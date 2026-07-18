import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { getSupabase } from '../../lib/supabase.js';
import { SettingsService } from './settings.service.js';

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/settings', async (request) => {
    const q = request.query as { tenant_id?: string };
    const tenantId = q.tenant_id || env.defaultTenantId;
    const service = new SettingsService(getSupabase());
    const settings = await service.get(tenantId);
    return { ok: true, settings };
  });

  app.put('/api/settings', async (request) => {
    const body = z
      .object({
        tenant_id: z.string().uuid().optional(),
        estimated_delivery_message: z.string().optional(),
        support_message: z.string().optional(),
        reservation_ttl_minutes: z.number().int().positive().optional(),
      })
      .parse(request.body ?? {});
    const settings = await new SettingsService(getSupabase()).upsert(
      body.tenant_id || env.defaultTenantId,
      body
    );
    return { ok: true, settings };
  });
}
