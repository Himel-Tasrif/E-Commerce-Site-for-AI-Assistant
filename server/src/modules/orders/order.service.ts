import type { SupabaseClient } from '@supabase/supabase-js';
import { DomainError } from '../../lib/errors.js';
import {
  allowedFulfillmentNext,
  canTransitionFulfillment,
  labelFulfillment,
} from '../../lib/labels.js';
import { CustomerService, type VerifyCustomerInput } from '../customers/customer.service.js';
import { SettingsService } from '../settings/settings.service.js';

export type SafeOrderSummary = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  total: number;
  currency: string;
  invoice_number: string | null;
  transaction_id: string | null;
  customer_number_snapshot: string | null;
  created_at: string;
  paid_at: string | null;
  product_summary?: string;
  source_channel?: string | null;
};

const ACTIVE_FULFILLMENT = new Set([
  'unfulfilled',
  'processing',
  'packed',
  'handed_to_courier',
  'in_transit',
  'out_for_delivery',
  'delivery_failed',
]);

function mapSummary(o: Record<string, unknown>, productSummary?: string): SafeOrderSummary {
  return {
    id: String(o.id),
    order_number: String(o.order_number),
    status: String(o.status),
    payment_status: String(o.payment_status),
    fulfillment_status: String(o.fulfillment_status ?? 'unfulfilled'),
    total: Number(o.total),
    currency: String(o.currency),
    invoice_number: o.invoice_number == null ? null : String(o.invoice_number),
    transaction_id: o.transaction_id == null ? null : String(o.transaction_id),
    customer_number_snapshot:
      o.customer_number_snapshot == null ? null : String(o.customer_number_snapshot),
    created_at: String(o.created_at),
    paid_at: o.paid_at == null ? null : String(o.paid_at),
    product_summary: productSummary,
    source_channel: o.source_channel == null ? null : String(o.source_channel),
  };
}

export class OrderService {
  constructor(private readonly db: SupabaseClient) {}

  async findForVerifiedCustomer(
    verify: VerifyCustomerInput,
    opts: { active_only?: boolean } = {}
  ): Promise<{ customer: Awaited<ReturnType<CustomerService['verify']>>; orders: SafeOrderSummary[] }> {
    const customers = new CustomerService(this.db);
    const customer = await customers.verify(verify);
    const orders = await this.listForCustomer(verify.tenant_id, customer.id, opts);
    return { customer, orders };
  }

