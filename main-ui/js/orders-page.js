import { getSession, loginPageUrl, redirectTo, setSession } from './auth.js';
import { mountHeaderAuth } from './header-auth.js';
import { fetchMyOrders } from './api/customers.js';
import { labelPayment, labelFulfillment } from './api/labels.js';
import { formatMoney } from './product-store.js';

mountHeaderAuth();

const session = getSession();
if (!session) redirectTo(loginPageUrl('orders.html'));

const els = {
  loading: document.getElementById('orders-loading'),
  list: document.getElementById('orders-list'),
  error: document.getElementById('orders-error'),
  banner: document.getElementById('orders-cus-banner'),
};

async function load() {
  try {
    const data = await fetchMyOrders(session);
    setSession({ ...session, ...data.customer });
    els.banner.innerHTML = `Customer ID: <span class="mono">${data.customer.customer_number}</span> — used when contacting support or the shopping assistant.`;

    const orders = data.orders || [];
    if (!orders.length) {
      els.list.innerHTML = `<p class="account-empty">You have no orders yet. <a href="shop.html">Shop now</a></p>`;
    } else {
      els.list.innerHTML = orders
        .map(
          (o) => `
        <a class="order-row" href="order.html?id=${encodeURIComponent(o.id)}">
          <div class="order-row-top">
            <strong>${o.order_number}</strong>
            <span>${formatMoney(o.total, o.currency)}</span>
          </div>
          <div class="order-meta">
            ${new Date(o.created_at).toLocaleString()}
            ${o.product_summary ? `<br>${o.product_summary}` : ''}
            ${o.transaction_id ? `<br>TXN: ${o.transaction_id}` : ''}
          </div>
          <div class="order-badges">
            <span class="pill pill-paid">${labelPayment(o.payment_status)}</span>
            <span class="pill ${o.fulfillment_status === 'delivered' ? 'pill-delivered' : ''}">${labelFulfillment(o.fulfillment_status)}</span>
          </div>
        </a>`
        )
        .join('');
    }
    els.loading.hidden = true;
    els.list.hidden = false;
  } catch (err) {
    els.loading.hidden = true;
    els.error.hidden = false;
    els.error.textContent = err.message || 'Failed to load orders';
  }
}

load();
