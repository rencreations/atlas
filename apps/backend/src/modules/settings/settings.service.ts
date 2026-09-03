import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { SETTINGS, SettingDef } from './settings-registry';
import { PRIVACY_TEMPLATE, TERMS_TEMPLATE } from './legal-defaults';

const CACHE_TTL_MS = 15_000;

interface CachedSetting {
  value: unknown;
  at: number;
  explicit: boolean;
}

/**
 * Database-backed dynamic settings with layered resolution:
 *   DB value → legacy env fallback → registry default.
 *
 * Values are cached in memory (single writer: godmode) with a short TTL.
 * Secret settings are stored encrypted and never returned in plaintext
 * by the godmode listing endpoints (they report `secretSet: true` only).
 */
@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private readonly cache = new Map<string, CachedSetting>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.prime();
    await this.seedLegalDefaults();
  }

  /**
   * First boot (or upgrade): when no legal text has ever been saved,
   * publish the bundled terms and privacy templates so the public pages
   * work out of the box. Admins replace them anytime from godmode.
   * An explicit row, even empty, is respected.
   */
  private async seedLegalDefaults(): Promise<void> {
    const now = new Date().toISOString().slice(0, 10);
    let siteName = 'Atlas';
    try {
      siteName = String((await this.get<string>('site.name')) || 'Atlas');
    } catch {
      // Default name is fine when the site setting cannot be read yet.
    }
    for (const [key, template] of [
      ['legal.termsText', TERMS_TEMPLATE],
      ['legal.privacyText', PRIVACY_TEMPLATE],
    ] as const) {
      const existing = await this.prisma.appSetting
        .findUnique({ where: { key } })
        .catch(() => null);
      // Only published text is respected: anything shorter than 200
      // characters is a placeholder or test snippet, not a real policy,
      // so it gets replaced by the template as well. Admins replace the
      // template anytime from godmode; published text is never touched.
      const published =
        existing && typeof existing.value === 'string' && existing.value.trim().length >= 200;
      if (published) continue;
      const text = template.replace(/\{\{SITE_NAME\}\}/g, siteName).replace(/\{\{DATE\}\}/g, now);
      await this.set(key, text, 'legal-defaults').catch((err) => {
        this.logger.warn(`Could not seed ${key}: ${(err as Error).message}`);
      });
    }
  }

  /** Load every explicit DB value into the cache. */
  private async prime(): Promise<void> {
    try {
      const rows = await this.prisma.appSetting.findMany();
      for (const row of rows) {
        this.cache.set(row.key, { value: row.value, at: Date.now(), explicit: true });
      }
    } catch (err) {
      // Table missing = migration not applied yet. Settings fall back to
      // defaults and the rest of the boot proceeds.
      this.logger.warn(`Could not load settings: ${(err as Error).message}`);
    }
  }

  definition(key: string): SettingDef | undefined {
    return SETTINGS[key];
  }

  definitions(): SettingDef[] {
    return Object.values(SETTINGS);
  }

  private fromCache(key: string): CachedSetting | undefined {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit;
    return undefined;
  }

  /**
   * Resolve a setting: cache → DB → env fallback → registry default.
   * Secret values are decrypted before returning to callers.
   */
  async get<T = unknown>(key: string): Promise<T> {
    const def = SETTINGS[key];
    if (!def) {
      this.logger.warn(`Unknown setting requested: ${key}`);
      return undefined as T;
    }

    const cached = this.fromCache(key);
    if (cached) {
      return this.plainValue(def, cached.value) as T;
    }

    let raw: unknown | undefined;
    let explicit = false;
    try {
      const row = await this.prisma.appSetting.findUnique({ where: { key } });
      if (row) {
        raw = row.value;
        explicit = true;
      }
    } catch {
      // Migration not applied, fall through to env/defaults.
    }

    const value = this.plainValue(def, raw);
    if (value === undefined) {
      const fromEnv = this.fromEnv(def);
      const finalValue = fromEnv !== undefined ? fromEnv : def.defaultValue;
      this.cache.set(key, { value: finalValue, at: Date.now(), explicit });
      return finalValue as T;
    }

    this.cache.set(key, { value, at: Date.now(), explicit });
    return value as T;
  }

  private plainValue(def: SettingDef, raw: unknown): unknown {
    if (raw === undefined || raw === null) return undefined;
    if (def.secret && typeof raw === 'string' && raw.startsWith('enc:v1:')) {
      try {
        return this.crypto.decrypt(raw);
      } catch {
        this.logger.warn(`Failed to decrypt secret setting ${def.key}`);
        return '';
      }
    }
    return raw;
  }

  private fromEnv(def: SettingDef): unknown {
    if (!def.envFallback) return undefined;
    const raw = this.config.get<string>(def.envFallback as never);
    if (raw === undefined || raw === '') return undefined;
    switch (def.type) {
      case 'boolean':
        return String(raw).toLowerCase() === 'true';
      case 'number': {
        const n = Number(raw);
        return Number.isFinite(n) ? n : undefined;
      }
      default:
        return raw;
    }
  }

  /** Set one setting (godmode). Secret defs get encrypted. */
  async set(key: string, value: unknown, updatedBy?: string): Promise<void> {
    const def = SETTINGS[key];
    if (!def) throw new Error(`Unknown setting: ${key}`);
    const stored = (
      def.secret && typeof value === 'string' && value !== ''
        ? this.crypto.encrypt(value)
        : this.coerce(def, value)
    ) as Prisma.InputJsonValue;
    await this.prisma.appSetting.upsert({
      where: { key },
      create: { key, value: stored, isSecret: !!def.secret, updatedBy },
      update: { value: stored, isSecret: !!def.secret, updatedBy },
    });
    this.cache.set(key, { value: stored, at: Date.now(), explicit: true });
  }

  /** Bulk-set settings from godmode in one round trip. */
  async setMany(entries: { key: string; value: unknown }[], updatedBy?: string): Promise<void> {
    for (const e of entries) {
      await this.set(e.key, e.value, updatedBy);
    }
  }

  /** Validate and coerce an incoming value to the registry type. */
  coerce(def: SettingDef, value: unknown): unknown {
    switch (def.type) {
      case 'boolean':
        return value === true || value === 'true';
      case 'number': {
        const n = Number(value);
        if (!Number.isFinite(n)) throw new Error(`${def.key} must be a number`);
        return n;
      }
      case 'json':
        return value;
      case 'enum':
        if (
          typeof value !== 'string' ||
          (def.options && !def.options.some((o) => o.value === value))
        ) {
          throw new Error(
            `${def.key} must be one of: ${def.options?.map((o) => o.value).join(', ')}`,
          );
        }
        return value;
      default:
        return String(value ?? '');
    }
  }

  /** Full view for godmode: registry metadata + current values, secrets masked. */
  async viewForGodmode(): Promise<
    {
      key: string;
      label: string;
      description?: string;
      group: string;
      type: string;
      secret: boolean;
      secretSet?: boolean;
      value?: unknown;
      defaultValue?: unknown;
      options?: { label: string; value: string }[];
      advanced?: boolean;
      public?: boolean;
      visibleWhen?: { key: string; oneOf: string[] };
      disabledWhen?: { key: string; oneOf: (string | boolean)[]; hint: string; section: string };
      moreInfo?: string;
      action?: { label: string; section: string };
      docUrl?: string;
      fileUpload?: { accept: string; hint: string };
      placeholder?: string;
    }[]
  > {
    const defs = this.definitions();
    return Promise.all(
      defs.map(async (def) => {
        const base = {
          key: def.key,
          label: def.label,
          description: def.description,
          group: def.group,
          type: def.type,
          secret: !!def.secret,
          options: def.options,
          advanced: def.advanced,
          public: def.public,
          visibleWhen: def.visibleWhen,
          disabledWhen: def.disabledWhen,
          moreInfo: def.moreInfo,
          action: def.action,
          docUrl: def.docUrl,
          fileUpload: def.fileUpload,
          placeholder: def.placeholder,
        };
        if (def.secret) {
          const raw = await this.get<string>(def.key);
          return { ...base, secretSet: !!(raw && raw !== ''), defaultValue: undefined };
        }
        const value = await this.get(def.key);
        return { ...base, value, defaultValue: def.defaultValue };
      }),
    );
  }

  /** Whether the first godmode onboarding has completed. */
  async isConfigured(): Promise<boolean> {
    return this.get<boolean>('system.configured');
  }

  async markConfigured(): Promise<void> {
    await this.set('system.configured', true);
  }
}
