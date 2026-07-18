import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { DomainError } from '../../lib/errors.js';
import { getSupabase } from '../../lib/supabase.js';
import { CustomerService } from '../customers/customer.service.js';
import { OrderService } from '../orders/order.service.js';
import { CheckoutService } from '../checkout/checkout.service.js';

const sessionGate = z.object({
  tenant_id: z.string().uuid().optional(),
  customer_id: z.string().uuid(),
  email: z.string().email(),
});

/**
 * Storefront-facing routes (no INTERNAL_API_SECRET).
 * Gated by customer_id + email matching the logged-in demo session.
 */
export async function storefrontRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/storefront/account', async (request) => {
    const q = sessionGate.parse(request.query);
    const tenantId = q.tenant_id || env.defaultTenantId;
    const customers = new CustomerService(getSupabase());
    const customer = await customers.getByIdForSession(tenantId, q.customer_id, q.email);
    const orders = await new OrderService(getSupabase()).listForCustomer(tenantId, customer.id, {
      active_only: false,
    });
    return {
      ok: true,
      customer,
      recent_orders: orders.slice(0, 5),
      help: {
        customer_id:
          'Your Customer ID is used when contacting support or the shopping assistant.',
        where_to_find:
          'You can find your Customer ID under My Account or at the top of the My Orders page.',
      },
    };
  });

  app.get('/api/storefront/orders', async (request) => {
    const q = sessionGate.parse(request.query);
    const tenantId = q.tenant_id || env.defaultTenantId;
    const customer = await new CustomerService(getSupabase()).getByIdForSession(
      tenantId,
      q.customer_id,
      q.email
    );
    const orders = await new OrderService(getSupabase()).listForCustomer(tenantId, customer.id);
    return { ok: true, customer, orders };
  });

  app.get('/api/storefront/orders/:id', async (request) => {
    const { id } = request.params as { id: string };
    const q = sessionGate.parse(request.query);
    const tenantId = q.tenant_id || env.defaultTenantId;
    const customer = await new CustomerService(getSupabase()).getByIdForSession(
      tenantId,
      q.customer_id,
      q.email
    );
    const detail = await new OrderService(getSupabase()).getDetailForCustomer(
      tenantId,
      id,
      customer.id
    );
    return { ok: true, customer, ...detail };
  });

  /** Public cart checkout — creates reservation session (opaque token returned once). */
  app.post('/api/checkout-sessions', async (request) => {
    const body = z
      .object({
        tenant_id: z.string().uuid().optional(),
        items: z
          .array(
            z.object({
              product_variant_id: z.string().uuid(),
              quantity: z.number().int().positive(),
            })
          )
          .min(1),
        customer_id: z.string().uuid().optional(),
        customer_email: z.string().email().optional(),
        source_channel: z
          .enum(['web', 'whatsapp', 'messenger', 'instagram', 'telegram', 'ai', 'other'])
          .optional()
          .default('web'),
        idempotency_key: z.string().optional(),
      })
      .parse(request.body);

    const tenantId = body.tenant_id || env.defaultTenantId;

    if (body.customer_id) {
      if (!body.customer_email) {
        throw new DomainError(
          'EMAIL_REQUIRED',
          'customer_email is required with customer_id',
          400
        );
      }
      await new CustomerService(getSupabase()).getByIdForSession(
        tenantId,
        body.customer_id,
        body.customer_email
      );
    }

    const result = await new CheckoutService(getSupabase()).createSession({
      tenant_id: tenantId,
      items: body.items,
      customer_id: body.customer_id,
      source_channel: body.source_channel,
      idempotency_key: body.idempotency_key,
    });

    return { ok: true, ...result };
  });
}
