/**
 * Stride - Components Module
 * Handles modals, dropdowns, carousels, toasts, and other interactive components
 */

export class Components {
  constructor() {
    this.modals = new Map();
    this.dropdowns = new Map();
    this.carousels = new Map();
    this.toasts = [];
  }
  
  init() {
    this.initModals();
    this.initDropdowns();
    this.initCarousels();
    this.initToasts();
    this.initTabs();
    this.initAccordions();
    this.initQuantitySelectors();
    this.initWishlistButtons();
    this.initQuickViewButtons();
  }
  
  // ===== MODALS =====
  initModals() {
    // Find all modals
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      const modal = overlay.querySelector('.modal');
      const closeBtn = overlay.querySelector('.modal-close');
      const id = overlay.id;
      
      this.modals.set(id, {
        overlay,
        modal,
        closeBtn,
        isOpen: false,
        onOpen: null,
        onClose: null
      });
      
      // Close button
      closeBtn?.addEventListener('click', () => this.closeModal(id));
      
      // Close on overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeModal(id);
      });
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.modals.forEach((_, id) => {
          if (this.modals.get(id).isOpen) this.closeModal(id);
        });
      }
    });
  }
  
  openModal(id, options = {}) {
    const modalData = this.modals.get(id);
    if (!modalData) return;
    
    modalData.overlay.classList.add('open');
    modalData.modal.classList.add('open');
    modalData.isOpen = true;
    document.body.style.overflow = 'hidden';
    
    // Focus management
    const focusable = modalData.modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
    
    // Trap focus
    this.trapFocus(modalData.modal);
    
    // Call onOpen callback
    if (modalData.onOpen) modalData.onOpen();
    if (options.onOpen) options.onOpen();
  }
  
  closeModal(id) {
    const modalData = this.modals.get(id);
    if (!modalData || !modalData.isOpen) return;
    
    modalData.overlay.classList.remove('open');
    modalData.modal.classList.remove('open');
    modalData.isOpen = false;
    document.body.style.overflow = '';
    
    // Call onClose callback
    if (modalData.onClose) modalData.onClose();
  }
  
  trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    element.addEventListener('keydown', function handleTab(e) {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    });
  }
  
  // ===== DROPDOWNS =====
  initDropdowns() {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
      const trigger = dropdown.querySelector('.dropdown-trigger');
      const menu = dropdown.querySelector('.dropdown-menu');
      const id = dropdown.id || `dropdown-${Math.random().toString(36).substr(2, 9)}`;
      
      if (!trigger || !menu) return;
      
      this.dropdowns.set(id, { dropdown, trigger, menu, isOpen: false });
      
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDropdown(id);
      });
      
      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) this.closeDropdown(id);
      });
      
      // Keyboard navigation
      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeDropdown(id);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.openDropdown(id);
          menu.querySelector('[role="menuitem"]')?.focus();
        }
      });
      
      menu.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeDropdown(id);
          trigger.focus();
        }
      });
    });
  }
  
  openDropdown(id) {
    const data = this.dropdowns.get(id);
    if (!data) return;
    
    data.dropdown.classList.add('open');
    data.menu.setAttribute('aria-hidden', 'false');
    data.trigger.setAttribute('aria-expanded', 'true');
    data.isOpen = true;
  }
  
  closeDropdown(id) {
    const data = this.dropdowns.get(id);
    if (!data) return;
    
    data.dropdown.classList.remove('open');
    data.menu.setAttribute('aria-hidden', 'true');
    data.trigger.setAttribute('aria-expanded', 'false');
    data.isOpen = false;
  }
  
  toggleDropdown(id) {
    const data = this.dropdowns.get(id);
    if (data.isOpen) this.closeDropdown(id);
    else this.openDropdown(id);
  }
  
  // ===== CAROUSELS =====
  initCarousels() {
    document.querySelectorAll('.carousel').forEach(carousel => {
      const track = carousel.querySelector('.carousel-track');
      const slides = carousel.querySelectorAll('.carousel-slide');
      const prevBtn = carousel.querySelector('.carousel-prev');
      const nextBtn = carousel.querySelector('.carousel-next');
      const dotsContainer = carousel.querySelector('.carousel-dots');
      const id = carousel.id || `carousel-${Math.random().toString(36).substr(2, 9)}`;
      
      if (!track || slides.length === 0) return;
      
      let currentIndex = 0;
      let autoPlayTimer = null;
      const autoPlayDelay = 5000;
      
      // Create dots
      if (dotsContainer) {
        dotsContainer.innerHTML = slides.map((_, i) => 
          `<button class="carousel-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Go to slide ${i + 1}"></button>`
        ).join('');
      }
      
      const dots = dotsContainer?.querySelectorAll('.carousel-dot');
      
      const updateCarousel = () => {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots?.forEach((dot, i) => {
          dot.classList.toggle('active', i === currentIndex);
        });
      };
      
      const goToSlide = (index) => {
        currentIndex = (index + slides.length) % slides.length;
        updateCarousel();
      };
      
      const nextSlide = () => goToSlide(currentIndex + 1);
      const prevSlide = () => goToSlide(currentIndex - 1);
      
      // Event listeners
      nextBtn?.addEventListener('click', () => {
        nextSlide();
        resetAutoPlay();
      });
      
      prevBtn?.addEventListener('click', () => {
        prevSlide();
        resetAutoPlay();
      });
      
      dots?.forEach(dot => {
        dot.addEventListener('click', () => {
          goToSlide(parseInt(dot.dataset.index));
          resetAutoPlay();
        });
      });
      
      // Touch/swipe support
      let touchStartX = 0;
      let touchEndX = 0;
      
      carousel.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });
      
      carousel.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
      }, { passive: true });
      
      const handleSwipe = () => {
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) nextSlide();
          else prevSlide();
          resetAutoPlay();
        }
      };
      
      // Auto-play
      const startAutoPlay = () => {
        autoPlayTimer = setInterval(nextSlide, autoPlayDelay);
      };
      
      const resetAutoPlay = () => {
        clearInterval(autoPlayTimer);
        startAutoPlay();
      };
      
      // Pause on hover
      carousel.addEventListener('mouseenter', () => clearInterval(autoPlayTimer));
      carousel.addEventListener('mouseleave', startAutoPlay);
      
      // Keyboard navigation
      carousel.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') prevSlide();
        if (e.key === 'ArrowRight') nextSlide();
      });
      
      // Initialize
      updateCarousel();
      startAutoPlay();
      
      this.carousels.set(id, { carousel, goToSlide, nextSlide, prevSlide });
    });
  }
  
  // ===== TOASTS =====
  initToasts() {
    // Toast container is created in HTML
    // This just ensures the global showToast function works
    window.showToast = this.showToast.bind(this);
  }
  
  showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    
    const icons = {
      success: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>',
      error: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 15.75h.007v.008H12v-.008Z" /></svg>',
      warning: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 15.75h.007v.008H12v-.008Z" /></svg>',
      info: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>'
    };
    
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-message">${message}</div>
      <button class="toast-close" aria-label="Dismiss notification">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    `;
    
    container.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    
    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
      this.removeToast(toast);
    });
    
    // Auto remove
    setTimeout(() => this.removeToast(toast), duration);
    
    return toast;
  }
  
  removeToast(toast) {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }
  
  // ===== TABS =====
  initTabs() {
    document.querySelectorAll('.tabs').forEach(tabs => {
      const triggers = tabs.querySelectorAll('.tab-trigger');
      const panels = tabs.querySelectorAll('.tab-panel');
      
      triggers.forEach((trigger, index) => {
        trigger.addEventListener('click', () => {
          triggers.forEach(t => t.classList.remove('active'));
          panels.forEach(p => p.classList.remove('active'));
          
          trigger.classList.add('active');
          panels[index]?.classList.add('active');
          
          // Update ARIA
          triggers.forEach(t => t.setAttribute('aria-selected', 'false'));
          trigger.setAttribute('aria-selected', 'true');
        });
        
        // Keyboard navigation
        trigger.addEventListener('keydown', (e) => {
          let newIndex = index;
          if (e.key === 'ArrowRight') newIndex = (index + 1) % triggers.length;
          if (e.key === 'ArrowLeft') newIndex = (index - 1 + triggers.length) % triggers.length;
          if (e.key === 'Home') newIndex = 0;
          if (e.key === 'End') newIndex = triggers.length - 1;
          
          if (newIndex !== index) {
            e.preventDefault();
            triggers[newIndex].click();
            triggers[newIndex].focus();
          }
        });
      });
    });
  }
  
  // ===== ACCORDIONS =====
  initAccordions() {
    document.querySelectorAll('.accordion').forEach(accordion => {
      const items = accordion.querySelectorAll('.accordion-item');
      
      items.forEach(item => {
        const trigger = item.querySelector('.accordion-trigger');
        const content = item.querySelector('.accordion-content');
        
        if (!trigger || !content) return;
        
        trigger.addEventListener('click', () => {
          const isOpen = item.classList.contains('open');
          
          // Close all if not allowing multiple
          if (!accordion.classList.contains('accordion-multiple')) {
            items.forEach(i => {
              i.classList.remove('open');
              i.querySelector('.accordion-trigger')?.setAttribute('aria-expanded', 'false');
              i.querySelector('.accordion-content')?.setAttribute('hidden', '');
            });
          }
          
          if (!isOpen) {
            item.classList.add('open');
            trigger.setAttribute('aria-expanded', 'true');
            content.removeAttribute('hidden');
          }
        });
      });
    });
  }
  
  // ===== QUANTITY SELECTORS =====
  initQuantitySelectors() {
    document.querySelectorAll('.quantity-selector').forEach(selector => {
      const input = selector.querySelector('.quantity-input');
      const decreaseBtn = selector.querySelector('[data-action="decrease"]');
      const increaseBtn = selector.querySelector('[data-action="increase"]');
      const min = parseInt(input?.min) || 1;
      const max = parseInt(input?.max) || 99;
      
      decreaseBtn?.addEventListener('click', () => {
        const value = parseInt(input.value) || min;
        if (value > min) input.value = value - 1;
        input.dispatchEvent(new Event('change'));
      });
      
      increaseBtn?.addEventListener('click', () => {
        const value = parseInt(input.value) || min;
        if (value < max) input.value = value + 1;
        input.dispatchEvent(new Event('change'));
      });
      
      input?.addEventListener('change', () => {
        let value = parseInt(input.value) || min;
        value = Math.max(min, Math.min(max, value));
        input.value = value;
      });
    });
  }
  
  // ===== WISHLIST BUTTONS =====
  initWishlistButtons() {
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const isActive = btn.classList.toggle('active');
        const icon = btn.querySelector('svg');
        
        if (isActive) {
          icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />';
          if (window.showToast) window.showToast('Added to wishlist', 'success');
        } else {
          icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />';
          if (window.showToast) window.showToast('Removed from wishlist', 'info');
        }
      });
    });
  }
  
  // ===== QUICK VIEW BUTTONS =====
  initQuickViewButtons() {
    document.querySelectorAll('.quick-view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const productId = btn.dataset.productId;
        if (productId && window.App?.productRenderer) {
          window.App.productRenderer.openQuickView(productId);
        }
      });
    });
  }
  
  // ===== LAZY LOADING IMAGES =====
  initLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            if (img.dataset.srcset) {
              img.srcset = img.dataset.srcset;
              img.removeAttribute('data-srcset');
            }
            img.classList.add('loaded');
            imageObserver.unobserve(img);
          }
        });
      }, { rootMargin: '50px' });
      
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }
}

// Initialize components when DOM is ready
let componentsInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  componentsInstance = new Components();
});

export const components = componentsInstance;