import { getSession, loginPageUrl, redirectTo } from './auth.js';
import { mountHeaderAuth } from './header-auth.js';
import { fetchMyOrder } from './api/customers.js';
import { labelPayment, labelFulfillment } from './api/labels.js';
import { formatMoney } from './product-store.js';

mountHeaderAuth();

const session = getSession();
if (!session) redirectTo(loginPageUrl('orders.html'));

const params = new URLSearchParams(window.location.search);
const orderId = params.get('id');
const els = {
  loading: document.getElementById('order-loading'),
  content: document.getElementById('order-content'),
  error: document.getElementById('order-error'),
};

function timelineLabel(h) {
  const type = h.status_type === 'payment' ? 'Payment' : h.status_type === 'fulfillment' ? 'Delivery' : 'Order';
  const next =
    h.status_type === 'fulfillment'
      ? labelFulfillment(h.new_status)
      : h.status_type === 'payment'
        ? labelPayment(h.new_status)
        : h.new_status;
  return `${type}: ${next}`;
}

async function load() {
  if (!orderId) {
    els.loading.hidden = true;
    els.error.hidden = false;
    els.error.textContent = 'Missing order id';
    return;
  }
  try {
    const data = await fetchMyOrder(session, orderId);
    const o = data.order;
    const items = o.order_items || [];
    const history = data.history || [];
    const settings = data.settings || {};
    const isDelivered = o.fulfillment_status === 'delivered';

    els.content.innerHTML = `
      <h1 class="account-title">${o.order_number}</h1>
      <p class="account-lead">Customer ID: <span class="mono">${o.customer_number_snapshot || data.customer.customer_number}</span></p>

      <section class="account-card">
        <h2>Items</h2>
        <div class="order-items-list">
          ${items
            .map(
              (i) => `
            <div class="order-item-row">
              <img src="${i.image_url || ''}" alt="">
              <div>
                <strong>${i.product_name}</strong>
                <div class="order-meta">
                  ${i.color_snapshot ? `Color ${i.color_snapshot} · ` : ''}${i.size ? `Size ${i.size} · ` : ''}Qty ${i.quantity}
                </div>
              </div>
              <span>${formatMoney(Number(i.unit_price) * Number(i.quantity), o.currency)}</span>
            </div>`
            )
            .join('')}
        </div>
      </section>

      <section class="account-card">
        <h2>Payment & delivery</h2>
        <dl class="account-dl">
          <div><dt>Payment</dt><dd>${labelPayment(o.payment_status)}</dd></div>
          <div><dt>Delivery</dt><dd>${labelFulfillment(o.fulfillment_status)}</dd></div>
          <div><dt>Transaction</dt><dd class="mono">${o.transaction_id || '—'}</dd></div>
          <div><dt>Invoice</dt><dd>${o.invoice_number || '—'}</dd></div>
          <div><dt>Total</dt><dd>${formatMoney(o.total, o.currency)}</dd></div>
        </dl>
        <p class="account-hint">${
          isDelivered
            ? 'Your order has been delivered.'
            : settings.estimated_delivery_message ||
              'Your order is expected to be delivered within 48 hours.'
        }</p>
        <p class="account-hint">${
          settings.support_message || "I'm available 24/7 if you need help or want an update."
        }</p>
      </section>

      <section class="account-card">
        <h2>Status timeline</h2>
        ${
          history.length
            ? `<ul class="timeline">${history
                .map(
                  (h) => `
              <li>
                <strong>${timelineLabel(h)}</strong>
                <time>${new Date(h.created_at).toLocaleString()}</time>
                ${h.note ? `<div class="order-meta">${h.note}</div>` : ''}
              </li>`
                )
                .join('')}</ul>`
            : `<p class="account-empty">No status history yet.</p>`
        }
      </section>
    `;
    els.loading.hidden = true;
    els.content.hidden = false;
  } catch (err) {
    els.loading.hidden = true;
    els.error.hidden = false;
    els.error.textContent = err.message || 'Failed to load order';
  }
}

load();
