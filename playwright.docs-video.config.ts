/**
 * Recording config for the walkthrough video on the docs site.
 *
 * The homepage embeds the clip at 900 px wide, so record at 1280x720 rather
 * than letting Playwright's default shrink it to fit an 800x800 box — the old
 * clip was 800x450 and was being upscaled in the browser.
 *
 * One worker: a docassemble container is the unit of concurrency, and the
 * recording must not compete with anything else for that server.
 *
 * Usage:
 *   npx playwright test --config playwright.docs-video.config.ts \
 *     tests/scenario-simple-single.spec.ts
 */
import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  outputDir: 'test-results-docs-video',
  reporter: [['line']],
  use: {
    ...base.use,
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    trace: 'off',
    video: { mode: 'on', size: { width: 1280, height: 720 } },
    launchOptions: {
      // A little slower than the test suite runs. The clip is meant to be
      // watched, and at full robot speed the screens change faster than a
      // reader can see what was filled in.
      slowMo: Number(process.env.DOCS_VIDEO_SLOWMO || 120),
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
  ],
});
