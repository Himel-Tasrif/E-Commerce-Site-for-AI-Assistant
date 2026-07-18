import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';
import { DomainError, mapRpcError } from '../../lib/errors.js';
import { generateOpaqueToken, sha256Hex } from '../../lib/crypto.js';
import { PaymentService, type DummyPaymentInput } from '../payments/payment.service.js';
import { SettingsService } from '../settings/settings.service.js';

export type CheckoutItemInput = {
  product_variant_id: string;
  quantity: number;
};

export type CreateCheckoutSessionInput = {
  tenant_id: string;
  items: CheckoutItemInput[];
  customer_id?: string;
  conversation_id?: string;
  source_channel?: string;
  idempotency_key?: string;
};

export class CheckoutService {
  private readonly payments = new PaymentService();
  private readonly settings: SettingsService;

  constructor(private readonly db: SupabaseClient) {
    this.settings = new SettingsService(db);
  }

  async createSession(input: CreateCheckoutSessionInput) {
    if (!input.items?.length) {
      throw new DomainError('EMPTY_ITEMS', 'At least one item is required', 400);
    }
    for (const item of input.items) {
      if (!item.product_variant_id || !Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new DomainError('INVALID_ITEM', 'Each item needs product_variant_id and positive quantity', 400);
      }
    }

    const token = generateOpaqueToken();
    const tokenHash = sha256Hex(token);

    const { data, error } = await this.db.rpc('create_checkout_session_with_reservation', {
      p_tenant_id: input.tenant_id,
      p_items: input.items.map((i) => ({
        product_variant_id: i.product_variant_id,
        quantity: i.quantity,
      })),
      p_token_hash: tokenHash,
      p_customer_id: input.customer_id ?? null,
      p_conversation_id: input.conversation_id ?? null,
      p_source_channel: input.source_channel ?? 'web',
      p_idempotency_key: input.idempotency_key ?? null,
      p_currency: null,
    });

    if (error) throw mapRpcError(error);

    const result = data as Record<string, unknown>;
    const sessionId = String(result.checkout_session_id);
    const checkoutUrl = `${env.storefrontUrl}/checkout.html?session=${encodeURIComponent(token)}`;

    // If idempotent hit, we cannot re-issue the original token — return session meta only
    if (result.idempotent === true) {
      const session = await this.getSessionById(input.tenant_id, sessionId);
      return {
        idempotent: true,
        checkout_session_id: sessionId,
        checkout_url: null as string | null,
        token: null as string | null,
        ...session,
      };
    }

    return {
      idempotent: false,
      checkout_session_id: sessionId,
      checkout_url: checkoutUrl,
      token,
      expires_at: result.expires_at,
      subtotal: Number(result.subtotal),
      total: Number(result.total),
      currency: String(result.currency),
    };
  }

  async getByToken(tenantId: string, token: string) {
    const tokenHash = sha256Hex(token);
    const { data: session, error } = await this.db
      .from('checkout_sessions')
      .select(
        'id, tenant_id, status, currency, subtotal, total, expires_at, completed_at, order_id, source_channel, customer_id, created_at'
      )
      .eq('tenant_id', tenantId)
      .eq('public_token_hash', tokenHash)
      .maybeSingle();

    if (error) throw new DomainError('DB_ERROR', error.message, 500);
    if (!session) throw new DomainError('SESSION_NOT_FOUND', 'Checkout session not found', 404);

    const { data: items, error: itemsErr } = await this.db
      .from('checkout_session_items')
      .select(
        'id, product_id, product_variant_id, product_name_snapshot, brand_snapshot, color_snapshot, size_snapshot, quantity, unit_price_snapshot, image_url_snapshot'
      )
      .eq('checkout_session_id', session.id)
      .eq('tenant_id', tenantId);

    if (itemsErr) throw new DomainError('DB_ERROR', itemsErr.message, 500);

    return {
      id: session.id,
      status: session.status,
      currency: session.currency,
      subtotal: Number(session.subtotal),
      total: Number(session.total),
      expires_at: session.expires_at,
      completed_at: session.completed_at,
      order_id: session.order_id,
      source_channel: session.source_channel,
      customer_id: session.customer_id,
      created_at: session.created_at,
      items: (items ?? []).map((it) => ({
        product_id: it.product_id,
        product_variant_id: it.product_variant_id,
        name: it.product_name_snapshot,
        brand: it.brand_snapshot,
        color: it.color_snapshot,
        size: it.size_snapshot,
        quantity: it.quantity,
        unit_price: Number(it.unit_price_snapshot),
        image_url: it.image_url_snapshot,
        line_total: Number(it.unit_price_snapshot) * Number(it.quantity),
      })),
    };
  }

