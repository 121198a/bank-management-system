import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Logged-in screens, rendered against a MOCKED API (no backend needed). The mock only supplies
 * enough data for the dashboards to render; it does not test server behaviour.
 */
const USERS = {
  customer: { path: '/dashboard', user: { _id: 'u1', fullName: 'Asha Verma', email: 'asha@example.com', role: 'customer', isActive: true } },
  employee: { path: '/employee', user: { _id: 'u2', fullName: 'Ravi Mehta', email: 'ravi@example.com', role: 'employee', isActive: true } },
  admin: { path: '/admin', user: { _id: 'u3', fullName: 'Meera Shah', email: 'meera@example.com', role: 'admin', isActive: true } }
};

const ok = (data, extra = {}) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'ok', data, ...extra }) });

async function mockApi(page, who) {
  const unknown = new Set();
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname.replace(/^\/api/, '');
    const method = route.request().method();
    if (p === '/auth/refresh' && method === 'POST') return route.fulfill(ok({ accessToken: 'test-token', user: who.user }));
    if (p === '/dashboard/stats') {
      return route.fulfill(ok({
        totalBalance: '152340.50',
        accounts: [{ _id: 'a1', accountNumber: '1000200030', accountType: 'savings', balance: '152340.50', status: 'active' }],
        recentTransactions: [], totalUsers: 12, totalAccounts: 9, totalTransactions: 40, pendingKyc: 2, pendingAccounts: 1
      }));
    }
    if (p.startsWith('/notifications')) return route.fulfill(ok({ notifications: [], unreadCount: 0 }, { pagination: { page: 1, limit: 10, total: 0, pages: 0 } }));
    unknown.add(`${method} ${p}`);
    return route.fulfill(ok([], { pagination: { page: 1, limit: 10, total: 0, pages: 0 } }));
  });
  return unknown;
}

const SIZES = [{ w: 375, h: 667, n: 'mobile' }, { w: 1280, h: 800, n: 'desktop' }];

for (const [role, who] of Object.entries(USERS)) {
  for (const size of SIZES) {
    for (const theme of ['light', 'dark']) {
      test.describe(`${role} dashboard — ${size.n}, ${theme}`, () => {
        test.use({ viewport: { width: size.w, height: size.h } });

        test.beforeEach(async ({ page }) => {
          await page.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch { /* ignore */ } }, theme);
          await mockApi(page, who);
          await page.goto(who.path);
          await expect(page.locator('h1:visible')).toHaveCount(1);
        });

        test('renders without an error screen, overflow, or missing landmarks', async ({ page }) => {
          await expect(page.getByRole('alert')).toHaveCount(0);
          const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
          expect(sw, `page scrolls horizontally (${sw} > ${iw})`).toBeLessThanOrEqual(iw + 1);
          await expect(page.locator('main#main-content')).toHaveCount(1);
          await expect(page.getByRole('link', { name: 'Skip to main content' })).toHaveCount(1);
        });

        test('tab title follows the page heading', async ({ page }) => {
          const h1 = (await page.locator('h1:visible').innerText()).trim();
          await expect(page).toHaveTitle(`${h1} — NexaBank`);
        });

        test('has no WCAG 2.x A/AA violations', async ({ page }) => {
          await page.waitForLoadState('networkidle');
          const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
          const describe = (n) => {
            const d = n.any[0] && n.any[0].data ? n.any[0].data : {};
            const colors = d.fgColor ? ` [fg ${d.fgColor} on bg ${d.bgColor} = ${d.contrastRatio}:1, needs ${d.expectedContrastRatio}]` : '';
            return `${n.target.join(' ')} <${n.html.slice(0, 90).replace(/\s+/g, ' ')}>${colors}`;
          };
          const summary = results.violations.flatMap((v) => v.nodes.map((n) => `${v.id} (${v.impact}): ${describe(n)}`));
          expect(summary, summary.join('\n')).toEqual([]);
        });
      });
    }
  }
}
