import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { getSupabase } from '../../lib/supabase.js';
import { requireInternalSecret } from '../../middleware/internalAuth.js';
import { CheckoutService } from './checkout.service.js';

const createSchema = z.object({
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
  conversation_id: z.string().optional(),
  source_channel: z.string().optional(),
  idempotency_key: z.string().optional(),
});

const completeSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  payment: z
    .object({
      success: z.boolean().optional(),
      transaction_id: z.string().optional(),
      provider: z.string().optional(),
      card_number: z.unknown().optional(),
      cvc: z.unknown().optional(),
      cvv: z.unknown().optional(),
    })
    .optional()
    .default({}),
});

export async function checkoutRoutes(app: FastifyInstance): Promise<void> {
  const service = () => new CheckoutService(getSupabase());

  app.post(
    '/api/internal/checkout-sessions',
    { preHandler: requireInternalSecret },
    async (request) => {
      const body = createSchema.parse(request.body);
      const result = await service().createSession({
        tenant_id: body.tenant_id || env.defaultTenantId,
        items: body.items,
        customer_id: body.customer_id,
        conversation_id: body.conversation_id,
        source_channel: body.source_channel,
        idempotency_key: body.idempotency_key,
      });
      return { ok: true, ...result };
    }
  );

  app.get('/api/checkout-sessions/:token', async (request) => {
    const { token } = request.params as { token: string };
    const q = request.query as { tenant_id?: string };
    const tenantId = q.tenant_id || env.defaultTenantId;
    const session = await service().getByToken(tenantId, token);
    return { ok: true, session };
  });

  app.post('/api/checkout-sessions/:token/complete', async (request) => {
    const { token } = request.params as { token: string };
    const body = completeSchema.parse(request.body ?? {});
    const tenantId = body.tenant_id || env.defaultTenantId;
    const result = await service().complete(tenantId, token, body.payment);
    return { ok: true, ...result };
  });
}
