import { escapeHtml, formatPrice } from './utils.js';
import { productImages, validateCatalog } from './catalog.js';

let activeCategory = null;
let products = [];
let catalogStatus = 'loading';
let productDialog;
let activeDialogProduct = null;
let activeDialogPhotoIndex = 0;
let lastDialogTrigger = null;

function initializeProductDialog() {
  productDialog = document.createElement('dialog');
  productDialog.className = 'product-dialog';
  productDialog.id = 'productDetailsDialog';
  productDialog.setAttribute('aria-labelledby', 'productDialogTitle');
  productDialog.setAttribute('aria-describedby', 'productDialogDescription');
  productDialog.innerHTML = `
    <div class="product-dialog-panel">
      <button class="product-dialog-close" type="button" data-dialog-close aria-label="Close product details">×</button>
      <div class="product-dialog-layout">
        <div class="product-dialog-gallery" data-dialog-gallery></div>
        <div class="product-dialog-info">
          <div class="product-meta">
            <span data-dialog-category></span>
            <span data-dialog-stock></span>
          </div>
          <h2 id="productDialogTitle" data-dialog-title></h2>
          <p class="product-dialog-description" id="productDialogDescription" data-dialog-description></p>
          <div class="product-dialog-price" data-dialog-price></div>
          <a class="btn product-dialog-call" href="tel:+16048080496">Call to ask about this product</a>
        </div>
      </div>
    </div>
  `;
  document.body.append(productDialog);

  productDialog.querySelector('[data-dialog-close]').addEventListener('click', () => productDialog.close());
  productDialog.addEventListener('click', event => {
    if (event.target === productDialog) productDialog.close();
    changeDialogPhoto(event);
  });
  productDialog.addEventListener('close', () => {
    document.body.classList.remove('product-dialog-open');
    if (lastDialogTrigger?.isConnected) lastDialogTrigger.focus();
    lastDialogTrigger = null;
    activeDialogProduct = null;
  });
}

