# Delta Electronics customer website

The existing customer website keeps its branding, repair service content, product cards, search, filters, and responsive layout. It now runs on Cloudflare Pages. A Pages Function forwards public same-origin `/api/*` reads to the shared `delta-electronics-api` Worker, which reads products from D1 and redirects referenced photos to Cloudinary. This deployment needs no R2 binding. GitHub stores only source code and deployment configuration. Product saves in the private dashboard do not rebuild this site.

## Run locally

Use Node.js 22.12 or later. Start the sibling API Worker first with local D1 migration and sample import; see [the API README](../delta-electronics-api/README.md). Then:

```sh
npm ci
npm run dev
# http://localhost:8788
```

`npm run dev` builds the static assets into `dist` and starts Wrangler Pages with the local `API` service binding. The build excludes the historical `fixtures/products.json`. To test a fresh product edit, change a product in the local owner dashboard and refresh this website; the API advertises a 20-second product cache. No frontend rebuild is needed for inventory changes.

## Checks and deployment

```sh
npm test
npm run build
```

Create a separate Cloudflare Pages project for this site with build command `npm run build`, output directory `dist`, Node.js 22.12 or later, and a service binding named `API` targeting `delta-electronics-api`. The public Pages Function only permits GET product and image routes; owner endpoints return 404. See the [integration contract](docs/INVENTORY_INTEGRATION.md) and [workspace deployment guide](https://github.com/MNPaul1/delta-electronics-api/blob/main/DEPLOYMENT.md). No product JSON, GitHub token, or browser API key is deployed with the static site.

The Git-integrated Cloudflare Pages project is `delta-electronics-website`; pushes to `main` are configured to start production builds.
