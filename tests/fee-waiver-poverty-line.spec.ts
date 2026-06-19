/**
 * Substantive-law regression: the fee-waiver eligibility hint uses 150% of the
 * federal poverty guideline (28 U.S.C. 1930(f)), NOT the means-test median
 * family income (which is far higher) -- confirmed William Franck, ERLS,
 * June 2026.
 *
 * 2026 HHS guideline, household of 1 (48 contiguous states): $15,960; 150% =
 * $23,940/yr. A $1,000/mo filer ($12,000/yr) is below -> "may qualify"; a
 * $2,800/mo filer ($33,600/yr) is above -> "unlikely". Under the OLD code both
 * compared to the ~$65,292 median and wrongly showed "may qualify".
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import {
  walkToMeansTestStart,
  navigateMeansTest,
  navigateCaseDetails,
  navigateBusiness,
  navigateHazardousProperty,
  navigateCreditCounseling,
  navigateDynamicPhase,
} from './navigation-helpers';
import { waitForDaPageLoad } from './helpers';
import { finishAndAssertAllPdfs } from './assert-helpers';

test.setTimeout(420_000);

async function reachPaymentMethod(page: import('@playwright/test').Page, scn: any) {
  await walkToMeansTestStart(page, scn);
  await navigateMeansTest(page, {}); // non-consumer → short path, lands on payment_method
  await waitForDaPageLoad(page);
  return ((await page.locator('body').textContent()) || '').toLowerCase();
}

test('below 150% of poverty → fee waiver looks likely', async ({ page }) => {
  const LOW = {
    ...SIMPLE_SINGLE,
    name: 'fee-waiver-low',
    income: { ...SIMPLE_SINGLE.income, grossWages: '1000' },
  };
  const body = await reachPaymentMethod(page, LOW);

  expect(body).toContain('150% of the federal poverty guideline');
  expect(body).toContain('$23,940.00');           // 150% FPL for household of 1
  expect(body).toContain('may qualify to have the filing fee waived');

  await navigateCaseDetails(page);
  await navigateBusiness(page);
  await navigateHazardousProperty(page);
  await navigateCreditCounseling(page, LOW);
  await navigateDynamicPhase(page, LOW);
  await finishAndAssertAllPdfs(page);
});

test('above 150% of poverty → fee waiver looks unlikely', async ({ page }) => {
  const HIGH = { ...SIMPLE_SINGLE, name: 'fee-waiver-high' }; // $2,800/mo
  const body = await reachPaymentMethod(page, HIGH);

  expect(body).toContain('$23,940.00');
  expect(body).toContain('above 150% of the poverty line');

  await navigateCaseDetails(page);
  await navigateBusiness(page);
  await navigateHazardousProperty(page);
  await navigateCreditCounseling(page, HIGH);
  await navigateDynamicPhase(page, HIGH);
  await finishAndAssertAllPdfs(page);
});
