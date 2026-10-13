import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PUBLIC_PAGES } from './viewports';

const SIZES = [{ width: 375, height: 667, name: 'mobile' }, { width: 1280, height: 800, name: 'desktop' }];
const THEMES = ['light', 'dark'];

for (const size of SIZES) {
  for (const theme of THEMES) {
    test.describe(`axe — ${size.name}, ${theme} theme`, () => {
      test.use({ viewport: { width: size.width, height: size.height } });

      test.beforeEach(async ({ page }) => {
        await page.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch { /* ignore */ } }, theme);
      });

      for (const pg of PUBLIC_PAGES) {
        test(`${pg.name} has no WCAG 2.x A/AA violations`, async ({ page }) => {
          await page.goto(pg.path);
          await expect(page.locator('h1:visible')).toHaveCount(1);
          await expect(page.locator('main')).toHaveCount(1); // one main landmark per page
          const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
          const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help}`);
          expect(summary, summary.join('\n')).toEqual([]);
        });
      }
    });
  }
}

test('keyboard: first Tab on the sign-in page lands on a visible, focusable control', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('h1:visible')).toHaveCount(1); // wait for the form, not just the shell
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
  await expect(focused).toHaveAttribute('type', 'email'); // first stop is the first form field
});

test('document title is set on public pages', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page).toHaveTitle(/Privacy Policy/);
  await page.goto('/this-page-does-not-exist');
  await expect(page).toHaveTitle(/not found/i);
});

test.describe('forms and page identity (public pages)', () => {
  for (const pg of ['/login', '/register', '/forgot-password']) {
    test(`${pg}: every form control has a real <label> (not just a placeholder) and a name`, async ({ page }) => {
      await page.goto(pg);
      await expect(page.locator('h1:visible')).toHaveCount(1);
      const problems = await page.evaluate(() => [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].flatMap((el) => {
        const out = [];
        const labelled = (el.labels && el.labels.length > 0) || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
        if (!labelled) out.push(`no label: <${el.tagName.toLowerCase()} type=${el.type} placeholder="${el.placeholder}">`);
        if (!el.name) out.push(`no name attribute: ${el.type} "${el.placeholder}"`);
        return out;
      }));
      expect(problems, problems.join('\n')).toEqual([]);
    });
  }

  test('each routed public page has its own title and description', async ({ page }) => {
    const seen = new Map();
    for (const pg of ['/login', '/register', '/forgot-password', '/privacy', '/terms', '/does-not-exist']) {
      await page.goto(pg);
      await expect(page.locator('h1:visible')).toHaveCount(1);
      const title = await page.title();
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(title.length, `${pg} title`).toBeGreaterThan(8);
      expect(description && description.length, `${pg} description`).toBeGreaterThan(10);
      expect(seen.has(title), `${pg} reuses the title of ${seen.get(title)}`).toBe(false);
      seen.set(title, pg);
    }
  });
});

test('raw HTML (no JavaScript) still exposes a main landmark, an h1 and noindex', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(`${baseURL}/login`);
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await ctx.close();
});
