import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isValidImageReference, validateCatalog } from '../js/catalog.js';
import { initializeStorefront } from '../js/storefront.js';

const samples = JSON.parse(readFileSync(new URL('../fixtures/products.json', import.meta.url), 'utf8'));

function mockPage(catalog, { badJson = false } = {}) {
  const search = {
    value: '',
    addEventListener(_event, listener) { this.onInput = listener; }
  };
  const filters = {
    innerHTML: '',
    querySelectorAll() {
      this.buttons = [...this.innerHTML.matchAll(/<button\b/g)].map(() => ({
        addEventListener(_event, listener) { this.onClick = listener; }
      }));
      return this.buttons;
    }
  };
  const images = [];
  const grid = {
    innerHTML: '',
    addEventListener(_event, listener) { this.onClick = listener; },
    querySelectorAll() {
      return [...this.innerHTML.matchAll(/<img\b/g)].map(() => {
        const image = {
          addEventListener(_event, listener) { this.onError = listener; },
          replaceWith(placeholder) { this.placeholder = placeholder; }
        };
        images.push(image);
        return image;
      });
    }
  };
  const empty = { hidden: true, textContent: '' };
  const elements = {
    '#productSearch': search,
    '#productFilters': filters,
    '#productGrid': grid,
    '#emptyProducts': empty
  };
  globalThis.document = {
    querySelector(selector) { return elements[selector]; },
    createElement() {
      return { setAttribute() {}, textContent: '', className: '' };
    }
  };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/products');
    return {
      ok: true,
      json: async () => {
        if (badJson) throw new SyntaxError('Invalid JSON');
        return { products: catalog };
      }
    };
  };
  return { search, filters, grid, empty, images };
}

function cardCount(grid) {
  return [...grid.innerHTML.matchAll(/class="product-card"/g)].length;
}

test('existing nine products satisfy the contract', () => {
  assert.equal(validateCatalog(samples).length, 9);
  assert.equal(new Set(samples.map(product => product.id)).size, 9);
});

test('validation enforces required types, unique IDs, and safe image references', () => {
  const product = samples[0];
  for (const [field, value] of [
    ['id', ' '], ['name', ''], ['category', '  '], ['price', -1],
    ['price', '89.99'], ['price', Infinity], ['description', null],
    ['inStock', 'true'], ['image', 'javascript:alert(1)'],
    ['image', '//example.com/a.jpg'], ['image', '/assets/products/../secret.jpg']
  ]) {
    assert.throws(() => validateCatalog([{ ...product, [field]: value }]));
  }
  assert.throws(() => validateCatalog([product, { ...product }]));
  assert.throws(() => validateCatalog({ products: samples }));
  assert.deepEqual(validateCatalog([]), []);
  assert.equal(isValidImageReference('/api/images/products/00000000-0000-0000-0000-000000000001.jpg'), true);
  assert.equal(isValidImageReference('https://example.com/monitor.jpg'), true);
  assert.equal(isValidImageReference('http://example.com/monitor.jpg'), false);
  assert.equal(isValidImageReference('https:example.com/monitor.jpg'), false);
  assert.equal(isValidImageReference('https://name:secret@example.com/monitor.jpg'), false);
  assert.equal(isValidImageReference('/other/monitor.jpg'), false);
  const image = '/api/images/products/00000000-0000-0000-0000-000000000001.jpg';
  assert.throws(() => validateCatalog([{ ...product, image: '', images: [image] }]));
  assert.throws(() => validateCatalog([{ ...product, image, images: [image, image] }]));
  const photos = Array.from({ length: 5 }, (_, index) =>
    `/api/images/products/00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}.jpg`);
  assert.equal(validateCatalog([{ ...product, image: photos[0], images: photos.slice(0, 4) }]).length, 1);
  assert.throws(() => validateCatalog([{ ...product, image: photos[0], images: photos }]));
});

