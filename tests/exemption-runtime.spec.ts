/**
 * Runtime regression test for issue #37.
 *
 * The static-analysis spec (exemption-consistency.spec.ts) proves no hardcoded
 * NE-only law lists remain in the YAML. This spec proves the fix actually
 * renders both NE and SD options in the dropdown when the page is loaded.
 *
 * Walks a Nebraska debtor through intro → debtor → property → vehicles, lands
 * on the personal-and-household-items page (the page Lea reported as missing
 * SD options), claims an exemption on household goods, and asserts that the
 * exemption-laws dropdown contains both Nebraska and South Dakota citations.
 */
import { test, expect } from '@playwright/test';
import { LEGACY_NE_MINIMAL } from './fixtures';
import {
  navigateToDebtorPage,
  fillDebtorAndAdvance,
  passDebtorFinal,
} from './navigation-helpers';
import {
  b64,
  waitForDaPageLoad,
  clickNthByName,
  clickYesNoButton,
  selectYesNoRadio,
} from './helpers';

test.describe('Exemption dropdown runtime (issue #37)', () => {
  test.setTimeout(300_000);

  test('household-goods exemption dropdown shows both NE and SD options', async ({ page }) => {
    const scenario = LEGACY_NE_MINIMAL;

    // intro → district → amendment → debtor identity
    await navigateToDebtorPage(page, scenario);
    await fillDebtorAndAdvance(page, scenario.debtor);
    await passDebtorFinal(page);

    // property_intro
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('property_intro'), 0);

    // No real property, no vehicles, no other vehicles → land on
    // the personal-and-household-items page
    await waitForDaPageLoad(page);
    await clickYesNoButton(page, 'prop.interests.there_are_any', false);
    await waitForDaPageLoad(page);
    await clickYesNoButton(page, 'prop.ab_vehicles.there_are_any', false);
    await waitForDaPageLoad(page);
    await clickYesNoButton(page, 'prop.ab_other_vehicles.there_are_any', false);

    // Wait for the personal/household items page
    await waitForDaPageLoad(page);
    await page.waitForLoadState('networkidle');
    const heading = await page.locator('h1').first().textContent();
    expect(heading?.toLowerCase()).toContain('personal and household items');

    // Click "Yes" on the household_goods exemption claim — this triggers the
    // show-if that reveals the exemption_laws dropdown.
    await selectYesNoRadio(page, 'prop.household_goods_is_claiming_exemption', true);

    // docassemble assigns opaque ids like `_field_56` to selects (not the
    // variable name), so locate the household-goods dropdown by anchoring on
    // a known household-goods law citation in its options.
    const dropdown = page.locator('select').filter({
      has: page.locator('option', {
        hasText: 'Household goods (Neb. Rev. Stat.',
      }),
    }).first();
    await expect(dropdown).toBeVisible({ timeout: 10_000 });

    const options = await dropdown.locator('option').allTextContents();
    const cleaned = options.map((o) => o.trim()).filter((o) => o.length > 0);
    console.log(`  Dropdown options (${cleaned.length}):`);
    for (const o of cleaned) console.log(`    - ${o}`);

    // The fix means this dropdown should contain both Nebraska and South
    // Dakota law citations. Before the fix it was NE-only.
    const hasNE = cleaned.some((o) => /Neb\.\s*Rev\.\s*Stat\./i.test(o));
    const hasSD = cleaned.some((o) => /\bSDCL\b/i.test(o));

    expect(hasNE, 'expected at least one Nebraska citation in the dropdown').toBe(true);
    expect(hasSD, 'expected at least one South Dakota citation in the dropdown — this is the regression Lea reported (#37)').toBe(true);
  });
});
