import type { SupabaseClient } from '@supabase/supabase-js';
import { DomainError } from '../../lib/errors.js';
import { normalizeEmail, phonesMatch } from '../../lib/crypto.js';

export type SafeCustomer = {
  id: string;
  tenant_id: string;
  customer_number: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
};

export type VerifyCustomerInput = {
  tenant_id: string;
  customer_number: string;
  phone?: string;
  email?: string;
};

function toSafe(row: Record<string, unknown>): SafeCustomer {
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    customer_number: String(row.customer_number),
    name: String(row.name),
    email: String(row.email),
    phone: row.phone == null ? null : String(row.phone),
    created_at: String(row.created_at),
  };
}

export class CustomerService {
  constructor(private readonly db: SupabaseClient) {}

  async verify(input: VerifyCustomerInput): Promise<SafeCustomer> {
    const customerNumber = input.customer_number?.trim().toUpperCase();
    if (!customerNumber) {
      throw new DomainError('CUSTOMER_NUMBER_REQUIRED', 'customer_number is required', 400);
    }
    if (!input.phone && !input.email) {
      throw new DomainError('CONTACT_REQUIRED', 'phone or email is required', 400);
    }

    const { data, error } = await this.db
      .from('store_customers')
      .select('id, tenant_id, customer_number, name, email, phone, created_at')
      .eq('tenant_id', input.tenant_id)
      .eq('customer_number', customerNumber)
      .maybeSingle();

    if (error) throw new DomainError('DB_ERROR', error.message, 500);
    if (!data) {
      throw new DomainError('CUSTOMER_NOT_FOUND', 'Customer verification failed', 404);
    }

    let ok = false;
    if (input.email) {
      ok = normalizeEmail(data.email) === normalizeEmail(input.email);
    }
    if (!ok && input.phone) {
      ok = phonesMatch(data.phone, input.phone);
    }

    if (!ok) {
      throw new DomainError('CUSTOMER_MISMATCH', 'Customer verification failed', 403);
    }

    return toSafe(data as Record<string, unknown>);
  }

  /** Storefront session gate: customer_id + email must match. Never returns password. */
  async getByIdForSession(
    tenantId: string,
    customerId: string,
    email: string
  ): Promise<SafeCustomer> {
    const { data, error } = await this.db
      .from('store_customers')
      .select('id, tenant_id, customer_number, name, email, phone, created_at')
      .eq('tenant_id', tenantId)
      .eq('id', customerId)
      .maybeSingle();

    if (error) throw new DomainError('DB_ERROR', error.message, 500);
    if (!data) throw new DomainError('CUSTOMER_NOT_FOUND', 'Customer not found', 404);
    if (normalizeEmail(data.email) !== normalizeEmail(email)) {
      throw new DomainError('CUSTOMER_MISMATCH', 'Invalid customer session', 403);
    }
    return toSafe(data as Record<string, unknown>);
  }

  async listAdmin(
    tenantId: string,
    opts: { search?: string } = {}
  ): Promise<(SafeCustomer & { order_count: number })[]> {
    const { data, error } = await this.db
      .from('store_customers')
      .select('id, tenant_id, customer_number, name, email, phone, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw new DomainError('DB_ERROR', error.message, 500);

    let rows = (data ?? []).map((r) => toSafe(r as Record<string, unknown>));
    const q = opts.search?.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (c) =>
          c.customer_number.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q)
      );
    }

    const ids = rows.map((r) => r.id);
    const counts = new Map<string, number>();
    if (ids.length) {
      const { data: orders } = await this.db
        .from('orders')
        .select('customer_id')
        .eq('tenant_id', tenantId)
        .in('customer_id', ids);
      for (const o of orders ?? []) {
        if (!o.customer_id) continue;
        counts.set(o.customer_id, (counts.get(o.customer_id) || 0) + 1);
      }
    }

    return rows.map((r) => ({ ...r, order_count: counts.get(r.id) || 0 }));
  }

  async getAdminDetail(tenantId: string, customerId: string) {
    const { data, error } = await this.db
      .from('store_customers')
      .select('id, tenant_id, customer_number, name, email, phone, created_at')
      .eq('tenant_id', tenantId)
      .eq('id', customerId)
      .maybeSingle();

    if (error) throw new DomainError('DB_ERROR', error.message, 500);
    if (!data) throw new DomainError('CUSTOMER_NOT_FOUND', 'Customer not found', 404);

    const { data: orders, error: oErr } = await this.db
      .from('orders')
      .select(
        'id, order_number, status, payment_status, fulfillment_status, total, currency, transaction_id, created_at'
      )
      .eq('tenant_id', tenantId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (oErr) throw new DomainError('DB_ERROR', oErr.message, 500);

    return {
      customer: toSafe(data as Record<string, unknown>),
      orders: orders ?? [],
    };
  }
}
