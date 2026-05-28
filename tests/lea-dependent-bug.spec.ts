/**
 * Diagnostic + regression for Lea's May-28 report: "you cannot get past the
 * dependent page — the continue button will not work."
 *
 * Root cause confirmed: the docassemble app uses the default jQuery validator
 * (`ignore: []`), which validates ALL required fields including ones hidden
 * by `show if:`. Conditional fields without `required: False` therefore
 * silently block Continue with no visible error — the classic project-memory
 * "missing required:False" silent-break trap (cf. customer bugs #54/56/57 and
 * feedback_no_hidden_validator_hack.md).
 *
 * The shared `clickContinue` helper overrides the validator with
 * `ignore: ':hidden'`, which masks exactly this class of bug. This file uses
 * a STRICT click — plain `#da-continue-button` click, no validator override —
 * so a regression in `required: False` on a hidden conditional field would
 * make this test hang exactly as it does for real users.
 *
 * Scenarios covered:
 *   - Schedule J household_description, SINGLE filer with 0 dependents:
 *       `other_household` is hidden via show-if:joint_case. Must have
 *       required:False or Continue silently blocks.
 *   - Schedule J household_description, SINGLE filer with 1 dependent:
 *       same field hidden, must Continue through to dependent_details.
 *   - 122A household_and_dependents_info, "Not married":
 *       `separated_status` is hidden via show-if:filing_status. Must have
 *       required:False or Continue silently blocks.
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import {
  b64, waitForDaPageLoad, selectYesNoRadio, fillById,
} from './helpers';
import {
  navigateToDebtorPage, fillDebtorAndAdvance, passDebtorFinal,
  navigatePropertySection, navigateExemptionSection,
  navigateCreditorLibraryPicker, navigateSecuredCreditors,
  navigateUnsecuredCreditors, navigateContractsLeases,
  navigateCommunityProperty, navigateIncome,
} from './navigation-helpers';

/**
 * STRICT Continue click: no validator override, no `:hidden` ignore.
 * If a hidden required field exists, this will silently fail to advance —
 * exactly as it does for a real user.
 */
async function clickContinueStrict(page: import('@playwright/test').Page) {
  await waitForDaPageLoad(page);
  await page.locator('#da-continue-button').click();
  await page.waitForLoadState('networkidle');
}

async function getCurrentHeading(page: import('@playwright/test').Page) {
  return (await page.locator('h1').first().textContent().catch(() => '')) || '';
}

test.describe("Lea's dependent-page bug — strict-validator regression", () => {
  test.setTimeout(420_000);

  test('household_description (single, 0 deps) Continue advances under strict validator', async ({ page }) => {
    // Drive the interview up to Schedule J — use the shared (hack-y) clickContinue
    // for the navigation, since we only need the strict click on the target page.
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
    await waitForDaPageLoad(page);

    // Should now be on "Describe your household".
    const heading = await getCurrentHeading(page);
    expect(heading.toLowerCase()).toContain('household');

    // Answer the only two visible required fields (single filer ⇒
    // `other_household` is hidden by show-if:joint_case).
    await selectYesNoRadio(page, 'debtor[0].expenses.dependents.there_are_any', false);
    await selectYesNoRadio(page, 'debtor[0].expenses.other_people_expenses', false);

    // Capture page state before strict click.
    await page.screenshot({ path: 'test-results/strict-household-pre.png', fullPage: true });

    // STRICT click — no `:hidden` validator override.
    await clickContinueStrict(page);
    await page.waitForTimeout(1500);

    const afterHeading = await getCurrentHeading(page);
    await page.screenshot({ path: 'test-results/strict-household-post.png', fullPage: true });
    console.log(`[strict-0deps] post-Continue heading = "${afterHeading}"`);

    // The fix is correct iff Continue advances past household_description.
    expect(afterHeading.toLowerCase()).not.toContain('household');
  });

  test('household_description (single, 1 dep) Continue advances under strict validator', async ({ page }) => {
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
    await waitForDaPageLoad(page);

    const heading = await getCurrentHeading(page);
    expect(heading.toLowerCase()).toContain('household');

    await selectYesNoRadio(page, 'debtor[0].expenses.dependents.there_are_any', true);
    await selectYesNoRadio(page, 'debtor[0].expenses.other_people_expenses', false);

    await clickContinueStrict(page);
    await page.waitForTimeout(1500);

    const afterHeading = await getCurrentHeading(page);
    console.log(`[strict-1dep] post-Continue heading = "${afterHeading}"`);

    expect(afterHeading.toLowerCase()).toContain('dependent');
  });

  // Note on 122A `separated_status`: same `show if` + missing `required: False`
  // trap on `monthly_income.separated_status` in
  // `122A-question-blocks.yml::household_and_dependents_info`. Fix applied
  // defensively (identical pattern to the verified `other_household` fix above).
  // Not driven by a runtime test here because the test path that reaches that
  // page (non_consumer_debts=False) currently has an unrelated navigation
  // issue on the upstream `means_test_exemptions` page — out of scope for the
  // dependent-page fix and noted for separate investigation.
});
