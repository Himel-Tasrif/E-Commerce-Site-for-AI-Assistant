/**
 * Stride - Product Data
 * Centralized product catalog for the e-commerce store
 */

window.products = [
  {
    id: 1,
    name: 'Air Max 270',
    category: 'Running',
    gender: 'men',
    price: 150,
    originalPrice: 180,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=600&fit=crop'
    ],
    rating: 4.8,
    reviewCount: 124,
    sizes: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12'],
    colors: ['Black/White', 'White/Black', 'Blue/Orange', 'Grey/Green'],
    description: 'The Air Max 270 delivers visible cushioning under every step with a large Max Air unit. The engineered mesh upper provides breathability and support while the foam midsole offers soft, responsive cushioning.',
    features: [
      'Max Air unit for maximum cushioning',
      'Engineered mesh upper for breathability',
      'Rubber outsole with waffle pattern for traction',
      'Foam midsole for soft, responsive ride',
      'Bootie construction for snug fit'
    ],
    isNew: true,
    isSale: true,
    tags: ['running', 'air max', 'cushioning', 'new arrival']
  },
  {
    id: 2,
    name: 'Air Jordan 1 Retro High OG',
    category: 'Basketball',
    gender: 'women',
    price: 170,
    originalPrice: null,
    image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1606811842175-4b4e4ae3b4e4?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop'
    ],
    rating: 4.9,
    reviewCount: 89,
    sizes: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12'],
    colors: ['Chicago', 'Bred', 'Royal', 'Shadow', 'UNC', 'Mocha'],
    description: 'The Air Jordan 1 Retro High OG stays true to the original 1985 design with premium leather and classic color blocking. The iconic silhouette that started it all returns with the same quality and attention to detail.',
    features: [
      'Premium leather upper for durability',
      'Air-Sole unit in heel for cushioning',
      'Rubber outsole with pivot circle for traction',
      'Classic high-top silhouette',
      'Wings logo on collar'
    ],
    isNew: false,
    isSale: false,
    tags: ['basketball', 'jordan', 'retro', 'iconic', 'leather']
  },
  {
    id: 3,
    name: 'Air Force 1 \'07',
    category: 'Lifestyle',
    gender: 'men',
    price: 110,
    originalPrice: 130,
    image: 'https://images.unsplash.com/photo-1606811842175-4b4e4ae3b4e4?w=600&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1606811842175-4b4e4ae3b4e4?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&h=600&fit=crop'
    ],
    rating: 4.7,
    reviewCount: 256,
    sizes: ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12'],
    colors: ['White/White', 'Black/Black', 'Triple White', 'Wheat', 'Sage'],
    description: 'The radiance lives on in the Nike Air Force 1 \'07, the b-ball OG that puts a fresh spin on what you know best: crisp leather, bold colors and the perfect amount of flash to let you shine.',
    features: [
      'Full-grain leather upper for durability',
      'Nike Air cushioning for all-day comfort',
      'Rubber cupsole with pivot points for traction',
      'Perforated toe box for breathability',
      'Padded collar for comfort'
    ],
    isNew: false,
    isSale: true,
    tags: ['lifestyle', 'air force 1', 'classic', 'leather', 'sale']
  },
  {
    id: 4,
    name: 'ZoomX Vaporfly Next% 3',
    category: 'Running',
    gender: 'women',
    price: 250,
    originalPrice: null,
    image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop'
    ],
    rating: 4.9,
    reviewCount: 67,
    sizes: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11'],
    colors: ['Prototype/White', 'Pink/Black', 'Green/Black', 'Orange/Black'],
    description: 'Designed for race day, the ZoomX Vaporfly Next% 3 gives you the speed you need to chase your personal best. A full-length carbon fiber plate and ZoomX foam deliver maximum energy return.',
    features: [
      'ZoomX foam for maximum energy return',
      'Full-length carbon fiber plate for propulsion',
      'Vaporweave upper - lightweight and moisture-resistant',
      'Nike Fast technology for race-day speed',
      'Offset heel for smooth transition'
    ],
    isNew: true,
    isSale: false,
    tags: ['running', 'racing', 'vaporfly', 'carbon plate', 'zoomx', 'new arrival']
  },
  {
    id: 5,
    name: 'Dunk Low Retro',
    category: 'Lifestyle',
    gender: 'unisex',
    price: 110,
    originalPrice: null,
    image: 'https://images.unsplash.com/photo-1606811842175-4b4e4ae3b4e4?w=600&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1606811842175-4b4e4ae3b4e4?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=600&fit=crop'
    ],
    rating: 4.8,
    reviewCount: 178,
    sizes: ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12'],
    colors: ['Panda', 'Syracuse', 'Kentucky', 'UNC', 'Michigan', 'St. John\'s'],
    description: 'From backboards to skateboards, the influence of the Nike Dunk Low is undeniable. Originally released in 1985, this retro version stays true to the original with premium leather and classic color blocking.',
    features: [
      'Leather and textile upper for durability',
      'Foam midsole for lightweight cushioning',
      'Rubber outsole with pivot circle for traction',
      'Padded low-cut collar for comfort',
      'Classic color-blocking design'
    ],
    isNew: false,
    isSale: false,
    tags: ['lifestyle', 'dunk', 'retro', 'skate', 'leather']
  },
  {
    id: 6,
    name: 'React Infinity Run Flyknit 3',
    category: 'Running',
    gender: 'men',
    price: 160,
    originalPrice: 180,
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=600&fit=crop'
    ],
    rating: 4.6,
    reviewCount: 92,
    sizes: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12'],
    colors: ['Black/White', 'Blue/Orange', 'Grey/Green', 'White/Black', 'Pink/Black'],
    description: 'The React Infinity Run Flyknit 3 keeps you running with a secure, stable feel and responsive cushioning. Updated Flyknit upper provides breathability and support where you need it most.',
    features: [
      'React foam for responsive cushioning',
      'Flyknit upper for adaptive fit',
      'Wider platform for stability',
      'Rocker geometry for smooth transitions',
      'Increased foam stack heights for softer feel'
    ],
    isNew: false,
    isSale: true,
    tags: ['running', 'react', 'flyknit', 'stability', 'sale']
  },
  {
    id: 7,
    name: 'Blazer Mid \'77 Vintage',
    category: 'Lifestyle',
    gender: 'women',
    price: 100,
    originalPrice: null,
    image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1606811842175-4b4e4ae3b4e4?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop'
    ],
    rating: 4.5,
    reviewCount: 134,
    sizes: ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12'],
    colors: ['White/Black', 'Black/White', 'Vintage Green', 'Vintage Red', 'Sail/Black'],
    description: 'The Nike Blazer Mid \'77 Vintage blends retro style with modern comfort. The vintage midsole finish and exposed foam tongue give it a heritage look while the padded collar adds comfort.',
    features: [
      'Premium leather upper with vintage finish',
      'Foam midsole for lightweight cushioning',
      'Rubber outsole with herringbone pattern',
      'Exposed foam tongue for retro aesthetic',
      'Padded collar for ankle comfort'
    ],
    isNew: false,
    isSale: false,
    tags: ['lifestyle', 'blazer', 'vintage', 'retro', 'mid-top']
  },
  {
    id: 8,
    name: 'Pegasus 40',
    category: 'Running',
    gender: 'kids',
    price: 130,
    originalPrice: null,
    image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop'
    ],
    rating: 4.7,
    reviewCount: 203,
    sizes: ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12'],
    colors: ['Black/White', 'Blue/Orange', 'Grey/Red', 'White/Black', 'Green/Black', 'Pink/White'],
    description: 'The Nike Pegasus 40 continues to put a spring in your step with responsive cushioning and a fit that feels made for you. Updated with a more breathable upper and improved heel fit.',
    features: [
      'React foam midsole for responsive ride',
      'Two Air Zoom units (forefoot & heel)',
      'Engineered mesh upper for breathability',
      'Waffle-inspired outsole for traction',
      'Improved heel fit and midfoot support'
    ],
    isNew: true,
    isSale: false,
    tags: ['running', 'pegasus', 'daily trainer', 'zoom air', 'new arrival']
  },
  {
    id: 9,
    name: 'Air Max 90',
    category: 'Lifestyle',
    gender: 'men',
    price: 130,
    originalPrice: 150,
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=600&fit=crop'
    ],
    rating: 4.7,
    reviewCount: 189,
    sizes: ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12'],
    colors: ['Infrared', 'White/Black', 'Black/White', 'Volt/Black', 'Blue/White'],
    description: 'The Nike Air Max 90 stays true to its OG running roots with the iconic Waffle sole, stitched overlays and classic TPU accents. The Max Air unit adds cushioning to your every step.',
    features: [
      'Leather and textile upper',
      'Max Air unit in heel for cushioning',
      'Waffle rubber outsole for traction',
      'TPU heel clip for stability',
      'Padded collar for comfort'
    ],
    isNew: false,
    isSale: true,
    tags: ['lifestyle', 'air max', '90s', 'retro', 'sale']
  },
  {
    id: 10,
    name: 'Zoom Freak 5',
    category: 'Basketball',
    gender: 'women',
    price: 140,
    originalPrice: null,
    image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1606811842175-4b4e4ae3b4e4?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop'
    ],
    rating: 4.8,
    reviewCount: 76,
    sizes: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12', '13'],
    colors: ['Black/White', 'Blue/Orange', 'Green/Black', 'Purple/Black', 'White/Red'],
    description: 'Giannis Antetokounmpo\'s signature shoe built for the Greek Freak\'s unique combination of power and speed. Zoom Air in the forefoot and Cushlon foam deliver responsive cushioning.',
    features: [
      'Zoom Air unit in forefoot for responsiveness',
      'Cushlon foam midsole for impact protection',
      'Molded TPU heel counter for stability',
      'Multidirectional traction pattern',
      'Lightweight mesh upper with containment'
    ],
    isNew: true,
    isSale: false,
    tags: ['basketball', 'giannis', 'zoom freak', 'signature', 'new arrival']
  },
  {
    id: 11,
    name: 'Cortez',
    category: 'Lifestyle',
    gender: 'unisex',
    price: 85,
    originalPrice: null,
    image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1606811842175-4b4e4ae3b4e4?w=600&h=600&fit=crop'
    ],
    rating: 4.6,
    reviewCount: 145,
    sizes: ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12'],
    colors: ['White/Black', 'Black/White', 'Red/White', 'Blue/White', 'Green/White'],
    description: 'The Nike Cortez is a timeless classic that started it all. Originally designed for running in 1972, it became a cultural icon. The leather upper and herringbone outsole deliver heritage style.',
    features: [
      'Leather upper with synthetic overlays',
      'Foam midsole for lightweight cushioning',
      'Herringbone rubber outsole for traction',
      'Classic 1972 silhouette',
      'Padded collar for comfort'
    ],
    isNew: false,
    isSale: false,
    tags: ['lifestyle', 'cortez', 'classic', 'heritage', '70s']
  },
  {
    id: 12,
    name: 'Ja 1',
    category: 'Basketball',
    gender: 'men',
    price: 120,
    originalPrice: null,
    image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1606811842175-4b4e4ae3b4e4?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop'
    ],
    rating: 4.7,
    reviewCount: 54,
    sizes: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12'],
    colors: ['Black/White', 'Red/Black', 'Blue/White', 'Purple/Black', 'Grey/Orange'],
    description: 'Ja Morant\'s first signature shoe built for explosive athleticism. A Zoom Air unit in the forefoot and foam midsole provide responsive cushioning for quick cuts and high-flying dunks.',
    features: [
      'Zoom Air unit in forefoot',
      'Foam midsole for cushioning',
      'TPU heel counter for lockdown',
      'Multidirectional herringbone traction',
      'Lightweight engineered mesh upper'
    ],
    isNew: true,
    isSale: false,
    tags: ['basketball', 'ja morant', 'signature', 'zoom air', 'new arrival']
  }
];

// Export for ES6 module usage
export const products = window.products;

// Export for CommonJS usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.products;
}