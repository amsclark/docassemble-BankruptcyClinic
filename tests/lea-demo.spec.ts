/**
 * Demonstration tests for Lea's May-28 feedback fixes, recorded for the
 * RESOLVED page (https://amsclark.github.io/docassemble-BankruptcyClinic/RESOLVED.html).
 *
 * Both demos run AFTER the fixes have been applied — they show the system
 * behaving correctly for a real-user click pattern (no `:hidden` validator
 * override). The bug-reproduction proof — that reverting the YAML change
 * makes the same strict-click hang — lives in `lea-dependent-bug.spec.ts`
 * and the PR description.
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import {
  b64, waitForDaPageLoad, selectYesNoRadio, clickYesNoButton,
} from './helpers';
import {
  navigateToDebtorPage, fillDebtorAndAdvance, passDebtorFinal,
  navigatePropertySection, navigateExemptionSection,
  navigateCreditorLibraryPicker,
} from './navigation-helpers';

async function clickContinueStrict(page: import('@playwright/test').Page) {
  await waitForDaPageLoad(page);
  await page.locator('#da-continue-button').click();
  await page.waitForLoadState('networkidle');
}

async function getCurrentHeading(page: import('@playwright/test').Page) {
  return (await page.locator('h1').first().textContent().catch(() => '')) || '';
}

test.describe("Lea's May-28 fixes — recorded demos", () => {
  test.setTimeout(420_000);

  /**
   * Demo 1: Schedule J "Describe your household" — Continue now works for
   * the single-filer path that was silently blocked.
   *
   * Drives the interview to the Schedule J household page, answers the two
   * visible yes/no questions, and Continues under the STRICT validator
   * (no `:hidden` override). With `required: False` applied to the hidden
   * `other_household` field, the form advances to "Estimate your ongoing
   * monthly expenses".
   */
  test('Schedule J Continue works for single filer (strict validator)', async ({ page }) => {
    await navigateToDebtorPage(page, SIMPLE_SINGLE);
    await fillDebtorAndAdvance(page, SIMPLE_SINGLE.debtor);
    await passDebtorFinal(page);
    await navigatePropertySection(page, SIMPLE_SINGLE);
    await navigateExemptionSection(page);
    await navigateCreditorLibraryPicker(page);
    // Drive past secured creditors quickly: say No to the gate.
    await waitForDaPageLoad(page);
    await clickYesNoButton(page, 'prop.creditors.there_are_any', false);
    // Drive past unsecured creditors (nonpriority list page).
    await waitForDaPageLoad(page);

    // Jump to Schedule J by saying No on every yes/no along the way.
    // Cleanest: re-use the section helpers up through Income, then probe.
    const { navigateUnsecuredCreditors, navigateContractsLeases,
            navigateCommunityProperty, navigateIncome } = await import('./navigation-helpers');
    await navigateUnsecuredCreditors(page, SIMPLE_SINGLE);
    await navigateContractsLeases(page);
    await navigateCommunityProperty(page);
    await navigateIncome(page, SIMPLE_SINGLE);
    await waitForDaPageLoad(page);

    // Land on "Describe your household".
    const heading = await getCurrentHeading(page);
    expect(heading.toLowerCase()).toContain('household');

    // Pause briefly so the video shows the user reading the page.
    await page.waitForTimeout(1200);

    // Pick "No dependents" + "No other-people expenses".
    await selectYesNoRadio(page, 'debtor[0].expenses.dependents.there_are_any', false);
    await page.waitForTimeout(600);
    await selectYesNoRadio(page, 'debtor[0].expenses.other_people_expenses', false);
    await page.waitForTimeout(800);

    // STRICT Continue (no validator hack) — proves the fix.
    await clickContinueStrict(page);
    await page.waitForTimeout(2000);

    const afterHeading = await getCurrentHeading(page);
    expect(afterHeading.toLowerCase()).not.toContain('household');
    expect(afterHeading.toLowerCase()).toContain('monthly expenses');

    // Hold final state on-screen briefly so the video clearly shows the
    // next page reached.
    await page.waitForTimeout(1500);
  });

  /**
   * Demo 2: Back button — added globally via `question back button: True`.
   *
   * Reproduces Lea's "I accidentally clicked Yes on a secured-debt question
   * and can't undo it" scenario:
   *   - reach the Schedule D "Do any creditors have claims secured by your
   *     property?" gate;
   *   - click Yes (the accident);
   *   - on the secured-claim details page, the new in-page **Back** button
   *     is now present;
   *   - click Back, returning to the gate;
   *   - click No, which advances past secured creditors.
   */
  test('Back button lets user undo accidental Yes on secured-debt gate', async ({ page }) => {
    await navigateToDebtorPage(page, SIMPLE_SINGLE);
    await fillDebtorAndAdvance(page, SIMPLE_SINGLE.debtor);
    await passDebtorFinal(page);
    await navigatePropertySection(page, SIMPLE_SINGLE);
    await navigateExemptionSection(page);
    await navigateCreditorLibraryPicker(page);
    await waitForDaPageLoad(page);

    // Should be on the secured-creditor gate ("Do any creditors have claims
    // secured by your property?"). Yes/No buttons only.
    const heading1 = await getCurrentHeading(page);
    expect(heading1.toLowerCase()).toContain('secured by');
    await page.waitForTimeout(1500);

    // Accidental Yes click — used to be unrecoverable.
    await clickYesNoButton(page, 'prop.creditors.there_are_any', true);
    await waitForDaPageLoad(page);

    // Now on the secured-claim details page. The NEW in-page Back button
    // is visible — that's the fix. Highlight it.
    const back = page.locator('text=Back').first();
    await expect(back).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1800);

    // Click Back to return to the gate.
    await back.click();
    await page.waitForLoadState('networkidle');
    await waitForDaPageLoad(page);

    // Should be back at the secured-creditor gate.
    const heading2 = await getCurrentHeading(page);
    expect(heading2.toLowerCase()).toContain('secured by');
    await page.waitForTimeout(1500);

    // Now click No (the answer the user actually wanted).
    await clickYesNoButton(page, 'prop.creditors.there_are_any', false);
    await waitForDaPageLoad(page);

    // Advanced past secured creditors — the gate is gone.
    const heading3 = await getCurrentHeading(page);
    expect(heading3.toLowerCase()).not.toContain('secured by');
    await page.waitForTimeout(2000);
  });
});
