/**
 * Checkout — cart mode or token session mode (?session=).
 * Prices and stock come from the trusted server; browser never inserts orders.
 */
import { Cart } from './cart.js';
import { getSession, setSession, loginPageUrl, redirectTo } from './auth.js';
import { paymentGateway } from './payment/gateway.js';
import { formatMoney } from './product-store.js';
import { mountHeaderAuth } from './header-auth.js';
import {
  createCheckoutSession,
  getCheckoutSession,
  completeCheckoutSession,
} from './api/checkout.js';
import { formatRemaining, labelFulfillment, labelPayment } from './api/labels.js';
import { requireSupabase, isSupabaseConfigured, DEFAULT_TENANT_ID } from './supabase-client.js';
import { CommerceApiError } from './api/client.js';

mountHeaderAuth();

const params = new URLSearchParams(window.location.search);
const tokenFromUrl = params.get('session');
const isTokenMode = Boolean(tokenFromUrl);

let session = getSession();
if (!isTokenMode && !session) {
  redirectTo(loginPageUrl('checkout.html'));
}

const cart = new Cart();
cart.close();

const els = {
  paymentForm: document.getElementById('payment-form'),
  payPhone: document.getElementById('pay-phone'),
  payBtn: document.getElementById('pay-btn'),
  panelSuccess: document.getElementById('panel-success'),
  panelPayment: document.getElementById('panel-payment'),
  panelExpired: document.getElementById('panel-expired'),
  summaryItems: document.getElementById('summary-items'),
  summaryTotal: document.getElementById('summary-total'),
  payAsName: document.getElementById('pay-as-name'),
  payAsEmail: document.getElementById('pay-as-email'),
  reserveMeta: document.getElementById('reserve-meta'),
  checkoutTitle: document.getElementById('checkout-title'),
};

let checkoutToken = tokenFromUrl;
let trustedSession = null;
let countdownTimer = null;
let completing = false;

function toast(msg, type = 'info') {
  if (window.showToast) window.showToast(msg, type);
  else alert(msg);
}

function setPaymentEnabled(enabled) {
  els.paymentForm?.querySelectorAll('input, button').forEach((el) => {
    el.disabled = !enabled;
  });
  if (els.payBtn) els.payBtn.disabled = !enabled;
}

function showExpired() {
  if (els.panelExpired) els.panelExpired.hidden = false;
  if (els.panelPayment) els.panelPayment.hidden = true;
  setPaymentEnabled(false);
  if (countdownTimer) clearInterval(countdownTimer);
}

function renderReserveMeta() {
  if (!els.reserveMeta || !trustedSession) return;
  const customerNumber =
    session?.customer_number || trustedSession.customer_number || '—';
  const expiresAt = new Date(trustedSession.expires_at).getTime();
  const remaining = expiresAt - Date.now();
  const expired = remaining <= 0 || trustedSession.status !== 'open';

  els.reserveMeta.innerHTML = `
    <div><span>Customer ID</span><strong class="mono">${customerNumber}</strong></div>
    <div><span>Reserved until</span><strong id="reserve-countdown">${
      expired ? 'Expired' : `${formatRemaining(remaining)} remaining`
    }</strong></div>
    <div><span>Payment method</span><strong>Dummy payment</strong></div>
    <div><span>Transaction</span><strong>Generated after success</strong></div>
  `;

  if (expired) showExpired();
}

function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    if (!trustedSession) return;
    const remaining = new Date(trustedSession.expires_at).getTime() - Date.now();
    const el = document.getElementById('reserve-countdown');
    if (remaining <= 0 || trustedSession.status !== 'open') {
      if (el) el.textContent = 'Expired';
      showExpired();
      return;
    }
    if (el) el.textContent = `${formatRemaining(remaining)} remaining`;
  }, 1000);
}

