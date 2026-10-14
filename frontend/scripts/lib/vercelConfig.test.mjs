import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildVercelConfig, normalizeOrigin } from './vercelConfig.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const shipped = JSON.parse(fs.readFileSync(path.join(here, '../../vercel.json'), 'utf8'));

describe('vercel.json as shipped', () => {
  it('serves the SPA for every non-API path, so deep links and refreshes work', () => {
    const spa = shipped.rewrites.find((r) => r.destination === '/index.html');
    expect(spa).toBeTruthy();
    const rx = new RegExp(`^${spa.source}$`);
    for (const p of ['/', '/login', '/dashboard/accounts', '/reset-password/abc123']) expect(rx.test(p), p).toBe(true);
    expect(rx.test('/api/auth/login'), 'API paths must not be swallowed by the SPA fallback').toBe(false);
  });

  it('sends the security headers the nginx config sends, with a strict CSP', () => {
    const all = shipped.headers.find((h) => h.source === '/(.*)').headers.reduce((m, h) => ({ ...m, [h.key]: h.value }), {});
    expect(all['X-Frame-Options']).toBe('DENY');
    expect(all['X-Content-Type-Options']).toBe('nosniff');
    expect(all['Content-Security-Policy']).toMatch(/default-src 'self'/);
    expect(all['Content-Security-Policy']).toMatch(/frame-ancestors 'none'/);
    expect(all['Content-Security-Policy']).not.toMatch(/script-src[^;]*'unsafe-(inline|eval)'/);
    expect(all['Content-Security-Policy']).not.toMatch(/googleapis|gstatic/); // fonts are self-hosted
  });

  it('caches hashed assets forever but never the HTML shell', () => {
    const cache = (src) => shipped.headers.find((h) => h.source === src).headers[0].value;
    expect(cache('/assets/(.*)')).toMatch(/immutable/);
    expect(cache('/(index.html)?')).toBe('no-cache');
  });
});

describe('buildVercelConfig / normalizeOrigin', () => {
  it('puts the API proxy before the SPA fallback and keeps everything else', () => {
    const out = buildVercelConfig(shipped, 'https://bank-api.onrender.com');
    expect(out.rewrites[0]).toEqual({ source: '/api/:path*', destination: 'https://bank-api.onrender.com/api/:path*' });
    expect(out.rewrites[1].destination).toBe('/index.html');
    expect(out.headers).toEqual(shipped.headers);
  });

  it('is idempotent: running it twice does not stack rewrites', () => {
    const once = buildVercelConfig(shipped, 'https://a.example.com');
    const twice = buildVercelConfig(once, 'https://b.example.com');
    expect(twice.rewrites.filter((r) => r.source.startsWith('/api/'))).toHaveLength(1);
    expect(twice.rewrites[0].destination).toBe('https://b.example.com/api/:path*');
  });

  it('normalises a trailing slash and rejects unsafe or malformed input', () => {
    expect(normalizeOrigin('https://api.example.com/')).toBe('https://api.example.com');
    expect(normalizeOrigin('http://localhost:5000')).toBe('http://localhost:5000');
    for (const bad of ['', 'api.example.com', 'http://api.example.com', 'https://api.example.com/v1', 'https://user:pw@api.example.com', 'ftp://x.com']) {
      expect(() => normalizeOrigin(bad), bad).toThrow();
    }
  });
});
