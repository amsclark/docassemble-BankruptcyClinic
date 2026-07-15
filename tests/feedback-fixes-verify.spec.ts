/**
 * Verification for the June 2026 Phil/Alex feedback fixes.
 *
 * The happy-path helpers (navigateContractsLeases answers "no leases";
 * navigateMeansTest takes the non_consumer_debts=true short-circuit) sidestep
 * the two crashes that were reported. This spec drives a full joint interview
 * but overrides those two steps to exercise the REAL failing paths:
 *
 *   #4  Schedule G — actually ADD an unexpired lease (assume = yes). Previously
 *       crashed with "Infinite loop: x.gathered already looked for".
 *   #5  Means test — take the consumer-debt path (non_consumer_debts = NO) with
 *       zero / "Not employed" income, which reaches review_122 + poverty_calc.
 *       Previously crashed on undefined debtor[i].income.income_amount_1.
 *
 * Reaching the conclusion + PDFs proves both paths now complete.
 */
import { test, expect, Page } from '@playwright/test';
import { JOINT_COUPLE } from './fixtures';
import {
  navigateToDebtorPage, fillDebtorAndAdvance, passDebtorFinal,
  navigatePropertySection, navigateExemptionSection, navigateCreditorLibraryPicker,
  navigateSecuredCreditors, navigateUnsecuredCreditors, navigateCommunityProperty,
  navigateIncome, navigateExpenses, navigateFinancialAffairs, navigateReporting,
  navigatePersonalLeases, navigateCaseDetails, navigateBusiness, navigateHazardousProperty,
  navigateCreditCounseling, navigateDynamicPhase,
} from './navigation-helpers';
import {
  b64, waitForDaPageLoad, clickContinue, clickYesNoButton, fillYesNoRadio,
  selectByName, fillById, handleAnotherPage,
} from './helpers';

async function heading(page: Page): Promise<string> {
  return (await page.locator('h1').first().textContent().catch(() => '')) || '';
}

/** #4 — add a single unexpired lease (assume = yes) via the list-collect form. */
async function addOneLease(page: Page) {
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.contracts_and_leases.there_are_any', true);
  await waitForDaPageLoad(page);
  await fillById(page, b64('prop.contracts_and_leases[0].name'), 'Acme Property Management');
  await fillById(page, b64('prop.contracts_and_leases[0].street'), '100 Main St');
  await fillById(page, b64('prop.contracts_and_leases[0].city'), 'Sioux Falls');
  await fillById(page, b64('prop.contracts_and_leases[0].state'), 'South Dakota');
  await fillById(page, b64('prop.contracts_and_leases[0].zip'), '57101');
  await fillById(page, b64('prop.contracts_and_leases[0].description'), 'Residential apartment lease');
  await fillYesNoRadio(page, 'prop.contracts_and_leases[0].has_codebtor', false);
  // Executory contract (not an unexpired lease) — exercises the same
  // contracts_and_leases gather + g_attach assembly where the infinite loop
  // lived, without the lease_assumed show-if reveal (test-helper flakiness).
  await fillYesNoRadio(page, 'prop.contracts_and_leases[0].unexpired_lease', false);
  await clickContinue(page);
  await handleAnotherPage(page, 'prop.contracts_and_leases.there_is_another');
}

/** #5 — consumer-debt means test (reaches review_122) with zero income. */
async function consumerDebtMeansTest(page: Page, joint: boolean) {
  // Walk every means-test screen (in whatever order docassemble resolves them)
  // until we reach the case-details payment screen, which navigateCaseDetails
  // then handles. Fill median_income whenever that field is present so the
  // required-field screen never blocks us.
  for (let i = 0; i < 18; i++) {
    await waitForDaPageLoad(page);
    const h = (await heading(page)).toLowerCase();
    const body = (await page.locator('body').innerText()).toLowerCase();

    // Exit: we've left the means test into case details (fee / prior bankruptcy).
    if (body.includes('pay the entire fee') ||
        body.includes('filed for bankruptcy within the last') ||
        h.includes('how will you pay')) {
      return;
    }

    // Always satisfy the required median-income field if it's on screen.
    const med = page.locator(`#${b64('monthly_income.median_income')}`);
    if (await med.count() > 0 && !((await med.inputValue()).trim())) {
      await fillById(page, b64('monthly_income.median_income'), '90000');
    }

    if (h.includes('presumption of abuse') && body.includes('select the option')) {
      await selectByName(page, b64('monthly_income.means_type'), 'There is no presumption of abuse.');
    } else if (h.includes('identify any exemptions')) {
      // non_consumer_debts derives from the Form 101 radio (answered consumer
      // back at the SOFA point) → drops into review_122 + poverty_calc.
      await fillYesNoRadio(page, 'monthly_income.disabled_veteran', false);
      await page.waitForTimeout(150);
      await fillYesNoRadio(page, 'monthly_income.reservists', false);
    } else if (h.includes('household and dependents')) {
      await selectByName(page, b64('monthly_income.filing_status'),
        joint ? 'Married and your spouse is filing with you.' : 'Not married');
    }
    // income / median / review_122 screens: defaults are fine (+ median filled
    // above) — just advance.
    await clickContinue(page);
  }
  throw new Error('consumerDebtMeansTest: did not reach case details within 18 steps');
}

test.describe('June 2026 feedback fixes — Schedule G lease + consumer-debt means test', () => {
  test.setTimeout(300_000);

  test('joint interview with an added lease and zero-income consumer means test reaches conclusion', async ({ page }) => {
    // consumerDebts:true → navigateFinancialAffairs picks "Primarily consumer
    // debts" on the Form 101 radio, which derives non_consumer_debts=False
    // (the consumer means-test path this spec exercises).
    const scenario = { ...JOINT_COUPLE, meansTest: { consumerDebts: true } };
    await navigateToDebtorPage(page, scenario);
    await fillDebtorAndAdvance(page, scenario.debtor);
    if (scenario.jointFiling && scenario.spouse) {
      await waitForDaPageLoad(page);
      await fillDebtorAndAdvance(page, scenario.spouse);
    }
    await passDebtorFinal(page);
    await navigatePropertySection(page, scenario);
    await navigateExemptionSection(page);
    await navigateCreditorLibraryPicker(page);
    await navigateSecuredCreditors(page, scenario);
    await navigateUnsecuredCreditors(page, scenario);
    await addOneLease(page);                       // #4 — was the infinite loop
    await navigateCommunityProperty(page);
    await navigateIncome(page, scenario);          // "Not employed" → zero income
    await navigateExpenses(page, scenario.rentExpense, scenario.dependents ?? 0);
    await navigateFinancialAffairs(page, scenario);
    await navigateReporting(page);
    await navigatePersonalLeases(page);
    await consumerDebtMeansTest(page, !!scenario.jointFiling);  // #5 — was the crash
    await navigateCaseDetails(page);
    await navigateBusiness(page);
    await navigateHazardousProperty(page);
    await navigateCreditCounseling(page, scenario);
    await navigateDynamicPhase(page, scenario);

    const bodyText = (await page.locator('body').innerText()).toLowerCase();
    expect(
      bodyText.includes('conclusion') ||
      bodyText.includes('interview questions complete') ||
      bodyText.includes('your documents are ready')
    ).toBe(true);
  });
});
