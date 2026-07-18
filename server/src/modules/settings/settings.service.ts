import type { SupabaseClient } from '@supabase/supabase-js';
import { DomainError } from '../../lib/errors.js';

export type StoreSettings = {
  tenant_id: string;
  estimated_delivery_message: string;
  support_message: string;
  reservation_ttl_minutes: number;
};

export class SettingsService {
  constructor(private readonly db: SupabaseClient) {}

  async get(tenantId: string): Promise<StoreSettings> {
    const { data, error } = await this.db
      .from('store_settings')
      .select(
        'tenant_id, estimated_delivery_message, support_message, reservation_ttl_minutes'
      )
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw new DomainError('DB_ERROR', error.message, 500);

    if (!data) {
      return {
        tenant_id: tenantId,
        estimated_delivery_message: 'Your order is expected to be delivered within 48 hours.',
        support_message: "I'm available 24/7 if you need help or want an update.",
        reservation_ttl_minutes: 15,
      };
    }

    return data as StoreSettings;
  }

  async upsert(
    tenantId: string,
    patch: {
      estimated_delivery_message?: string;
      support_message?: string;
      reservation_ttl_minutes?: number;
    }
  ): Promise<StoreSettings> {
    const current = await this.get(tenantId);
    const next = {
      tenant_id: tenantId,
      estimated_delivery_message:
        patch.estimated_delivery_message?.trim() || current.estimated_delivery_message,
      support_message: patch.support_message?.trim() || current.support_message,
      reservation_ttl_minutes:
        patch.reservation_ttl_minutes != null
          ? Number(patch.reservation_ttl_minutes)
          : current.reservation_ttl_minutes,
    };

    if (!Number.isFinite(next.reservation_ttl_minutes) || next.reservation_ttl_minutes <= 0) {
      throw new DomainError('INVALID_TTL', 'reservation_ttl_minutes must be a positive number', 400);
    }

    const { data, error } = await this.db
      .from('store_settings')
      .upsert(
        {
          ...next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id' }
      )
      .select(
        'tenant_id, estimated_delivery_message, support_message, reservation_ttl_minutes'
      )
      .single();

    if (error) throw new DomainError('DB_ERROR', error.message, 500);
    return data as StoreSettings;
  }
}
