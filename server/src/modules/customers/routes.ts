import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getSupabase } from '../../lib/supabase.js';
import { requireInternalSecret } from '../../middleware/internalAuth.js';
import { CustomerService } from './customer.service.js';

const verifySchema = z.object({
  tenant_id: z.string().uuid(),
  customer_number: z.string().min(3),
  phone: z.string().optional(),
  email: z.string().optional(),
});

export async function customerRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/api/internal/customers/verify',
    { preHandler: requireInternalSecret },
    async (request) => {
      const body = verifySchema.parse(request.body);
      const service = new CustomerService(getSupabase());
      const customer = await service.verify(body);
      return { ok: true, customer };
    }
  );
}
