import { defineConfig } from '@playwright/test';

// Visual snapshots of the built Storybook at phone, tablet and desktop sizes. Always run in Playwright's Linux
// Docker image (`make test-visual`), so baselines are comparable everywhere.
const PORT = 6007;

export default defineConfig({
  testDir: 'test/visual',
  // One baseline set, named by story, theme and screen size; no OS suffix because they're always made on Linux.
  snapshotPathTemplate: '{testDir}/__snapshots__/{projectName}/{arg}{ext}',
  fullyParallel: true,
  // Each worker is a Chromium instance. Locally (in Docker) VISUAL_WORKERS, default 4, keeps memory and CPU use modest,
  // even under `make ci`; CI's own runner sets no VISUAL_WORKERS and uses Playwright's default.
  workers: process.env.VISUAL_WORKERS
    ? Number(process.env.VISUAL_WORKERS)
    : process.env.CI
      ? undefined
      : 4,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // `animations: 'disabled'` below stops CSS animation only; reduced motion also stops canvas (chart) animation.
    contextOptions: { reducedMotion: 'reduce' },
  },
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.002 },
  },
  webServer: {
    command: `node scripts/serve-static.mjs storybook-static ${PORT}`,
    url: `http://127.0.0.1:${PORT}/index.json`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'phone',
      use: {
        browserName: 'chromium',
        viewport: { width: 360, height: 800 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'tablet',
      use: { browserName: 'chromium', viewport: { width: 768, height: 1024 }, hasTouch: true },
    },
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
  ],
});
