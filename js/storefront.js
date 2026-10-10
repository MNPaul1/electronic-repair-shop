import { getProducts } from './product-store.js';
import { escapeHtml, formatPrice } from './utils.js';

let activeCategory = 'All';

function renderFilters(products) {
  const filterContainer = document.querySelector('#productFilters');
  const categories = [...new Set(products.map(product => product.category))];

  if (activeCategory !== 'All' && !categories.includes(activeCategory)) {
    activeCategory = 'All';
  }

  const filters = ['All', ...categories];

  filterContainer.innerHTML = filters.map(category => `
    <button
      class="filter-btn ${category === activeCategory ? 'active' : ''}"
      type="button"
      data-filter="${escapeHtml(category)}"
      aria-pressed="${category === activeCategory}"
    >
      ${escapeHtml(category)}
    </button>
  `).join('');

  filterContainer.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      activeCategory = button.dataset.filter;
      refreshProductCatalog();
    });
  });
}

function renderProductCards(products) {
  const query = document.querySelector('#productSearch').value.trim().toLowerCase();
  const visibleProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
    const searchText = `${product.name} ${product.description} ${product.category}`.toLowerCase();

    return matchesCategory && searchText.includes(query);
  });

  const grid = document.querySelector('#productGrid');
  document.querySelector('#emptyProducts').hidden = visibleProducts.length > 0;

  grid.innerHTML = visibleProducts.map(product => `
    <article class="product-card">
      <div class="product-image">
        ${product.image
          ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">`
          : '<span class="product-placeholder" aria-hidden="true">⌁</span>'}
      </div>
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

export function refreshProductCatalog() {
  const products = getProducts();
  renderFilters(products);
  renderProductCards(products);
}

export function initializeStorefront() {
  document.querySelector('#productSearch').addEventListener('input', refreshProductCatalog);
  refreshProductCatalog();
}
