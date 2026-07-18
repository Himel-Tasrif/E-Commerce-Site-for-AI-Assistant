import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { getSupabase } from '../../lib/supabase.js';
import { CustomerService } from '../customers/customer.service.js';
import { OrderService } from '../orders/order.service.js';
import { CheckoutService } from '../checkout/checkout.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { SettingsService } from '../settings/settings.service.js';

/**
 * R&D admin routes — service-role backed, no browser secrets.
 * Tighten with real admin auth before production.
 */
export async function adminRoutes(app: FastifyInstance): Promise<void> {
  const tenant = (q: { tenant_id?: string }) => q.tenant_id || env.defaultTenantId;

  app.get('/api/admin/customers', async (request) => {
    const q = request.query as { tenant_id?: string; search?: string };
    const rows = await new CustomerService(getSupabase()).listAdmin(tenant(q), {
      search: q.search,
    });
    return { ok: true, customers: rows };
  });

  app.get('/api/admin/customers/:id', async (request) => {
    const { id } = request.params as { id: string };
    const q = request.query as { tenant_id?: string };
    const detail = await new CustomerService(getSupabase()).getAdminDetail(tenant(q), id);
    return { ok: true, ...detail };
  });

  app.get('/api/admin/orders', async (request) => {
    const q = request.query as Record<string, string | undefined>;
    const orders = await new OrderService(getSupabase()).listAdmin(tenant(q), {
      order_number: q.order_number,
      customer_number: q.customer_number,
      transaction_id: q.transaction_id,
      phone: q.phone,
      email: q.email,
      payment_status: q.payment_status,
      fulfillment_status: q.fulfillment_status,
      source_channel: q.source_channel,
      date_from: q.date_from,
      date_to: q.date_to,
    });
    return { ok: true, orders };
  });

  app.get('/api/admin/orders/:id', async (request) => {
    const { id } = request.params as { id: string };
    const q = request.query as { tenant_id?: string };
    const detail = await new OrderService(getSupabase()).getDetail(tenant(q), id);
    return { ok: true, ...detail };
  });

  app.patch('/api/admin/orders/:id/fulfillment', async (request) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        tenant_id: z.string().uuid().optional(),
        fulfillment_status: z.string().min(1),
        note: z.string().optional(),
      })
      .parse(request.body);
    const detail = await new OrderService(getSupabase()).updateFulfillment(
      body.tenant_id || env.defaultTenantId,
      id,
      body.fulfillment_status,
      { note: body.note }
    );
    return { ok: true, ...detail };
  });

  app.get('/api/admin/reservations', async (request) => {
    const q = request.query as {
      tenant_id?: string;
      status?: string;
      customer_number?: string;
      product?: string;
      expiring_soon?: string;
    };
    const reservations = await new InventoryService(getSupabase()).listReservations(tenant(q), {
      status: q.status,
      customer_number: q.customer_number,
      product: q.product,
      expiring_soon: q.expiring_soon === '1' || q.expiring_soon === 'true',
    });
    return { ok: true, reservations };
  });

  app.get('/api/admin/checkout-sessions', async (request) => {
    const q = request.query as {
      tenant_id?: string;
      status?: string;
      source_channel?: string;
      customer_number?: string;
    };
    const sessions = await new CheckoutService(getSupabase()).listAdmin(tenant(q), {
      status: q.status,
      source_channel: q.source_channel,
      customer_number: q.customer_number,
    });
    return { ok: true, sessions };
  });

  app.get('/api/admin/checkout-sessions/:id', async (request) => {
    const { id } = request.params as { id: string };
    const q = request.query as { tenant_id?: string };
    const session = await new CheckoutService(getSupabase()).getAdminDetail(tenant(q), id);
    return { ok: true, session };
  });

  app.get('/api/admin/settings', async (request) => {
    const q = request.query as { tenant_id?: string };
    const settings = await new SettingsService(getSupabase()).get(tenant(q));
    return { ok: true, settings };
  });

  app.put('/api/admin/settings', async (request) => {
    const body = z
      .object({
        tenant_id: z.string().uuid().optional(),
        estimated_delivery_message: z.string().optional(),
        support_message: z.string().optional(),
        reservation_ttl_minutes: z.number().int().positive().optional(),
      })
      .parse(request.body);
    const settings = await new SettingsService(getSupabase()).upsert(
      body.tenant_id || env.defaultTenantId,
      body
    );
    return { ok: true, settings };
  });
}
