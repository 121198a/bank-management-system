import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND, DEFAULT_TITLE, titleFor } from './brand';

const here = path.dirname(fileURLToPath(import.meta.url));

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});

describe('brand configuration', () => {
  it('builds consistent document titles', () => {
    expect(titleFor('Fund Transfer')).toBe(`Fund Transfer — ${BRAND.name}`);
    expect(titleFor('')).toBe(DEFAULT_TITLE);
    expect(DEFAULT_TITLE).toBe(`${BRAND.name} — ${BRAND.descriptor}`);
  });

  it('no source file hard-codes the product name (change it in config/brand.js only)', () => {
    const src = path.resolve(here, '..');
    const offenders = walk(src)
      .filter((f) => /\.(jsx?|css)$/.test(f) && !/\.test\./.test(f) && !f.endsWith(path.join('config', 'brand.js')))
      .filter((f) => /NexaBank|Bank Management System/.test(fs.readFileSync(f, 'utf8')));
    expect(offenders.map((f) => path.relative(src, f))).toEqual([]);
  });

  it('index.html (static) matches the configured name', () => {
    const html = fs.readFileSync(path.resolve(here, '../../index.html'), 'utf8');
    expect(html).toContain(`<title>${DEFAULT_TITLE}</title>`);
    expect(html).toContain(`property="og:title" content="${BRAND.name}"`);
  });
});
