const DEFAULT_PRODUCTS = [
  { id: 'p1', name: '24” Full HD Monitor', category: 'Monitors', price: 89.99, description: 'Clean pre-owned 1080p monitor. HDMI connection.', inStock: true, image: '' },
  { id: 'p2', name: 'Wireless Keyboard & Mouse', category: 'Keyboards', price: 34.99, description: 'Simple wireless combo for home or office.', inStock: true, image: '' },
  { id: 'p3', name: 'USB-C Fast Charger 20W', category: 'Accessories', price: 19.99, description: 'Compact wall charger for compatible phones and tablets.', inStock: true, image: '' },
  { id: 'p4', name: 'USB-C to USB-C Cable', category: 'Accessories', price: 12.99, description: '1 metre everyday charging and data cable.', inStock: true, image: '' },
  { id: 'p5', name: 'Refurbished Android Phone', category: 'Devices', price: 179.99, description: 'Unlocked pre-owned phone. Model availability changes often.', inStock: true, image: '' },
  { id: 'p6', name: 'Laptop Cooling Pad', category: 'Accessories', price: 24.99, description: 'USB-powered cooling stand for laptops.', inStock: false, image: '' },
  { id: 'p7', name: 'Compact Bluetooth Keyboard', category: 'Keyboards', price: 29.99, description: 'Portable keyboard for tablets, phones and computers.', inStock: true, image: '' },
  { id: 'p8', name: 'HDMI Cable 6 ft', category: 'Accessories', price: 9.99, description: 'Standard HDMI cable for monitors, TVs and consoles.', inStock: true, image: '' }
];

const STORAGE_KEY = 'surrey-tech-products-v1';
let products = loadProducts();
let activeFilter = 'All';

function loadProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : DEFAULT_PRODUCTS.map(product => ({ ...product }));
  } catch {
    return DEFAULT_PRODUCTS.map(product => ({ ...product }));
  }
}

function saveProducts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch {
    alert('Products could not be saved in this browser. Check browser storage settings and try again.');
    return false;
  }
  renderProducts();
  renderAdminProducts();
  return true;
}

function money(amount) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function renderFilters() {
  const holder = document.querySelector('#productFilters');
  const categories = [...new Set(products.map(product => product.category))];
  if (activeFilter !== 'All' && !categories.includes(activeFilter)) activeFilter = 'All';
  const filters = ['All', ...categories];

  holder.innerHTML = filters.map(category => `
    <button class="filter-btn ${category === activeFilter ? 'active' : ''}"
      data-filter="${escapeHtml(category)}" aria-pressed="${category === activeFilter}">
      ${escapeHtml(category)}
    </button>
  `).join('');

  holder.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      renderProducts();
    });
  });
}

