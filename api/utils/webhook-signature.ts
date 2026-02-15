/**
 * HMAC signature verification for webhook payloads
 *
 * WHY: Allows senders to sign payloads; receivers verify authenticity.
 *     Users configure a secret per webhook. Header: X-Qimtek-Signature
 *     Format: sha256=<hex>
 */
import { createHmac, timingSafeEqual } from 'crypto';

const ALGORITHM = 'sha256';
const HEADER = 'x-qimtek-signature';

export function verifySignature(
  payload: string | Buffer,
  secret: string,
  signatureHeader: string | null
): boolean {
  if (!secret || !signatureHeader) return false;

  const match = signatureHeader.match(/^sha256=([a-f0-9]+)$/i);
  if (!match) return false;

  const expected = createHmac(ALGORITHM, secret)
    .update(payload)
    .digest('hex');

  const actual = match[1].toLowerCase();
  if (expected.length !== actual.length) return false;

  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
  } catch {
    return false;
  }
}

export function generateSignature(payload: string | Buffer, secret: string): string {
  const hex = createHmac(ALGORITHM, secret).update(payload).digest('hex');
  return `sha256=${hex}`;
}

export { HEADER as SIGNATURE_HEADER };
