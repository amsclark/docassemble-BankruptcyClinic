/**
 * Substantive-law regression: the app screens for the 730-day domicile rule
 * (11 U.S.C. 522(b)(3)(A)) -- a debtor who has lived in the filing state for
 * less than 2 years may have to use another state's exemptions. The app only
 * computes NE/SD exemptions, so it warns (non-blocking) and tells the filer to
 * confirm the governing state with their attorney (William Franck, ERLS,
 * June 2026).
 *
 * Scenario: a NE filer answers "No" (lived here < 2 years) -> warning appears,
 * is acknowledged, and the interview finishes to PDF.
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import {
  navigateToDebtorPage,
  fillDebtorAndAdvance,
  passDebtorFinal,
  navigatePropertySection,
  navigateExemptionSection,
  navigateCreditorLibraryPicker,
  navigateSecuredCreditors,
  navigateUnsecuredCreditors,
  navigateContractsLeases,
  navigateCommunityProperty,
  navigateIncome,
  navigateExpenses,
  navigateFinancialAffairs,
  navigateReporting,
  navigatePersonalLeases,
  navigateMeansTest,
  navigateCaseDetails,
  navigateBusiness,
  navigateHazardousProperty,
  navigateCreditCounseling,
  navigateDynamicPhase,
} from './navigation-helpers';
import { b64, waitForDaPageLoad, clickYesNoButton, clickNthByName } from './helpers';
import { finishAndAssertAllPdfs } from './assert-helpers';

const SCN = { ...SIMPLE_SINGLE, name: 'domicile-730-warning' };

test.setTimeout(420_000);

test('recent mover (< 2 years) gets the 730-day domicile warning', async ({ page }) => {
  await navigateToDebtorPage(page, SCN);
  await fillDebtorAndAdvance(page, SCN.debtor);
  await passDebtorFinal(page);
  await navigatePropertySection(page, SCN);

  // domicile_two_years question — answer No (lived here < 2 years).
  await waitForDaPageLoad(page);
  const qHeading = ((await page.locator('h1').first().textContent()) || '').toLowerCase();
  expect(qHeading).toContain('2 years');
  await clickYesNoButton(page, 'prop.domicile_two_years', false);

  // domicile_warning screen.
  await waitForDaPageLoad(page);
  const wHeading = ((await page.locator('h1').first().textContent()) || '').toLowerCase();
  expect(wHeading).toContain('governed by another state');
  const body = ((await page.locator('body').textContent()) || '').toLowerCase();
  expect(body).toContain('522(b)(3)(a)');
  await clickNthByName(page, b64('prop.domicile_warning_acknowledged'), 0);

  // Finish to PDF (navigateExemptionSection skips the already-answered domicile
  // screen).
  await navigateExemptionSection(page);
  await navigateCreditorLibraryPicker(page);
  await navigateSecuredCreditors(page, SCN);
  await navigateUnsecuredCreditors(page, SCN);
  await navigateContractsLeases(page);
  await navigateCommunityProperty(page);
  await navigateIncome(page, SCN);
  await navigateExpenses(page, SCN.rentExpense, 0);
  await navigateFinancialAffairs(page, SCN);
  await navigateReporting(page);
  await navigatePersonalLeases(page);
  await navigateMeansTest(page, {});
  await navigateCaseDetails(page);
  await navigateBusiness(page);
  await navigateHazardousProperty(page);
  await navigateCreditCounseling(page, SCN);
  await navigateDynamicPhase(page, SCN);

  await finishAndAssertAllPdfs(page);
});
