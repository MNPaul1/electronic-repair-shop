# Delta Electronics — Small Business Website Demo

A responsive one-page website for a Delta, BC electronics repair and sales shop.

## Included

- Phone, tablet, laptop/computer and other electronics repair sections
- Product storefront loaded from a separate JSON catalog
- Search and category filtering
- Sample store rating and customer reviews, clearly labeled as demo content
- Responsive mobile navigation

## Product catalog

Product listings are stored in `products.json` at the site root. It is the only inventory source for this website. Commit catalogue changes to the branch used for Vercel production deployments; the site fetches the deployed `/products.json` on each page load. Each product uses these fields:

- `id` — unique product identifier
- `name` — product name
- `category` — category used by the storefront filters
- `price` — price in Canadian dollars
- `description` — short product description
- `inStock` — `true` or `false`
- `image` — HTTPS image URL, `/assets/products/...` path, or an empty string for the placeholder

See [the inventory integration contract](docs/INVENTORY_INTEGRATION.md) for validation rules and the future private dashboard workflow. Product images kept in GitHub are suitable for a small catalogue. Use object storage if uploads become large or frequent.

## Project structure

- `index.html` — page content
- `products.json` — product catalog
- `styles.css` — layout, colours and responsive styles
- `js/main.js` — starts the page and connects the features
- `js/storefront.js` — loads the catalog, filters and renders products
- `js/catalog.js` — validates the catalogue before display
- `js/utils.js` — shared formatting and HTML-safety helpers
- `vercel.json` — browser cache policy for the catalogue
- `tests/catalog.test.mjs` — dependency-free catalogue and storefront checks

## Run locally

No build step is required. Serve the folder over HTTP because the app uses native JavaScript modules and fetches `products.json`.

```bash
cd surrey-tech-shop
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

Run the checks with `node --test tests/catalog.test.mjs` (Node.js 22 or newer).

For Vercel, import this repository as a static project with this folder as the project root, leave the build command empty, and connect the intended production branch. No runtime database or public GitHub token is needed.

## Before going live

Replace the sample address, business hours, product details, images, demo review content, repair promises and warranty wording with accurate business information.
