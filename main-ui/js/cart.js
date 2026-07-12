/**
 * Stride - Cart Module
 */
import { formatMoney } from './product-store.js';

function sameId(a, b) {
  return String(a) === String(b);
}

export class Cart {
  constructor() {
    this.items = [];
    this.isOpen = false;
    this.storageKey = 'Stride_cart';
    this.overlayEl = null;
    this.modalEl = null;
    this.mode = 'modal'; // modal | sidebar

    this.init();
  }

  init() {
    this.loadFromStorage();
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    const cartBtn = document.getElementById('cart-btn');
    const cartClose = document.getElementById('cart-close');
    const cartModal = document.getElementById('cart-modal');
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');

    if (cartSidebar) {
      this.mode = 'sidebar';
      this.overlayEl = cartSidebar;
      this.modalEl = cartSidebar.querySelector('.cart-sidebar-content');
    } else if (cartModal) {
      this.mode = 'modal';
      this.overlayEl = cartModal;
      this.modalEl = cartModal.querySelector('.modal');
    }

    cartBtn?.addEventListener('click', () => this.open());
    cartClose?.addEventListener('click', () => this.close());
    cartOverlay?.addEventListener('click', () => this.close());

    this.overlayEl?.addEventListener('click', (e) => {
      if (e.target === this.overlayEl) this.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });

    document.getElementById('checkout-btn')?.addEventListener('click', () => this.checkout());
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      this.items = stored ? JSON.parse(stored) : [];
    } catch {
      this.items = [];
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch {
      /* ignore */
    }
  }

  add(product, quantity = 1, size = null) {
    const id = String(product.id);
    const sizeKey = size == null || size === '' ? null : String(size);
    const variants = Array.isArray(product.variants) ? product.variants : [];
    let productVariantId = null;
    if (sizeKey && variants.length) {
      const match = variants.find((v) => String(v.size) === sizeKey);
      productVariantId = match?.id || null;
    } else if (!sizeKey && variants.length === 1) {
      productVariantId = variants[0].id;
    }

    const existingIndex = this.items.findIndex(
      (item) => sameId(item.id, id) && String(item.size || '') === String(sizeKey || '')
    );

    if (existingIndex >= 0) {
      this.items[existingIndex].quantity += quantity;
      if (productVariantId) this.items[existingIndex].product_variant_id = productVariantId;
    } else {
      this.items.push({
        id,
        name: product.name,
        price: product.price,
        currency: product.currency || 'BDT',
        originalPrice: product.originalPrice,
        image: product.image,
        quantity,
        size: sizeKey,
        category: product.category,
        brand: product.brand || '',
        color: product.color || (product.colors && product.colors[0]) || '',
        product_variant_id: productVariantId,
      });
    }

    this.saveToStorage();
    this.render();
    this.open();

    if (window.showToast) {
      window.showToast(`${product.name} added to cart`, 'success');
    }
  }

  remove(itemId, size = null) {
    this.items = this.items.filter(
      (item) => !(sameId(item.id, itemId) && String(item.size || '') === String(size || ''))
    );
    this.saveToStorage();
    this.render();
  }

  updateQuantity(itemId, quantity, size = null) {
    const item = this.items.find(
      (i) => sameId(i.id, itemId) && String(i.size || '') === String(size || '')
    );
    if (!item) return;
    if (quantity <= 0) this.remove(itemId, size);
    else {
      item.quantity = quantity;
      this.saveToStorage();
      this.render();
    }
  }

  clear() {
    this.items = [];
    this.saveToStorage();
    this.render();
  }

