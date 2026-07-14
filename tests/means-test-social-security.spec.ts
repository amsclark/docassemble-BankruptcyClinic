/**
 * Substantive-law regression: Social Security Act benefits are EXCLUDED from
 * current monthly income for the means-test median comparison
 * (11 U.S.C. 101(10A)(B)(ii)(I); confirmed William Franck, ERLS, June 2026).
 *
 * Discriminating scenario: a Nebraska single filer with modest wages ($2,800/mo)
 * and LARGE Social Security income ($9,000/mo). Combined, that is far ABOVE the
 * NE household-of-1 median (~$5,441/mo) — so if SS were (wrongly) counted, the
 * review screen would say "exceeds the median / file 122A-2". With SS correctly
 * excluded, wages alone are BELOW median and the screen says "below the median".
 *
 * The test asserts the below-median text at review_122, then finishes the
 * interview all the way to PDF assembly.
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import {
  walkToMeansTestStart,
  navigateCaseDetails,
  navigateBusiness,
  navigateHazardousProperty,
  navigateCreditCounseling,
  navigateDynamicPhase,
} from './navigation-helpers';
import {
  b64,
  waitForDaPageLoad,
  selectByName,
  selectYesNoRadio,
  clickContinue,
  clickNthByName,
} from './helpers';
import { finishAndAssertAllPdfs } from './assert-helpers';

const SS_HEAVY = {
  ...SIMPLE_SINGLE,
  name: 'ss-excluded-means-test',
  income: { ...SIMPLE_SINGLE.income, socialSecurity: '9000' },
  meansTest: { consumerDebts: true },
};

test.setTimeout(420_000);

test('Social Security is excluded from the means-test median comparison', async ({ page }) => {
  await walkToMeansTestStart(page, SS_HEAVY);

  // means_test_presumption_of_abuse
  await selectByName(page, b64('monthly_income.means_type'), 'There is no presumption of abuse.');
  await clickContinue(page);

  // means_test_exemptions — consumer debts (picked on the SOFA-point Form 101
  // radio via meansTest.consumerDebts) drives the full 122A median comparison;
  // non_consumer_debts is derived, not a field here.
  await waitForDaPageLoad(page);
  await selectYesNoRadio(page, 'monthly_income.disabled_veteran', false);
  await page.waitForTimeout(300);
  await selectYesNoRadio(page, 'monthly_income.reservists', false);
  await page.waitForTimeout(300);
  await clickContinue(page);

  // household_and_dependents_info — single filer.
  await waitForDaPageLoad(page);
  await selectByName(page, b64('monthly_income.filing_status'), 'Not married');
  await page.waitForTimeout(300);
  await clickContinue(page);

  // debtor1_current_monthly_income — fields default from Schedule I, including
  // social1 = debtor[0].income.social_security ($9,000). Accept the defaults.
  await waitForDaPageLoad(page);
  await clickContinue(page);

  // Median family income screen — state + household size defaulted.
  await waitForDaPageLoad(page);
  await clickContinue(page);

  // review_122 — the determination screen. Assert on the COMPUTED figures
  // (not the prose), since docassemble's dev-mode source panel dumps the raw
  // template — including the unused "% else: exceeds the median" line — into
  // the DOM. The estimated overall income must be wages-only ($2,800), proving
  // the $9,000 Social Security was excluded; it must never show the SS-included
  // total ($11,800).
  await waitForDaPageLoad(page);
  const body = ((await page.locator('body').textContent()) || '').toLowerCase();
  expect(body).toContain('below the median');
  expect(body).toContain('$2,800.00');
  expect(body).not.toContain('$11,800');

  // Continue past the review and finish the interview to PDF assembly.
  await clickNthByName(page, b64('monthly_income.reviewed'), 0);
  await waitForDaPageLoad(page);
  await navigateCaseDetails(page);
  await navigateBusiness(page);
  await navigateHazardousProperty(page);
  await navigateCreditCounseling(page, SS_HEAVY);
  await navigateDynamicPhase(page, SS_HEAVY);

  await finishAndAssertAllPdfs(page);
});