function renderDialogPhoto() {
  if (!productDialog || !activeDialogProduct) return;

  const gallery = productDialog.querySelector('[data-dialog-gallery]');
  const images = productImages(activeDialogProduct);
  const image = images[activeDialogPhotoIndex];
  gallery.innerHTML = `
    <div class="product-dialog-photo">
      ${image
        ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(activeDialogProduct.name)} photo ${activeDialogPhotoIndex + 1} of ${images.length}" decoding="async">`
        : '<span class="product-placeholder" aria-hidden="true">⌁</span>'}
      ${images.length > 1 ? `
        <div class="product-dialog-gallery-controls" role="group" aria-label="Product photos">
          <button type="button" data-dialog-photo-step="-1" aria-label="Previous photo">‹</button>
          <span aria-live="polite" aria-atomic="true">${activeDialogPhotoIndex + 1} / ${images.length}</span>
          <button type="button" data-dialog-photo-step="1" aria-label="Next photo">›</button>
        </div>` : ''}
    </div>
  `;
  addImageFallbacks(gallery);
}

function openProductDialog(product, trigger) {
  if (!productDialog || !product || productDialog.open) return;

  activeDialogProduct = product;
  activeDialogPhotoIndex = 0;
  lastDialogTrigger = trigger;
  productDialog.querySelector('[data-dialog-category]').textContent = product.category;

  const stock = productDialog.querySelector('[data-dialog-stock]');
  stock.className = product.inStock ? 'stock' : 'out';
  stock.textContent = product.inStock ? 'In stock' : 'Ask for stock';

  productDialog.querySelector('[data-dialog-title]').textContent = product.name;
  productDialog.querySelector('[data-dialog-description]').textContent = product.description || 'No description available.';
  productDialog.querySelector('[data-dialog-price]').textContent = formatPrice(product.price);
  renderDialogPhoto();

  document.body.classList.add('product-dialog-open');
  productDialog.showModal();
  productDialog.querySelector('[data-dialog-close]').focus({ preventScroll: true });
}

function openProductFromCard(event) {
  const card = event.target.closest?.('.product-card');
  if (!card || event.target.closest?.('[data-photo-step], a')) return;

  const trigger = event.target.closest?.('[data-open-product]') ?? card.querySelector('[data-open-product]');
  const product = products.find(item => item.id === card?.dataset.productId);
  if (product) openProductDialog(product, trigger);
}

function changeDialogPhoto(event) {
  const button = event.target.closest?.('[data-dialog-photo-step]');
  if (!button || !activeDialogProduct) return;

  const images = productImages(activeDialogProduct);
  if (images.length < 2) return;
  activeDialogPhotoIndex = (activeDialogPhotoIndex + Number(button.dataset.dialogPhotoStep) + images.length) % images.length;
  renderDialogPhoto();
}

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
  const productLimit = Number(grid.dataset?.productLimit);
  const displayedProducts = productLimit > 0
    ? visibleProducts.slice(0, productLimit)
    : visibleProducts;
  const emptyState = document.querySelector('#emptyProducts');
  emptyState.hidden = visibleProducts.length > 0;
  emptyState.textContent = products.length === 0
    ? 'No products are listed right now. Call the shop for current stock.'
    : 'No products match that filter.';

  grid.innerHTML = displayedProducts.map(product => {
    const images = productImages(product);
    return `
      <article class="product-card" data-product-id="${escapeHtml(product.id)}" data-photo-index="0">
        <div class="product-image">
          <button class="product-image-trigger" type="button" data-open-product aria-haspopup="dialog" aria-controls="productDetailsDialog" aria-label="View details for ${escapeHtml(product.name)}">
            <div class="product-image-media">
              ${product.image
                ? `<img src="${escapeHtml(product.image)}" alt="" loading="lazy" decoding="async">`
                : '<span class="product-placeholder" aria-hidden="true">⌁</span>'}
            </div>
          </button>
          ${images.length > 1 ? `<div class="product-gallery-controls" role="group" aria-label="Photo gallery for ${escapeHtml(product.name)}">
            <button type="button" data-photo-step="-1" aria-label="Previous photo of ${escapeHtml(product.name)}">‹</button>
            <span class="photo-count" aria-live="polite" aria-atomic="true">1 / ${images.length}</span>
            <button type="button" data-photo-step="1" aria-label="Next photo of ${escapeHtml(product.name)}">›</button>
          </div>` : ''}
        </div>
        <div class="product-body">
          <div class="product-meta">
            <span>${escapeHtml(product.category)}</span>
            <span class="${product.inStock ? 'stock' : 'out'}">
              ${product.inStock ? 'In stock' : 'Ask for stock'}
            </span>
          </div>
          <h3><button class="product-title-trigger" type="button" data-open-product aria-haspopup="dialog" aria-controls="productDetailsDialog">${escapeHtml(product.name)}</button></h3>
          <p>${escapeHtml(product.description)}</p>
          <button class="product-details-link" type="button" data-open-product aria-haspopup="dialog" aria-controls="productDetailsDialog">View full details <span aria-hidden="true">↗</span></button>
          <div class="price-row">
            <span class="price">${formatPrice(product.price)}</span>
            <a href="tel:+16048080496">Call to hold →</a>
          </div>
        </div>
      </article>
    `;
  }).join('');

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
  const media = card.querySelector('.product-image-media');
  media.innerHTML = `<img src="${escapeHtml(images[index])}" alt="${escapeHtml(product.name)} photo ${index + 1} of ${images.length}" loading="lazy" decoding="async">`;
  card.querySelector('.photo-count').textContent = `${index + 1} / ${images.length}`;
  addImageFallbacks(media);
}

function addImageFallbacks(grid) {
  grid.querySelectorAll('img').forEach(image => {
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
  initializeProductDialog();
  document.querySelector('#productSearch').addEventListener('input', refreshProductCatalog);
  document.querySelector('#productGrid').addEventListener('click', changePhoto);
  document.querySelector('#productGrid').addEventListener('click', openProductFromCard);
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