test('storefront reflects additions, removals, prices, stock, categories, search, and empty catalogues', async () => {
  let page = mockPage(samples);
  await initializeStorefront();
  assert.equal(cardCount(page.grid), samples.length);
  assert.match(page.grid.innerHTML, /\$89\.99/);
  assert.match(page.grid.innerHTML, /Ask for stock/);
  assert.match(page.filters.innerHTML, /Monitors/);

  const added = { ...samples[0], id: 'p9', name: '<Special Camera>', category: 'Cameras', price: 129.5, inStock: false };
  page = mockPage([...samples.slice(1), { ...samples[0], price: 99.99, inStock: false }, added]);
  await initializeStorefront();
  assert.equal(cardCount(page.grid), samples.length + 1);
  assert.match(page.grid.innerHTML, /\$99\.99/);
  assert.match(page.grid.innerHTML, /\$129\.50/);
  assert.match(page.filters.innerHTML, /Cameras/);
  assert.match(page.grid.innerHTML, /&lt;Special Camera&gt;/);
  assert.doesNotMatch(page.grid.innerHTML, /<Special Camera>/);
  const changedMonitor = page.grid.innerHTML.split('</article>').find(card => card.includes('24” Full HD Monitor'));
  assert.match(changedMonitor, /class="out"/);

  page.search.value = 'special';
  page.search.onInput();
  assert.equal(cardCount(page.grid), 1);
  page.search.value = '';
  page.search.onInput();
  assert.equal(page.filters.buttons.length, 6); // All plus the five categories.
  page.filters.buttons.at(-1).onClick();
  assert.equal(cardCount(page.grid), 1);
  assert.match(page.grid.innerHTML, /&lt;Special Camera&gt;/);

  page = mockPage(samples.slice(1));
  await initializeStorefront();
  assert.equal(cardCount(page.grid), samples.length - 1);
  assert.doesNotMatch(page.grid.innerHTML, /24” Full HD Monitor/);

  page = mockPage([]);
  await initializeStorefront();
  assert.equal(cardCount(page.grid), 0);
  assert.equal(page.empty.hidden, false);
  assert.match(page.empty.textContent, /No products are listed/);
});

test('images are lazy loaded and broken images fall back to the placeholder', async () => {
  const page = mockPage([{ ...samples[0], image: '/api/images/products/00000000-0000-0000-0000-000000000001.jpg' }]);
  await initializeStorefront();
  assert.match(page.grid.innerHTML, /loading="lazy"/);
  assert.match(page.grid.innerHTML, /alt="24” Full HD Monitor"/);
  page.images[0].onError();
  assert.equal(page.images[0].placeholder.className, 'product-placeholder');
  assert.equal(page.images[0].placeholder.textContent, '⌁');
  const placeholderPage = mockPage([samples[0]]);
  await initializeStorefront();
  assert.match(placeholderPage.grid.innerHTML, /product-placeholder/);
});

test('multiple photos show customer gallery controls', async () => {
  const first = '/api/images/products/00000000-0000-0000-0000-000000000001.jpg';
  const second = '/api/images/products/00000000-0000-0000-0000-000000000002.jpg';
  const page = mockPage([{ ...samples[0], image: first, images: [first, second] }]);
  await initializeStorefront();
  assert.match(page.grid.innerHTML, /photo-count">1 \/ 2/);
  assert.match(page.grid.innerHTML, /Previous photo/);
  assert.match(page.grid.innerHTML, /Next photo/);
  const frame = { innerHTML: '', querySelectorAll: () => [] };
  const count = { textContent: '' };
  const card = { dataset: { productId: samples[0].id, photoIndex: '0' },
    querySelector(selector) { return selector === '.product-image' ? frame : count; } };
  const button = { dataset: { photoStep: '1' }, closest: () => card };
  page.grid.onClick({ target: { closest: () => button } });
  assert.match(frame.innerHTML, /00000000-0000-0000-0000-000000000002\.jpg/);
  assert.equal(count.textContent, '2 / 2');
});

test('invalid JSON and invalid products show an error that search does not erase', async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    for (const [catalog, options] of [[samples, { badJson: true }], [[{ ...samples[0], price: -1 }], {}]]) {
      const page = mockPage(catalog, options);
      await initializeStorefront();
      assert.equal(page.empty.hidden, false);
      assert.match(page.empty.textContent, /could not be loaded/);
      page.search.value = 'monitor';
      page.search.onInput();
      assert.match(page.empty.textContent, /could not be loaded/);
    }
  } finally {
    console.error = originalError;
  }
});
