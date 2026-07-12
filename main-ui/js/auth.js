/**
 * Stride — Demo customer auth (swappable for real auth later).
 * Prefers Supabase `store_customers`; falls back to localStorage if table missing.
 */
import { requireSupabase, DEFAULT_TENANT_ID, isSupabaseConfigured } from './supabase-client.js';

const SESSION_KEY = 'stride_customer_session';
const LOCAL_USERS_KEY = 'stride_demo_customers_v1';

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(customer) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      customer_number: customer.customer_number || '',
      created_at: customer.created_at || null,
    })
  );
  window.dispatchEvent(new CustomEvent('stride:auth-changed'));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent('stride:auth-changed'));
}

export function requireSession() {
  const s = getSession();
  if (!s) throw new Error('Please sign in to continue');
  return s;
}

export function getReturnUrl(fallback = 'index.html') {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next') || params.get('return') || fallback;
  if (!next || next.startsWith('http') || next.startsWith('//') || next.includes('://')) {
    return fallback;
  }
  return next;
}

export function currentPagePath() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  let file = parts[parts.length - 1] || 'index.html';
  if (!file.includes('.')) file = 'index.html';
  return `${file}${window.location.search || ''}`;
}

export function loginPageUrl(next) {
  const target = next || currentPagePath();
  return `login.html?next=${encodeURIComponent(target)}`;
}

export function registerPageUrl(next) {
  const target = next || getReturnUrl(currentPagePath());
  return `register.html?next=${encodeURIComponent(target)}`;
}

export function redirectTo(url) {
  window.location.href = url;
}

export function redirectAfterAuth(fallback = 'index.html') {
  redirectTo(getReturnUrl(fallback));
}

function readLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeLocalUsers(users) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function isMissingTableError(err) {
  const msg = err?.message || '';
  return err?.code === 'PGRST205' || /schema cache|does not exist|Could not find the table/i.test(msg);
}

/** Create account only — does NOT sign in. */
export async function signUp({ name, email, phone, password }) {
  const payload = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: (phone || '').trim() || null,
    password,
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await requireSupabase()
        .from('store_customers')
        .insert({
          tenant_id: DEFAULT_TENANT_ID,
          ...payload,
        })
        .select('id, name, email, phone, customer_number, created_at')
        .single();

      if (error) {
        if (error.message?.includes('duplicate') || error.code === '23505') {
          throw new Error('An account with this email already exists. Please sign in.');
        }
        if (!isMissingTableError(error)) throw new Error(error.message);
        console.warn('store_customers missing — using local demo store. Run apply-customers-orders.sql');
      } else {
        return data;
      }
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }

  const users = readLocalUsers();
  if (users.some((u) => u.email === payload.email)) {
    throw new Error('An account with this email already exists. Please sign in.');
  }
  const row = {
    id: crypto.randomUUID(),
    ...payload,
    _local: true,
  };
  users.push(row);
  writeLocalUsers(users);
  return { id: row.id, name: row.name, email: row.email, phone: row.phone };
}

export async function signIn({ email, password }) {
  const normalized = email.trim().toLowerCase();

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await requireSupabase()
        .from('store_customers')
        .select('id, name, email, phone, password, customer_number, created_at')
        .eq('tenant_id', DEFAULT_TENANT_ID)
        .eq('email', normalized)
        .maybeSingle();

      if (error) {
        if (!isMissingTableError(error)) throw new Error(error.message);
      } else if (data) {
        if (data.password !== password) throw new Error('Invalid email or password');
        const session = {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone || '',
          customer_number: data.customer_number || '',
          created_at: data.created_at || null,
        };
        setSession(session);
        return session;
      }
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }

  const user = readLocalUsers().find((u) => u.email === normalized);
  if (!user || user.password !== password) throw new Error('Invalid email or password');
  const session = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
  };
  setSession(session);
  return session;
}
