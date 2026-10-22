export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;
  const allowed = context.request.method === 'GET' &&
    (path === '/api/products' || /^\/api\/products\/[A-Za-z0-9_-]{1,80}$/.test(path) ||
      /^\/api\/images\/products\/[0-9a-f-]{36}\.(?:jpg|png|webp|heic|heif)$/.test(path));
  if (!allowed) return new Response('Not found', { status: 404 });
  const headers = new Headers(context.request.headers);
  headers.delete('Cookie');
  headers.delete('Authorization');
  return context.env.API.fetch(new Request(context.request, { headers }));
}
