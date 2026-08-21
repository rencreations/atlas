import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Minimal RFC 6238 TOTP (SHA-1, 6 digits, 30s window) with zero
 * dependencies. Used for the godmode second factor.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateTotpSecret(length = 32): string {
  const bytes = randomBytes(length);
  const bits: string[] = [];
  for (const b of bytes) bits.push(b.toString(2).padStart(8, '0'));
  let buffer = 0;
  let bitsLeft = 0;
  let out = '';
  for (const bit of bits.join('')) {
    buffer = (buffer << 1) | (bit === '1' ? 1 : 0);
    bitsLeft += 1;
    if (bitsLeft === 5) {
      out += BASE32_ALPHABET[buffer];
      buffer = 0;
      bitsLeft = 0;
    }
  }
  return out;
}

function base32Decode(secret: string): Buffer {
  const cleaned = secret.replace(/[= ]/g, '').toUpperCase();
  let buffer = 0;
  let bitsLeft = 0;
  const bytes: number[] = [];
  for (const ch of cleaned) {
    const val = BASE32_ALPHABET.indexOf(ch);
    if (val === -1) throw new Error(`Invalid base32 character: ${ch}`);
    buffer = (buffer << 5) | val;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bytes.push((buffer >> (bitsLeft - 8)) & 0xff);
      bitsLeft -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function totpToken(secret: string, timestamp = Date.now(), digits = 6, step = 30): string {
  const counter = Math.floor(timestamp / 1000 / step);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', base32Decode(secret)).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 10 ** digits).padStart(digits, '0');
}

export function verifyTotpToken(
  secret: string,
  code: string,
  window = 1,
  timestamp = Date.now(),
): boolean {
  const normalized = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;
  const candidate = Buffer.from(normalized);
  for (let offset = -window; offset <= window; offset++) {
    const expected = Buffer.from(totpToken(secret, timestamp + offset * 30_000));
    if (expected.length === candidate.length && timingSafeEqual(expected, candidate)) {
      return true;
    }
  }
  return false;
}

export function totpAuthUrl(secret: string, label: string, issuer: string): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    digits: '6',
    period: '30',
    algorithm: 'SHA1',
  });
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?${params.toString()}`;
}
