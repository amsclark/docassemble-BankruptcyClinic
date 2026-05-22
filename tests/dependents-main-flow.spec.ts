/**
 * Dependents are reachable in the normal Schedule J flow (batch 4, May 2026).
 *
 * Roxanne reported being able to add dependents only by requesting a fee
 * waiver. The "Describe your household / dependents" step now appears for every
 * filer. This drives an INDIVIDUAL filer with one dependent (the joint case
 * with two dependents is covered by scenario-joint-couple) all the way to the
 * conclusion page, confirming the dependents enumeration does not stall.
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import { runFullInterview } from './navigation-helpers';

test.describe('Dependents in the main flow', () => {
  test.setTimeout(420_000);

  test('individual filer with one dependent reaches conclusion', async ({ page }) => {
    const scenario = { ...SIMPLE_SINGLE, dependents: 1 };
    await runFullInterview(page, scenario);
    const bodyText = await page.locator('body').innerText();
    expect(
      bodyText.toLowerCase().includes('conclusion') ||
      bodyText.toLowerCase().includes('interview questions complete') ||
      bodyText.toLowerCase().includes('your documents are ready'),
    ).toBeTruthy();
  });
});
