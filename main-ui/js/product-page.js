/**
 * Product detail page — product.html?id=...
 */
import { Cart } from './cart.js';
import { products as seedProducts } from './products.js';
import { getProducts, loadProductsFromApi, formatMoney } from './product-store.js';
import { mountHeaderAuth } from './header-auth.js';

mountHeaderAuth();

const cart = new Cart();
const params = new URLSearchParams(window.location.search);
const productId = params.get('id');

const els = {
  loading: document.getElementById('product-loading'),
  missing: document.getElementById('product-missing'),
  detail: document.getElementById('product-detail'),
  crumb: document.getElementById('crumb-name'),
  mainImage: document.getElementById('product-main-image'),
  thumbs: document.getElementById('product-thumbs'),
  brand: document.getElementById('product-brand'),
  name: document.getElementById('product-name'),
  category: document.getElementById('product-category'),
  price: document.getElementById('product-price'),
  desc: document.getElementById('product-desc'),
  sizes: document.getElementById('size-options'),
  qty: document.getElementById('qty-input'),
  addBtn: document.getElementById('product-add-cart'),
};

let selectedSize = null;
let currentProduct = null;

function sameId(a, b) {
  return String(a) === String(b);
}

async function boot() {
  if (!productId) {
    showMissing();
    return;
  }

  let list = getProducts(seedProducts);
  list = await loadProductsFromApi(seedProducts);
  const product = list.find((p) => sameId(p.id, productId));

  if (!product) {
    showMissing();
    return;
  }

  currentProduct = product;
  render(product);
}

function showMissing() {
  els.loading.hidden = true;
  els.detail.hidden = true;
  els.missing.hidden = false;
}

function render(product) {
  els.loading.hidden = true;
  els.missing.hidden = true;
  els.detail.hidden = false;

  document.title = `${product.name} | Stride`;
  els.crumb.textContent = product.name;
  els.brand.textContent = product.brand || 'Stride';
  els.name.textContent = product.name;
  els.category.textContent = [product.category, product.gender].filter(Boolean).join(' · ');
  els.price.textContent = formatMoney(product.price, product.currency || 'BDT');
  els.desc.textContent = product.description || '';

  const images = (Array.isArray(product.images) && product.images.length
    ? product.images
    : [product.image]
  ).filter(Boolean);

  els.mainImage.src = images[0] || '';
  els.mainImage.alt = product.name;
  els.thumbs.innerHTML = images
    .map(
      (src, i) => `
    <button type="button" class="product-thumb${i === 0 ? ' active' : ''}" data-src="${src}">
      <img src="${src}" alt="">
    </button>`
    )
    .join('');

  els.thumbs.querySelectorAll('.product-thumb').forEach((btn) => {
    btn.addEventListener('click', () => {
      els.thumbs.querySelectorAll('.product-thumb').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      els.mainImage.src = btn.dataset.src;
    });
  });

  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  if (!sizes.length) {
    document.getElementById('size-field').hidden = true;
  } else {
    selectedSize = sizes[0];
    els.sizes.innerHTML = sizes
      .map(
        (s, i) => `
      <button type="button" class="size-chip${i === 0 ? ' selected' : ''}" data-size="${s}">${s}</button>`
      )
      .join('');
    els.sizes.querySelectorAll('.size-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        els.sizes.querySelectorAll('.size-chip').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedSize = btn.dataset.size;
      });
    });
  }
}

els.addBtn?.addEventListener('click', () => {
  if (!currentProduct) return;
  const qty = Math.max(1, Number(els.qty.value) || 1);
  cart.add(currentProduct, qty, selectedSize);
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
    setTimeout(() => t.remove(), 3500);
  });

boot();
