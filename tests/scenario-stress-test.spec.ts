/**
 * Scenario 5: Stress Test / Maximum Coverage (P2)
 *
 * Alexander Maximilian, SD individual, maximum data:
 * real property + vehicle + deposit + secured + priority + nonpriority creditors.
 * Uses the single-item navigation path (first item of each list).
 *
 * Future extension: iterate through multi-item lists using
 * realProperties[], vehicles[], deposits[], securedList[], etc.
 */
import { test, expect } from '@playwright/test';
import { STRESS_TEST } from './fixtures';
import { runFullInterview } from './navigation-helpers';
import { downloadAllPdfs, findPdf, getField } from './pdf-helpers';
import { screenshot } from './helpers';

test.describe('Scenario 5: Stress Test — Maximum Coverage', () => {
  test.setTimeout(480_000);

  test('maximum data scenario reaches conclusion with all forms', async ({ page }) => {
    await runFullInterview(page, STRESS_TEST);

    // Verify conclusion
    const bodyText = await page.locator('body').innerText();
    expect(
      bodyText.toLowerCase().includes('conclusion') ||
      bodyText.toLowerCase().includes('interview questions complete') ||
      bodyText.toLowerCase().includes('your documents are ready')
    ).toBe(true);

    await screenshot(page, 'stress-test-conclusion');

    // Download PDFs
    const pdfs = await downloadAllPdfs(page);
    console.log(`  Downloaded ${pdfs.length} PDFs`);
    expect(pdfs.length).toBeGreaterThanOrEqual(15);

    // All PDFs valid
    for (const pdf of pdfs) {
      expect(pdf.pages).toBeGreaterThan(0);
    }

    // ── Form 101 ──
    const form101 = findPdf(pdfs, '101');
    expect(form101).toBeTruthy();
    if (form101) {
      expect(getField(form101.fields, 'debtor_first_name1')).toBe('Alexander');
      expect(getField(form101.fields, 'debtor_last_name1')).toBe('Maximilian');
      expect(getField(form101.fields, 'bankruptcy_district')).toContain('South Dakota');
      expect(form101.fields['isCh7']).toBe(true);
      console.log('  ✓ Form 101: stress test debtor verified');
    }

    // ── Form 2030 ──
    const form2030 = findPdf(pdfs, '2030');
    expect(form2030).toBeTruthy();
    if (form2030) {
      expect(getField(form2030.fields, 'District')).toContain('South Dakota');
      expect(getField(form2030.fields, 'Chapter')).toBe('7');
    }

    // Verify all key forms
    const allNames = pdfs.map(p => p.name.toLowerCase()).join(' | ');
    for (const form of ['101', '106', '107', '108', '121', '122', '2030']) {
      expect(allNames).toContain(form);
    }

    // Log PDF details for manual review
    for (const pdf of pdfs) {
      console.log(`  📄 ${pdf.name}: ${pdf.pages} pages, ${Object.keys(pdf.fields).length} fields`);
    }
  });
});
