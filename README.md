# Delta Electronics — Small Business Website Demo

A responsive one-page website for a Delta, BC electronics repair + sales shop.

## Included

- Phone, tablet, laptop/computer and other electronics repair sections
- Product storefront for monitors, keyboards, accessories and pre-owned devices
- Sample store rating and customer reviews, clearly labeled as demo content
- Search + category filtering
- Owner product manager to add, edit and remove listings with custom categories
- Product inventory saved in the browser with `localStorage`
- Responsive mobile navigation
- Local-business-oriented copy and layout

## Project structure

- `index.html` — page content and interactive elements
- `styles.css` — layout, colours and responsive styles
- `js/main.js` — starts the page and connects the features
- `js/storefront.js` — product search, category filters and product cards
- `js/admin.js` — owner product manager
- `js/product-store.js` — product data and browser storage
- `js/utils.js` — shared formatting and HTML-safety helpers

## Run locally

No build step is required. Serve the folder over HTTP because the app uses native JavaScript modules.

```bash
cd surrey-tech-shop
python3 -m http.server 8080
```
Then open `http://localhost:8080`.

## Demo owner manager
At the bottom of the website click **Manage product listings**.

Demo PIN: `2468`

The demo manager can add, edit and remove products, including their category, price, description, image URL and stock status. Changes are stored in that browser only.

## Important before going live
The current product management is intentionally simple and appropriate for a prototype. `localStorage` is **not** a real multi-device admin system. For production, connect the existing product UI to a database such as Supabase/Firebase and use proper owner authentication. That will let the owner update products from any phone/computer and make changes visible to all visitors.

Also replace these placeholders:
- Business name
- Exact address
- Phone number
- Email
- Store hours
- Repair promises/warranty wording
- Product photos/prices/inventory
- Hero image if desired

## Suggested production stack
- Frontend: this site or a React/Next.js version
- Database: Supabase Postgres
- Product images: Supabase Storage
- Owner login: Supabase Auth
- Hosting: Vercel / Netlify / Cloudflare Pages

This keeps the site inexpensive and simple enough for a small local shop while giving the owner real inventory controls.
