/**
 * Legacy browser order insert — DO NOT use for checkout.
 * Checkout creates sessions and completes via the commerce server (js/api/checkout.js).
 * Kept only for reference / emergency tooling.
 */
import { requireSupabase, DEFAULT_TENANT_ID, isSupabaseConfigured } from './supabase-client.js';

function orderNumber() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `STR-${n}`;
}

function linkToken() {
  return `pay_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

/** @deprecated Use createCheckoutSession + completeCheckoutSession instead */
export async function createPaidOrder(payload) {
  console.warn(
    'createPaidOrder is deprecated. Checkout must use the commerce server session APIs.'
  );
  if (!isSupabaseConfigured) throw new Error('Database not configured');

  const { customer, items, currency = 'BDT', phone, shippingAddress, payment } = payload;
  const subtotal = items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const total = subtotal;
  const num = orderNumber();
  const token = linkToken();
  const invoice = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${num.slice(-4)}`;

  const { data: order, error } = await requireSupabase()
    .from('orders')
    .insert({
      tenant_id: DEFAULT_TENANT_ID,
      customer_id: customer.id,
      order_number: num,
      status: 'paid',
      payment_status: 'paid',
      payment_provider: payment.provider || 'dummy',
      transaction_id: payment.transactionId,
      phone,
      customer_name: customer.name,
      customer_email: customer.email,
      currency,
      subtotal,
      total,
      payment_link_token: token,
      invoice_number: invoice,
      shipping_address: shippingAddress || null,
      paid_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const lines = items.map((i) => ({
    order_id: order.id,
    product_id: typeof i.id === 'string' && i.id.length > 20 ? i.id : null,
    product_name: i.name,
    size: i.size || null,
    quantity: i.quantity,
    unit_price: i.price,
    image_url: i.image || null,
  }));

  const { error: itemsErr } = await requireSupabase().from('order_items').insert(lines);
  if (itemsErr) throw new Error(itemsErr.message);

  return order;
}

export async function fetchOrderByPaymentToken(token) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await requireSupabase()
    .from('orders')
    .select('*, order_items(*)')
    .eq('payment_link_token', token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
