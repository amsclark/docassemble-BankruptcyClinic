/**
 * Scenario 3: Joint Filing Couple (P1)
 *
 * Robert & Sarah Johnson, SD joint filing, 2 vehicles (one paid off, one
 * with loan), priority + nonpriority creditors, 2 dependents.
 * Validates joint filing flow with two debtor identity collections.
 */
import { test, expect } from '@playwright/test';
import { JOINT_COUPLE } from './fixtures';
import { runFullInterview } from './navigation-helpers';
import { downloadAllPdfs, findPdf, getField } from './pdf-helpers';
import { screenshot } from './helpers';

test.describe('Scenario 3: Joint Filing Couple — Robert & Sarah Johnson', () => {
  test.setTimeout(300_000);

  test('joint filing reaches conclusion with both debtor names in PDFs', async ({ page }) => {
    await runFullInterview(page, JOINT_COUPLE);

    // Verify conclusion
    const bodyText = await page.locator('body').innerText();
    expect(
      bodyText.toLowerCase().includes('conclusion') ||
      bodyText.toLowerCase().includes('interview questions complete') ||
      bodyText.toLowerCase().includes('your documents are ready')
    ).toBe(true);

    await screenshot(page, 'joint-couple-conclusion');

    // Download PDFs
    const pdfs = await downloadAllPdfs(page);
    console.log(`  Downloaded ${pdfs.length} PDFs`);
    expect(pdfs.length).toBeGreaterThanOrEqual(15);

    // ── Form 101: Both debtor names ──
    const form101 = findPdf(pdfs, '101');
    expect(form101).toBeTruthy();
    if (form101) {
      expect(getField(form101.fields, 'debtor_first_name1')).toBe('Robert');
      expect(getField(form101.fields, 'debtor_last_name1')).toBe('Johnson');
      expect(getField(form101.fields, 'bankruptcy_district')).toContain('South Dakota');
      expect(form101.fields['isCh7']).toBe(true);
      // Verify second debtor name
      expect(getField(form101.fields, 'debtor_first_name2')).toBe('Sarah');
      expect(getField(form101.fields, 'debtor_middle_name2')).toBe('K');
      expect(getField(form101.fields, 'debtor_last_name2')).toBe('Johnson');
      // Verify debtor addresses
      expect(getField(form101.fields, 'debtor_street1')).toBe('321 Pine Ln');
      expect(getField(form101.fields, 'debtor_city1')).toBe('Sioux Falls');
      expect(getField(form101.fields, 'debtor_state1')).toContain('South Dakota');
      expect(getField(form101.fields, 'debtor_zip1')).toBe('57101');
      expect(getField(form101.fields, 'debtor_street2')).toBe('321 Pine Ln');
      console.log('  ✓ Form 101: both debtor names and addresses verified');
    }

    // ── Form 2030 ──
    const form2030 = findPdf(pdfs, '2030');
    expect(form2030).toBeTruthy();
    if (form2030) {
      expect(getField(form2030.fields, 'District')).toContain('South Dakota');
      expect(getField(form2030.fields, 'Chapter')).toBe('7');
      console.log('  ✓ Form 2030: SD district, Ch7 verified');
    }

    // Verify key forms present
    const allNames = pdfs.map(p => p.name.toLowerCase()).join(' | ');
    for (const form of ['101', '106', '107', '108', '121', '122', '2030']) {
      expect(allNames).toContain(form);
    }
  });
});
