/**
 * Stride — Product Store
 * Loads catalog from Supabase when configured; falls back to local seed data.
 * Realtime: storefront updates when admin creates/updates/deletes products.
 */
import { supabase, isSupabaseConfigured, DEFAULT_TENANT_ID, requireSupabase } from './supabase-client.js';

const STORAGE_KEY = 'stride_products_v1';
const CHANNEL_NAME = 'stride_products';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Map a Supabase product row (+ joins) into the storefront product shape */
export function mapDbProduct(row) {
  if (!row) return null;
  const variants = row.product_variants ?? [];
  const images = (row.product_images ?? [])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((i) => i.image_url)
    .filter(Boolean);

  const main = row.main_image_url || images[0] || '';
  const sizes = variants.map((v) => String(v.size)).filter(Boolean);
  const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
  const gender = row.gender ? String(row.gender).toLowerCase() : null;
  const category = String(row.category || 'Lifestyle');
  const status = String(row.status || 'active');
  const created = row.created_at ? new Date(row.created_at).getTime() : 0;
  const isNew = Date.now() - created < 1000 * 60 * 60 * 24 * 30;

  return {
    id: String(row.id),
    name: String(row.name || '').trim(),
    brand: String(row.brand || '').trim(),
    category,
    gender,
    price: Number(row.price) || 0,
    currency: String(row.currency || 'BDT'),
    originalPrice: null,
    image: main,
    images: images.length ? images : main ? [main] : [],
    rating: 4.6,
    reviewCount: 0,
    sizes: sizes.length ? sizes : ['7', '8', '9', '10', '11'],
    variants: variants.map((v) => ({
      id: String(v.id),
      size: String(v.size),
      stock_count: Number(v.stock_count) || 0,
    })),
    color: row.color ? String(row.color) : '',
    colors: row.color ? [String(row.color)] : ['Default'],
    description: String(row.description || '').trim() || 'Premium footwear built for comfort and style.',
    features: [],
    material: row.material ? String(row.material) : '',
    isNew,
    isSale: tags.some((t) => t.toLowerCase() === 'sale') || status === 'out_of_stock',
    tags: [
      ...tags,
      category.toLowerCase(),
      ...(gender ? [gender] : []),
      ...(status === 'active' ? [] : [status]),
    ].filter(Boolean),
    status,
    totalStock: variants.reduce((sum, v) => sum + (Number(v.stock_count) || 0), 0),
    _order: created,
  };
}

function normalizeProduct(raw, index = 0) {
  if (!isObject(raw)) return null;

  const id = raw.id != null ? String(raw.id) : '';
  const name = String(raw.name || '').trim();
  const category = String(raw.category || '').trim() || 'Lifestyle';
  const price = Number(raw.price);
  const originalPrice = raw.originalPrice == null ? null : Number(raw.originalPrice);
  const image = String(raw.image || '').trim();
  const images = Array.isArray(raw.images) ? raw.images.map(String).filter(Boolean) : [];

  if (!id || !name) return null;
  if (!Number.isFinite(price) || price < 0) return null;

  const normalizedImages = images.length ? images : image ? [image] : [];
  const mainImage = image || normalizedImages[0] || '';
  const gender = raw.gender ? String(raw.gender).toLowerCase() : null;

  return {
    id,
    name,
    brand: String(raw.brand || '').trim(),
    category,
    gender,
    price,
    currency: String(raw.currency || 'USD'),
    originalPrice: Number.isFinite(originalPrice) ? originalPrice : null,
    image: mainImage,
    images: normalizedImages.length ? normalizedImages : mainImage ? [mainImage] : [],
    rating: Number.isFinite(Number(raw.rating)) ? Number(raw.rating) : 4.6,
    reviewCount: Number.isFinite(Number(raw.reviewCount)) ? Number(raw.reviewCount) : 0,
    sizes: Array.isArray(raw.sizes) ? raw.sizes.map(String) : ['7', '8', '9', '10', '11'],
    colors: Array.isArray(raw.colors) ? raw.colors.map(String) : ['Black/White'],
    description: String(raw.description || '').trim() || 'Premium footwear built for comfort and style.',
    features: Array.isArray(raw.features) ? raw.features.map(String) : [],
    material: String(raw.material || ''),
    isNew: Boolean(raw.isNew),
    isSale: Boolean(raw.isSale),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    status: String(raw.status || 'active'),
    totalStock: Number.isFinite(Number(raw.totalStock)) ? Number(raw.totalStock) : null,
    _order: Number.isFinite(Number(raw._order)) ? Number(raw._order) : index,
  };
}

