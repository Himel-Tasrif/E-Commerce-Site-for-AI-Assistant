/**
 * Stride — Main Entry Point
 */
import { Cart } from './cart.js';
import { Search } from './search.js';
import { Components } from './components.js';
import { ProductRenderer } from './product-renderer.js';
import { products as seedProducts } from './products.js';
import { getProducts, loadProductsFromApi, subscribeToProductUpdates, productMatchesFilter } from './product-store.js';
import { loadSiteContent } from './site-content.js';
import { mountHeaderAuth } from './header-auth.js';

const App = {
  cart: null,
  search: null,
  components: null,
  productRenderer: null,

  async init() {
    const initialProducts = getProducts(seedProducts);

    this.cart = new Cart();
    this.search = new Search(initialProducts);
    this.components = new Components();
    this.productRenderer = new ProductRenderer(this.cart, initialProducts);

    this.initNavigation();
    this.initMobileMenu();
    this.initScrollEffects();
    this.initProductRendering();
    this.initNewsletter();
    this.initSmoothScroll();
    this.components.init();

    // Live catalog from Supabase (admin CRUD → storefront)
    const fromApi = await loadProductsFromApi(seedProducts);
    this.applyProductList(fromApi);

    await loadSiteContent();
    mountHeaderAuth();

    subscribeToProductUpdates(
      (next) => this.applyProductList(next),
      () => getProducts(seedProducts)
    );

    console.log('Stride initialized');
  },

  applyProductList(list) {
    this.search.products = list;
    this.productRenderer.products = list;
    this.productRenderer.renderFeaturedProducts(8);
    this.productRenderer.renderShopProducts();
    this.initShopInteractions(true);
  },

  initNavigation() {
    const header = document.getElementById('header') || document.querySelector('header.header');
    const navLinks = document.querySelectorAll('.header-nav-link');

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.forEach((l) => l.classList.remove('active'));
        link.classList.add('active');
      });
    });

    if (!header) return;

    let lastScroll = 0;
    window.addEventListener(
      'scroll',
      () => {
        const currentScroll = window.pageYOffset;
        header.classList.toggle('scrolled', currentScroll > 100);
        header.classList.toggle(
          'header-hidden',
          currentScroll > lastScroll && currentScroll > 200
        );
        lastScroll = currentScroll;
      },
      { passive: true }
    );
  },

  initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileNavLinks = document.querySelectorAll('.mobile-menu-link');
    const openIcon = document.getElementById('menu-open-icon');
    const closeIcon = document.getElementById('menu-close-icon');

    const openMenu = () => {
      if (!mobileMenu) return;
      mobileMenu.classList.add('open');
      mobileMenuBtn?.setAttribute('aria-expanded', 'true');
      if (openIcon) openIcon.style.display = 'none';
      if (closeIcon) closeIcon.style.display = 'block';
      document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      if (!mobileMenu) return;
      mobileMenu.classList.remove('open');
      mobileMenuBtn?.setAttribute('aria-expanded', 'false');
      if (openIcon) openIcon.style.display = 'block';
      if (closeIcon) closeIcon.style.display = 'none';
      document.body.style.overflow = '';
    };

    mobileMenuBtn?.addEventListener('click', () => {
      if (mobileMenu?.classList.contains('open')) closeMenu();
      else openMenu();
    });

    mobileNavLinks.forEach((link) => link.addEventListener('click', closeMenu));
    mobileMenu?.addEventListener('click', (e) => {
      if (e.target === mobileMenu) closeMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu?.classList.contains('open')) closeMenu();
    });
  },

  initScrollEffects() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('animate-in');
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el));
  },

  initProductRendering() {
    this.productRenderer.init();
    this.productRenderer.renderFeaturedProducts(8);
    this.productRenderer.renderShopProducts();
    this.initShopInteractions(false);
  },

  _shopBound: false,

  initShopInteractions(reapplyOnly) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    const filterButtons = document.querySelectorAll('.filter-btn');
    const sortSelect = document.getElementById('sort-select');
    const resultsEl = document.getElementById('shop-results');

    const applyFromState = (state) => {
      let list = [...this.productRenderer.products];

      if (state.category && state.category !== 'all') {
        list = list.filter((p) => productMatchesFilter(p, state.category));
      }

      if (state.q) {
        const q = String(state.q).toLowerCase();
        list = list.filter(
          (p) =>
            String(p.name).toLowerCase().includes(q) ||
            String(p.category || '').toLowerCase().includes(q) ||
            String(p.brand || '').toLowerCase().includes(q) ||
            (p.tags || []).some((t) => String(t).toLowerCase().includes(q))
        );
      }

      switch (state.sort) {
        case 'price-low':
          list.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          list.sort((a, b) => b.price - a.price);
          break;
        case 'newest':
          list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
          break;
        default:
          break;
      }

      this.productRenderer.renderShopProducts(list, grid);
      if (resultsEl) {
        resultsEl.textContent = `Showing ${list.length} of ${this.productRenderer.products.length} products`;
      }

      // Sync filter button active state from URL
      filterButtons.forEach((btn) => {
        const match = (btn.dataset.category || 'all') === (state.category || 'all');
        btn.classList.toggle('active', match);
        btn.setAttribute('aria-selected', match ? 'true' : 'false');
      });

      const heroTitle = document.getElementById('shop-hero-title');
      if (heroTitle && state.category && state.category !== 'all') {
        const label = state.category.charAt(0).toUpperCase() + state.category.slice(1);
        heroTitle.textContent =
          state.category === 'new' ? 'New Arrivals' : label === 'Sale' ? 'Sale' : `${label}'s Collection`.replace("s's", 's');
        if (['men', 'women', 'kids'].includes(state.category)) {
          heroTitle.textContent = `${label}'s Collection`;
        } else if (state.category === 'sale') {
          heroTitle.textContent = 'Sale';
        } else if (state.category === 'new') {
          heroTitle.textContent = 'New Arrivals';
        } else {
          heroTitle.textContent = label;
        }
      } else if (heroTitle) {
        heroTitle.textContent = 'Shop All';
      }
    };

    const readUrlState = () => {
      const params = new URLSearchParams(window.location.search);
      return {
        category: params.get('category') || 'all',
        q: params.get('q') || '',
        sort: sortSelect?.value || 'featured',
      };
    };

    if (!this._shopBound) {
      this._shopBound = true;
      filterButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const category = btn.dataset.category || 'all';
          const params = new URLSearchParams(window.location.search);
          if (category === 'all') params.delete('category');
          else params.set('category', category);
          const qs = params.toString();
          history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
          applyFromState(readUrlState());
        });
      });
      sortSelect?.addEventListener('change', () => applyFromState(readUrlState()));
    }

    applyFromState(readUrlState());
    if (reapplyOnly) return;
  },

  initNewsletter() {
    const form = document.getElementById('newsletter-form');
    const emailInput = document.getElementById('newsletter-email');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      if (!this.validateEmail(email)) {
        this.showToast('Please enter a valid email address', 'error');
        return;
      }
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Subscribing...';
      submitBtn.disabled = true;
      try {
        await new Promise((r) => setTimeout(r, 800));
        this.showToast('Thanks for subscribing!', 'success');
        form.reset();
      } catch {
        this.showToast('Something went wrong. Please try again.', 'error');
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  },

  initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (!target) return;
        e.preventDefault();
        const offset = target.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top: offset, behavior: 'smooth' });
      });
    });
  },

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="toast-message">${message}</div>
      <button class="toast-close" aria-label="Dismiss">×</button>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    toast.querySelector('.toast-close').addEventListener('click', () => this.removeToast(toast));
    setTimeout(() => this.removeToast(toast), 5000);
  },

  removeToast(toast) {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  },
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.App = App;
window.showToast = App.showToast.bind(App);
