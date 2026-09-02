import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { customAlphabet } from 'nanoid';

const objectId = customAlphabet('0123456789abcdefghijkmnopqrstuvwxyz', 16);

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly region: string;
  private readonly publicBaseUrl: string;
  private readonly presignTtl: number;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('s3.bucket') ?? '';
    this.region = config.get<string>('s3.region') ?? '';
    this.publicBaseUrl = config.get<string>('s3.publicBaseUrl') ?? '';
    this.presignTtl = config.get<number>('s3.presignTtl') ?? 300;

    const accessKeyId = config.get<string>('s3.accessKeyId') ?? '';
    const secretAccessKey = config.get<string>('s3.secretAccessKey') ?? '';
    if (this.bucket && this.region && accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region: this.region,
        credentials: { accessKeyId, secretAccessKey },
      });
    } else {
      this.client = null;
      this.logger.warn('S3 storage not configured, uploads disabled. Configure it in godmode.');
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  private requireClient(): S3Client {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Storage is not configured on this instance. Configure it in godmode.',
      );
    }
    return this.client;
  }

  /** Build a deterministic, namespaced object key for a project upload. */
  buildKey(projectId: string, contentType: string): string {
    const ext = this.extensionFor(contentType);
    return `projects/${projectId}/${Date.now()}-${objectId()}${ext}`;
  }

  /** Public CDN URL for a stored object. Falls back to the virtual-hosted-style S3 URL. */
  publicUrlFor(key: string): string {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/+$/, '')}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async presignPut(opts: {
    key: string;
    contentType: string;
    contentLength: number;
  }): Promise<{ uploadUrl: string; expiresIn: number }> {
    const client = this.requireClient();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: opts.key,
      ContentType: opts.contentType,
      ContentLength: opts.contentLength,
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: this.presignTtl });
    return { uploadUrl, expiresIn: this.presignTtl };
  }

  /**
   * Presigned GET URL for a stored object. Useful for download links
   * that should expire (e.g. voice recordings, Phase 7).
   * Default TTL is 5 minutes (`s3.presignTtl`).
   */
  async presignGet(key: string): Promise<{ downloadUrl: string; expiresIn: number }> {
    const client = this.requireClient();
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const downloadUrl = await getSignedUrl(client, command, {
      expiresIn: this.presignTtl,
    });
    return { downloadUrl, expiresIn: this.presignTtl };
  }

  async deleteObject(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err) {
      this.logger.warn(`Failed to delete S3 object ${key}: ${(err as Error).message}`);
    }
  }

  /** Used by the health check, fast existence probe. */
  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch (err) {
      this.logger.warn(`S3 ping failed: ${(err as Error).message}`);
      return false;
    }
  }

  /** Strip the public base URL or amazonaws prefix to recover the object key. */
  keyFromPublicUrl(url: string): string | null {
    if (this.publicBaseUrl && url.startsWith(this.publicBaseUrl)) {
      return url.slice(this.publicBaseUrl.length).replace(/^\/+/, '');
    }
    const m = url.match(/amazonaws\.com\/(.+)$/);
    return m ? m[1] : null;
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

// Careful: changing this interacts with session idle timeout policy

// Careful: changing this interacts with link preview cache eviction
