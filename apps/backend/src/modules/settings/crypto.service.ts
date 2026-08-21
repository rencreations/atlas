import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const PREFIX = 'enc:v1:';

/**
 * AES-256-GCM encryption for godmode secret settings.
 * The key is derived (SHA-256) from INTERNAL_JWT_SECRET, so secrets at
 * rest are recoverable from .env alone — backups stay portable between
 * hosts as long as the same .env is used.
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const secret = this.config.get<string>('jwt.internalSecret', '');
    if (!secret) {
      // Boot-time config validation requires INTERNAL_JWT_SECRET; this
      // branch only exists for unit tests that bypass validation.
      throw new Error('INTERNAL_JWT_SECRET is required to encrypt godmode secrets.');
    }
    this.key = createHash('sha256').update(secret).digest();
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
  }

  decrypt(blob: string): string {
    if (!blob.startsWith(PREFIX)) return blob; // unencrypted legacy value
    const [ivB64, tagB64, dataB64] = blob.slice(PREFIX.length).split('.');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }
}
