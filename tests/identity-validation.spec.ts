/**
 * Identity-screen validation (Phil/Roxanne batch 4, May 2026).
 *
 * Two real bugs reported on the "Tell the court about the debtor" screen:
 *  1. An SSN entered without hyphens produced a hard error.
 *  2. After ANY validation error on that screen re-rendered the page, the
 *     County dropdown was wiped to only "N/A" — you couldn't pick a county and
 *     were stuck (Phil had to type "NA" to get through).
 *
 * This test reproduces the bug condition (invalid SSN → re-render) and asserts
 * the County dropdown still lists the state's counties, then that a hyphen-less
 * SSN is accepted.
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import { navigateToDebtorPage } from './navigation-helpers';
import {
  b64, waitForDaPageLoad, fillById, selectById, clickById, clickNthByName,
} from './helpers';

test.describe('Identity screen — SSN + county (batch 4)', () => {
  test.setTimeout(180_000);

  test('hyphen-less SSN is accepted and county survives a validation re-render', async ({ page }) => {
    await navigateToDebtorPage(page, SIMPLE_SINGLE);
    await waitForDaPageLoad(page);

    await fillById(page, b64('debtor[i].name.first'), 'Pat');
    await fillById(page, b64('debtor[i].name.last'), 'Tester');
    await fillById(page, b64('debtor[i].address.address'), '123 Main St');
    await fillById(page, b64('debtor[i].address.city'), 'Omaha');
    await selectById(page, b64('debtor[i].address.state'), 'Nebraska');
    await fillById(page, b64('debtor[i].address.zip'), '68102');

    // County is JS/AJAX-populated after the state is chosen.
    await page.waitForTimeout(1500);
    const county = page.locator(`#${b64('debtor[i].address.county')}`);
    expect(await county.locator('option').count(),
      'counties should populate after choosing a state').toBeGreaterThan(1);
    await county.selectOption({ label: 'Sarpy County' });

    // SSN type = SSN, then enter an INVALID value to force a validation re-render.
    await clickById(page, b64('debtor[i].tax_id.tax_id_type') + '_0');
    await page.waitForTimeout(300);
    await fillById(page, b64('_field_19'), 'abc');
    await clickNthByName(page, b64('debtor_basic_info'), 0);
    await waitForDaPageLoad(page);

    // Still on the identity screen (validation failed) ...
    const heading1 = (await page.locator('h1').first().textContent().catch(() => '')) ?? '';
    expect(heading1.toLowerCase()).toContain('basic identity');

    // ... and the county dropdown must still list the NE counties (the bug
    // collapsed it to just "Select…/N/A"). Wait for repopulation, then assert
    // a real county is present.
    const countyAfter = page.locator(`#${b64('debtor[i].address.county')}`);
    await expect(countyAfter.locator('option', { hasText: 'Sarpy County' }))
      .toHaveCount(1, { timeout: 10_000 });

    // Re-pick the county (the selection resets on re-render) and provide a
    // valid SSN WITHOUT hyphens — it should be accepted (normalized server-side).
    await countyAfter.selectOption({ label: 'Sarpy County' });
    await fillById(page, b64('_field_19'), '123456789');
    await clickNthByName(page, b64('debtor_basic_info'), 0);
    await waitForDaPageLoad(page);

    const heading2 = (await page.locator('h1').first().textContent().catch(() => '')) ?? '';
    expect(heading2.toLowerCase(),
      'a hyphen-less SSN should be accepted and advance the interview').not.toContain('basic identity');
  });

  // Negative test for the exact case a tester raised: an INCOMPLETE SSN —
  // numerically plausible but too few digits (5, not 9). The server-side
  // check (101-question-blocks.yml: `len(_digits) != 9`) must reject it and
  // keep the user on the identity screen with the 9-digit error. The valid
  // 9-digit case is covered above; this proves the blocker fires on a partial
  // entry (not only on the garbage "abc" case).
  test('an incomplete SSN (too few digits) is rejected and blocks advancing', async ({ page }) => {
    await navigateToDebtorPage(page, SIMPLE_SINGLE);
    await waitForDaPageLoad(page);

    await fillById(page, b64('debtor[i].name.first'), 'Pat');
    await fillById(page, b64('debtor[i].name.last'), 'Tester');
    await fillById(page, b64('debtor[i].address.address'), '123 Main St');
    await fillById(page, b64('debtor[i].address.city'), 'Omaha');
    await selectById(page, b64('debtor[i].address.state'), 'Nebraska');
    await fillById(page, b64('debtor[i].address.zip'), '68102');
    await page.waitForTimeout(1500);
    await page.locator(`#${b64('debtor[i].address.county')}`).selectOption({ label: 'Sarpy County' });

    // SSN type = SSN, then an incomplete 5-digit value.
    await clickById(page, b64('debtor[i].tax_id.tax_id_type') + '_0');
    await page.waitForTimeout(300);
    await fillById(page, b64('_field_19'), '12345');
    await clickNthByName(page, b64('debtor_basic_info'), 0);
    await waitForDaPageLoad(page);

    // Must NOT advance — still on the identity screen.
    const heading = (await page.locator('h1').first().textContent().catch(() => '')) ?? '';
    expect(heading.toLowerCase(),
      'an incomplete (5-digit) SSN must keep the user on the identity screen').toContain('basic identity');

    // And the specific SSN-length validation error must be the reason (proves
    // it's the SSN check blocking, not an unrelated empty field).
    const bodyText = (await page.locator('body').innerText().catch(() => '')) ?? '';
    expect(bodyText,
      'the 9-digit SSN validation message should be shown').toMatch(/9-digit number/i);
  });
});