  async listForCustomer(
    tenantId: string,
    customerId: string,
    opts: { active_only?: boolean } = {}
  ): Promise<SafeOrderSummary[]> {
    let query = this.db
      .from('orders')
      .select(
        'id, order_number, status, payment_status, fulfillment_status, total, currency, invoice_number, transaction_id, customer_number_snapshot, created_at, paid_at, source_channel, order_items(product_name, quantity, size)'
      )
      .eq('tenant_id', tenantId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (opts.active_only) {
      query = query.in('fulfillment_status', [...ACTIVE_FULFILLMENT]);
    }

    const { data, error } = await query;
    if (error) throw new DomainError('DB_ERROR', error.message, 500);

    return (data ?? []).map((o) => {
      const items = (o.order_items as { product_name: string; quantity: number; size: string | null }[]) || [];
      const summary = items
        .map((i) => `${i.product_name}${i.size ? ` (${i.size})` : ''} ×${i.quantity}`)
        .join(', ');
      return mapSummary(o as unknown as Record<string, unknown>, summary || undefined);
    });
  }

  async getDetailForCustomer(tenantId: string, orderId: string, customerId: string) {
    const detail = await this.getDetail(tenantId, orderId);
    if (detail.order.customer_id !== customerId) {
      throw new DomainError('ORDER_FORBIDDEN', 'Order not found for this customer', 404);
    }
    const settings = await new SettingsService(this.db).get(tenantId);
    return { ...detail, settings };
  }

  async getDetail(tenantId: string, orderId: string) {
    const { data, error } = await this.db
      .from('orders')
      .select(
        `id, tenant_id, customer_id, order_number, status, payment_status, fulfillment_status,
         payment_provider, transaction_id, phone, customer_name, customer_email, currency,
         subtotal, total, invoice_number, shipping_address, notes, paid_at, verified_at,
         created_at, customer_number_snapshot, checkout_session_id, source_channel,
         order_items (id, product_id, product_variant_id, product_name, size, quantity, unit_price, image_url, brand_snapshot, color_snapshot)`
      )
      .eq('tenant_id', tenantId)
      .eq('id', orderId)
      .maybeSingle();

    if (error) throw new DomainError('DB_ERROR', error.message, 500);
    if (!data) throw new DomainError('ORDER_NOT_FOUND', 'Order not found', 404);

    const { data: history, error: hErr } = await this.db
      .from('order_status_history')
      .select(
        'id, status_type, previous_status, new_status, note, changed_by_type, changed_by_id, created_at'
      )
      .eq('tenant_id', tenantId)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (hErr) throw new DomainError('DB_ERROR', hErr.message, 500);

    return {
      order: data,
      history: history ?? [],
      allowed_fulfillment_next: allowedFulfillmentNext(
        String(data.fulfillment_status || 'unfulfilled')
      ),
    };
  }

  async listAdmin(
    tenantId: string,
    filters: {
      order_number?: string;
      customer_number?: string;
      transaction_id?: string;
      phone?: string;
      email?: string;
      payment_status?: string;
      fulfillment_status?: string;
      source_channel?: string;
      date_from?: string;
      date_to?: string;
    } = {}
  ) {
    let query = this.db
      .from('orders')
      .select(
        `id, order_number, status, payment_status, fulfillment_status, total, currency,
         transaction_id, phone, customer_email, customer_name, customer_number_snapshot,
         source_channel, created_at, customer_id`
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (filters.order_number) query = query.ilike('order_number', `%${filters.order_number}%`);
    if (filters.customer_number) {
      query = query.ilike('customer_number_snapshot', `%${filters.customer_number}%`);
    }
    if (filters.transaction_id) {
      query = query.ilike('transaction_id', `%${filters.transaction_id}%`);
    }
    if (filters.phone) query = query.ilike('phone', `%${filters.phone}%`);
    if (filters.email) query = query.ilike('customer_email', `%${filters.email}%`);
    if (filters.payment_status) query = query.eq('payment_status', filters.payment_status);
    if (filters.fulfillment_status) {
      query = query.eq('fulfillment_status', filters.fulfillment_status);
    }
    if (filters.source_channel) query = query.eq('source_channel', filters.source_channel);
    if (filters.date_from) query = query.gte('created_at', filters.date_from);
    if (filters.date_to) query = query.lte('created_at', filters.date_to);

    const { data, error } = await query;
    if (error) throw new DomainError('DB_ERROR', error.message, 500);
    return data ?? [];
  }

  async updateFulfillment(
    tenantId: string,
    orderId: string,
    nextStatus: string,
    opts: { note?: string; changed_by_id?: string } = {}
  ) {
    const { data: order, error } = await this.db
      .from('orders')
      .select('id, fulfillment_status, status')
      .eq('tenant_id', tenantId)
      .eq('id', orderId)
      .maybeSingle();

    if (error) throw new DomainError('DB_ERROR', error.message, 500);
    if (!order) throw new DomainError('ORDER_NOT_FOUND', 'Order not found', 404);

    const prev = String(order.fulfillment_status || 'unfulfilled');
    if (!canTransitionFulfillment(prev, nextStatus)) {
      throw new DomainError(
        'INVALID_TRANSITION',
        `Cannot change fulfillment from ${labelFulfillment(prev)} to ${labelFulfillment(nextStatus)}`,
        409,
        { from: prev, to: nextStatus, allowed: allowedFulfillmentNext(prev) }
      );
    }

    const legacyStatus =
      nextStatus === 'delivered'
        ? 'fulfilled'
        : nextStatus === 'cancelled'
          ? 'cancelled'
          : order.status === 'paid' || order.status === 'verified'
            ? nextStatus === 'processing' || nextStatus === 'packed'
              ? 'verified'
              : order.status
            : order.status;

    const { error: uErr } = await this.db
      .from('orders')
      .update({
        fulfillment_status: nextStatus,
        status: legacyStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('tenant_id', tenantId);

    if (uErr) throw new DomainError('DB_ERROR', uErr.message, 500);

    const { error: hErr } = await this.db.from('order_status_history').insert({
      tenant_id: tenantId,
      order_id: orderId,
      status_type: 'fulfillment',
      previous_status: prev,
      new_status: nextStatus,
      note: opts.note || null,
      changed_by_type: 'admin',
      changed_by_id: opts.changed_by_id || 'admin',
    });

    if (hErr) throw new DomainError('DB_ERROR', hErr.message, 500);

    return this.getDetail(tenantId, orderId);
  }
}
