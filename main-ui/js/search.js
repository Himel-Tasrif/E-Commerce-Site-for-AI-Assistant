/**
 * Stride - Search Module
 * Handles search functionality with debounced input, suggestions, and results
 */

export class Search {
  constructor(products = []) {
    this.input = document.getElementById('search-input');
    this.form = document.getElementById('search-form');
    this.suggestions = document.getElementById('search-suggestions');
    this.results = document.getElementById('search-results');
    this.modal = document.getElementById('search-modal');
    this.closeBtn = document.getElementById('search-close');
    this.openBtn = document.getElementById('search-btn');
    this.suggestionBtns = document.querySelectorAll('.search-suggestion');
    
    this.products = Array.isArray(products) ? products : [];
    this.debounceTimer = null;
    this.debounceDelay = 300;
    this.minQueryLength = 2;
    
    this.init();
  }
  
  async init() {
    // Products can be injected from main.js; if empty, try loading from globals/storage.
    if (!this.products.length) {
      await this.loadProducts();
    }
    this.bindEvents();
  }
  
  async loadProducts() {
    try {
      // Try to load from products.js module
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
      console.warn('Could not load products for search:', e);
      this.products = this.getFallbackProducts();
    }
  }
  
  getFallbackProducts() {
    return [
      { id: 1, name: 'Air Max 270', category: 'Running', price: 150 },
      { id: 2, name: 'Air Jordan 1', category: 'Basketball', price: 170 },
      { id: 3, name: 'Air Force 1', category: 'Lifestyle', price: 110 },
      { id: 4, name: 'ZoomX Vaporfly', category: 'Running', price: 250 },
      { id: 5, name: 'Dunk Low', category: 'Lifestyle', price: 110 },
      { id: 6, name: 'React Infinity', category: 'Running', price: 160 },
    ];
  }
  
  bindEvents() {
    // Open search modal
    this.openBtn?.addEventListener('click', () => this.open());
    
    // Close search modal
    this.closeBtn?.addEventListener('click', () => this.close());
    
    // Close on overlay click (modal overlay is #search-modal)
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });
    
    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal?.classList.contains('open')) this.close();
    });
    
    // Search input with debounce
    this.input?.addEventListener('input', (e) => this.handleInput(e.target.value));
    
    // Form submit
    this.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.performSearch(this.input.value);
    });
    
    // Suggestion buttons
    this.suggestionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.input.value = btn.textContent;
        this.performSearch(btn.textContent);
      });
    });
    
    // Focus input when modal opens
    this.modal?.addEventListener('transitionend', () => {
      if (this.modal.classList.contains('open')) {
        this.input?.focus();
      }
    });
  }
  
  open() {
    this.modal?.classList.add('open');
    this.modal?.querySelector('.modal')?.classList.add('open');
    document.body.style.overflow = 'hidden';
    this.input?.focus();
  }
  
  close() {
    this.modal?.classList.remove('open');
    this.modal?.querySelector('.modal')?.classList.remove('open');
    document.body.style.overflow = '';
    if (this.input) this.input.value = '';
    this.hideResults();
    this.showSuggestions();
  }
  
  handleInput(value) {
    clearTimeout(this.debounceTimer);
    
    if (value.length < this.minQueryLength) {
      this.showSuggestions();
      this.hideResults();
      return;
    }
    
    this.debounceTimer = setTimeout(() => {
      this.performSearch(value);
    }, this.debounceDelay);
  }
  
  performSearch(query) {
    const results = this.searchProducts(query);
    this.renderResults(results, query);
    this.hideSuggestions();
    this.showResults();
  }
  
  searchProducts(query) {
    const normalizedQuery = query.toLowerCase().trim();
    
    return this.products
      .filter(product => {
        const name = product.name.toLowerCase();
        const category = product.category?.toLowerCase() || '';
        return name.includes(normalizedQuery) || category.includes(normalizedQuery);
      })
      .slice(0, 8); // Limit results
  }
  
  renderResults(results, query) {
    if (!this.results) return;
    
    if (results.length === 0) {
      this.results.innerHTML = `
        <div class="search-no-results" style="padding: var(--space-8); text-align: center;">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" style="width: 48px; height: 48px; color: var(--color-gray-300); margin: 0 auto var(--space-4);">
            <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <h3 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2);">No results found</h3>
          <p style="color: var(--color-gray-500);">We couldn't find any products matching "${query}"</p>
        </div>
      `;
      return;
    }
    
    this.results.innerHTML = `
      <div class="search-results-list" style="max-height: 400px; overflow-y: auto;">
        ${results.map(product => `
          <a href="product.html?id=${product.id}" class="search-result-item" style="display: flex; align-items: center; gap: var(--space-4); padding: var(--space-3); border-bottom: 1px solid var(--color-gray-100); text-decoration: none; color: inherit; transition: background var(--transition-fast);">
            <img src="${product.image}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: var(--radius-md);" loading="lazy">
            <div style="flex: 1; min-width: 0;">
              <h4 style="font-weight: var(--font-weight-medium); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${product.name}</h4>
              <p style="font-size: var(--font-size-sm); color: var(--color-gray-500);">${product.category}</p>
            </div>
            <span style="font-weight: var(--font-weight-semibold);">$${product.price.toFixed(2)}</span>
          </a>
        `).join('')}
      </div>
      <div style="padding: var(--space-4); text-align: center; border-top: 1px solid var(--color-gray-200);">
        <a href="shop.html?q=${encodeURIComponent(query)}" class="btn btn-outline btn-sm">View All Results</a>
      </div>
    `;
  }
  
  showSuggestions() {
    this.suggestions?.classList.remove('hidden');
  }
  
  hideSuggestions() {
    this.suggestions?.classList.add('hidden');
  }
  
  showResults() {
    this.results?.classList.remove('hidden');
    this.results?.style.setProperty('display', 'block');
  }
  
  hideResults() {
    this.results?.classList.add('hidden');
    this.results?.style.setProperty('display', 'none');
  }
}