  getTotal() {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  getItemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  open() {
    this.isOpen = true;
    this.overlayEl?.classList.add('open');
    this.modalEl?.classList.add('open');
    if (this.mode === 'sidebar') {
      this.overlayEl?.classList.add('is-open');
      document.getElementById('cart-overlay')?.classList.add('open');
    }
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.isOpen = false;
    this.overlayEl?.classList.remove('open', 'is-open');
    this.modalEl?.classList.remove('open');
    document.getElementById('cart-overlay')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  checkout() {
    if (this.items.length === 0) return;
    if (window.showToast) window.showToast('Redirecting to checkout...', 'info');
    setTimeout(() => {
      window.location.href = 'checkout.html';
    }, 300);
  }

  render() {
    this.renderCartCount();
    this.renderCartItems();
    this.renderCartSummary();
  }

  renderCartCount() {
    const countEl = document.getElementById('cart-count');
    const count = this.getItemCount();
    if (!countEl) return;
    countEl.textContent = String(count);
    countEl.setAttribute('aria-label', `${count} item${count !== 1 ? 's' : ''} in cart`);
    countEl.style.display = count > 0 ? 'flex' : 'none';
  }

  renderCartItems() {
    const container = document.getElementById('cart-items');
    const emptyEl = document.getElementById('cart-empty');
    const footer = document.getElementById('cart-footer');
    if (!container) return;

    if (this.items.length === 0) {
      container.innerHTML = `
        <div class="cart-empty" style="text-align: center; padding: var(--space-12) var(--space-4);">
          <h3 style="font-size: var(--font-size-lg); font-weight: 600; margin-bottom: 0.5rem;">Your cart is empty</h3>
          <p style="color: var(--color-gray-500); margin-bottom: 1.5rem;">Add shoes to get started.</p>
          <a href="shop.html" class="btn btn-primary">Continue Shopping</a>
        </div>
      `;
      if (emptyEl) emptyEl.style.display = 'block';
      if (footer) footer.style.display = 'none';
      container.style.display = 'block';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    container.style.display = 'block';
    if (footer) footer.style.display = 'block';

    const currency = this.items[0]?.currency || 'BDT';
    container.innerHTML = this.items
      .map(
        (item) => `
      <div class="cart-item" data-id="${item.id}" data-size="${item.size || ''}">
        <img src="${item.image || ''}" alt="${item.name}" class="cart-item-image" loading="lazy">
        <div class="cart-item-details">
          <h4 class="cart-item-name">${item.name}</h4>
          ${item.size ? `<p class="cart-item-size">Size: ${item.size}</p>` : ''}
          <p class="cart-item-price">${formatMoney(item.price, currency)}</p>
        </div>
        <div class="cart-item-quantity">
          <button type="button" class="quantity-btn" aria-label="Decrease quantity" data-action="decrease">-</button>
          <span class="quantity-value">${item.quantity}</span>
          <button type="button" class="quantity-btn" aria-label="Increase quantity" data-action="increase">+</button>
        </div>
        <button type="button" class="cart-item-remove" aria-label="Remove ${item.name}" data-action="remove">×</button>
      </div>`
      )
      .join('');

    container.querySelectorAll('.cart-item').forEach((itemEl) => {
      const id = itemEl.dataset.id;
      const size = itemEl.dataset.size || null;
      itemEl.querySelector('[data-action="increase"]')?.addEventListener('click', () => {
        const item = this.items.find((i) => sameId(i.id, id) && String(i.size || '') === String(size || ''));
        if (item) this.updateQuantity(id, item.quantity + 1, size);
      });
      itemEl.querySelector('[data-action="decrease"]')?.addEventListener('click', () => {
        const item = this.items.find((i) => sameId(i.id, id) && String(i.size || '') === String(size || ''));
        if (item) this.updateQuantity(id, item.quantity - 1, size);
      });
      itemEl.querySelector('[data-action="remove"]')?.addEventListener('click', () => {
        this.remove(id, size);
      });
    });
  }

  renderCartSummary() {
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    const currency = this.items[0]?.currency || 'BDT';
    const total = this.getTotal();
    if (subtotalEl) subtotalEl.textContent = formatMoney(total, currency);
    if (totalEl) totalEl.textContent = formatMoney(total, currency);
  }
}
