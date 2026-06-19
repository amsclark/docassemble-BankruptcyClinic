/**
 * Substantive-law advisory: when a filer categorizes a nonpriority unsecured
 * debt as "Student loans" on Schedule F, the app shows a note that student loans
 * are generally NOT discharged absent an undue-hardship showing
 * (11 U.S.C. 523(a)(8); confirmed William Franck, ERLS, June 2026).
 *
 * The note is a same-screen show-if toggle: visible for "Student loans", hidden
 * for other claim types. The test verifies both states, then finishes to PDF.
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
import {
  b64,
  waitForDaPageLoad,
  clickYesNoButton,
  fillYesNoRadio,
  clickContinue,
} from './helpers';
import { finishAndAssertAllPdfs } from './assert-helpers';

const SCN = {
  ...SIMPLE_SINGLE,
  name: 'student-loan-note',
  creditors: {
    nonpriority: {
      name: 'U.S. Department of Education', street: 'PO Box 5609', city: 'Greenville',
      state: 'Texas', zip: '75403', totalClaim: '25000', type: 'Student loans',
    },
  },
};

test.setTimeout(420_000);

test('student-loan claim type shows the §523(a)(8) nondischargeability note', async ({ page }) => {
  await navigateToDebtorPage(page, SCN);
  await fillDebtorAndAdvance(page, SCN.debtor);
  await passDebtorFinal(page);
  await navigatePropertySection(page, SCN);
  await navigateExemptionSection(page);
  await navigateCreditorLibraryPicker(page);
  await navigateSecuredCreditors(page, SCN);

  // Priority claims — none.
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.priority_claims.there_are_any', false);

  // Nonpriority claim screen.
  await waitForDaPageLoad(page);
  const P = 'prop.nonpriority_claims[0]';
  await page.locator(`#${b64(`${P}.name`)}`).fill(SCN.creditors.nonpriority.name);
  await page.locator(`#${b64(`${P}.street`)}`).fill(SCN.creditors.nonpriority.street);
  await page.locator(`#${b64(`${P}.city`)}`).fill(SCN.creditors.nonpriority.city);
  await page.locator(`select#${b64(`${P}.state`)}`).selectOption(SCN.creditors.nonpriority.state);
  await page.locator(`#${b64(`${P}.zip`)}`).fill(SCN.creditors.nonpriority.zip);
  await page.locator(`select#${b64(`${P}.who`)}`).selectOption('Debtor 1 only');

  // The note renders once per list-collect row template (most hidden), so scope
  // to VISIBLE matches and assert the count toggles with the claim type.
  const note = page.locator('p:visible').filter({ hasText: '523(a)(8)' });

  // Other claim type → no visible note.
  await page.locator(`select#${b64(`${P}.type`)}`).selectOption('Medical');
  await page.waitForTimeout(300);
  await expect(note).toHaveCount(0);

  // Student loans → exactly one visible note.
  await page.locator(`select#${b64(`${P}.type`)}`).selectOption('Student loans');
  await page.waitForTimeout(300);
  await expect(note).toHaveCount(1);
  await expect(note).toContainText('undue');

  // Complete the claim and finish to PDF.
  await page.locator(`#${b64(`${P}.total_claim`)}`).fill(SCN.creditors.nonpriority.totalClaim);
  await fillYesNoRadio(page, `${P}.save_to_library`, false);
  await fillYesNoRadio(page, `${P}.has_codebtor`, false);
  await fillYesNoRadio(page, `${P}.has_notify`, false);
  await clickContinue(page);

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