  async complete(tenantId: string, token: string, paymentInput: DummyPaymentInput) {
    const payment = this.payments.processDummy(paymentInput);
    const tokenHash = sha256Hex(token);

    const { data, error } = await this.db.rpc('complete_checkout_session', {
      p_tenant_id: tenantId,
      p_token_hash: tokenHash,
      p_payment: {
        success: payment.success,
        transaction_id: payment.transaction_id,
        provider: payment.provider,
      },
      p_completion_idempotency_key: payment.transaction_id,
    });

    if (error) throw mapRpcError(error);

    const result = data as Record<string, unknown>;
    const settings = await this.settings.get(tenantId);

    return {
      idempotent: Boolean(result.idempotent),
      order_id: result.order_id,
      order_number: result.order_number,
      invoice_number: result.invoice_number,
      transaction_id: result.transaction_id,
      customer_number: result.customer_number,
      payment_status: result.payment_status,
      fulfillment_status: result.fulfillment_status,
      status: result.status,
      total: Number(result.total),
      currency: result.currency,
      estimated_delivery_message:
        result.estimated_delivery_message || settings.estimated_delivery_message,
      support_message: result.support_message || settings.support_message,
    };
  }

  private async getSessionById(tenantId: string, sessionId: string) {
    const { data, error } = await this.db
      .from('checkout_sessions')
      .select('status, currency, subtotal, total, expires_at')
      .eq('tenant_id', tenantId)
      .eq('id', sessionId)
      .maybeSingle();
    if (error || !data) {
      return { status: 'unknown', currency: 'BDT', subtotal: 0, total: 0, expires_at: null };
    }
    return {
      status: data.status,
      currency: data.currency,
      subtotal: Number(data.subtotal),
      total: Number(data.total),
      expires_at: data.expires_at,
    };
  }

  async listAdmin(
    tenantId: string,
    filters: { status?: string; source_channel?: string; customer_number?: string } = {}
  ) {
    let query = this.db
      .from('checkout_sessions')
      .select(
        `id, status, currency, subtotal, total, expires_at, completed_at, created_at,
         source_channel, customer_id, order_id, conversation_id,
         store_customers (customer_number, name),
         orders (order_number),
         checkout_session_items (product_name_snapshot, size_snapshot, quantity, unit_price_snapshot, brand_snapshot, color_snapshot, image_url_snapshot),
         stock_reservations (id, status, quantity, expires_at)`
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.source_channel) query = query.eq('source_channel', filters.source_channel);

    const { data, error } = await query;
    if (error) throw new DomainError('DB_ERROR', error.message, 500);

    let rows = data ?? [];
    if (filters.customer_number) {
      const q = filters.customer_number.trim().toUpperCase();
      rows = rows.filter((r) => {
        const c = r.store_customers as { customer_number?: string } | null;
        return (c?.customer_number || '').includes(q);
      });
    }

    return rows.map((r) => {
      const customer = r.store_customers as { customer_number?: string; name?: string } | null;
      const order = r.orders as { order_number?: string } | null;
      const items = (r.checkout_session_items as Record<string, unknown>[]) || [];
      const reservations = (r.stock_reservations as { status: string }[]) || [];
      return {
        id: r.id,
        status: r.status,
        customer_number: customer?.customer_number ?? null,
        customer_name: customer?.name ?? null,
        source_channel: r.source_channel,
        currency: r.currency,
        subtotal: Number(r.subtotal),
        total: Number(r.total),
        created_at: r.created_at,
        expires_at: r.expires_at,
        completed_at: r.completed_at,
        order_number: order?.order_number ?? null,
        order_id: r.order_id,
        items,
        reservation_statuses: reservations.map((x) => x.status),
        products_summary: items
          .map(
            (i) =>
              `${i.product_name_snapshot}${i.size_snapshot ? ` (${i.size_snapshot})` : ''} ×${i.quantity}`
          )
          .join(', '),
      };
    });
  }

  async getAdminDetail(tenantId: string, sessionId: string) {
    const rows = await this.listAdmin(tenantId, {});
    const found = rows.find((r) => r.id === sessionId);
    if (!found) throw new DomainError('SESSION_NOT_FOUND', 'Checkout session not found', 404);
    return found;
  }
}
