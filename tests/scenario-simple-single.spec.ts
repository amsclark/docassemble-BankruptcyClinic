/**
 * Scenario 1: Simple Single Filer (P0 — Smoke/Happy Path)
 *
 * Maria Garcia, NE individual, no property, 2 nonpriority unsecured creditors.
 * Exercises the complete start-to-finish interview with "No" paths through
 * all property questions (no list-collect jQuery bug exposure).
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import { runFullInterview } from './navigation-helpers';
import { downloadAllPdfs, findPdf, getField, PdfInfo } from './pdf-helpers';
import { waitForDaPageLoad, screenshot } from './helpers';

test.describe('Scenario 1: Simple Single Filer — Maria Garcia', () => {
  test.setTimeout(420_000);

  test('complete filing reaches conclusion with all forms', async ({ page }) => {
    await runFullInterview(page, SIMPLE_SINGLE);

    // Verify conclusion page reached
    const bodyText = await page.locator('body').innerText();
    expect(
      bodyText.toLowerCase().includes('conclusion') ||
      bodyText.toLowerCase().includes('interview questions complete') ||
      bodyText.toLowerCase().includes('your documents are ready')
    ).toBe(true);

    await screenshot(page, 'simple-single-conclusion');

    // Download and verify all PDFs
    const pdfs = await downloadAllPdfs(page);
    console.log(`  Downloaded ${pdfs.length} PDFs`);
    expect(pdfs.length).toBeGreaterThanOrEqual(15);

    // All PDFs must have at least 1 page
    for (const pdf of pdfs) {
      expect(pdf.pages).toBeGreaterThan(0);
    }

    // ── Form 101: Voluntary Petition ──
    const form101 = findPdf(pdfs, '101');
    expect(form101).toBeTruthy();
    if (form101) {
      expect(getField(form101.fields, 'debtor_first_name1')).toBe('Maria');
      expect(getField(form101.fields, 'debtor_last_name1')).toBe('Garcia');
      expect(getField(form101.fields, 'bankruptcy_district')).toContain('Nebraska');
      expect(form101.fields['isCh7']).toBe(true);
      console.log('  ✓ Form 101: debtor name, district, Ch7 verified');
    }

    // ── Form 2030: Attorney Disclosure ──
    const form2030 = findPdf(pdfs, '2030');
    expect(form2030).toBeTruthy();
    if (form2030) {
      expect(getField(form2030.fields, 'District')).toContain('Nebraska');
      expect(getField(form2030.fields, 'Chapter')).toBe('7');
      console.log('  ✓ Form 2030: district, chapter verified');
    }

    // Verify key form numbers are present in headings
    const allNames = pdfs.map(p => p.name.toLowerCase()).join(' | ');
    for (const form of ['101', '106', '107', '108', '121', '122', '2030']) {
      expect(allNames).toContain(form);
    }
    console.log('  ✓ All key form numbers present');
  });
});
