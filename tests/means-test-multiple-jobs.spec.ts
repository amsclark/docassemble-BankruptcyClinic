/**
 * Regression: the means test must count EVERY job on Schedule I, not just the
 * first one (Phil Martin, UAT August 2026).
 *
 * Schedule I offers six wage rows because a filer (or a non-filing spouse) can
 * hold several jobs. Form 122A's "gross wages" pre-fill used to read
 * income_amount_1 alone, so a two-job filer saw a means-test figure that
 * silently disagreed with their own Schedule I. objects.gross_monthly_wages()
 * now sums all six slots and every consumer of that total goes through it.
 *
 * Discriminating scenario: a Nebraska single filer with $2,800/mo from job 1
 * and $1,400/mo from job 2. The correct total is $4,200/mo; the pre-fix total
 * was $2,800/mo. Both sit below the NE household-of-1 median (~$5,441/mo), so
 * the determination is "below the median" either way -- which is exactly why
 * the assertion is on the FIGURE and not on the prose. A test that only checked
 * the below/above wording would pass against the bug.
 *
 * Runs all the way through to PDF assembly per the project testing rule.
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

const TWO_JOBS = {
  ...SIMPLE_SINGLE,
  name: 'means-test-two-jobs',
  income: {
    ...SIMPLE_SINGLE.income,
    grossWages: '2800',   // job 1
    grossWages2: '1400',  // job 2 -- ignored before the fix
    overtimePay: '0',
    overtimePay2: '0',
  },
  meansTest: { consumerDebts: true },
};

test.setTimeout(420_000);

test('means test counts wages from every job, not just the first', async ({ page }) => {
  await walkToMeansTestStart(page, TWO_JOBS);

  // means_test_presumption_of_abuse
  await selectByName(page, b64('monthly_income.means_type'), 'There is no presumption of abuse.');
  await clickContinue(page);

  // means_test_exemptions — consumerDebts drives the full 122A median
  // comparison rather than short-circuiting on non-consumer debts.
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

  // debtor1_current_monthly_income — gross_wages1 defaults to
  // gross_monthly_wages(debtor[0].income). Assert the DEFAULT itself, so the
  // test pins the summing function and not just the downstream display.
  await waitForDaPageLoad(page);
  const grossWages1 = page.locator(`#${b64('monthly_income.gross_wages1')}`);
  await expect(grossWages1).toHaveValue(/4,?200/);
  await clickContinue(page);

  // Median family income screen — state + household size defaulted.
  await waitForDaPageLoad(page);
  await clickContinue(page);

  // review_122 — assert on the computed figure. $4,200 is job 1 + job 2;
  // $2,800 alone would mean job 2 was dropped again.
  await waitForDaPageLoad(page);
  const body = ((await page.locator('body').textContent()) || '').toLowerCase();
  expect(body).toContain('$4,200.00');
  expect(body).not.toContain('$2,800.00');

  // Continue past the review and finish the interview to PDF assembly.
  await clickNthByName(page, b64('monthly_income.reviewed'), 0);
  await waitForDaPageLoad(page);
  await navigateCaseDetails(page);
  await navigateBusiness(page);
  await navigateHazardousProperty(page);
  await navigateCreditCounseling(page, TWO_JOBS);
  await navigateDynamicPhase(page, TWO_JOBS);

  await finishAndAssertAllPdfs(page);
});
