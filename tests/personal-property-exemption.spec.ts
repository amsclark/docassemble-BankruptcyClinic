/**
 * Personal-property exemption gating (Phil/Roxanne batch 4, May 2026).
 *
 * Bug: on the personal-property screen, the "Claiming Exemption?" question was
 * shown and REQUIRED for every item type even when the filer said they did not
 * own that item — so saying "No firearm" / "No cash" produced a "you didn't
 * claim an exemption" error and blocked progress.
 *
 * Fix: each "Claiming Exemption?" is now gated behind its "Do you own X?"
 * question. This test reaches the personal-property screen, says the filer owns
 * nothing, and asserts the exemption questions are hidden.
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import { navigateToDebtorPage, fillDebtorAndAdvance, passDebtorFinal } from './navigation-helpers';
import {
  b64, waitForDaPageLoad, clickNthByName, clickYesNoButton, selectYesNoRadio,
} from './helpers';

async function notVisible(page, varName: string): Promise<boolean> {
  const loc = page.locator(`[name="${b64(varName)}"]`);
  if (await loc.count() === 0) return true;        // not rendered at all => hidden
  return !(await loc.first().isVisible());          // rendered but display:none
}

test.describe('Personal property — exemption only asked when item owned (batch 4)', () => {
  test.setTimeout(180_000);

  test('"Claiming Exemption?" is hidden for items you do not own', async ({ page }) => {
    await navigateToDebtorPage(page, SIMPLE_SINGLE);
    await fillDebtorAndAdvance(page, SIMPLE_SINGLE.debtor);
    await passDebtorFinal(page);

    // property_intro, then real property / vehicles / other vehicles → No to
    // reach the flat personal-property screen.
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('property_intro'), 0);
    await waitForDaPageLoad(page);
    await clickYesNoButton(page, 'prop.interests.there_are_any', false);
    await waitForDaPageLoad(page);
    await clickYesNoButton(page, 'prop.ab_vehicles.there_are_any', false);
    await waitForDaPageLoad(page);
    await clickYesNoButton(page, 'prop.ab_other_vehicles.there_are_any', false);
    await waitForDaPageLoad(page);
    await page.waitForTimeout(1500);

    // Say we own no household goods and no firearms.
    await selectYesNoRadio(page, 'prop.has_household_goods', false);
    await selectYesNoRadio(page, 'prop.has_firearms', false);
    await page.waitForTimeout(500);

    expect(await notVisible(page, 'prop.firearms_is_claiming_exemption'),
      'firearms exemption question should be hidden when you own no firearms').toBeTruthy();
    expect(await notVisible(page, 'prop.household_goods_is_claiming_exemption'),
      'household-goods exemption question should be hidden when you have none').toBeTruthy();
  });
});
