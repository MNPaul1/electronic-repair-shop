import {
  addProduct,
  getProducts,
  removeProduct,
  restoreDefaultProducts,
  updateProduct
} from './product-store.js';
import { refreshProductCatalog } from './storefront.js';
import { escapeHtml, formatPrice } from './utils.js';

function resetProductForm() {
  const form = document.querySelector('#productForm');
  form.reset();
  form.elements.namedItem('id').value = '';
  form.elements.namedItem('inStock').checked = true;
  document.querySelector('#saveProductButton').textContent = 'Add product';
  document.querySelector('#cancelEdit').hidden = true;
}

function startEditingProduct(productId) {
  const product = getProducts().find(item => item.id === productId);
  if (!product) return;

  const form = document.querySelector('#productForm');
  form.elements.namedItem('id').value = product.id;
  form.elements.namedItem('name').value = product.name;
  form.elements.namedItem('category').value = product.category;
  form.elements.namedItem('price').value = product.price;
  form.elements.namedItem('image').value = product.image;
  form.elements.namedItem('description').value = product.description;
  form.elements.namedItem('inStock').checked = product.inStock;

  document.querySelector('#saveProductButton').textContent = 'Save changes';
  document.querySelector('#cancelEdit').hidden = false;
  form.elements.namedItem('name').focus();
}

function renderAdminProducts() {
  const productList = document.querySelector('#adminProductList');
  const products = getProducts();

  productList.innerHTML = products.map(product => `
    <div class="admin-product-row">
      <div>
        <strong>${escapeHtml(product.name)}</strong><br>
        <small>${escapeHtml(product.category)} · ${product.inStock ? 'In stock' : 'Not in stock'}</small>
      </div>
      <span class="product-price">${formatPrice(product.price)}</span>
      <div class="admin-product-actions">
        <button class="edit-btn" type="button" data-edit="${escapeHtml(product.id)}">Edit</button>
        <button class="danger-btn" type="button" data-delete="${escapeHtml(product.id)}">
          Remove
        </button>
      </div>
    </div>
  `).join('');

  productList.querySelectorAll('[data-edit]').forEach(button => {
    button.addEventListener('click', () => startEditingProduct(button.dataset.edit));
  });

  productList.querySelectorAll('[data-delete]').forEach(button => {
    button.addEventListener('click', () => {
      if (!confirm('Remove this product listing?')) return;

      const productId = button.dataset.delete;
      if (!removeProduct(productId)) return;

      const editingId = document.querySelector('#productForm').elements.namedItem('id').value;
      if (editingId === productId) resetProductForm();

      refreshProductCatalog();
      renderAdminProducts();
    });
  });
}

function unlockAdmin() {
  const pin = document.querySelector('#adminPin').value;

  if (pin !== '2468') {
    alert('Incorrect demo PIN. Use 2468.');
    return;
  }

  document.querySelector('#adminLock').hidden = true;
  document.querySelector('#adminPanel').hidden = false;
  renderAdminProducts();
}

function readProductForm(form) {
  const data = new FormData(form);

  return {
    name: data.get('name').trim(),
    category: data.get('category').trim(),
    price: Number(data.get('price')),
    image: data.get('image').trim(),
    description: data.get('description').trim(),
    inStock: data.get('inStock') === 'on'
  };
}

function saveProduct(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const productId = form.elements.namedItem('id').value;
  const details = readProductForm(form);
  const wasSaved = productId
    ? updateProduct(productId, details)
    : addProduct(details);

  if (!wasSaved) return;

  resetProductForm();
  refreshProductCatalog();
  renderAdminProducts();
}

function handleResetInventory() {
  if (!confirm('Reset to the demo inventory?')) return;
  if (!restoreDefaultProducts()) return;

  resetProductForm();
  refreshProductCatalog();
  renderAdminProducts();
}

export function initializeAdmin() {
  const dialog = document.querySelector('#adminDialog');

  document.querySelector('#openAdmin').addEventListener('click', () => dialog.showModal());
  document.querySelector('#closeAdmin').addEventListener('click', () => dialog.close());
  document.querySelector('#unlockAdmin').addEventListener('click', unlockAdmin);
  document.querySelector('#adminPin').addEventListener('keydown', event => {
    if (event.key === 'Enter') unlockAdmin();
  });
  document.querySelector('#productForm').addEventListener('submit', saveProduct);
  document.querySelector('#cancelEdit').addEventListener('click', resetProductForm);
  document.querySelector('#resetProducts').addEventListener('click', handleResetInventory);
  dialog.addEventListener('close', resetProductForm);
}
