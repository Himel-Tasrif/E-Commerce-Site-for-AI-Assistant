import { getSession, signIn, getReturnUrl, redirectAfterAuth, registerPageUrl } from './auth.js';
import { mountHeaderAuth } from './header-auth.js';

mountHeaderAuth();

const params = new URLSearchParams(window.location.search);
const next = getReturnUrl('index.html');
const alertEl = document.getElementById('auth-alert');
const form = document.getElementById('login-form');
const btn = document.getElementById('login-btn');

document.getElementById('register-link').href = registerPageUrl(next);

if (params.get('registered') === '1') {
  alertEl.hidden = false;
  alertEl.className = 'auth-alert auth-alert-success';
  alertEl.textContent = 'Account created. Please sign in to continue.';
}

if (params.get('email')) {
  document.getElementById('email').value = params.get('email');
}

// Already signed in → go back to where they came from
if (getSession()) {
  redirectAfterAuth(next);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertEl.hidden = true;
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  try {
    await signIn({
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
    });
    redirectAfterAuth(next);
  } catch (err) {
    alertEl.hidden = false;
    alertEl.className = 'auth-alert auth-alert-error';
    alertEl.textContent = err.message || 'Sign in failed';
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
});
