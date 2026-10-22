# Inventory integration contract

`products.json` at the website root is the complete catalogue. The public site loads its own deployed `/products.json` on page load and renders every card, search result, and category filter from that array. A successful production deployment exposes added, changed, and removed products without changing website code. The public site does not call GitHub or write inventory.

## JSON schema

The file is a JSON array; `[]` is valid. Each element is an object with these required fields. Keep the existing field names and types.

| Field | Type | Rule |
| --- | --- | --- |
| `id` | string | Nonempty after trimming, unique in the array, stable across edits. Never reuse an old ID for a different item. |
| `name` | string | Nonempty after trimming. |
| `category` | string | Nonempty after trimming. New values appear in the filters automatically. |
| `price` | number | Finite and at least zero, denominated in CAD. Write JSON numbers, not quoted strings. |
| `description` | string | May be empty. |
| `inStock` | boolean | JSON `true` or `false`. |
| `image` | string | `""`, an HTTPS URL without embedded credentials, or a root-relative `/assets/products/...` path. |

Example:

```json
[
  {
    "id": "p1",
    "name": "24-inch Full HD Monitor",
    "category": "Monitors",
    "price": 89.99,
    "description": "Clean pre-owned 1080p monitor.",
    "inStock": true,
    "image": "/assets/products/monitor.jpg"
  }
]
```

The dashboard should validate before publishing with the same rules as [`js/catalog.js`](../js/catalog.js). Avoid duplicate IDs and keep an item's ID when its name, price, image, category, or stock changes. The storefront rejects the whole catalogue if a field is invalid, and shows customers a reload/call message. Customer-managed text is escaped when inserted into HTML. Image references are validated before insertion; broken images and empty `image` values show the existing placeholder. Images have product-name alt text, lazy loading, and consistent card sizing.

Put repository images under `assets/products/` and store their root-relative path. Use HTTPS for external images, ideally from a host you control. Do not use `http:`, `data:`, protocol-relative URLs, relative paths without a leading slash, or paths outside `/assets/products/`. Local image paths must avoid percent encoding, query strings, fragments, and `..` traversal; all image references must avoid whitespace and backslashes. Publish new image files before referencing them in the catalogue; keep old files until no product references them. GitHub-hosted images suit a small catalogue; large or frequent uploads may eventually need object storage and stable HTTPS URLs.

## Private dashboard publishing flow

The future owner dashboard is a **separate private application**. Its server, with a narrowly scoped GitHub credential, should:

1. Fetch `products.json` from the production branch through GitHub's [Get repository content API](https://docs.github.com/en/rest/repos/contents#get-repository-content): `GET /repos/{owner}/{repo}/contents/products.json?ref={productionBranch}`. Decode the returned base64 `content`, parse it, validate it, and retain the returned file `sha` as the editing baseline. Show this fresh catalogue to the owner.
2. Allow edits to a working copy for that session. Do not treat a permanently stored local copy as authoritative: another owner session, a direct GitHub edit, or a rollback can change the repository.
3. Before publishing, fetch the file and SHA again. If the SHA changed, reject the stale working copy and ask the owner to refresh, or reconcile changes by stable product ID with explicit conflict handling. Never silently overwrite a change to the same product. Validate the complete proposed array again.
4. Base64-encode the complete updated JSON file and use GitHub's [Create or update file contents API](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents): `PUT /repos/{owner}/{repo}/contents/products.json` with `message`, `content`, `sha` (the latest file SHA), and `branch`. A missing or stale SHA for an existing file must not be treated as success.
5. Handle a failed or conflicting PUT by fetching the latest file again. Keep the owner's unpublished edits available for review, compare by ID, and retry only after a safe merge or owner choice. Avoid automatic blind retries with an old SHA. Show API errors and deployment status separately.
6. Wait for the GitHub commit to trigger the Vercel Git integration for the configured production branch. A successful commit means the repository changed; it does not mean the deployment succeeded. Verify the deployment is ready and `/products.json` on the production domain reflects the expected catalogue before reporting it as live.

Example GET response (only the fields needed for this flow are shown):

```json
{
  "name": "products.json",
  "path": "products.json",
  "sha": "CURRENT_FILE_BLOB_SHA",
  "encoding": "base64",
  "content": "BASE64_ENCODED_JSON_ARRAY"
}
```

Example PUT request body (the `content` value must be replaced with the actual base64-encoded, validated JSON array):

```json
{
  "message": "Update Delta Electronics inventory",
  "content": "BASE64_ENCODED_JSON_ARRAY",
  "sha": "CURRENT_FILE_BLOB_SHA",
  "branch": "main"
}
```

Example successful PUT response (partial):

```json
{
  "content": { "path": "products.json", "sha": "NEW_FILE_BLOB_SHA" },
  "commit": { "sha": "NEW_COMMIT_SHA" }
}
```

The branch name above is an example; configure it to match Vercel's production branch. Use the same content API with the current SHA when replacing an existing image. The API may return a conflict or validation error; use its status and response body to guide the owner instead of assuming every failure is a stale SHA.

If a GitHub commit succeeds but Vercel deployment fails, keep the last successful deployment live, inspect the Vercel build/deployment logs, correct the catalogue or asset, and publish a new commit. If necessary, revert the bad inventory commit on the production branch and verify the resulting deployment. Do not label the inventory update live until the production URL serves it.

The GitHub credential belongs only on the dashboard's server, using a GitHub App installation token or fine-grained token with the minimum repository Contents permission needed. Never put it in public JavaScript, `products.json`, browser storage, or this repository. Limit who can use the dashboard; its authentication and upload flow belong to that separate project.

## Deployment and caching

Configure Vercel's Git integration for this repository and its production branch, with this folder as the project root. This static site needs no build command. Vercel serves `products.json` as a normal root file. The `vercel.json` rule makes browsers revalidate the catalogue, and the storefront requests it with `cache: 'no-store'` so a new page load does not reuse a stale browser copy. [Vercel's Git deployment guide](https://vercel.com/docs/git) and [cache header guide](https://vercel.com/docs/caching/cache-control-headers) describe the hosting behavior. Requests made during a deployment can still see the previous successful version until the new deployment is ready.
