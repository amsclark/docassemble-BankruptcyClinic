/**
 * The above-median branch: Official Form 122A-2 (Chapter 7 Means Test
 * Calculation) must be collected and assembled.
 *
 * Form 122A-1 line 14 compares line 12b (current monthly income x 12) with
 * line 13 (the DOJ median for the state and household size). "More than" sends
 * the filer to Part 3 and requires Form 122A-2. Every other means-test spec in
 * this suite uses a fixture that sits BELOW the median, so none of them reaches
 * this branch and none of them proves 122A-2 assembles.
 *
 * Discriminating scenario: a Nebraska single filer earning $9,000 a month.
 * Annualised that is $108,000, well above the NE household-of-1 median of
 * $66,922, so the long form is required and the presumption of abuse applies.
 * The same fixture at $2,800 a month (SIMPLE_SINGLE) stays below the median and
 * never sees a 122A-2 screen.
 *
 * The load-bearing assertion is at the end: `form_b122a-2.pdf` must be among
 * the assembled documents. docassemble silently produces nothing at all if the
 * attachment is never reached, so a mid-interview assertion would not catch a
 * broken hook in 101-question-blocks.yml.
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
  fillByName,
  selectByName,
  selectYesNoRadio,
  clickContinue,
  clickNthByName,
} from './helpers';
import { finishAndAssertAllPdfs } from './assert-helpers';

const ABOVE_MEDIAN = {
  ...SIMPLE_SINGLE,
  name: 'means-test-above-median',
  income: {
    ...SIMPLE_SINGLE.income,
    grossWages: '9000',
    overtimePay: '0',
    taxDeduction: '1800',
  },
  meansTest: { consumerDebts: true },
};

test.setTimeout(600_000);

test('an above-median filer is taken through Form 122A-2 and it assembles', async ({ page }) => {
  await walkToMeansTestStart(page, ABOVE_MEDIAN);

  // ── Form 122A-1 ──────────────────────────────────────────────────
  // means_test_presumption_of_abuse
  await selectByName(page, b64('monthly_income.means_type'), 'There is no presumption of abuse.');
  await clickContinue(page);

  // means_test_exemptions — no veteran / reservist exclusion, so the means
  // test actually runs.
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

  // debtor1_current_monthly_income — defaults from Schedule I.
  await waitForDaPageLoad(page);
  await clickContinue(page);

  // Median family income screen — state and household size are defaulted.
  await waitForDaPageLoad(page);
  await clickContinue(page);

  // review_122. Line 12b is $108,000 against a $66,922 median, so this screen
  // must say the long form is required. Before the annualisation fix it
  // compared $9,000 with $66,922 and told this filer the opposite.
  await waitForDaPageLoad(page);
  const review122 = ((await page.locator('body').innerText()) || '').toLowerCase();
  expect(review122).toContain('above the median');
  expect(review122).toContain('122a-2');
  await clickNthByName(page, b64('monthly_income.reviewed'), 0);

  // ── Form 122A-2 ──────────────────────────────────────────────────
  // means2 household size. exemption_people and people_under_65 have no
  // default; people_65_plus defaults to 0.
  await waitForDaPageLoad(page);
  await fillByName(page, b64('means2.exemption_people'), '1');
  await fillByName(page, b64('means2.people_under_65'), '1');
  await clickContinue(page);

  // means2 housing — every field is optional or defaulted (line 10 is $0 for
  // most filers), so accept the defaults.
  await waitForDaPageLoad(page);
  await clickContinue(page);

  // means2 vehicle count — a bare `choices:` field, so a <select>, not radios.
  await waitForDaPageLoad(page);
  await selectByName(page, b64('means2.vehicle_count'), '1');
  await page.waitForTimeout(300);
  await clickContinue(page);

  // means2 vehicle details — only the description is required.
  await waitForDaPageLoad(page);
  await fillByName(page, b64('means2.vehicle1_description'), '2015 Honda Civic');
  await clickContinue(page);

  // means2 other necessary expenses (lines 16-23) — all defaulted from
  // Schedule I / J.
  await waitForDaPageLoad(page);
  await clickContinue(page);

  // means2 health insurance (line 25). "Yes, I actually spend it" hides the
  // follow-up amount field.
  await waitForDaPageLoad(page);
  await selectYesNoRadio(page, 'means2.actually_spend_health', true);
  await page.waitForTimeout(300);
  await clickContinue(page);

  // means2 additional deductions (lines 26-31) — all defaulted.
  await waitForDaPageLoad(page);
  await clickContinue(page);

  // means2 other secured debts (line 33d rows).
  await waitForDaPageLoad(page);
  await selectYesNoRadio(page, 'means2.has_other_secured', false);
  await page.waitForTimeout(300);
  await clickContinue(page);

  // means2 cure amounts (line 34).
  await waitForDaPageLoad(page);
  await selectYesNoRadio(page, 'means2.has_cure_amount', false);
  await page.waitForTimeout(300);
  await clickContinue(page);

  // means2 priority claims (line 35).
  await waitForDaPageLoad(page);
  await selectYesNoRadio(page, 'means2.has_priority_claims', false);
  await page.waitForTimeout(300);
  await clickContinue(page);

  // means2 chapter 13 administrative expenses (line 36).
  await waitForDaPageLoad(page);
  await selectYesNoRadio(page, 'means2.chapter13_eligible', false);
  await page.waitForTimeout(300);
  await clickContinue(page);

  // means2 unsecured debt (line 41a) — defaulted from Schedule E/F.
  await waitForDaPageLoad(page);
  await clickContinue(page);

  // means2 special circumstances (line 43).
  await waitForDaPageLoad(page);
  await selectYesNoRadio(page, 'means2.has_special_circumstances', false);
  await page.waitForTimeout(300);
  await clickContinue(page);

  // means2 review. $9,000 a month against roughly $3,000-$4,000 of allowed
  // deductions leaves 60-month disposable income far over the $17,150 upper
  // threshold in 11 U.S.C. 707(b)(2), so this is the presumption branch.
  await waitForDaPageLoad(page);
  const review122a2 = ((await page.locator('body').innerText()) || '').toLowerCase();
  expect(review122a2).toContain('presumption of abuse applies');
  await clickNthByName(page, b64('means2.reviewed'), 0);
  await waitForDaPageLoad(page);

  // ── Through to assembly ──────────────────────────────────────────
  await navigateCaseDetails(page);
  await navigateBusiness(page);
  await navigateHazardousProperty(page);
  await navigateCreditCounseling(page, ABOVE_MEDIAN);
  await navigateDynamicPhase(page, ABOVE_MEDIAN);

  // The whole point of the spec: 122A-2 must be in the assembled packet.
  await finishAndAssertAllPdfs(page, {
    mustInclude: ['101', '106', '107', '22a-1', '122a-2'],
  });
});
