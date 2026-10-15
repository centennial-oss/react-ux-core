import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// Visual snapshots of every story tagged `visual` (all stories by default; a story opts out with '!visual'), in the
// light and dark themes, at each project's screen size. Each story is captured around its own content; stories tagged
// `visual-page` (overlays that render outside the story) capture the whole viewport. Every story is also checked for
// horizontal page scroll, which must never happen, even at 360 px.

interface IndexEntry {
  id: string;
  type: 'story' | 'docs';
  subtype?: 'story' | 'test';
  tags?: string[];
}

const MARGIN = 8;

const index = JSON.parse(readFileSync('storybook-static/index.json', 'utf8')) as {
  entries: Record<string, IndexEntry>;
};
const stories = Object.values(index.entries).filter(
  (entry) => entry.type === 'story' && entry.subtype !== 'test' && entry.tags?.includes('visual'),
);

for (const story of stories) {
  const wholePage = story.tags?.includes('visual-page') ?? false;

  for (const theme of ['light', 'dark'] as const) {
    test(`${story.id} (${theme})`, async ({ page }) => {
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`);
      const root = page.locator('#storybook-root');
      // React Aria collections can render a hidden <template> first; wait for real content.
      await root.locator('> :not(template)').first().waitFor();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      // Maps draw after their style loads.
      await expect(page.locator('[data-map-status="loading"]')).toHaveCount(0, { timeout: 15_000 });

      if (wholePage) {
        // These stories open an overlay on load. Overlays mount a moment after the story, animate in, are placed by
        // React Aria (hidden until then), and on phones slide in by scrolling, which disabling animations doesn't
        // cover. Capture once at least one overlay is rendered, placed, fully on screen and opaque, and unchanged
        // between two checks 100 ms apart. (The check is synchronous: Playwright polls it, and an async check's
        // promise would count as "true" at once.)
        await expect(page.locator('[data-entering]')).toHaveCount(0);
        await page.waitForFunction(
          () => {
            const overlays = [
              ...document.querySelectorAll(
                '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-toast-id]',
              ),
            ]
              // Only rendered overlays: a hidden one has an empty box that passes every check below.
              .filter((overlay) => overlay.checkVisibility({ visibilityProperty: true }))
              .map((overlay) => {
                const { top, left, bottom } = overlay.getBoundingClientRect();
                // An anchored popover's surface (the overlay's `data-trigger` ancestor) may still be fading in.
                const surface = overlay.closest('[data-trigger]') ?? overlay;
                return { top, left, bottom, opacity: getComputedStyle(surface).opacity };
              });
            const state = JSON.stringify(overlays);
            const memory = window as unknown as { ruxLastOverlays?: string };
            const isUnchanged = memory.ruxLastOverlays === state;
            memory.ruxLastOverlays = state;
            // React Aria hides a popover it hasn't placed yet with inline clipping.
            const isPlacing =
              document.querySelector('[data-trigger][style*="clip-path: inset(50%)"]') !== null;
            return (
              isUnchanged &&
              !isPlacing &&
              overlays.length > 0 &&
              overlays.every(
                (rect) =>
                  rect.top >= 0 && rect.bottom <= window.innerHeight + 1 && rect.opacity === '1',
              )
            );
          },
          undefined,
          { polling: 100 },
        );
      }

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, 'the page must not scroll horizontally').toBeLessThanOrEqual(0);

      const name = `${story.id}--${theme}.png`;
      const box = wholePage ? null : await root.boundingBox();
      if (!box || box.height === 0) {
        await expect(page).toHaveScreenshot(name);
        return;
      }
      const viewport = page.viewportSize() ?? { width: 0, height: 0 };
      const x = Math.max(0, box.x - MARGIN);
      const y = Math.max(0, box.y - MARGIN);
      await expect(page).toHaveScreenshot(name, {
        fullPage: true,
        clip: {
          x,
          y,
          width: Math.min(viewport.width - x, box.width + MARGIN * 2),
          height: box.height + MARGIN * 2,
        },
      });
    });
  }
}
