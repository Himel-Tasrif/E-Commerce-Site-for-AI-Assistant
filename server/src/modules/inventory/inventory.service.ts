import type { SupabaseClient } from '@supabase/supabase-js';
import { DomainError, mapRpcError } from '../../lib/errors.js';

export class InventoryService {
  constructor(private readonly db: SupabaseClient) {}

  async releaseExpired(tenantId?: string): Promise<number> {
    const { data, error } = await this.db.rpc('release_expired_reservations', {
      p_tenant_id: tenantId ?? null,
    });
    if (error) throw mapRpcError(error);
    return Number(data ?? 0);
  }

  async getVariantStock(tenantId: string, variantId: string) {
    const { data, error } = await this.db
      .from('product_variants')
      .select('id, stock_count, product_id, products!inner(tenant_id, status)')
      .eq('id', variantId)
      .eq('products.tenant_id', tenantId)
      .maybeSingle();

    if (error) throw new DomainError('DB_ERROR', error.message, 500);
    if (!data) throw new DomainError('VARIANT_NOT_FOUND', 'Variant not found', 404);

    const { data: reserved } = await this.db
      .from('stock_reservations')
      .select('quantity')
      .eq('product_variant_id', variantId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());

    const reservedQty = (reserved ?? []).reduce((s, r) => s + Number(r.quantity), 0);
    return {
      variant_id: variantId,
      stock_count: Number(data.stock_count),
      reserved: reservedQty,
      available: Number(data.stock_count) - reservedQty,
    };
  }

  async listReservations(
    tenantId: string,
    filters: {
      status?: string;
      customer_number?: string;
      product?: string;
      expiring_soon?: boolean;
    } = {}
  ) {
    await this.releaseExpired(tenantId);

    let query = this.db
      .from('stock_reservations')
      .select(
        `id, tenant_id, checkout_session_id, product_variant_id, quantity, status, expires_at, released_at, created_at,
         product_variants (id, size, stock_count, product_id,
           products (id, name, brand, main_image_url, tenant_id)
         ),
         checkout_sessions (id, status, customer_id, expires_at,
           store_customers (customer_number, name)
         )`
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(300);

    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw new DomainError('DB_ERROR', error.message, 500);

    const now = Date.now();
    let rows = (data ?? []).map((r) => {
      const variantRaw = r.product_variants as unknown;
      const variant = (Array.isArray(variantRaw) ? variantRaw[0] : variantRaw) as {
        id: string;
        size: string;
        stock_count: number;
        products: unknown;
      } | null;
      const productRaw = variant?.products;
      const product = (Array.isArray(productRaw) ? productRaw[0] : productRaw) as {
        id: string;
        name: string;
        brand: string;
        main_image_url: string | null;
      } | null;
      const sessionRaw = r.checkout_sessions as unknown;
      const session = (Array.isArray(sessionRaw) ? sessionRaw[0] : sessionRaw) as {
        id: string;
        status: string;
        store_customers: unknown;
      } | null;
      const custRaw = session?.store_customers;
      const customer = (Array.isArray(custRaw) ? custRaw[0] : custRaw) as {
        customer_number: string;
        name: string;
      } | null;
      const stock = Number(variant?.stock_count ?? 0);
      const qty = Number(r.quantity);
      const expiresAt = new Date(r.expires_at).getTime();
      const remainingMs = Math.max(0, expiresAt - now);

      return {
        id: r.id,
        checkout_session_id: r.checkout_session_id,
        product_variant_id: r.product_variant_id,
        product_id: product?.id ?? null,
        product_name: product?.name ?? 'Unknown',
        brand: product?.brand ?? null,
        image_url: product?.main_image_url ?? null,
        size: variant?.size ?? null,
        physical_stock: stock,
        reserved_quantity: qty,
        effective_available: Math.max(0, stock - (r.status === 'active' ? qty : 0)),
        status: r.status,
        expires_at: r.expires_at,
        remaining_ms: r.status === 'active' ? remainingMs : 0,
        customer_number: customer?.customer_number ?? null,
        customer_name: customer?.name ?? null,
        session_status: session?.status ?? null,
        created_at: r.created_at,
      };
    });

    if (filters.customer_number) {
      const q = filters.customer_number.trim().toUpperCase();
      rows = rows.filter((r) => (r.customer_number || '').includes(q));
    }
    if (filters.product) {
      const q = filters.product.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.product_name.toLowerCase().includes(q) ||
          (r.brand || '').toLowerCase().includes(q) ||
          (r.size || '').toLowerCase().includes(q)
      );
    }
    if (filters.expiring_soon) {
      const hour = 60 * 60 * 1000;
      rows = rows.filter((r) => r.status === 'active' && r.remaining_ms > 0 && r.remaining_ms <= hour);
    }

    // Recompute effective available using all active reservations per variant
    const activeByVariant = new Map<string, number>();
    for (const r of rows) {
      if (r.status === 'active') {
        activeByVariant.set(
          r.product_variant_id,
          (activeByVariant.get(r.product_variant_id) || 0) + r.reserved_quantity
        );
      }
    }
    return rows.map((r) => ({
      ...r,
      active_reserved_total: activeByVariant.get(r.product_variant_id) || 0,
      effective_available: Math.max(
        0,
        r.physical_stock - (activeByVariant.get(r.product_variant_id) || 0)
      ),
    }));
  }
}
