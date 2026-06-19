/**
 * Substantive-law regression: the app warns a filer who may be ineligible for a
 * discharge under 11 U.S.C. 727(a)(8)/(9) -- a prior Chapter 7 discharge in a
 * case FILED within 8 years (or Chapter 12/13 within 6 years) before this
 * petition. The clock runs from the prior case's filing date, not the discharge
 * date (confirmed William Franck, ERLS, June 2026). The warning is non-blocking.
 *
 * Scenario: NE single filer, non-consumer-debt (fast means-test path), who lists
 * one prior Chapter 7 case filed ~3 years ago WITH a discharge granted. The
 * warning screen must appear; the filer acknowledges it and finishes to PDF.
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import {
  walkToMeansTestStart,
  navigateMeansTest,
  navigateBusiness,
  navigateHazardousProperty,
  navigateCreditCounseling,
  navigateDynamicPhase,
} from './navigation-helpers';
import {
  b64,
  waitForDaPageLoad,
  clickContinue,
  clickYesNoButton,
  selectYesNoRadio,
  fillByName,
  clickNthByName,
} from './helpers';
import { finishAndAssertAllPdfs } from './assert-helpers';

const SCN = { ...SIMPLE_SINGLE, name: 'discharge-bar-warning' };

test.setTimeout(420_000);

test('prior Chapter 7 discharge within 8 years triggers the discharge-eligibility warning', async ({ page }) => {
  await walkToMeansTestStart(page, SCN);
  await navigateMeansTest(page, {}); // non-consumer debts → short means-test path

  // payment_method — pay the whole fee.
  await waitForDaPageLoad(page);
  await page.locator('label').filter({ hasText: 'I will pay the entire fee when I file my petition' }).click();
  await clickContinue(page);

  // previous_bankruptcy — YES.
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'case.has_previous_bankruptcy', true);

  // previous_bankruptcy_details (list collect): district, chapter 7, filed
  // ~3 years ago, discharge granted, case number.
  await waitForDaPageLoad(page);
  await page.locator(`#${b64('case.previous_bankruptcy[0].district')}`).selectOption({ index: 1 });
  await page.locator(`#${b64('case.previous_bankruptcy[0].chapter')}`).selectOption('7');
  await page.locator(`#${b64('case.previous_bankruptcy[0].when')}`).fill('2023-06-19');
  await selectYesNoRadio(page, 'case.previous_bankruptcy[0].discharge_granted', true);
  await fillByName(page, b64('case.previous_bankruptcy[0].case_number'), '23-40123');
  await clickContinue(page);

  // The list-collect gather completes on Continue (one item), so the flow goes
  // straight to discharge_bar_warning — the screen under test.
  await waitForDaPageLoad(page);
  const heading = ((await page.locator('h1').first().textContent()) || '').toLowerCase();
  expect(heading).toContain('discharge-eligibility');
  const body = ((await page.locator('body').textContent()) || '').toLowerCase();
  expect(body).toContain('727(a)(8)');
  expect(body).toContain('filing date');

  // Acknowledge and finish the interview to PDF.
  await clickNthByName(page, b64('case.discharge_bar_acknowledged'), 0);

  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'case.has_pending_bankruptcy', false);
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'case.rents_residence', false);
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('case_final'), 0);

  await navigateBusiness(page);
  await navigateHazardousProperty(page);
  await navigateCreditCounseling(page, SCN);
  await navigateDynamicPhase(page, SCN);

  await finishAndAssertAllPdfs(page);
});
