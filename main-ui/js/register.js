import { getSession, signUp, getReturnUrl, redirectTo, loginPageUrl } from './auth.js';
import { mountHeaderAuth } from './header-auth.js';

mountHeaderAuth();

const next = getReturnUrl('index.html');
const alertEl = document.getElementById('auth-alert');
const form = document.getElementById('register-form');
const btn = document.getElementById('register-btn');

document.getElementById('login-link').href = loginPageUrl(next);

if (getSession()) {
  redirectTo(next);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertEl.hidden = true;
  btn.disabled = true;
  btn.textContent = 'Creating…';
  try {
    const email = document.getElementById('email').value.trim();
    await signUp({
      name: document.getElementById('name').value,
      email,
      phone: document.getElementById('phone').value,
      password: document.getElementById('password').value,
    });
    // After register → login page (not auto signed-in)
    const loginUrl = `login.html?next=${encodeURIComponent(next)}&registered=1&email=${encodeURIComponent(email)}`;
    redirectTo(loginUrl);
  } catch (err) {
    alertEl.hidden = false;
    alertEl.className = 'auth-alert auth-alert-error';
    alertEl.textContent = err.message || 'Could not create account';
    btn.disabled = false;
    btn.textContent = 'Create account';
  }
});
