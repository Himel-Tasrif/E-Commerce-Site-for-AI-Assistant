import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getSupabase } from '../../lib/supabase.js';
import { requireInternalSecret } from '../../middleware/internalAuth.js';
import { OrderService } from './order.service.js';

const findSchema = z.object({
  tenant_id: z.string().uuid(),
  customer_number: z.string().min(3),
  phone: z.string().optional(),
  email: z.string().optional(),
  active_only: z.boolean().optional().default(false),
});

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/api/internal/orders/find',
    { preHandler: requireInternalSecret },
    async (request) => {
      const body = findSchema.parse(request.body);
      const service = new OrderService(getSupabase());
      const result = await service.findForVerifiedCustomer(
        {
          tenant_id: body.tenant_id,
          customer_number: body.customer_number,
          phone: body.phone,
          email: body.email,
        },
        { active_only: body.active_only }
      );
      return { ok: true, ...result };
    }
  );
}
