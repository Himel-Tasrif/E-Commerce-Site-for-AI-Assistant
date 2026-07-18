import { createHash, randomBytes } from 'node:crypto';

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Opaque checkout token — never store the raw token in DB */
export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Strip spaces/dashes; keep leading + for international */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');
  return hasPlus ? `+${digits}` : digits;
}

export function phonesMatch(a: string | null | undefined, b: string): boolean {
  if (!a) return false;
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Compare last 10 digits (common BD local vs +880)
  const ta = na.replace(/\D/g, '').slice(-10);
  const tb = nb.replace(/\D/g, '').slice(-10);
  return ta.length >= 10 && ta === tb;
}
