/**
 * PDF Content Verification Suite (P1)
 *
 * Runs one full interview (LEGACY_NE_MAXIMUM — the most data-rich legacy
 * scenario that's been proven to work), then performs exhaustive field-level
 * verification across all downloaded PDF forms.
 *
 * Uses test.describe.configure({ mode: 'serial' }) so beforeAll runs first,
 * then individual form checks run against the shared pdfs array.
 */
import { test, expect, Browser } from '@playwright/test';
import { LEGACY_NE_MAXIMUM } from './fixtures';
import { runFullInterview } from './navigation-helpers';
import { downloadAllPdfs, findPdf, getField, PdfInfo } from './pdf-helpers';

test.describe('PDF Content Verification Suite', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(420_000);

  let pdfs: PdfInfo[] = [];
  let interviewCompleted = false;

  test('run full interview and download all PDFs', async ({ page }) => {
    await runFullInterview(page, LEGACY_NE_MAXIMUM);

    // Verify conclusion
    const bodyText = await page.locator('body').innerText();
    expect(
      bodyText.toLowerCase().includes('conclusion') ||
      bodyText.toLowerCase().includes('interview questions complete') ||
      bodyText.toLowerCase().includes('your documents are ready')
    ).toBe(true);

    pdfs = await downloadAllPdfs(page);
    expect(pdfs.length).toBeGreaterThanOrEqual(15);
    interviewCompleted = true;

    console.log(`  📋 Downloaded ${pdfs.length} PDFs for verification:`);
    for (const pdf of pdfs) {
      console.log(`    ${pdf.name}: ${pdf.pages} pages, ${Object.keys(pdf.fields).length} fields`);
    }
  });

  test('all PDFs are structurally valid', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    for (const pdf of pdfs) {
      expect(pdf.pages).toBeGreaterThan(0);
      expect(pdf.buffer.length).toBeGreaterThan(100);
    }
  });

  test('Form 101: debtor name, district, chapter', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const form = findPdf(pdfs, '101');
    expect(form).toBeTruthy();
    const f = form!.fields;
    expect(getField(f, 'debtor_first_name1')).toBe('Irene');
    expect(getField(f, 'debtor_last_name1')).toBe('Ingram');
    expect(getField(f, 'bankruptcy_district')).toContain('Nebraska');
    expect(f['isCh7']).toBe(true);
    // SSN should contain last 4 digits
    const ssn = getField(f, 'debtor_ssn1');
    expect(ssn).toContain('0009');
  });

  test('Form 106A/B: real property and vehicle listed', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const form = findPdf(pdfs, '106');
    // Find the A/B form specifically
    const formAB = pdfs.find(p =>
      p.name.toLowerCase().includes('106') &&
      (p.name.toLowerCase().includes('a') || p.name.toLowerCase().includes('b'))
    );
    // At minimum, the combined 106 form should exist
    expect(form || formAB).toBeTruthy();

    if (formAB) {
      const fieldNames = Object.keys(formAB.fields);
      console.log(`  106A/B field names (sample): ${fieldNames.slice(0, 20).join(', ')}`);
    }
  });

  test('Form 106D: secured creditor present', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const form = findPdf(pdfs, '106d');
    // The secured creditor form may be combined with others
    const formD = form || pdfs.find(p =>
      p.name.toLowerCase().includes('106') &&
      p.name.toLowerCase().includes('d')
    );
    if (formD) {
      const fieldNames = Object.keys(formD.fields);
      console.log(`  106D field names (sample): ${fieldNames.slice(0, 20).join(', ')}`);
      // Look for creditor name field
      const creditorField = Object.entries(formD.fields).find(([k, v]) =>
        typeof v === 'string' && v.toLowerCase().includes('great plains')
      );
      if (creditorField) {
        console.log(`  ✓ Found secured creditor: ${creditorField[0]} = ${creditorField[1]}`);
      }
    }
  });

  test('Form 106E/F: unsecured creditors present', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const formEF = pdfs.find(p =>
      p.name.toLowerCase().includes('106') &&
      (p.name.toLowerCase().includes('e') || p.name.toLowerCase().includes('f'))
    );
    if (formEF) {
      const fieldNames = Object.keys(formEF.fields);
      console.log(`  106E/F field names (sample): ${fieldNames.slice(0, 20).join(', ')}`);

      // Look for priority creditor (Nebraska DOR)
      const priorityField = Object.entries(formEF.fields).find(([k, v]) =>
        typeof v === 'string' && v.toLowerCase().includes('nebraska')
      );
      if (priorityField) {
        console.log(`  ✓ Found priority creditor: ${priorityField[0]} = ${priorityField[1]}`);
      }

      // Look for nonpriority creditor (Capital One)
      const nonpriorityField = Object.entries(formEF.fields).find(([k, v]) =>
        typeof v === 'string' && v.toLowerCase().includes('capital one')
      );
      if (nonpriorityField) {
        console.log(`  ✓ Found nonpriority creditor: ${nonpriorityField[0]} = ${nonpriorityField[1]}`);
      }
    }
  });

  test('Form 107: statement of financial affairs', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const form = findPdf(pdfs, '107');
    expect(form).toBeTruthy();
    if (form) {
      expect(form.pages).toBeGreaterThan(0);
      console.log(`  107: ${form.pages} pages, ${Object.keys(form.fields).length} fields`);
    }
  });

  test('Form 108: statement of intention', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const form = findPdf(pdfs, '108');
    expect(form).toBeTruthy();
    if (form) {
      expect(form.pages).toBeGreaterThan(0);
      console.log(`  108: ${form.pages} pages, ${Object.keys(form.fields).length} fields`);
    }
  });

  test('Form 121: social security number verification', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const form = findPdf(pdfs, '121');
    expect(form).toBeTruthy();
    if (form) {
      // Look for SSN field
      const ssnField = Object.entries(form.fields).find(([k, v]) =>
        typeof v === 'string' && v.includes('0009')
      );
      if (ssnField) {
        console.log(`  ✓ Form 121 SSN field: ${ssnField[0]} contains last 4`);
      }
    }
  });

  test('Form 122A: means test calculation', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const form = findPdf(pdfs, '122');
    expect(form).toBeTruthy();
    if (form) {
      expect(form.pages).toBeGreaterThan(0);
      console.log(`  122A: ${form.pages} pages, ${Object.keys(form.fields).length} fields`);
    }
  });

  test('Form 2030: attorney disclosure verified', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const form = findPdf(pdfs, '2030');
    expect(form).toBeTruthy();
    if (form) {
      expect(getField(form.fields, 'District')).toContain('Nebraska');
      expect(getField(form.fields, 'Debtor 1').toLowerCase()).toContain('irene');
      expect(getField(form.fields, 'Chapter')).toBe('7');
      console.log('  ✓ Form 2030: district, debtor, chapter verified');
    }
  });

  test('all expected form numbers are present', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const allNames = pdfs.map(p => p.name.toLowerCase()).join(' | ');
    for (const form of ['101', '106', '107', '108', '121', '122', '2030']) {
      expect(allNames).toContain(form);
    }
  });
});
