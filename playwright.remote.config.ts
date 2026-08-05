/**
 * Config for driving a REMOTE docassemble host (e.g. the UAT box) rather than a
 * container on localhost. Page transitions cross the public internet, so the
 * local 30s action timeout races the slower renders and produces spurious
 * "element was detached from the DOM" failures mid-interview.
 */
import base from './playwright.config';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  ...base,
  timeout: 900 * 1000,
  retries: 0,
  workers: 1,
  use: {
    ...base.use,
    actionTimeout: 120 * 1000,
    navigationTimeout: 180 * 1000,
  },
});