function renderProducts() {
  renderFilters();
  const query = document.querySelector('#productSearch').value.trim().toLowerCase();
  const visibleProducts = products.filter(product => {
    const matchesCategory = activeFilter === 'All' || product.category === activeFilter;
    const searchableText = `${product.name} ${product.description} ${product.category}`.toLowerCase();
    return matchesCategory && searchableText.includes(query);
  });

  document.querySelector('#emptyProducts').hidden = visibleProducts.length > 0;
  const grid = document.querySelector('#productGrid');
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
          <span class="${product.inStock ? 'stock' : 'out'}">${product.inStock ? 'In stock' : 'Ask for stock'}</span>
        </div>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description)}</p>
        <div class="price-row">
          <span class="price">${money(product.price)}</span>
          <a href="tel:+16045550184">Call to hold →</a>
        </div>
      </div>
    </article>
  `).join('');

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

function resetProductForm() {
  const form = document.querySelector('#productForm');
  form.reset();
  form.elements.id.value = '';
  form.elements.inStock.checked = true;
  document.querySelector('#saveProductButton').textContent = 'Add product';
  document.querySelector('#cancelEdit').hidden = true;
}

function startEditingProduct(productId) {
  const product = products.find(item => item.id === productId);
  if (!product) return;

  const form = document.querySelector('#productForm');
  form.elements.id.value = product.id;
  form.elements.name.value = product.name;
  form.elements.category.value = product.category;
  form.elements.price.value = product.price;
  form.elements.image.value = product.image || '';
  form.elements.description.value = product.description || '';
  form.elements.inStock.checked = Boolean(product.inStock);
  document.querySelector('#saveProductButton').textContent = 'Save changes';
  document.querySelector('#cancelEdit').hidden = false;
  form.elements.name.focus();
}

function renderAdminProducts() {
  const list = document.querySelector('#adminProductList');
  if (!list) return;

  list.innerHTML = products.map(product => `
    <div class="admin-product-row">
      <div>
        <strong>${escapeHtml(product.name)}</strong><br>
        <small>${escapeHtml(product.category)} · ${product.inStock ? 'In stock' : 'Not in stock'}</small>
      </div>
      <span class="product-price">${money(product.price)}</span>
      <div class="admin-product-actions">
        <button class="edit-btn" type="button" data-edit="${escapeHtml(product.id)}">Edit</button>
        <button class="danger-btn" type="button" data-delete="${escapeHtml(product.id)}">Remove</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-edit]').forEach(button => {
    button.addEventListener('click', () => startEditingProduct(button.dataset.edit));
  });

  list.querySelectorAll('[data-delete]').forEach(button => {
    button.addEventListener('click', () => {
      if (!confirm('Remove this product listing?')) return;
      products = products.filter(product => product.id !== button.dataset.delete);
      if (document.querySelector('#productForm').elements.id.value === button.dataset.delete) resetProductForm();
      saveProducts();
    });
  });
}

document.querySelector('#productSearch').addEventListener('input', renderProducts);

document.querySelector('.menu-toggle').addEventListener('click', event => {
  const links = document.querySelector('.nav-links');
  const isOpen = links.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelector('.nav-links').classList.remove('open');
    document.querySelector('.menu-toggle').setAttribute('aria-expanded', 'false');
  });
});

document.querySelectorAll('[data-service]').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelector('#deviceSelect').value = link.dataset.service;
  });
});

document.querySelector('#quoteForm').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const subject = encodeURIComponent(`Repair request: ${data.get('device')} - ${data.get('model') || 'model not listed'}`);
  const body = encodeURIComponent(`Name: ${data.get('name')}\nPhone: ${data.get('phone')}\nDevice: ${data.get('device')}\nBrand/model: ${data.get('model')}\n\nIssue:\n${data.get('issue')}`);
  window.location.href = `mailto:hello@surreytechrepair.ca?subject=${subject}&body=${body}`;
});

const dialog = document.querySelector('#adminDialog');
document.querySelector('#openAdmin').addEventListener('click', () => dialog.showModal());
document.querySelector('#closeAdmin').addEventListener('click', () => dialog.close());

function unlockAdmin() {
  if (document.querySelector('#adminPin').value === '2468') {
    document.querySelector('#adminLock').hidden = true;
    document.querySelector('#adminPanel').hidden = false;
    renderAdminProducts();
  } else {
    alert('Incorrect demo PIN. Use 2468.');
  }
}

document.querySelector('#unlockAdmin').addEventListener('click', unlockAdmin);
document.querySelector('#adminPin').addEventListener('keydown', event => {
  if (event.key === 'Enter') unlockAdmin();
});

document.querySelector('#productForm').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const id = data.get('id');
  const product = {
    id: id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    name: data.get('name').trim(),
    category: data.get('category').trim(),
    price: Number(data.get('price')),
    image: data.get('image').trim(),
    description: data.get('description').trim(),
    inStock: data.get('inStock') === 'on'
  };

  if (id) {
    products = products.map(existing => existing.id === id ? product : existing);
  } else {
    products.unshift(product);
  }

  if (saveProducts()) resetProductForm();
});

document.querySelector('#cancelEdit').addEventListener('click', resetProductForm);
document.querySelector('#resetProducts').addEventListener('click', () => {
  if (!confirm('Reset to the demo inventory?')) return;
  products = DEFAULT_PRODUCTS.map(product => ({ ...product }));
  resetProductForm();
  saveProducts();
});

dialog.addEventListener('close', resetProductForm);
document.querySelector('#year').textContent = new Date().getFullYear();
renderProducts();
