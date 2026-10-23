import { escapeHtml, formatPrice } from './utils.js';
import { productImages, validateCatalog } from './catalog.js';

let activeCategory = null;
let products = [];
let catalogStatus = 'loading';

function renderFilters() {
  const filterContainer = document.querySelector('#productFilters');
  const categories = [...new Set(products.map(product => product.category))];

  if (activeCategory !== null && !categories.includes(activeCategory)) {
    activeCategory = null;
  }

  const filters = [null, ...categories];

  filterContainer.innerHTML = filters.map(category => `
    <button
      class="filter-btn ${category === activeCategory ? 'active' : ''}"
      type="button"
      aria-pressed="${category === activeCategory}"
    >
      ${category === null ? 'All' : escapeHtml(category)}
    </button>
  `).join('');

  filterContainer.querySelectorAll('button').forEach((button, index) => {
    button.addEventListener('click', () => {
      activeCategory = filters[index];
      refreshProductCatalog();
    });
  });
}

function renderProductCards() {
  const query = document.querySelector('#productSearch').value.trim().toLowerCase();
  const visibleProducts = products.filter(product => {
    const matchesCategory = activeCategory === null || product.category === activeCategory;
    const searchText = `${product.name} ${product.description} ${product.category}`.toLowerCase();

    return matchesCategory && searchText.includes(query);
  });

  const grid = document.querySelector('#productGrid');
  const emptyState = document.querySelector('#emptyProducts');
  emptyState.hidden = visibleProducts.length > 0;
  emptyState.textContent = products.length === 0
    ? 'No products are listed right now. Call the shop for current stock.'
    : 'No products match that filter.';

  grid.innerHTML = visibleProducts.map(product => `
    <article class="product-card" data-product-id="${escapeHtml(product.id)}" data-photo-index="0">
      <div class="product-image">
        ${product.image
          ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async">`
          : '<span class="product-placeholder" aria-hidden="true">⌁</span>'}
      </div>
      ${productImages(product).length > 1 ? `<div class="product-gallery-controls">
        <button type="button" data-photo-step="-1" aria-label="Previous photo of ${escapeHtml(product.name)}">‹</button>
        <span class="photo-count">1 / ${productImages(product).length}</span>
        <button type="button" data-photo-step="1" aria-label="Next photo of ${escapeHtml(product.name)}">›</button>
      </div>` : ''}
      <div class="product-body">
        <div class="product-meta">
          <span>${escapeHtml(product.category)}</span>
          <span class="${product.inStock ? 'stock' : 'out'}">
            ${product.inStock ? 'In stock' : 'Ask for stock'}
          </span>
        </div>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description)}</p>
        <div class="price-row">
          <span class="price">${formatPrice(product.price)}</span>
          <a href="tel:+16048080496">Call to hold →</a>
        </div>
      </div>
    </article>
  `).join('');

  addImageFallbacks(grid);
}

function changePhoto(event) {
  const button = event.target.closest?.('[data-photo-step]');
  if (!button) return;
  const card = button.closest('.product-card');
  const product = products.find(item => item.id === card?.dataset.productId);
  if (!product) return;
  const images = productImages(product);
  if (images.length < 2) return;
  const index = (Number(card.dataset.photoIndex) + Number(button.dataset.photoStep) + images.length) % images.length;
  card.dataset.photoIndex = String(index);
  const frame = card.querySelector('.product-image');
  frame.innerHTML = `<img src="${escapeHtml(images[index])}" alt="${escapeHtml(product.name)} photo ${index + 1} of ${images.length}" loading="lazy" decoding="async">`;
  card.querySelector('.photo-count').textContent = `${index + 1} / ${images.length}`;
  addImageFallbacks(frame);
}

function addImageFallbacks(grid) {
  grid.querySelectorAll('.product-image img').forEach(image => {
    image.addEventListener('error', () => {
      const placeholder = document.createElement('span');
      placeholder.className = 'product-placeholder';
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.textContent = '⌁';
      image.replaceWith(placeholder);
    }, { once: true });
  });
}

function refreshProductCatalog() {
  if (catalogStatus !== 'ready') return;
  renderFilters();
  renderProductCards();
}

function showCatalogError() {
  catalogStatus = 'error';
  document.querySelector('#productFilters').innerHTML = '';
  document.querySelector('#productGrid').innerHTML = '';
  const emptyState = document.querySelector('#emptyProducts');
  emptyState.textContent = 'Product listings could not be loaded. Please reload the page or call the shop for current stock.';
  emptyState.hidden = false;
}

export async function initializeStorefront() {
  activeCategory = null;
  products = [];
  catalogStatus = 'loading';
  document.querySelector('#productSearch').addEventListener('input', refreshProductCatalog);
  document.querySelector('#productGrid').addEventListener('click', changePhoto);
  const loading = document.querySelector('#emptyProducts');
  loading.textContent = 'Loading products…';
  loading.hidden = false;

  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error(`Catalogue request failed (${response.status}).`);
    const body = await response.json();
    products = validateCatalog(body.products);
    catalogStatus = 'ready';
    refreshProductCatalog();
  } catch (error) {
    console.error('Could not load product API:', error);
    showCatalogError();
  }
}
