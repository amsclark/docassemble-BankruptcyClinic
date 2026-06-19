/**
 * Substantive-law regression: a NON-FILING spouse's income is INCLUDED in
 * current monthly income for the means-test median comparison when the spouses
 * are not legally separated (11 U.S.C. 101(10A)(B)(i); confirmed William Franck,
 * ERLS, June 2026).
 *
 * Discriminating scenario: a Nebraska debtor filing ALONE, married, spouse NOT
 * filing, living in the same household. Debtor wages $2,800/mo (below the NE
 * household-of-1 median ~$5,441); non-filing spouse wages $4,000/mo. Combined
 * CMI $6,800 is ABOVE median. If the spouse income were (wrongly) excluded, the
 * debtor alone would be below median.
 *
 * The test enters the spouse's income on the Column-B screen and asserts the
 * review screen's estimated overall income is $6,800 (spouse included), never
 * $2,800 (spouse excluded), then finishes to PDF assembly.
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
  fillByName,
  clickContinue,
  clickNthByName,
} from './helpers';
import { finishAndAssertAllPdfs } from './assert-helpers';

test.setTimeout(420_000);

test('non-filing spouse income is included in the means-test median comparison', async ({ page }) => {
  await walkToMeansTestStart(page, { ...SIMPLE_SINGLE, name: 'nonfiling-spouse-cmi' });

  // means_test_presumption_of_abuse
  await selectByName(page, b64('monthly_income.means_type'), 'There is no presumption of abuse.');
  await clickContinue(page);

  // means_test_exemptions — consumer debts → full median comparison.
  await waitForDaPageLoad(page);
  await selectYesNoRadio(page, 'monthly_income.non_consumer_debts', false);
  await page.waitForTimeout(300);
  await selectYesNoRadio(page, 'monthly_income.disabled_veteran', false);
  await page.waitForTimeout(300);
  await selectYesNoRadio(page, 'monthly_income.reservists', false);
  await page.waitForTimeout(300);
  await clickContinue(page);

  // household_and_dependents_info — married, spouse NOT filing, same household.
  await waitForDaPageLoad(page);
  await selectByName(page, b64('monthly_income.filing_status'), 'Married and your spouse is NOT filing with you.');
  await page.waitForTimeout(300);
  await page.getByRole('combobox', { name: /You and your spouse are/i })
    .selectOption('Living in the same household and not legally separated.');
  await page.waitForTimeout(300);
  await clickContinue(page);

  // debtor1_current_monthly_income — defaults from Schedule I ($2,800 wages).
  await waitForDaPageLoad(page);
  await clickContinue(page);

  // spouse (Column B) income screen — now shown for a non-filing, not-separated
  // spouse. Enter $4,000/mo wages.
  await waitForDaPageLoad(page);
  const heading = ((await page.locator('h1').first().textContent()) || '').toLowerCase();
  expect(heading).toContain("spouse");
  await fillByName(page, b64('monthly_income.gross_wages2'), '4000');
  await clickContinue(page);

  // Median family income screen.
  await waitForDaPageLoad(page);
  await clickContinue(page);

  // review_122 — assert on the computed figure (the dev-mode source panel dumps
  // both template branches, so assert numbers, not prose). $6,800 proves the
  // spouse's $4,000 was included; $2,800 would mean it was wrongly excluded.
  await waitForDaPageLoad(page);
  const body = ((await page.locator('body').textContent()) || '').toLowerCase();
  expect(body).toContain('$6,800.00');
  expect(body).not.toContain('$2,800.00');

  await clickNthByName(page, b64('monthly_income.reviewed'), 0);
  await waitForDaPageLoad(page);
  await navigateCaseDetails(page);
  await navigateBusiness(page);
  await navigateHazardousProperty(page);
  await navigateCreditCounseling(page, { ...SIMPLE_SINGLE, name: 'nonfiling-spouse-cmi' });
  await navigateDynamicPhase(page, { ...SIMPLE_SINGLE, name: 'nonfiling-spouse-cmi' });

  await finishAndAssertAllPdfs(page);
});
