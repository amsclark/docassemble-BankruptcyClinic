/**
 * Probe: does the means_test_exemptions page advance under both masked AND
 * strict Continue when the user answers No / No / No (the consumer-debts
 * path that drives the if-branch into household_and_dependents_info)?
 *
 * Earlier observations (before the bulk fix) showed this page silently
 * failing on the all-False case while T/F/F advanced cleanly. With the bulk
 * fix in place — including required:False on the separated_status field of
 * the downstream household_and_dependents_info page — both paths should now
 * succeed.
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import { waitForDaPageLoad } from './helpers';
import {
  navigateToDebtorPage, fillDebtorAndAdvance, passDebtorFinal,
  navigatePropertySection, navigateExemptionSection,
  navigateCreditorLibraryPicker, navigateSecuredCreditors,
  navigateUnsecuredCreditors, navigateContractsLeases,
  navigateCommunityProperty, navigateIncome, navigateExpenses,
  navigateFinancialAffairs, navigateReporting, navigatePersonalLeases,
} from './navigation-helpers';

async function getHeading(p: import('@playwright/test').Page) {
  return ((await p.locator('h1').first().textContent({ timeout: 5000 }).catch(() => '')) || '').trim();
}

// consumerDebts:true makes navigateFinancialAffairs pick "Primarily consumer
// debts" on the single Form 101 debt-classification radio, which is what now
// derives non_consumer_debts=False (the consumer path this probe exercises).
const SCN = { ...SIMPLE_SINGLE, meansTest: { consumerDebts: true } };

async function reachMeansTestExemptions(page: import('@playwright/test').Page) {
  await navigateToDebtorPage(page, SIMPLE_SINGLE);
  await fillDebtorAndAdvance(page, SIMPLE_SINGLE.debtor);
  await passDebtorFinal(page);
  await navigatePropertySection(page, SIMPLE_SINGLE);
  await navigateExemptionSection(page);
  await navigateCreditorLibraryPicker(page);
  await navigateSecuredCreditors(page, SIMPLE_SINGLE);
  await navigateUnsecuredCreditors(page, SIMPLE_SINGLE);
  await navigateContractsLeases(page);
  await navigateCommunityProperty(page);
  await navigateIncome(page, SIMPLE_SINGLE);
  await navigateExpenses(page, SIMPLE_SINGLE.rentExpense, 0);
  await navigateFinancialAffairs(page, SCN);
  await navigateReporting(page);
  await navigatePersonalLeases(page);

  // means_test_presumption_of_abuse (single select field)
  await waitForDaPageLoad(page);
  const { selectByName, b64, clickContinue } = await import('./helpers');
  await selectByName(page, b64('monthly_income.means_type'), 'There is no presumption of abuse.');
  await clickContinue(page);
  await waitForDaPageLoad(page);
  // Now on means_test_exemptions
}

test.setTimeout(420_000);

test('means_test_exemptions advances under masked Continue with all-No (consumer debts)', async ({ page }) => {
  await reachMeansTestExemptions(page);

  const heading = await getHeading(page);
  expect(heading.toLowerCase()).toContain('identify any exemptions from presumption of abuse');

  // Click No on each of the yesnoradios (veteran, reservist) via label
  await page.evaluate(() => {
    const names = ['monthly_income.disabled_veteran', 'monthly_income.reservists'];
    names.forEach((name) => {
      // docassemble b64: standard base64, no padding
      const b64 = btoa(name).replace(/=+$/, '');
      const labelNo = document.querySelector(`label[for="${b64}_1"]`) as HTMLElement | null;
      if (labelNo && labelNo.offsetParent !== null) labelNo.click();
    });
  });
  await page.waitForTimeout(600);

  const { clickContinue } = await import('./helpers');
  await clickContinue(page);
  await page.waitForTimeout(1500);

  const after = await getHeading(page);
  console.log(`[probe-masked-all-No] after Continue: "${after}"`);
  expect(after.toLowerCase()).not.toContain('identify any exemptions');
  expect(after.toLowerCase()).toContain('tell the court about your household and dependents');
});

test('means_test_exemptions advances under STRICT Continue with all-No (consumer debts)', async ({ page }) => {
  await reachMeansTestExemptions(page);

  const heading = await getHeading(page);
  expect(heading.toLowerCase()).toContain('identify any exemptions from presumption of abuse');

  await page.evaluate(() => {
    const names = ['monthly_income.disabled_veteran', 'monthly_income.reservists'];
    names.forEach((name) => {
      // docassemble b64: standard base64, no padding
      const b64 = btoa(name).replace(/=+$/, '');
      const labelNo = document.querySelector(`label[for="${b64}_1"]`) as HTMLElement | null;
      if (labelNo && labelNo.offsetParent !== null) labelNo.click();
    });
  });
  await page.waitForTimeout(600);

  // STRICT — no validator override
  await page.locator('#da-continue-button').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  const after = await getHeading(page);
  console.log(`[probe-strict-all-No] after strict Continue: "${after}"`);
  expect(after.toLowerCase()).not.toContain('identify any exemptions');
});
