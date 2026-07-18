import { describe, it, expect, beforeAll } from 'vitest';
import { assertTestEnv, env } from '../src/config/env.js';
import { getSupabase, resetSupabaseClient } from '../src/lib/supabase.js';
import { buildApp } from '../src/app.js';
import { CustomerService } from '../src/modules/customers/customer.service.js';
import { CheckoutService } from '../src/modules/checkout/checkout.service.js';
import { sha256Hex } from '../src/lib/crypto.js';

const gate = assertTestEnv();
const describeDb = gate.ok ? describe : describe.skip;

describeDb('commerce foundation (integration)', () => {
  const tenantId = env.defaultTenantId;
  const otherTenant = '00000000-0000-0000-0000-000000000099';
  let db: ReturnType<typeof getSupabase>;
  let variantId: string;
  let productId: string;
  let customerId: string;
  let customerNumber: string;
  let customerEmail: string;
  let customerPhone: string;

  beforeAll(async () => {
    resetSupabaseClient();
    db = getSupabase();

    // Ensure other tenant exists for isolation tests
    await db.from('tenants').upsert({
      id: otherTenant,
      name: 'Isolation Test Tenant',
    });

    // Pick or create a product+variant with stock
    const { data: existing } = await db
      .from('product_variants')
      .select('id, product_id, stock_count, products!inner(tenant_id, status)')
      .eq('products.tenant_id', tenantId)
      .eq('products.status', 'active')
      .gte('stock_count', 2)
      .limit(1)
      .maybeSingle();

    if (existing) {
      variantId = existing.id;
      productId = existing.product_id;
      await db.from('product_variants').update({ stock_count: 5 }).eq('id', variantId);
    } else {
      const { data: product, error: pErr } = await db
        .from('products')
        .insert({
          tenant_id: tenantId,
          name: 'Phase1 Test Shoe',
          brand: 'Stride',
          category: 'sneakers',
          color: 'Black',
          price: 1000,
          currency: 'BDT',
          status: 'active',
          gender: 'unisex',
        })
        .select('id')
        .single();
      if (pErr) throw pErr;
      productId = product.id;
      const { data: variant, error: vErr } = await db
        .from('product_variants')
        .insert({ product_id: productId, size: '42', stock_count: 5 })
        .select('id')
        .single();
      if (vErr) throw vErr;
      variantId = variant.id;
    }

    customerEmail = `phase1-${Date.now()}@example.com`;
    customerPhone = '+8801711000099';
    const { data: customer, error: cErr } = await db
      .from('store_customers')
      .insert({
        tenant_id: tenantId,
        name: 'Phase1 Tester',
        email: customerEmail,
        phone: customerPhone,
        password: 'secret-should-never-leak',
      })
      .select('id, customer_number, email, phone, password')
      .single();
    if (cErr) throw cErr;
    customerId = customer.id;
    customerNumber = customer.customer_number;
    expect(customerNumber).toMatch(/^CUS-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{5,8}$/);
  });

  it('generates customer_number and rejects mutation', async () => {
    const { error } = await db
      .from('store_customers')
      .update({ customer_number: 'CUS-HACKED' })
      .eq('id', customerId);
    // Trigger should reject; PostgREST surfaces as error
    expect(error).toBeTruthy();

    const { data } = await db
      .from('store_customers')
      .select('customer_number')
      .eq('id', customerId)
      .single();
    expect(data?.customer_number).toBe(customerNumber);
  });

  it('verifies customer correctly and excludes password', async () => {
    const app = await buildApp();
    const okRes = await app.inject({
      method: 'POST',
      url: '/api/internal/customers/verify',
      headers: { 'x-internal-api-secret': env.internalApiSecret },
      payload: {
        tenant_id: tenantId,
        customer_number: customerNumber,
        email: customerEmail,
      },
    });
    expect(okRes.statusCode).toBe(200);
    const body = okRes.json();
    expect(body.customer.customer_number).toBe(customerNumber);
    expect(JSON.stringify(body)).not.toMatch(/password/i);
    expect(body.customer.password).toBeUndefined();

    const badRes = await app.inject({
      method: 'POST',
      url: '/api/internal/customers/verify',
      headers: { 'x-internal-api-secret': env.internalApiSecret },
      payload: {
        tenant_id: tenantId,
        customer_number: customerNumber,
        email: 'wrong@example.com',
      },
    });
    expect(badRes.statusCode).toBe(403);

    const noAuth = await app.inject({
      method: 'POST',
      url: '/api/internal/customers/verify',
      payload: {
        tenant_id: tenantId,
        customer_number: customerNumber,
        email: customerEmail,
      },
    });
    expect(noAuth.statusCode).toBe(401);

    await app.close();
  });

  it('CustomerService.verify with phone', async () => {
    const svc = new CustomerService(db);
    const c = await svc.verify({
      tenant_id: tenantId,
      customer_number: customerNumber,
      phone: '01711000099',
    });
    expect(c.id).toBe(customerId);
    expect((c as { password?: string }).password).toBeUndefined();
  });

  it('creates checkout session and returns opaque token URL', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/internal/checkout-sessions',
      headers: { 'x-internal-api-secret': env.internalApiSecret },
      payload: {
        tenant_id: tenantId,
        customer_id: customerId,
        items: [{ product_variant_id: variantId, quantity: 1 }],
        source_channel: 'ai',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toBeTruthy();
    expect(body.checkout_url).toContain('/checkout.html?session=');
    expect(body.total).toBeGreaterThan(0);

    // Hash only in DB
    const { data: session } = await db
      .from('checkout_sessions')
      .select('public_token_hash')
      .eq('id', body.checkout_session_id)
      .single();
    expect(session?.public_token_hash).toBe(sha256Hex(body.token));
    expect(JSON.stringify(session)).not.toContain(body.token);

    // GET session safe payload
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/checkout-sessions/${encodeURIComponent(body.token)}?tenant_id=${tenantId}`,
    });
    expect(getRes.statusCode).toBe(200);
    const sessionBody = getRes.json();
    expect(sessionBody.session.total).toBe(body.total);
    expect(sessionBody.session.items.length).toBe(1);
    expect(JSON.stringify(sessionBody)).not.toMatch(/public_token_hash|password/);

    // cleanup reservation
    await db.rpc('release_expired_reservations', { p_tenant_id: tenantId });
    await db
      .from('stock_reservations')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('checkout_session_id', body.checkout_session_id)
      .eq('status', 'active');
    await db
      .from('checkout_sessions')
      .update({ status: 'cancelled' })
      .eq('id', body.checkout_session_id);

    await app.close();
  });

  it('fails when out of stock', async () => {
    const checkout = new CheckoutService(db);
    await expect(
      checkout.createSession({
        tenant_id: tenantId,
        items: [{ product_variant_id: variantId, quantity: 9999 }],
      })
    ).rejects.toMatchObject({ code: 'STOCK_UNAVAILABLE' });
  });

  it('allows only one concurrent reservation of the final unit', async () => {
    // Set stock to 1 and clear active reservations on this variant
    await db
      .from('stock_reservations')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('product_variant_id', variantId)
      .eq('status', 'active');
    await db.from('product_variants').update({ stock_count: 1 }).eq('id', variantId);

    const checkout = new CheckoutService(db);
    const results = await Promise.allSettled([
      checkout.createSession({
        tenant_id: tenantId,
        items: [{ product_variant_id: variantId, quantity: 1 }],
      }),
      checkout.createSession({
        tenant_id: tenantId,
        items: [{ product_variant_id: variantId, quantity: 1 }],
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // cleanup
    for (const r of fulfilled) {
      if (r.status === 'fulfilled') {
        await db
          .from('stock_reservations')
          .update({ status: 'released', released_at: new Date().toISOString() })
          .eq('checkout_session_id', r.value.checkout_session_id);
        await db
          .from('checkout_sessions')
          .update({ status: 'cancelled' })
          .eq('id', r.value.checkout_session_id);
      }
    }
    await db.from('product_variants').update({ stock_count: 5 }).eq('id', variantId);
  });

  it('rejects expired session completion', async () => {
    const checkout = new CheckoutService(db);
    const created = await checkout.createSession({
      tenant_id: tenantId,
      customer_id: customerId,
      items: [{ product_variant_id: variantId, quantity: 1 }],
    });

    // Force expiry
    await db
      .from('checkout_sessions')
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq('id', created.checkout_session_id);
    await db
      .from('stock_reservations')
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq('checkout_session_id', created.checkout_session_id);

    await expect(
      checkout.complete(tenantId, created.token!, {
        success: true,
        transaction_id: `TXN-EXP-${Date.now()}`,
      })
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof Error &&
        'code' in err &&
        ['SESSION_EXPIRED', 'SESSION_NOT_OPEN'].includes(String((err as { code: string }).code))
    );
  });

  it('completes idempotently and deducts stock once', async () => {
    await db
      .from('stock_reservations')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('product_variant_id', variantId)
      .eq('status', 'active');
    await db.from('product_variants').update({ stock_count: 5 }).eq('id', variantId);

    const checkout = new CheckoutService(db);
    const created = await checkout.createSession({
      tenant_id: tenantId,
      customer_id: customerId,
      items: [{ product_variant_id: variantId, quantity: 1 }],
    });

    const { data: before } = await db
      .from('product_variants')
      .select('stock_count')
      .eq('id', variantId)
      .single();

    const txn = `TXN-IDEM-${Date.now()}`;
    const first = await checkout.complete(tenantId, created.token!, {
      success: true,
      transaction_id: txn,
    });
    const second = await checkout.complete(tenantId, created.token!, {
      success: true,
      transaction_id: txn,
    });

    expect(first.order_number).toBe(second.order_number);
    expect(second.idempotent).toBe(true);
    expect(first.customer_number).toBe(customerNumber);
    expect(first.estimated_delivery_message).toBeTruthy();
    expect(first.support_message).toBeTruthy();

    const { data: after } = await db
      .from('product_variants')
      .select('stock_count')
      .eq('id', variantId)
      .single();
    expect(Number(after?.stock_count)).toBe(Number(before?.stock_count) - 1);

    // Third complete still same stock
    await checkout.complete(tenantId, created.token!, {
      success: true,
      transaction_id: txn,
    });
    const { data: after3 } = await db
      .from('product_variants')
      .select('stock_count')
      .eq('id', variantId)
      .single();
    expect(Number(after3?.stock_count)).toBe(Number(after?.stock_count));
  });

  it('enforces tenant isolation on session lookup', async () => {
    const checkout = new CheckoutService(db);
    const created = await checkout.createSession({
      tenant_id: tenantId,
      items: [{ product_variant_id: variantId, quantity: 1 }],
    });

    await expect(checkout.getByToken(otherTenant, created.token!)).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
    });

    await db
      .from('stock_reservations')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('checkout_session_id', created.checkout_session_id);
    await db
      .from('checkout_sessions')
      .update({ status: 'cancelled' })
      .eq('id', created.checkout_session_id);
  });
});

describe('integration gate', () => {
  it('documents skip reason when service role missing', () => {
    if (!gate.ok) {
      console.warn(`Integration tests skipped: ${gate.reason}`);
    }
    expect(true).toBe(true);
  });
});
