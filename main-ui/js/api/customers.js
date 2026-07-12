import { commerceFetch, sessionQuery, DEFAULT_TENANT_ID } from './client.js';

export async function fetchAccount(session) {
  return commerceFetch(`/api/storefront/account?${sessionQuery(session)}`);
}

export async function fetchMyOrders(session) {
  return commerceFetch(`/api/storefront/orders?${sessionQuery(session)}`);
}

export async function fetchMyOrder(session, orderId) {
  return commerceFetch(`/api/storefront/orders/${orderId}?${sessionQuery(session)}`);
}

export async function fetchStoreSettings() {
  return commerceFetch(`/api/settings?tenant_id=${DEFAULT_TENANT_ID}`);
}
