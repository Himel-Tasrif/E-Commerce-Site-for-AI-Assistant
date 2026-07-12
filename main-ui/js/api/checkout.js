import { commerceFetch, DEFAULT_TENANT_ID } from './client.js';

export async function createCheckoutSession({ items, customerId, customerEmail, idempotencyKey }) {
  return commerceFetch('/api/checkout-sessions', {
    method: 'POST',
    body: JSON.stringify({
      tenant_id: DEFAULT_TENANT_ID,
      items,
      customer_id: customerId,
      customer_email: customerEmail,
      source_channel: 'web',
      idempotency_key: idempotencyKey,
    }),
  });
}

export async function getCheckoutSession(token) {
  return commerceFetch(
    `/api/checkout-sessions/${encodeURIComponent(token)}?tenant_id=${DEFAULT_TENANT_ID}`
  );
}

export async function completeCheckoutSession(token, payment) {
  return commerceFetch(`/api/checkout-sessions/${encodeURIComponent(token)}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      tenant_id: DEFAULT_TENANT_ID,
      payment: {
        success: payment.success !== false,
        transaction_id: payment.transactionId || payment.transaction_id,
        provider: payment.provider || 'dummy',
      },
    }),
  });
}
