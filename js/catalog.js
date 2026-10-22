// Keep these rules aligned with docs/INVENTORY_INTEGRATION.md.
export function isValidImageReference(image) {
  if (image === '') return true;
  if (typeof image !== 'string' || /\s|[\u0000-\u001f\u007f]/.test(image)) return false;

  if (image.startsWith('/') && !image.startsWith('//') && !image.includes('\\')) {
    return /^\/api\/images\/products\/[0-9a-f-]{36}\.(?:jpg|png|webp|heic|heif)$/.test(image);
  }

  if (!/^https:\/\//i.test(image) || image.includes('\\')) return false;
  try {
    const url = new URL(image);
    return url.protocol === 'https:' && Boolean(url.hostname) &&
      !url.username && !url.password;
  } catch {
    return false;
  }
}

export function validateCatalog(catalog) {
  if (!Array.isArray(catalog)) throw new Error('Catalogue must be a JSON array.');

  const ids = new Set();
  catalog.forEach((product, index) => {
    const label = `Product ${index + 1}`;
    if (!product || typeof product !== 'object' || Array.isArray(product)) {
      throw new Error(`${label} must be an object.`);
    }
    if (typeof product.id !== 'string' || !product.id.trim()) {
      throw new Error(`${label} needs a nonempty string id.`);
    }
    if (ids.has(product.id)) throw new Error(`Duplicate product id: ${product.id}`);
    ids.add(product.id);
    if (typeof product.name !== 'string' || !product.name.trim()) {
      throw new Error(`${label} needs a nonempty name.`);
    }
    if (typeof product.category !== 'string' || !product.category.trim()) {
      throw new Error(`${label} needs a nonempty category.`);
    }
    if (typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price < 0) {
      throw new Error(`${label} needs a nonnegative numeric CAD price.`);
    }
    if (typeof product.description !== 'string') {
      throw new Error(`${label} needs a string description.`);
    }
    if (typeof product.inStock !== 'boolean') {
      throw new Error(`${label} needs a boolean inStock value.`);
    }
    if (!isValidImageReference(product.image)) {
      throw new Error(`${label} has an invalid image reference.`);
    }
  });

  return catalog;
}
