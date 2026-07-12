/**
 * Loads homepage hero + category tiles from site_content (admin-editable).
 * Falls back to existing HTML/local images when DB empty.
 */
import { requireSupabase, DEFAULT_TENANT_ID, isSupabaseConfigured } from './supabase-client.js';

const LOCAL_FALLBACKS = {
  hero: 'images/hero-shoe.jpg',
  category_men: 'images/category-men.jpg',
  category_women: 'images/category-women.jpg',
  category_kids: 'images/category-kids.jpg',
  category_running: 'images/category-running.jpg',
  category_lifestyle: 'images/category-lifestyle.jpg',
  category_sale: 'images/category-sale.jpg',
};

export async function loadSiteContent() {
  if (!isSupabaseConfigured) return applyLocalFallbacks();

  try {
    const { data, error } = await requireSupabase()
      .from('site_content')
      .select('*')
      .eq('tenant_id', DEFAULT_TENANT_ID)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data?.length) return applyLocalFallbacks();

    const byKey = Object.fromEntries(data.map((r) => [r.slot_key, r]));
    applyHero(byKey.hero);
    applyCategories(data.filter((r) => r.slot_key.startsWith('category_')));
  } catch (e) {
    console.warn('site content load failed', e);
    applyLocalFallbacks();
  }
}

function applyLocalFallbacks() {
  const heroImg = document.querySelector('.hero-image img');
  if (heroImg && (!heroImg.getAttribute('src') || heroImg.naturalWidth === 0)) {
    heroImg.src = LOCAL_FALLBACKS.hero;
  }
  // Ensure category imgs point at local files if broken
  document.querySelectorAll('.category-card[data-slot]').forEach((card) => {
    const key = card.dataset.slot;
    const img = card.querySelector('img');
    if (img && LOCAL_FALLBACKS[key]) img.src = LOCAL_FALLBACKS[key];
  });
}

function applyHero(row) {
  if (!row) {
    const img = document.querySelector('.hero-image img');
    if (img) img.src = LOCAL_FALLBACKS.hero;
    return;
  }
  const title = document.getElementById('hero-title');
  const desc = document.querySelector('.hero-description');
  const badge = document.querySelector('.hero-badge');
  const img = document.querySelector('.hero-image img');
  const meta = row.meta || {};

  if (title && row.title) {
    title.innerHTML = String(row.title).replace(/\.\s+/, '.<br>');
  }
  if (desc && row.subtitle) desc.textContent = row.subtitle;
  if (badge && meta.badge) badge.textContent = meta.badge;
  if (img) img.src = row.image_url || LOCAL_FALLBACKS.hero;
}

function applyCategories(rows) {
  const grid = document.getElementById('category-grid') || document.querySelector('.category-grid');
  if (!grid || !rows.length) {
    // still set data-slot fallbacks on existing cards
    const map = [
      ['men', 'category_men'],
      ['women', 'category_women'],
      ['kids', 'category_kids'],
      ['running', 'category_running'],
      ['lifestyle', 'category_lifestyle'],
      ['sale', 'category_sale'],
    ];
    grid?.querySelectorAll('.category-card').forEach((card, i) => {
      if (map[i]) card.dataset.slot = map[i][1];
    });
    applyLocalFallbacks();
    return;
  }

  grid.innerHTML = rows
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => {
      const img = r.image_url || LOCAL_FALLBACKS[r.slot_key] || LOCAL_FALLBACKS.category_men;
      const href = r.link_url || 'shop.html';
      return `
        <a href="${href}" class="category-card" role="listitem" data-slot="${r.slot_key}">
          <img src="${img}" alt="" loading="lazy">
          <div class="category-card-content">
            <h3 class="category-card-title">${r.title || ''}</h3>
            <p class="category-card-count">${r.subtitle || ''}</p>
          </div>
        </a>`;
    })
    .join('');
}