function renderTrustedSummary() {
  if (!trustedSession) return;
  const items = trustedSession.items || [];
  const currency = trustedSession.currency || 'BDT';
  els.summaryItems.innerHTML = items
    .map(
      (i) => `
    <div class="summary-line">
      <img src="${i.image_url || ''}" alt="" width="56" height="56">
      <div>
        <strong>${i.name}</strong>
        <p>${[i.brand, i.color, i.size ? `Size ${i.size}` : null, `Qty ${i.quantity}`]
          .filter(Boolean)
          .join(' · ')}</p>
        <p class="muted-line">${formatMoney(i.unit_price, currency)} each</p>
      </div>
      <span>${formatMoney(i.line_total, currency)}</span>
    </div>`
    )
    .join('');
  els.summaryTotal.textContent = formatMoney(trustedSession.total, currency);
}

async function resolveVariantIds(items) {
  const missing = items.filter((i) => !i.product_variant_id);
  if (!missing.length) return items;
  if (!isSupabaseConfigured) {
    throw new Error('Select a size for each item so we can reserve the correct stock.');
  }
  const db = requireSupabase();
  const resolved = [...items];
  for (const item of resolved) {
    if (item.product_variant_id) continue;
    if (!item.size) {
      throw new Error(`Choose a size for ${item.name} before checkout.`);
    }
    const { data, error } = await db
      .from('product_variants')
      .select('id, products!inner(tenant_id)')
      .eq('product_id', item.id)
      .eq('size', String(item.size))
      .eq('products.tenant_id', DEFAULT_TENANT_ID)
      .maybeSingle();
    if (error || !data) {
      throw new Error(`Could not find stock variant for ${item.name} size ${item.size}.`);
    }
    item.product_variant_id = data.id;
  }
  return resolved;
}

async function ensureTrustedSessionFromCart() {
  session = getSession();
  if (!session) {
    redirectTo(loginPageUrl('checkout.html'));
    return;
  }
  if (!cart.items.length) {
    els.summaryItems.innerHTML = `<p class="empty-cart-msg">Your cart is empty. <a href="shop.html">Shop now</a></p>`;
    els.summaryTotal.textContent = formatMoney(0, 'BDT');
    setPaymentEnabled(false);
    return;
  }

  const items = await resolveVariantIds(cart.items.map((i) => ({ ...i })));
  const payload = items.map((i) => ({
    product_variant_id: i.product_variant_id,
    quantity: i.quantity,
  }));

  const created = await createCheckoutSession({
    items: payload,
    customerId: session.id,
    customerEmail: session.email,
    idempotencyKey: `web-cart-${session.id}-${crypto.randomUUID()}`,
  });

  if (!created.token) {
    throw new Error(
      'A checkout session already exists for this cart. Open the reserved link or wait for it to expire.'
    );
  }

  checkoutToken = created.token;
  const url = new URL(window.location.href);
  url.searchParams.set('session', checkoutToken);
  window.history.replaceState({}, '', url.toString());

  const loaded = await getCheckoutSession(checkoutToken);
  trustedSession = loaded.session;
  renderTrustedSummary();
  renderReserveMeta();
  startCountdown();
}

async function loadTokenSession() {
  const loaded = await getCheckoutSession(checkoutToken);
  trustedSession = loaded.session;
  if (trustedSession.status !== 'open') {
    if (trustedSession.status === 'completed') {
      toast('This session was already completed.', 'info');
    }
    showExpired();
  }
  renderTrustedSummary();
  renderReserveMeta();
  startCountdown();

  if (!session && trustedSession.customer_id) {
    // Token checkout can proceed without forcing login if session was AI-created
    if (els.payAsName) els.payAsName.textContent = 'Guest / reserved checkout';
    if (els.payAsEmail) els.payAsEmail.textContent = '';
  }
}

