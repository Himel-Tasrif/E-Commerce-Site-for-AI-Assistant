/**
 * Header account chip — shows Sign in or logged-in user menu.
 * Mount on every page that has #account-btn / .header-actions.
 */
import { getSession, clearSession, loginPageUrl } from './auth.js';

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'U';
}

export function mountHeaderAuth() {
  const actions = document.querySelector('.header-actions');
  const accountBtn = document.getElementById('account-btn');
  if (!actions) return;

  let wrap = document.getElementById('header-account');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'header-account';
    wrap.className = 'header-account';
    if (accountBtn) accountBtn.replaceWith(wrap);
    else actions.insertBefore(wrap, actions.firstChild);
  }

  const render = () => {
    const session = getSession();
    if (!session) {
      wrap.innerHTML = `
        <a class="header-account-signin" href="${loginPageUrl()}">Sign in</a>
      `;
      return;
    }

    wrap.innerHTML = `
      <button type="button" class="header-account-trigger" id="account-menu-btn" aria-expanded="false" aria-haspopup="true">
        <span class="header-account-avatar" aria-hidden="true">${initials(session.name)}</span>
        <span class="header-account-name">${session.name.split(' ')[0]}</span>
        <svg class="header-account-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div class="header-account-menu" id="account-menu" hidden>
        <div class="header-account-menu-head">
          <strong>${session.name}</strong>
          <span>${session.email}</span>
          ${session.customer_number ? `<span class="header-account-cus">${session.customer_number}</span>` : ''}
        </div>
        <a href="account.html" class="header-account-menu-item">My Account</a>
        <a href="orders.html" class="header-account-menu-item">My Orders</a>
        <a href="checkout.html" class="header-account-menu-item">Checkout</a>
        <button type="button" class="header-account-menu-item danger" id="account-signout">Sign out</button>
      </div>
    `;

    const btn = wrap.querySelector('#account-menu-btn');
    const menu = wrap.querySelector('#account-menu');
    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    wrap.querySelector('#account-signout')?.addEventListener('click', () => {
      clearSession();
      render();
      if (window.showToast) window.showToast('Signed out', 'info');
    });
  };

  document.addEventListener('click', (e) => {
    const menu = document.getElementById('account-menu');
    const btn = document.getElementById('account-menu-btn');
    if (!menu || menu.hidden) return;
    if (!wrap.contains(e.target)) {
      menu.hidden = true;
      btn?.setAttribute('aria-expanded', 'false');
    }
  });

  window.addEventListener('stride:auth-changed', render);
  render();
}
