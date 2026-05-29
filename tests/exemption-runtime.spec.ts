/**
 * Runtime test for the exemption dropdowns.
 *
 * Clinic decision (supersedes the original issue #37 "show both states"):
 * exemptions are now restricted to the FILING STATE — a Nebraska filing shows
 * Nebraska exemptions only, a South Dakota filing shows SD only.
 *
 * Walks a Nebraska debtor through intro → debtor → property → vehicles, lands
 * on the personal-and-household-items page, claims an exemption on household
 * goods, and asserts the exemption-laws dropdown shows Nebraska citations and
 * NOT South Dakota citations.
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
  waitForPageStable,
  clickNthByName,
  clickYesNoButton,
  pickYesNoradio,
} from './helpers';

test.describe('Exemption dropdown runtime (issue #37)', () => {
  test.setTimeout(300_000);

  test('household-goods exemption dropdown is restricted to the filing state (NE only)', async ({ page }) => {
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
    await waitForPageStable(page);
    const heading = await page.locator('h1').first().textContent();
    expect(heading?.toLowerCase()).toContain('personal and household items');

    // The parent yesnoradio (`has_household_goods`) is a top-level field —
    // its input is named `b64('prop.has_household_goods')`. The child
    // (`is_claiming_exemption`) is inside a `show if:` and gets renamed to
    // an opaque `_field_N` id; we resolve it by its question label text.
    await pickYesNoradio(page, 'prop.has_household_goods', true);
    await pickYesNoradio(
      page,
      'prop.household_goods_is_claiming_exemption',
      true,
      // Show-if'd field: docassemble renamed it to an opaque _field_N id.
      // Anchor by question label + the show-if condition for unambiguous lookup.
      { label: 'Claiming Exemption?', inShowIfOf: 'prop.has_household_goods' },
    );

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

    // Clinic decision: a Nebraska filing shows Nebraska citations and NOT
    // South Dakota ones (exemptions restricted to the filing state).
    const hasNE = cleaned.some((o) => /Neb\.\s*Rev\.\s*Stat\./i.test(o));
    const hasSD = cleaned.some((o) => /\bSDCL\b/i.test(o));

    expect(hasNE, 'expected Nebraska citations in the dropdown for a NE filing').toBe(true);
    expect(hasSD, 'expected NO South Dakota citations for a NE filing (exemptions restricted to filing state)').toBe(false);
  });
});
