/**
 * Stride — Product Renderer
 */
import { formatMoney } from './product-store.js';

function sameId(a, b) {
  return String(a) === String(b);
}

export class ProductRenderer {
  constructor(cart = null, products = []) {
    this.cart = cart;
    this.products = products || [];
    this.featuredContainer = document.getElementById('featured-products') || document.getElementById('featured-products-grid');
    this.shopContainer = document.getElementById('product-grid') || document.getElementById('shop-products-grid');
    this.quickViewOverlay = document.getElementById('quick-view-modal');
    this.quickViewModal = this.quickViewOverlay?.querySelector('.modal') || null;
    this.currentProduct = null;
    this._eventsBound = false;
  }
  
  async init() {
    // Products are already loaded via constructor
    if (this.products.length === 0) {
      await this.loadProducts();
    }
    this.ensureQuickViewModal();
    this.renderFeaturedProducts();
    this.renderShopProducts();
    this.bindUIEvents();
  }

  ensureQuickViewModal() {
    if (this.quickViewOverlay) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay quick-view-modal';
    overlay.id = 'quick-view-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Quick view');
    overlay.innerHTML = `<div class="modal" style="max-width: 980px;"></div>`;
    document.body.appendChild(overlay);

    this.quickViewOverlay = overlay;
    this.quickViewModal = overlay.querySelector('.modal');
  }
  
  async loadProducts() {
    try {
      // Try to load from global products array (products.js)
      if (typeof window.products !== 'undefined') {
        this.products = window.products;
      } else {
        // Fallback: fetch from JSON file
        const response = await fetch('data/products.json');
        if (response.ok) {
          this.products = await response.json();
        }
      }
    } catch (e) {
      console.warn('Could not load products:', e);
      this.products = this.getFallbackProducts();
    }
  }

  getFallbackProducts() {
    return [];
  }
  
  renderFeaturedProducts(limit = 8) {
    if (!this.featuredContainer) return;
    
    const featuredProducts = this.products
      .filter(p => p.isNew || p.isSale)
      .slice(0, limit);
    
    this.featuredContainer.innerHTML = featuredProducts.map(product => 
      this.createProductCard(product)
    ).join('');
    
    // Re-initialize components for new cards
    if (window.components) {
      window.components.initWishlistButtons();
      window.components.initQuickViewButtons();
      window.components.initQuantitySelectors();
    }
  }
  
  renderShopProducts(products = null, container = null) {
    const targetContainer = container || this.shopContainer;
    const productsToRender = products || this.products;
    
    if (!targetContainer) return;
    
    targetContainer.innerHTML = productsToRender.map(product => 
      this.createProductCard(product)
    ).join('');
    
    // Re-initialize components
    if (window.components) {
      window.components.initWishlistButtons();
      window.components.initQuickViewButtons();
      window.components.initQuantitySelectors();
    }
  }
  
  createProductCard(product) {
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0;

    const badges = [];
    if (product.isNew) badges.push('<span class="badge badge-new">New</span>');
    if (hasDiscount) badges.push(`<span class="badge badge-sale">-${discountPercent}%</span>`);

    const colors = Array.isArray(product.colors) ? product.colors : [];
    const href = `product.html?id=${encodeURIComponent(product.id)}`;
    const safeRating = Number.isFinite(Number(product.rating)) ? Number(product.rating) : 4.6;
    const safeReviewCount = Number.isFinite(Number(product.reviewCount)) ? Number(product.reviewCount) : 0;

    return `
      <article class="product-card" data-product-id="${product.id}">
        <a href="${href}" class="product-card-image-link">
          <div class="product-card-image">
            <img src="${product.image || ''}" alt="${product.name}" loading="lazy" width="400" height="400">
            ${badges.length ? `<div class="product-card-badges">${badges.join('')}</div>` : ''}
          </div>
        </a>

        <div class="product-card-content">
          <p class="product-card-category">${product.category || ''}</p>
          <h3 class="product-card-title">
            <a href="${href}">${product.name}</a>
          </h3>

          <div class="product-card-rating" style="display: flex; align-items: center; gap: var(--space-2); margin: var(--space-2) 0;">
            <span class="rating-stars" aria-label="${safeRating} out of 5 stars">${this.renderStars(safeRating)}</span>
            <span class="rating-count" style="font-size: var(--font-size-sm); color: var(--color-gray-500);">(${safeReviewCount})</span>
          </div>

          <div class="product-card-price">
            <span class="current-price">${formatMoney(product.price, product.currency || 'BDT')}</span>
            ${hasDiscount ? `<span class="original-price">${formatMoney(product.originalPrice, product.currency || 'BDT')}</span>` : ''}
          </div>

          ${colors.length ? `
          <div class="product-card-colors" style="display: flex; gap: var(--space-2); margin-top: var(--space-3);">
            ${colors.slice(0, 4).map((color) => `
              <span class="color-swatch" style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--color-gray-200); background: ${this.getColorHex(color)};" title="${color}"></span>
            `).join('')}
          </div>` : ''}

          <div class="product-card-footer" style="display: flex; gap: var(--space-2); margin-top: var(--space-4);">
            <a href="${href}" class="btn btn-secondary" style="flex: 1; text-align: center;">View</a>
            <button type="button" class="btn btn-primary add-to-cart-btn" data-product-id="${product.id}" style="flex: 1;">
              Add to Cart
            </button>
          </div>
        </div>
      </article>
    `;
  }
  
  renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) {
      stars += '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" width="16" height="16"><path d="M12 2l3.09 6.26L24 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"/></svg>';
    }
    if (hasHalfStar) {
      stars += '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" width="16" height="16"><path d="M12 2l3.09 6.26L24 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"/></svg>';
    }
    for (let i = 0; i < emptyStars; i++) {
      stars += '<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2l3.09 6.26L24 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"/></svg>';
    }
    return stars;
  }
  
  getColorHex(colorName) {
    const colorMap = {
      'Black/White': '#000000',
      'White/Black': '#ffffff',
      'White/White': '#ffffff',
      'Black/Black': '#000000',
      'Triple White': '#ffffff',
      'Chicago': '#C8102E',
      'Bred': '#000000',
      'Royal': '#006BB6',
      'Shadow': '#333333',
      'Prototype/White': '#E8E8E8',
      'Pink/Black': '#FF69B4',
      'Green/Black': '#006400',
      'Panda': '#000000',
      'Syracuse': '#F58220',
      'Kentucky': '#0033A0',
      'UNC': '#7BAFD4',
      'Blue/Orange': '#006BB6',
      'Blue/Red': '#006BB6',
      'Grey/Green': '#808080',
      'Grey/Red': '#808080',
      'Vintage Green': '#2E5D3E',
      'Blue/White': '#006BB6'
    };
    return colorMap[colorName] || '#cccccc';
  }
  
  bindUIEvents() {
    if (this._eventsBound) return;
    this._eventsBound = true;

    document.addEventListener('click', (e) => {
      const quickViewBtn = e.target.closest('.quick-view-btn');
      if (quickViewBtn) {
        e.preventDefault();
        e.stopPropagation();
        const productId = quickViewBtn.dataset.productId;
        if (productId) this.openQuickView(productId);
        return;
      }

      const addToCartBtn = e.target.closest('.add-to-cart-btn');
      if (addToCartBtn) {
        e.preventDefault();
        e.stopPropagation();
        const productId = addToCartBtn.dataset.productId;
        const product = this.getProductById(productId);
        if (product && this.cart) {
          this.cart.add(product, 1, null);
        } else if (!product && window.showToast) {
          window.showToast('Product not found', 'error');
        }
      }
    });

    this.quickViewOverlay?.addEventListener('click', (e) => {
      if (e.target === this.quickViewOverlay) this.closeQuickView();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.quickViewOverlay?.classList.contains('open')) {
        this.closeQuickView();
      }
    });
  }

  openQuickView(productId) {
    const product = this.getProductById(productId);
    if (!product) return;
    
    this.currentProduct = product;
    this.renderQuickView(product);
    
    this.quickViewOverlay?.classList.add('open');
    this.quickViewModal?.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    // Focus management
    const closeBtn = document.getElementById('quick-view-close');
    closeBtn?.focus();
    
    // Initialize quantity selector in modal
    if (window.components) {
      window.components.initQuantitySelectors();
    }
  }
  
  closeQuickView() {
    this.quickViewOverlay?.classList.remove('open');
    this.quickViewModal?.classList.remove('open');
    document.body.style.overflow = '';
    this.currentProduct = null;
  }
  
  renderQuickView(product) {
    if (!this.quickViewModal) return;
    
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount 
      ? Math.round((1 - product.price / product.originalPrice) * 100) 
      : 0;
    
    const badges = [];
    if (product.isNew) badges.push('<span class="badge badge-new">New</span>');
    if (hasDiscount) badges.push(`<span class="badge badge-sale">-${discountPercent}%</span>`);
    
    const images = Array.isArray(product.images) && product.images.length
      ? product.images
      : [product.image].filter(Boolean);

    const mainImage = images[0] || product.image || '';

    // Admin panel image integration - data attributes for dynamic image replacement
    const adminMainImageAttr = mainImage ? `data-admin-image="${mainImage}"` : '';
    const adminImagesAttr = images.length
      ? `data-admin-images='${JSON.stringify(images).replace(/'/g, "&apos;")}'`
      : '';
    
    this.quickViewModal.innerHTML = `
      <button class="modal-close" id="quick-view-close" aria-label="Close quick view">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
      
      <div class="quick-view-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-8);">
        <!-- Image Gallery -->
        <div class="quick-view-gallery">
          <div class="quick-view-main-image" style="position: relative; aspect-ratio: 1; border-radius: var(--radius-xl); overflow: hidden; background: var(--color-gray-50);">
            <img id="quick-view-main-img" src="${mainImage}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;" ${adminMainImageAttr} ${adminImagesAttr}>
            ${badges.length ? `<div class="quick-view-badges" style="position: absolute; top: var(--space-4); left: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2);">${badges.join('')}</div>` : ''}
          </div>
          <div class="quick-view-thumbnails" style="display: flex; gap: var(--space-3); margin-top: var(--space-4); overflow-x: auto;">
            ${images.map((img, i) => `
              <button class="quick-view-thumb${i === 0 ? ' active' : ''}" data-index="${i}" style="flex-shrink: 0; width: 80px; height: 80px; border-radius: var(--radius-md); overflow: hidden; border: 2px solid ${i === 0 ? 'var(--color-primary)' : 'transparent'}; cursor: pointer; background: var(--color-gray-100);">
                <img src="${img}" alt="${product.name} view ${i + 1}" style="width: 100%; height: 100%; object-fit: cover;" data-admin-image="${img}">
              </button>
            `).join('')}
          </div>
        </div>
        
        <!-- Product Info -->
        <div class="quick-view-info">
          <p class="quick-view-category" style="color: var(--color-primary); font-weight: var(--font-weight-medium); text-transform: uppercase; font-size: var(--font-size-sm); letter-spacing: 0.05em;">${product.category}</p>
          <h2 class="quick-view-title" style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); margin: var(--space-2) 0 var(--space-4);">${product.name}</h2>
          
          <div class="quick-view-rating" style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4);">
            <span class="rating-stars" style="color: var(--color-warning);">${this.renderStars(product.rating)}</span>
            <span style="color: var(--color-gray-500);">${product.rating} (${product.reviewCount} reviews)</span>
          </div>
          
          <div class="quick-view-price" style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-6);">
            <span class="current-price" style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold);">${formatMoney(product.price, product.currency || 'USD')}</span>
            ${hasDiscount ? `<span class="original-price" style="font-size: var(--font-size-xl); text-decoration: line-through; color: var(--color-gray-400);">${formatMoney(product.originalPrice, product.currency || 'USD')}</span>` : ''}
          </div>
          
          <p class="quick-view-description" style="color: var(--color-gray-600); line-height: var(--line-height-relaxed); margin-bottom: var(--space-6);">${product.description}</p>
          
          <!-- Color Selection -->
          <div class="quick-view-colors" style="margin-bottom: var(--space-6);">
            <label style="display: block; font-weight: var(--font-weight-medium); margin-bottom: var(--space-3);">Color</label>
            <div class="color-options" style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
              ${(Array.isArray(product.colors) ? product.colors : []).map((color, i) => `
                <button class="color-option${i === 0 ? ' selected' : ''}" data-color="${color}" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid ${i === 0 ? 'var(--color-primary)' : 'var(--color-gray-300)'}; background: ${this.getColorHex(color)}; cursor: pointer; transition: var(--transition-fast);" aria-label="${color}" title="${color}"></button>
              `).join('')}
            </div>
          </div>
          
          <!-- Size Selection -->
          <div class="quick-view-sizes" style="margin-bottom: var(--space-6);">
            <label style="display: block; font-weight: var(--font-weight-medium); margin-bottom: var(--space-3);">Size</label>
            <div class="size-options" style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
              ${(Array.isArray(product.sizes) ? product.sizes : ['7', '8', '9', '10']).map(size => `
                <button class="size-option" data-size="${size}" style="min-width: 44px; height: 44px; border: 2px solid var(--color-gray-300); border-radius: var(--radius-md); background: var(--color-white); font-weight: var(--font-weight-medium); cursor: pointer; transition: var(--transition-fast);">${size}</button>
              `).join('')}
            </div>
          </div>
          
          <!-- Quantity Selector -->
          <div class="quick-view-quantity" style="margin-bottom: var(--space-6);">
            <label style="display: block; font-weight: var(--font-weight-medium); margin-bottom: var(--space-3);">Quantity</label>
            <div class="quantity-selector" style="display: inline-flex; align-items: center; border: 1px solid var(--color-gray-300); border-radius: var(--radius-md); overflow: hidden;">
              <button class="quantity-btn" data-action="decrease" aria-label="Decrease quantity" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: var(--color-gray-50); border: none; cursor: pointer;">-</button>
              <input type="number" class="quantity-input" value="1" min="1" max="10" style="width: 60px; height: 44px; text-align: center; border: none; border-left: 1px solid var(--color-gray-300); border-right: 1px solid var(--color-gray-300); font-weight: var(--font-weight-medium);" aria-label="Quantity">
              <button class="quantity-btn" data-action="increase" aria-label="Increase quantity" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: var(--color-gray-50); border: none; cursor: pointer;">+</button>
            </div>
          </div>
          
          <!-- Features -->
          <div class="quick-view-features" style="margin-bottom: var(--space-6); padding: var(--space-4); background: var(--color-gray-50); border-radius: var(--radius-lg);">
            <h4 style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3);">Features</h4>
            <ul style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-2); font-size: var(--font-size-sm); color: var(--color-gray-600);">
              ${(Array.isArray(product.features) ? product.features : []).map(feature => `<li style="display: flex; align-items: center; gap: var(--space-2);"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" width="16" height="16" style="color: var(--color-primary); flex-shrink: 0;"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>${feature}</li>`).join('') || '<li>Premium footwear</li>'}
            </ul>
          </div>
          
          <!-- Action Buttons -->
          <div class="quick-view-actions" style="display: flex; gap: var(--space-3);">
            <button class="btn btn-primary btn-lg quick-view-add-cart" style="flex: 1;" data-product-id="${product.id}">
              Add to Cart
            </button>
            <a href="product.html?id=${encodeURIComponent(product.id)}" class="btn btn-outline btn-lg" style="flex: 1; text-align: center;">View details</a>
          </div>
        </div>
      </div>
    `;
    
    // Bind events for the rendered content
    this.bindQuickViewContentEvents(product);
  }
  
  bindQuickViewContentEvents(product) {
    // Close button (rendered inside the modal content)
    this.quickViewModal?.querySelector('#quick-view-close')?.addEventListener('click', () => this.closeQuickView());

    const images = Array.isArray(product.images) && product.images.length
      ? product.images
      : [product.image].filter(Boolean);

    // Thumbnail clicks
    this.quickViewModal?.querySelectorAll('.quick-view-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const index = parseInt(thumb.dataset.index);
        const mainImg = document.getElementById('quick-view-main-img');
        if (mainImg) {
          mainImg.src = images[index] || images[0] || mainImg.src;
        }
        this.quickViewModal?.querySelectorAll('.quick-view-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });
    
    // Color selection
    this.quickViewModal?.querySelectorAll('.color-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.quickViewModal?.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
    
    // Size selection
    this.quickViewModal?.querySelectorAll('.size-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.quickViewModal?.querySelectorAll('.size-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
    
    // Add to cart
    const addToCartBtn = this.quickViewModal?.querySelector('.quick-view-add-cart');
    addToCartBtn?.addEventListener('click', () => {
      const selectedSize = this.quickViewModal?.querySelector('.size-option.selected')?.dataset.size;
      const quantity = parseInt(this.quickViewModal?.querySelector('.quantity-input')?.value) || 1;
      
      if (!selectedSize && product.sizes.length > 0) {
        if (window.showToast) window.showToast('Please select a size', 'warning');
        return;
      }
      
      if (this.cart) this.cart.add(product, quantity, selectedSize || null);
      this.closeQuickView();
    });
    
    // Wishlist
    const wishlistBtn = this.quickViewModal?.querySelector('.quick-view-wishlist');
    wishlistBtn?.addEventListener('click', () => {
      wishlistBtn.classList.toggle('active');
      const icon = wishlistBtn.querySelector('svg');
      if (wishlistBtn.classList.contains('active')) {
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />';
        if (window.showToast) window.showToast('Added to wishlist', 'success');
      } else {
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />';
        if (window.showToast) window.showToast('Removed from wishlist', 'info');
      }
    });
    
    // Quantity buttons
    this.quickViewModal?.querySelectorAll('.quantity-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = this.quickViewModal?.querySelector('.quantity-input');
        if (!input) return;
        
        const action = btn.dataset.action;
        const value = parseInt(input.value) || 1;
        const max = parseInt(input.max) || 10;
        const min = parseInt(input.min) || 1;
        
        if (action === 'increase' && value < max) input.value = value + 1;
        if (action === 'decrease' && value > min) input.value = value - 1;
      });
    });
  }
  
  // Filter products for shop page
  filterProducts(filters) {
    let filtered = [...this.products];
    
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(p => p.category === filters.category);
    }
    
    if (filters.priceRange) {
      const [min, max] = filters.priceRange;
      filtered = filtered.filter(p => p.price >= min && p.price <= max);
    }
    
    if (filters.colors && filters.colors.length > 0) {
      filtered = filtered.filter(p => 
        p.colors.some(c => filters.colors.includes(c))
      );
    }
    
    if (filters.sizes && filters.sizes.length > 0) {
      filtered = filtered.filter(p => 
        p.sizes.some(s => filters.sizes.includes(s))
      );
    }
    
    if (filters.sort) {
      switch (filters.sort) {
        case 'price-asc':
          filtered.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          filtered.sort((a, b) => b.price - a.price);
          break;
        case 'newest':
          filtered.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
          break;
        case 'rating':
          filtered.sort((a, b) => b.rating - a.rating);
          break;
        default:
          // featured/default
          break;
      }
    }
    
    return filtered;
  }
  
  getProductById(id) {
    return this.products.find((p) => sameId(p.id, id));
  }
}
