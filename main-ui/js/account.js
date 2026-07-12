import { getSession, loginPageUrl, redirectTo, setSession } from './auth.js';
import { mountHeaderAuth } from './header-auth.js';
import { fetchAccount } from './api/customers.js';
import { labelPayment, labelFulfillment } from './api/labels.js';
import { formatMoney } from './product-store.js';

mountHeaderAuth();

const session = getSession();
if (!session) redirectTo(loginPageUrl('account.html'));

const els = {
  loading: document.getElementById('account-loading'),
  content: document.getElementById('account-content'),
  error: document.getElementById('account-error'),
  help: document.getElementById('account-help'),
  where: document.getElementById('account-where'),
  orders: document.getElementById('acc-orders'),
};

async function load() {
  try {
    const data = await fetchAccount(session);
    const c = data.customer;
    setSession({ ...session, ...c });
    els.help.textContent = data.help?.customer_id || '';
    els.where.textContent = data.help?.where_to_find || '';
    document.getElementById('acc-name').textContent = c.name;
    document.getElementById('acc-number').textContent = c.customer_number;
    document.getElementById('acc-email').textContent = c.email;
    document.getElementById('acc-phone').textContent = c.phone || '—';
    document.getElementById('acc-created').textContent = c.created_at
      ? new Date(c.created_at).toLocaleDateString()
      : '—';

    const orders = data.recent_orders || [];
    if (!orders.length) {
      els.orders.innerHTML = `<p class="account-empty">No orders yet. <a href="shop.html">Start shopping</a></p>`;
    } else {
      els.orders.innerHTML = orders
        .map(
          (o) => `
        <a class="order-row" href="order.html?id=${encodeURIComponent(o.id)}">
          <div class="order-row-top">
            <strong>${o.order_number}</strong>
            <span>${formatMoney(o.total, o.currency)}</span>
          </div>
          <div class="order-meta">${new Date(o.created_at).toLocaleString()}${
            o.product_summary ? ` · ${o.product_summary}` : ''
          }</div>
          <div class="order-badges">
            <span class="pill pill-paid">${labelPayment(o.payment_status)}</span>
            <span class="pill">${labelFulfillment(o.fulfillment_status)}</span>
          </div>
        </a>`
        )
        .join('');
    }

    els.loading.hidden = true;
    els.content.hidden = false;
  } catch (err) {
    els.loading.hidden = true;
    els.error.hidden = false;
    els.error.textContent = err.message || 'Failed to load account';
  }
}

load();