function showSuccess(result) {
  document.getElementById('success-order').textContent = result.order_number;
  document.getElementById('success-txn').textContent = result.transaction_id || '—';
  document.getElementById('success-invoice').textContent = result.invoice_number || '—';
  document.getElementById('success-customer').textContent = result.customer_number || session?.customer_number || '—';
  document.getElementById('success-payment').textContent = labelPayment(result.payment_status);
  document.getElementById('success-fulfillment').textContent = labelFulfillment(
    result.fulfillment_status
  );
  document.getElementById('success-delivery-msg').textContent =
    result.estimated_delivery_message ||
    'Your order is expected to be delivered within 48 hours.';
  document.getElementById('success-support-msg').textContent =
    result.support_message || "I'm available 24/7 if you need help or want an update.";

  els.panelPayment.hidden = true;
  const bar = document.getElementById('checkout-user-bar');
  if (bar) bar.hidden = true;
  if (els.reserveMeta) els.reserveMeta.hidden = true;
  if (els.panelExpired) els.panelExpired.hidden = true;
  els.panelSuccess.hidden = false;
  if (countdownTimer) clearInterval(countdownTimer);
}

els.paymentForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (completing) return;

  if (!checkoutToken || !trustedSession) {
    toast('Checkout session is not ready', 'error');
    return;
  }
  if (trustedSession.status !== 'open' || new Date(trustedSession.expires_at) <= new Date()) {
    showExpired();
    toast('This checkout session has expired.', 'error');
    return;
  }

  const current = getSession();
  const phone = els.payPhone?.value.trim();
  if (current && !phone) {
    toast('Phone is required for verification', 'error');
    return;
  }

  const card = {
    brand: document.querySelector('input[name="card-brand"]:checked')?.value || 'visa',
    number: document.getElementById('card-number').value,
    exp: document.getElementById('card-exp').value,
    cvc: document.getElementById('card-cvc').value,
    name: document.getElementById('card-name').value,
  };

  completing = true;
  els.payBtn.disabled = true;
  els.payBtn.textContent = 'Processing…';

  try {
    const charge = await paymentGateway.charge({
      amount: trustedSession.total,
      currency: trustedSession.currency || 'BDT',
      orderId: trustedSession.id,
      card,
    });
    if (!charge.success) throw new Error(charge.error || 'Payment failed');

    const result = await completeCheckoutSession(checkoutToken, {
      success: true,
      transactionId: charge.transactionId,
      provider: charge.provider,
    });

    if (current && phone) setSession({ ...current, phone });
    if (!isTokenMode) cart.clear();

    showSuccess(result);
    toast(
      result.idempotent
        ? 'Your payment has been confirmed successfully.'
        : 'Your order has been placed successfully.',
      'success'
    );
  } catch (err) {
    if (err instanceof CommerceApiError && err.code === 'SESSION_EXPIRED') {
      showExpired();
    }
    toast(err.message || 'Checkout failed', 'error');
  } finally {
    completing = false;
    els.payBtn.disabled = false;
    els.payBtn.textContent = 'Confirm Payment';
  }
});

window.showToast =
  window.showToast ||
  ((message, type) => {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type} show`;
    t.textContent = message;
    c.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  });

(async function init() {
  if (session) {
    if (els.payAsName) els.payAsName.textContent = session.name;
    if (els.payAsEmail) els.payAsEmail.textContent = session.email;
    if (session.phone && els.payPhone) els.payPhone.value = session.phone;
  }

  if (els.checkoutTitle) {
    els.checkoutTitle.textContent = isTokenMode ? 'Reserved checkout' : 'Payment';
  }

  try {
    if (isTokenMode) await loadTokenSession();
    else await ensureTrustedSessionFromCart();
  } catch (err) {
    toast(err.message || 'Could not start checkout', 'error');
    setPaymentEnabled(false);
    if (err instanceof CommerceApiError && err.code === 'STOCK_UNAVAILABLE') {
      els.summaryItems.innerHTML = `<p class="empty-cart-msg">Not enough stock for one or more items. Update your cart and try again.</p>`;
    }
  }
})();