function normalizeList(raw) {
  const normalized = raw.map((p, i) => normalizeProduct(p, i)).filter(Boolean);
  normalized.sort((a, b) => {
    const ao = Number.isFinite(a._order) ? a._order : 0;
    const bo = Number.isFinite(b._order) ? b._order : 0;
    if (ao !== bo) return bo - ao;
    return String(a.id).localeCompare(String(b.id));
  });
  return normalized;
}

let cache = null;
let listeners = new Set();

function notify(products) {
  cache = products;
  listeners.forEach((cb) => {
    try {
      cb(products);
    } catch {
      /* ignore listener errors */
    }
  });
  try {
    window.dispatchEvent(new CustomEvent('stride:products-changed'));
  } catch {
    /* no-op */
  }
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage({ type: 'products-changed', ts: Date.now() });
    bc.close();
  } catch {
    /* no-op */
  }
}

export function getProducts(fallback = []) {
  if (cache) return cache;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const list = normalizeList(JSON.parse(stored));
      if (list.length) {
        cache = list;
        return list;
      }
    }
  } catch {
    /* ignore */
  }
  return normalizeList(fallback);
}

export function saveProducts(products) {
  const normalized = normalizeList(Array.isArray(products) ? products : []);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    /* quota */
  }
  notify(normalized);
}

/** Fetch active products from Supabase (or keep fallback). */
export async function loadProductsFromApi(fallback = []) {
  if (!isSupabaseConfigured || !supabase) {
    const local = getProducts(fallback);
    notify(local);
    return local;
  }

  const { data, error } = await requireSupabase()
    .from('products')
    .select(`*, product_variants (*), product_images (*)`)
    .eq('tenant_id', DEFAULT_TENANT_ID)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Stride: failed to load products from Supabase', error.message);
    const local = getProducts(fallback);
    notify(local);
    return local;
  }

  const mapped = (data ?? []).map(mapDbProduct).filter(Boolean);
  if (mapped.length === 0 && fallback.length) {
    const local = normalizeList(fallback);
    notify(local);
    return local;
  }

  saveProducts(mapped);
  return mapped;
}

/**
 * Subscribe to product updates (local events + Supabase realtime).
 * @returns {() => void} unsubscribe
 */
export function subscribeToProductUpdates(callback, getLatest) {
  const onChange = () => callback(getLatest());
  listeners.add(onChange);

  const onStorage = (e) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      onChange();
    }
  };
  window.addEventListener('storage', onStorage);

  let bc = null;
  try {
    bc = new BroadcastChannel(CHANNEL_NAME);
    bc.addEventListener('message', () => {
      cache = null;
      onChange();
    });
  } catch {
    /* ignore */
  }

  window.addEventListener('stride:products-changed', onChange);

  let channel = null;
  if (isSupabaseConfigured && supabase) {
    channel = supabase
      .channel('storefront-products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        async () => {
          cache = null;
          await loadProductsFromApi(getLatest());
          onChange();
        }
      )
      .subscribe();
  }

  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('stride:products-changed', onChange);
    if (bc) bc.close();
    if (channel && supabase) supabase.removeChannel(channel);
  };
}

/** Does a product match a shop filter slug (men, women, running, sale, …)? */
export function productMatchesFilter(product, filter) {
  if (!filter || filter === 'all') return true;
  const f = String(filter).toLowerCase();
  const category = String(product.category || '').toLowerCase();
  const gender = String(product.gender || '').toLowerCase();
  const tags = (product.tags || []).map((t) => String(t).toLowerCase());

  if (f === 'sale') return Boolean(product.isSale) || tags.includes('sale');
  if (f === 'new') return Boolean(product.isNew) || tags.includes('new') || tags.includes('new arrival');
  if (['men', 'women', 'kids', 'unisex'].includes(f)) {
    return gender === f || tags.includes(f) || (f !== 'unisex' && gender === 'unisex');
  }
  return category === f || tags.includes(f);
}

export function formatMoney(amount, currency = 'USD') {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency === 'BDT' ? 'BDT' : currency,
      maximumFractionDigits: currency === 'BDT' ? 0 : 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}
