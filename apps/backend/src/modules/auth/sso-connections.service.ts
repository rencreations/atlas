import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/settings/crypto.service';

export type SsoConnectionType = 'oidc' | 'saml';

/** Config shape stored in SsoConnection.config (JSON). Secret string
 *  fields are stored with the same `enc:v1:` convention as AppSetting. */
export interface SsoConnectionConfig {
  // OIDC
  issuer?: string;
  clientId?: string;
  clientSecret?: string;
  // SAML
  entryPoint?: string;
  spIssuer?: string;
  cert?: string;
  privateKey?: string;
}

export interface SsoConnectionRow {
  id: string;
  name: string;
  type: SsoConnectionType;
  enabled: boolean;
  domains: string[];
  config: SsoConnectionConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface SsoConnectionDto {
  name: string;
  type: SsoConnectionType;
  enabled?: boolean;
  domains?: string[];
  config: SsoConnectionConfig;
}

const SECRET_CONFIG_FIELDS: (keyof SsoConnectionConfig)[] = ['clientSecret', 'cert', 'privateKey'];

/**
 * CRUD for tenant SSO directories. An instance can connect as many
 * companies as it wants, each either OIDC or SAML; the login page lists
 * every enabled connection as its own button.
 */
@Injectable()
export class SsoConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async list(): Promise<SsoConnectionRow[]> {
    const rows = await this.prisma.ssoConnection.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map((r) => this.fromRow(r, true));
  }

  /** Enabled connections only, secrets decrypted (used by auth flows). */
  async enabled(): Promise<SsoConnectionRow[]> {
    const rows = await this.prisma.ssoConnection.findMany({
      where: { enabled: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.fromRow(r, false));
  }

  async get(id: string, withSecrets = false): Promise<SsoConnectionRow> {
    const row = await this.prisma.ssoConnection.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('SSO connection not found.');
    return this.fromRow(row, !withSecrets);
  }

  async create(dto: SsoConnectionDto): Promise<SsoConnectionRow> {
    this.validate(dto);
    const row = await this.prisma.ssoConnection.create({
      data: {
        name: dto.name.trim(),
        type: dto.type,
        enabled: dto.enabled ?? false,
        domains: (dto.domains ?? []).join(','),
        config: this.encryptConfig(dto.config) as Prisma.InputJsonValue,
      },
    });
    return this.fromRow(row, true);
  }

  async update(id: string, dto: SsoConnectionDto): Promise<SsoConnectionRow> {
    await this.get(id);
    this.validate(dto);
    const row = await this.prisma.ssoConnection.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        type: dto.type,
        enabled: dto.enabled ?? false,
        domains: (dto.domains ?? []).join(','),
        config: this.encryptConfig(dto.config) as Prisma.InputJsonValue,
      },
    });
    return this.fromRow(row, true);
  }

  async setEnabled(id: string, enabled: boolean): Promise<SsoConnectionRow> {
    await this.get(id);
    const row = await this.prisma.ssoConnection.update({ where: { id }, data: { enabled } });
    return this.fromRow(row, true);
  }

  async remove(id: string): Promise<{ ok: boolean }> {
    await this.prisma.ssoConnection.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('SSO connection not found.');
    });
    return { ok: true };
  }

  // ─── Row mapping / encryption ─────────────────────────────────────

  /** Mask = secrets replaced with '' plus a `secretSet` map for the UI. */
  private fromRow(
    row: Prisma.SsoConnectionGetPayload<Record<string, never>>,
    mask: boolean,
  ): SsoConnectionRow {
    const raw = (row.config ?? {}) as Record<string, unknown>;
    const config: SsoConnectionConfig = {};
    for (const field of SECRET_CONFIG_FIELDS) {
      const value = typeof raw[field] === 'string' ? (raw[field] as string) : '';
      config[field] = mask ? '' : value ? this.crypto.decrypt(value) : '';
    }
    for (const field of ['issuer', 'clientId', 'entryPoint', 'spIssuer'] as const) {
      config[field] = typeof raw[field] === 'string' ? (raw[field] as string) : '';
    }
    const masked = mask
      ? ({ ...config, secretSet: this.secretSetOf(raw) } as SsoConnectionConfig)
      : config;
    return {
      id: row.id,
      name: row.name,
      type: row.type as SsoConnectionType,
      enabled: row.enabled,
      domains: (row.domains ?? '')
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean),
      config: masked,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private secretSetOf(raw: Record<string, unknown>): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const field of SECRET_CONFIG_FIELDS) {
      out[field] = typeof raw[field] === 'string' && (raw[field] as string).length > 0;
    }
    return out;
  }

  /** Encrypt secret config fields; plain fields pass through. */
  private encryptConfig(config: SsoConnectionConfig): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const field of SECRET_CONFIG_FIELDS) {
      const value = (config[field] ?? '').trim();
      if (value) out[field] = this.crypto.encrypt(value);
    }
    for (const field of ['issuer', 'clientId', 'entryPoint', 'spIssuer'] as const) {
      const value = (config[field] ?? '').trim();
      if (value) out[field] = value;
    }
    return out;
  }

  private validate(dto: SsoConnectionDto): void {
    if (!dto.name || !dto.name.trim()) throw new BadRequestException('A name is required.');
    if (dto.name.trim().length > 80) {
      throw new BadRequestException('Keep the name under 80 characters.');
    }
    if (dto.type !== 'oidc' && dto.type !== 'saml') {
      throw new BadRequestException('Type must be oidc or saml.');
    }
    if (dto.type === 'oidc' && !(dto.config.issuer ?? '').trim()) {
      throw new BadRequestException('OIDC needs an issuer URL.');
    }
    if (
      dto.type === 'saml' &&
      (!(dto.config.entryPoint ?? '').trim() || !(dto.config.cert ?? '').trim())
    ) {
      throw new BadRequestException('SAML needs an entry point and the IdP certificate.');
    }
  }
}
