import { describe, it, expect } from 'vitest';
import { sha256Hex, generateOpaqueToken, normalizeEmail, normalizePhone, phonesMatch } from '../src/lib/crypto.js';
import { PaymentService } from '../src/modules/payments/payment.service.js';
import { DomainError } from '../src/lib/errors.js';
import { buildApp } from '../src/app.js';

describe('crypto helpers', () => {
  it('hashes stably', () => {
    expect(sha256Hex('abc')).toBe(sha256Hex('abc'));
    expect(sha256Hex('abc')).not.toBe(sha256Hex('abd'));
    expect(sha256Hex('abc')).toHaveLength(64);
  });

  it('generates opaque tokens', () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });

  it('normalizes email and phone', () => {
    expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com');
    expect(normalizePhone('+880 1712-345678')).toBe('+8801712345678');
    expect(phonesMatch('+8801712345678', '01712345678')).toBe(true);
    expect(phonesMatch('01712345678', '01999999999')).toBe(false);
  });
});

describe('PaymentService', () => {
  it('rejects card data', () => {
    const svc = new PaymentService();
    expect(() => svc.processDummy({ card_number: '4111' })).toThrow(DomainError);
    expect(() => svc.processDummy({ cvc: '123' })).toThrow(DomainError);
  });

  it('returns dummy txn', () => {
    const svc = new PaymentService();
    const r = svc.processDummy({ success: true });
    expect(r.success).toBe(true);
    expect(r.transaction_id).toMatch(/^TXN-DUMMY-/);
    expect(r.provider).toBe('dummy');
  });
});

describe('GET /health', () => {
  it('returns ok', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe('stride-server');
    await app.close();
  });
});
