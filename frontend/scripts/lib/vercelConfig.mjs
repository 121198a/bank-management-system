/**
 * Adds the same-origin API proxy to vercel.json.
 *
 * Why a proxy: the browser calls /api/... on the SAME origin as the site, so the HTTP-only refresh
 * cookie (SameSite=Strict, path /api/auth) keeps working. Calling the backend directly on another
 * domain would make that cookie a third-party cookie and sign-in would not persist.
 */
export const normalizeOrigin = (input) => {
  let url;
  try { url = new URL(String(input).trim()); } catch { throw new Error(`Not a valid URL: "${input}"`); }
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error('The backend must be reachable over https:// (http:// is allowed only for localhost).');
  if (url.pathname !== '/' || url.search || url.hash) throw new Error('Give only the origin, e.g. https://api.example.com (no path, query or fragment).');
  if (url.username || url.password) throw new Error('Do not put credentials in the URL.');
  return url.origin;
};

export const buildVercelConfig = (current, origin) => {
  const safe = normalizeOrigin(origin);
  const rewrites = (current.rewrites || []).filter((r) => !String(r.source).startsWith('/api/'));
  return { ...current, rewrites: [{ source: '/api/:path*', destination: `${safe}/api/:path*` }, ...rewrites] };
};
