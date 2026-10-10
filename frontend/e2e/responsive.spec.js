import { test, expect } from '@playwright/test';
import { VIEWPORTS, PUBLIC_PAGES } from './viewports';

// For every kit viewport x public page: no horizontal scrolling, the page heading is
// actually inside the viewport, and nothing important is pushed past the right edge.
for (const vp of VIEWPORTS) {
  test.describe(`viewport ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const pg of PUBLIC_PAGES) {
      test(`${pg.name}: no horizontal overflow, heading visible`, async ({ page }) => {
        await page.goto(pg.path);
        // Exactly one *visible* top-level heading (WCAG 1.3.1 / 2.4.6): hidden desktop-only
        // headings do not count, so a page cannot pass here while having no h1 on phones.
        const h1 = page.locator('h1:visible');
        await expect(h1).toHaveCount(1);

        const { scrollWidth, innerWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth
        }));
        expect(scrollWidth, `page scrolls horizontally (${scrollWidth}px > ${innerWidth}px)`).toBeLessThanOrEqual(innerWidth + 1);

        const box = await h1.first().boundingBox();
        expect(box.x, 'heading starts off-screen').toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width, 'heading is clipped on the right').toBeLessThanOrEqual(vp.width + 1);
      });
    }
  });
}
