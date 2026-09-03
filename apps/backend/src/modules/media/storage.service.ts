import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { customAlphabet } from 'nanoid';
import { SettingsService } from '@/modules/settings/settings.service';

const objectId = customAlphabet('0123456789abcdefghijkmnopqrstuvwxyz', 16);

export type StorageProvider = 'local' | 's3' | 'r2' | 's3compat' | 'disabled';

const PRESIGN_TTL = 300; // seconds, mirrors the old s3.presignTtl default

/**
 * Settings-driven object storage. Replaces the old env-only S3Service:
 * the provider (local disk, AWS S3, Cloudflare R2, other S3-compatible,
 * or disabled) and its credentials live in godmode settings, so switching
 * providers never needs a redeploy.
 *
 * The public surface is kept identical to the old S3Service
 * (buildKey / publicUrlFor / presignPut / presignGet / deleteObject /
 * keyFromPublicUrl / isConfigured / ping) so every existing consumer
 * keeps working unchanged. The local provider serves and accepts objects
 * through backend routes with short-lived HMAC-signed tokens, matching
 * the semantics of S3 presigned URLs.
 *
 * Every operation accepts an explicit `provider` so the background
 * migration can read the OLD side and write the NEW side concurrently
 * while live traffic keeps using the active provider.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly settings: SettingsService,
    private readonly config: ConfigService,
  ) {}

  // ─── Provider resolution ──────────────────────────────────────────

  async provider(): Promise<StorageProvider> {
    const p = await this.settings.get<string>('storage.provider');
    return (['local', 's3', 'r2', 's3compat', 'disabled'] as const).includes(p as StorageProvider)
      ? (p as StorageProvider)
      : 'disabled';
  }

  /** Whether the active provider can accept uploads. */
  async isConfigured(): Promise<boolean> {
    return (await this.provider()) !== 'disabled';
  }

  private backendBaseUrl(): string {
    return (this.config.get<string>('app.baseUrl') ?? 'http://localhost:3000').replace(/\/+$/, '');
  }

  // ─── S3 client (s3 / r2 / s3compat) ───────────────────────────────

  private async s3Target(provider: 's3' | 'r2' | 's3compat'): Promise<{
    client: S3Client;
    bucket: string;
    publicBaseUrl: string;
  } | null> {
    const prefix = `storage.${provider}`;
    const bucket = String((await this.settings.get<string>(`${prefix}.bucket`)) ?? '').trim();
    if (!bucket) return null;

    let endpoint = '';
    let region = '';
    let forcePathStyle = false;
    if (provider === 's3') {
      region = String((await this.settings.get<string>('storage.s3.region')) ?? '').trim();
    } else if (provider === 'r2') {
      const accountId = String(
        (await this.settings.get<string>('storage.r2.accountId')) ?? '',
      ).trim();
      if (!accountId) return null;
      endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
      region = 'auto';
      forcePathStyle = true;
    } else {
      endpoint = String(
        (await this.settings.get<string>('storage.s3compat.endpoint')) ?? '',
      ).trim();
      region = String((await this.settings.get<string>('storage.s3compat.region')) ?? '').trim();
      forcePathStyle = true;
      if (!endpoint) return null;
    }

    const accessKeyId = String(
      (await this.settings.get<string>(`${prefix}.accessKeyId`)) ?? '',
    ).trim();
    const secretAccessKey = String(
      (await this.settings.get<string>(`${prefix}.secretAccessKey`)) ?? '',
    ).trim();
    const publicBaseUrl = String(
      (await this.settings.get<string>(`${prefix}.publicBaseUrl`)) ?? '',
    ).trim();
    if (!accessKeyId || !secretAccessKey) return null;

    const client = new S3Client({
      region: region || 'us-east-1',
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint ? { endpoint } : {}),
      ...(forcePathStyle ? { forcePathStyle: true } : {}),
      // Some S3-compatible stores reject trailing checksums; only send
      // them where the protocol strictly requires it.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
    return { client, bucket, publicBaseUrl };
  }

  // ─── Local disk storage ───────────────────────────────────────────

  private async localDir(): Promise<string> {
    const configured = String((await this.settings.get<string>('storage.local.path')) ?? '').trim();
    return resolve(process.cwd(), configured || 'data/files');
  }

  private localPathFor(dir: string, key: string): string {
    const target = resolve(dir, key);
    // Keys are generated by us, but reject traversal defensively anyway.
    if (target !== dir && !target.startsWith(dir + '/')) {
      throw new BadRequestException('Invalid object key.');
    }
    return target;
  }

  /** Absolute disk path for a local-storage key (validated against traversal). */
  async localFilePath(key: string): Promise<string> {
    return this.localPathFor(await this.localDir(), key);
  }

  // ─── Public API (same surface as the old S3Service) ───────────────

  buildKey(projectId: string, contentType: string): string {
    const ext = this.extensionFor(contentType);
    return `projects/${projectId}/${Date.now()}-${objectId()}${ext}`;
  }

  /** Public URL for a stored object under the given (or active) provider. */
  async publicUrlFor(key: string, provider?: StorageProvider): Promise<string> {
    const active = provider ?? (await this.provider());
    if (active === 'local' || active === 'disabled') {
      return `${this.backendBaseUrl()}/api/v1/storage/local/${key}`;
    }
    const target = await this.s3Target(active);
    if (!target) {
      throw new ServiceUnavailableException(
        'Storage is not configured on this instance. Configure it in godmode.',
      );
    }
    if (target.publicBaseUrl) {
      return `${target.publicBaseUrl.replace(/\/+$/, '')}/${key}`;
    }
    if (active === 's3') {
      const region = String((await this.settings.get<string>('storage.s3.region')) ?? '').trim();
      return `https://${target.bucket}.s3.${region || 'us-east-1'}.amazonaws.com/${key}`;
    }
    if (active === 'r2') {
      const accountId = String(
        (await this.settings.get<string>('storage.r2.accountId')) ?? '',
      ).trim();
      return `https://${accountId}.r2.cloudflarestorage.com/${target.bucket}/${key}`;
    }
    const endpoint = String(
      (await this.settings.get<string>('storage.s3compat.endpoint')) ?? '',
    ).replace(/\/+$/, '');
    return `${endpoint}/${target.bucket}/${key}`;
  }

  async presignPut(opts: {
    key: string;
    contentType: string;
    contentLength: number;
  }): Promise<{ uploadUrl: string; expiresIn: number }> {
    const provider = await this.provider();
    if (provider === 'local') {
      return {
        uploadUrl: `${this.backendBaseUrl()}/api/v1/storage/local/${opts.key}?t=${this.signToken(
          opts.key,
          opts.contentType,
          opts.contentLength,
        )}`,
        expiresIn: PRESIGN_TTL,
      };
    }
    if (provider === 'disabled') {
      throw new ServiceUnavailableException(
        'Storage is not configured on this instance. Configure it in godmode.',
      );
    }
    const target = await this.s3Target(provider);
    if (!target) {
      throw new ServiceUnavailableException(
        'Storage is not configured on this instance. Configure it in godmode.',
      );
    }
    const command = new PutObjectCommand({
      Bucket: target.bucket,
      Key: opts.key,
      ContentType: opts.contentType,
      ContentLength: opts.contentLength,
    });
    const uploadUrl = await getSignedUrl(target.client, command, { expiresIn: PRESIGN_TTL });
    return { uploadUrl, expiresIn: PRESIGN_TTL };
  }

  async presignGet(key: string): Promise<{ downloadUrl: string; expiresIn: number }> {
    const provider = await this.provider();
    if (provider === 'local') {
      return {
        downloadUrl: `${this.backendBaseUrl()}/api/v1/storage/local/${key}?t=${this.signToken(
          key,
          '',
          0,
        )}`,
        expiresIn: PRESIGN_TTL,
      };
    }
    if (provider === 'disabled') {
      throw new ServiceUnavailableException(
        'Storage is not configured on this instance. Configure it in godmode.',
      );
    }
    const target = await this.s3Target(provider);
    if (!target) {
      throw new ServiceUnavailableException(
        'Storage is not configured on this instance. Configure it in godmode.',
      );
    }
    const command = new GetObjectCommand({ Bucket: target.bucket, Key: key });
    const downloadUrl = await getSignedUrl(target.client, command, { expiresIn: PRESIGN_TTL });
    return { downloadUrl, expiresIn: PRESIGN_TTL };
  }

  async deleteObject(key: string): Promise<void> {
    const provider = await this.provider();
    try {
      if (provider === 'local') {
        const dir = await this.localDir();
        await unlink(this.localPathFor(dir, key)).catch(() => undefined);
        return;
      }
      if (provider === 'disabled') return;
      const target = await this.s3Target(provider);
      if (!target) return;
      await target.client.send(new DeleteObjectCommand({ Bucket: target.bucket, Key: key }));
    } catch (err) {
      this.logger.warn(`Failed to delete object ${key}: ${(err as Error).message}`);
    }
  }

  /**
   * Whether a provider is configured enough to hold data. For S3-family
   * providers this is a config check (not a network probe); for local it
   * means the folder can be created.
   */
  async isReachable(provider: StorageProvider): Promise<boolean> {
    if (provider === 'disabled') return false;
    if (provider === 'local') return this.ping('local');
    const target = await this.s3Target(provider);
    return target !== null;
  }

  /** Fast existence probe for the health check. */
  async ping(provider?: StorageProvider): Promise<boolean> {
    const active = provider ?? (await this.provider());
    if (active === 'disabled') return false;
    if (active === 'local') {
      try {
        await mkdir(await this.localDir(), { recursive: true });
        return true;
      } catch {
        return false;
      }
    }
    const target = await this.s3Target(active);
    if (!target) return false;
    try {
      await target.client.send(new HeadBucketCommand({ Bucket: target.bucket }));
      return true;
    } catch (err) {
      this.logger.warn(`Storage ping failed: ${(err as Error).message}`);
      return false;
    }
  }

  /** Recover the object key from a stored public URL (any known shape). */
  async keyFromPublicUrl(url: string, provider?: StorageProvider): Promise<string | null> {
    if (!url) return null;
    const active = provider ?? (await this.provider());
    if (active === 'local' || active === 'disabled') {
      const base = `${this.backendBaseUrl()}/api/v1/storage/local/`;
      if (url.startsWith(base)) return url.slice(base.length);
    } else {
      const target = await this.s3Target(active).catch(() => null);
      if (target?.publicBaseUrl && url.startsWith(target.publicBaseUrl)) {
        return url.slice(target.publicBaseUrl.length).replace(/^\/+/, '');
      }
      if (active === 's3compat') {
        const endpoint = String(
          (await this.settings.get<string>('storage.s3compat.endpoint')) ?? '',
        ).trim();
        if (endpoint && url.startsWith(endpoint)) {
          const rest = url.slice(endpoint.length).replace(/^\/+/, '');
          const seg = rest.split('/');
          if (seg.length > 1) return seg.slice(1).join('/');
        }
      }
    }
    const m = url.match(/amazonaws\.com\/(.+)$/);
    if (m) return m[1];
    const r2 = url.match(/r2\.cloudflarestorage\.com\/[^/]+\/(.+)$/);
    if (r2) return r2[1];
    return null;
  }

  // ─── Migration support ────────────────────────────────────────────

  /** Every object key currently reachable under the given (or active) provider. */
  async listKeys(provider?: StorageProvider): Promise<string[]> {
    const active = provider ?? (await this.provider());
    if (active === 'local') {
      const dir = await this.localDir();
      const out: string[] = [];
      const walk = async (base: string) => {
        const { readdir } = await import('node:fs/promises');
        for (const entry of await readdir(base, { withFileTypes: true }).catch(() => [])) {
          const full = join(base, entry.name);
          if (entry.isDirectory()) await walk(full);
          else out.push(relative(dir, full).split('\\').join('/'));
        }
      };
      await walk(dir);
      return out;
    }
    if (active === 'disabled') return [];
    const target = await this.s3Target(active);
    if (!target) return [];
    const keys: string[] = [];
    let token: string | undefined;
    do {
      const res = await target.client.send(
        new ListObjectsV2Command({
          Bucket: target.bucket,
          ...(token ? { ContinuationToken: token } : {}),
        }),
      );
      for (const obj of res.Contents ?? []) {
        if (obj.Key) keys.push(obj.Key);
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return keys;
  }

  async getObject(key: string, provider?: StorageProvider): Promise<Buffer> {
    const active = provider ?? (await this.provider());
    if (active === 'local') {
      return readFile(this.localPathFor(await this.localDir(), key));
    }
    if (active === 'disabled') throw new ServiceUnavailableException('Storage is not configured.');
    const target = await this.s3Target(active);
    if (!target) throw new ServiceUnavailableException('Storage is not configured.');
    const res = await target.client.send(new GetObjectCommand({ Bucket: target.bucket, Key: key }));
    const stream = res.Body as Readable;
    return streamToBuffer(stream);
  }

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
    provider?: StorageProvider,
  ): Promise<void> {
    const active = provider ?? (await this.provider());
    if (active === 'local') {
      const dir = await this.localDir();
      const path = this.localPathFor(dir, key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, body);
      return;
    }
    if (active === 'disabled') throw new ServiceUnavailableException('Storage is not configured.');
    const target = await this.s3Target(active);
    if (!target) throw new ServiceUnavailableException('Storage is not configured.');
    await target.client.send(
      new PutObjectCommand({
        Bucket: target.bucket,
        Key: key,
        Body: body,
        ContentType: contentType || 'application/octet-stream',
      }),
    );
  }

  /** { size, exists } probe used to skip already-migrated objects. */
  async headObject(
    key: string,
    provider?: StorageProvider,
  ): Promise<{ exists: boolean; size?: number }> {
    const active = provider ?? (await this.provider());
    try {
      if (active === 'local') {
        const s = await stat(this.localPathFor(await this.localDir(), key)).catch(() => null);
        return s ? { exists: true, size: s.size } : { exists: false };
      }
      if (active === 'disabled') return { exists: false };
      const target = await this.s3Target(active);
      if (!target) return { exists: false };
      const res = await target.client.send(
        new HeadObjectCommand({ Bucket: target.bucket, Key: key }),
      );
      return { exists: true, size: res.ContentLength };
    } catch {
      return { exists: false };
    }
  }

  // ─── Local upload/download token (mirrors S3 presign semantics) ───

  signToken(key: string, contentType: string, contentLength: number): string {
    const secret = this.config.getOrThrow<string>('jwt.internalSecret');
    const exp = Math.floor(Date.now() / 1000) + PRESIGN_TTL;
    const payload = `${key}|${contentType}|${contentLength}|${exp}`;
    const sig = createHmac('sha256', secret).update(payload).digest('base64url');
    return `${exp}.${sig}`;
  }

  /** Validate a local upload token; returns true when key/type/length match. */
  verifyToken(key: string, contentType: string, contentLength: number, token: string): boolean {
    if (!token) return false;
    const secret = this.config.getOrThrow<string>('jwt.internalSecret');
    const [expRaw, sigRaw] = token.split('.');
    const exp = Number(expRaw);
    if (!exp || !sigRaw || Date.now() / 1000 > exp) return false;
    const expected = createHmac('sha256', secret)
      .update(`${key}|${contentType}|${contentLength}|${exp}`)
      .digest('base64url');
    const a = Buffer.from(expected);
    const b = Buffer.from(sigRaw);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private extensionFor(mime: string): string {
    switch (mime) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/gif':
        return '.gif';
      case 'video/mp4':
        return '.mp4';
      case 'video/webm':
        return '.webm';
      default:
        return '';
    }
  }
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolvePromise, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (c: Buffer) => chunks.push(c));
    stream.on('end', () => resolvePromise(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
