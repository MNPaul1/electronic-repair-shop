# Inventory integration

The public website calls same-origin `GET /api/products`. Its Cloudflare Pages Function forwards that request through the `API` service binding to `delta-electronics-api`. The Worker reads D1 and returns `{ "products": [...] }`; product data is cached briefly (`Cache-Control: public, max-age=20`). The storefront handles loading, empty, and API error states and performs category filtering and name search in the browser. Customer text is escaped before insertion into HTML. Product images have alt text, lazy loading, and a placeholder when the image is empty or fails to load.

Each public product has stable `id`, `name`, `category`, decimal CAD `price`, `description`, boolean `inStock`, and `image`. The image is empty, or a generated same-origin `/api/images/products/<key>` path. The website catalogue validation accepts HTTPS image URLs for compatibility with older catalogue data. The D1-only Worker currently emits empty image references. The public image endpoint returns 404 while image storage is absent.

The private dashboard writes product records directly to the shared Worker, which stores integer price cents and stock state in D1. Image uploads are unavailable in the D1-only deployment. An owner save changes the API data directly; no GitHub commit or Cloudflare Pages deployment is required. See the [API contract](../../delta-electronics-api/docs/API.md) for field and endpoint rules.

The historical nine-item catalogue is saved as `fixtures/products.json` for an explicit, repeatable D1 import. It is never fetched by the running storefront and is excluded from `dist`. Run the import only after reviewing its contents and deciding it is appropriate for the target database. The importer does not overwrite existing product IDs.

For local development, run the API Worker on port 8787 and this Pages application on port 8788. For deployment, configure the Pages `API` service binding to the same Worker as the separate admin Pages project. The public proxy strips cookies and Authorization before forwarding GET requests and rejects all owner routes. The API Worker has no public `workers.dev` URL.
