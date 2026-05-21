/**
 * Confirmation tests for the May-2026 customer-feedback fixes (Roxanne's notes).
 *
 * These assert the user-visible result of specific fixes by navigating to the
 * page that hosts each fix and inspecting the rendered options/labels. They
 * complement the end-to-end scenario specs (which prove no-regression across
 * the whole petition).
 */
import { test, expect } from '@playwright/test';
import {
  b64,
  waitForDaPageLoad,
  clickNthByName,
  clickYesNoButton,
  fillYesNoRadio,
} from './helpers';
import { SIMPLE_SINGLE } from './fixtures';
import {
  navigateToDebtorPage,
  fillDebtorAndAdvance,
  passDebtorFinal,
  navigatePropertySection,
} from './navigation-helpers';

/** Read the option/datalist values associated with a field id (handles both
 *  <select> and combobox <input list=...> renderings). */
async function fieldOptions(page: import('@playwright/test').Page, fieldId: string): Promise<string[]> {
  return page.evaluate((id) => {
    const el = document.getElementById(id);
    if (!el) return [];
    if (el.tagName.toLowerCase() === 'select') {
      return Array.from(el.querySelectorAll('option')).map((o) => (o.textContent || '').trim());
    }
    const listId = el.getAttribute('list');
    const dl = (listId && document.getElementById(listId)) || el.parentElement?.querySelector('datalist');
    if (dl) return Array.from(dl.querySelectorAll('option')).map((o) => ((o as HTMLOptionElement).value || o.textContent || '').trim());
    return [];
  }, fieldId);
}

test.describe('Roxanne feedback fixes', () => {
  test('Real property: ownership interest is a pick-list; wildcard citation drops the bogus (1)(c)', async ({ page }) => {
    await navigateToDebtorPage(page, SIMPLE_SINGLE);
    await fillDebtorAndAdvance(page, SIMPLE_SINGLE.debtor);
    await passDebtorFinal(page);

    // Property intro -> real property "Yes" lands on the detail page.
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('property_intro'), 0);
    await waitForDaPageLoad(page);
    await clickYesNoButton(page, 'prop.interests.there_are_any', true);
    await waitForDaPageLoad(page);

    // Ownership-interest is now a selectable list with the named tenancy options.
    // (docassemble renders datatype:combobox as an enhanced <input>; its options
    // live in the page DOM, so assert against the rendered HTML.)
    const ownershipField = page.locator(`#${b64('prop.interests[0].ownership_interest')}`);
    await expect(ownershipField).toBeAttached();
    const html = await page.content();
    expect(html).toContain('Fee Simple');
    expect(html).toContain('Tenancy by the Entireties');
    expect(html).toContain('Tenants in Common');

    // Claim an exemption so the law dropdown renders, then verify the corrected
    // wildcard citation (§ 25-1552, NOT the non-existent § 25-1552(1)(c)).
    await fillYesNoRadio(page, 'prop.interests[0].is_claiming_exemption', true);
    await page.waitForTimeout(500);
    // The exemption-law list renders its options into the DOM; check the
    // corrected wildcard citation is present and the bogus subsection is gone.
    const htmlWithLaws = await page.content();
    expect(htmlWithLaws).toContain('Neb. Rev. Stat. § 25-1552');
    expect(htmlWithLaws).not.toContain('25-1552(1)(c)');
  });

  test('Exemption set choices are relabeled to State / Federal', async ({ page }) => {
    await navigateToDebtorPage(page, SIMPLE_SINGLE);
    await fillDebtorAndAdvance(page, SIMPLE_SINGLE.debtor);
    await passDebtorFinal(page);
    // SIMPLE_SINGLE has no property, so this answers "No" through Schedule A/B
    // and lands on the Schedule C exemption-type question.
    await navigatePropertySection(page, SIMPLE_SINGLE);
    await waitForDaPageLoad(page);

    const body = await page.locator('body').innerText();
    expect(body).toContain('Which set of exemptions');

    const opts = await fieldOptions(page, b64('prop.exempt_property.exemption_type'));
    const optsText = opts.join(' | ');
    expect(optsText).toContain('State exemptions');
    expect(optsText).toContain('Federal exemptions');
  });
});
