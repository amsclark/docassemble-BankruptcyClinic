/**
 * Substantive-law regression: the South Dakota wildcard exemption (SDCL 43-45-4)
 * is tiered -- $7,000 for a head of a family, $5,000 otherwise (confirmed
 * William Franck, ERLS, June 2026). The clinic chose to ask the filer directly.
 *
 * This test confirms the "Are you the head of a family?" question appears for a
 * South Dakota filer (with the SDCL 43-45-4 / $7,000 explanation), is answered,
 * and the interview finishes to PDF. (NE filers never see it -- gated on state.)
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
import { waitForDaPageLoad, clickYesNoButton } from './helpers';
import { finishAndAssertAllPdfs } from './assert-helpers';

const SD_SINGLE = {
  ...SIMPLE_SINGLE,
  name: 'sd-head-of-family',
  district: 'District of South Dakota',
  debtor: {
    first: 'Robert', middle: 'A', last: 'Johnson',
    street: '321 Pine Ln', city: 'Sioux Falls', state: 'South Dakota', zip: '57101',
    countyIndex: 2, taxIdType: 'ssn' as const, taxId: '444-55-6666',
  },
  property: {},
};

test.setTimeout(420_000);

test('SD filer is asked the head-of-family question for the SDCL 43-45-4 wildcard tier', async ({ page }) => {
  await navigateToDebtorPage(page, SD_SINGLE);
  await fillDebtorAndAdvance(page, SD_SINGLE.debtor);
  await passDebtorFinal(page);
  await navigatePropertySection(page, SD_SINGLE);

  // The head-of-family question appears at the start of the exemption section
  // for a South Dakota filer.
  await waitForDaPageLoad(page);
  const heading = ((await page.locator('h1').first().textContent()) || '').toLowerCase();
  expect(heading).toContain('head of a family');
  const body = ((await page.locator('body').textContent()) || '').toLowerCase();
  expect(body).toContain('43-45-4');
  expect(body).toContain('$7,000');

  await clickYesNoButton(page, 'prop.head_of_family', true);

  // Finish the interview to PDF (navigateExemptionSection skips the already
  // answered head-of-family screen).
  await navigateExemptionSection(page);
  await navigateCreditorLibraryPicker(page);
  await navigateSecuredCreditors(page, SD_SINGLE);
  await navigateUnsecuredCreditors(page, SD_SINGLE);
  await navigateContractsLeases(page);
  await navigateCommunityProperty(page);
  await navigateIncome(page, SD_SINGLE);
  await navigateExpenses(page, SD_SINGLE.rentExpense, 0);
  await navigateFinancialAffairs(page, SD_SINGLE);
  await navigateReporting(page);
  await navigatePersonalLeases(page);
  await navigateMeansTest(page, {});
  await navigateCaseDetails(page);
  await navigateBusiness(page);
  await navigateHazardousProperty(page);
  await navigateCreditCounseling(page, SD_SINGLE);
  await navigateDynamicPhase(page, SD_SINGLE);

  await finishAndAssertAllPdfs(page);
});
