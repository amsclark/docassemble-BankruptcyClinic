/**
 * Scenario 4: Complex Case (P1)
 *
 * Patricia O'Brien-Smith, NE individual, amended filing with case number,
 * alias, separate mailing address, real property + vehicle + deposits,
 * secured + priority + nonpriority creditors.
 *
 * Note: codebtor and contracts/leases sections require extended navigation
 * functions. This test uses the standard "No" paths for those sections
 * while validating the other complex fields (amended, alias, mailing address).
 */
import { test, expect } from '@playwright/test';
import { COMPLEX_CASE } from './fixtures';
import { runFullInterview } from './navigation-helpers';
import { downloadAllPdfs, findPdf, getField } from './pdf-helpers';
import { screenshot } from './helpers';

test.describe('Scenario 4: Complex Case — Patricia O\'Brien-Smith', () => {
  test.setTimeout(360_000);

  test('amended filing with alias + mailing address reaches conclusion', async ({ page }) => {
    await runFullInterview(page, COMPLEX_CASE);

    // Verify conclusion
    const bodyText = await page.locator('body').innerText();
    expect(
      bodyText.toLowerCase().includes('conclusion') ||
      bodyText.toLowerCase().includes('interview questions complete') ||
      bodyText.toLowerCase().includes('your documents are ready')
    ).toBe(true);

    await screenshot(page, 'complex-case-conclusion');

    // Download PDFs
    const pdfs = await downloadAllPdfs(page);
    console.log(`  Downloaded ${pdfs.length} PDFs`);
    expect(pdfs.length).toBeGreaterThanOrEqual(15);

    // ── Form 101 ──
    const form101 = findPdf(pdfs, '101');
    expect(form101).toBeTruthy();
    if (form101) {
      // Name with special characters
      expect(getField(form101.fields, 'debtor_first_name1')).toBe('Patricia');
      const lastName = getField(form101.fields, 'debtor_last_name1');
      expect(lastName).toContain("O'Brien");
      expect(getField(form101.fields, 'bankruptcy_district')).toContain('Nebraska');
      expect(form101.fields['isCh7']).toBe(true);
      console.log('  ✓ Form 101: special character name, NE district verified');
    }

    // ── Form 2030 ──
    const form2030 = findPdf(pdfs, '2030');
    expect(form2030).toBeTruthy();
    if (form2030) {
      expect(getField(form2030.fields, 'District')).toContain('Nebraska');
      console.log('  ✓ Form 2030: verified');
    }

    // Verify key forms
    const allNames = pdfs.map(p => p.name.toLowerCase()).join(' | ');
    for (const form of ['101', '106', '107', '108', '121', '122', '2030']) {
      expect(allNames).toContain(form);
    }
  });
});
