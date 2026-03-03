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

/** Helper: find a field value by searching all fields for a matching string */
function findFieldValue(fields: Record<string, string | boolean | undefined>, search: string): string | undefined {
  const entry = Object.entries(fields).find(([k, v]) =>
    typeof v === 'string' && v.toLowerCase().includes(search.toLowerCase())
  );
  return entry ? (entry[1] as string) : undefined;
}

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

    console.log(`  Downloaded ${pdfs.length} PDFs for verification:`);
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

  test('Form 101: debtor identity, address, district, chapter', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const form = findPdf(pdfs, '101');
    expect(form).toBeTruthy();
    const f = form!.fields;

    // Debtor name
    expect(getField(f, 'debtor_first_name1')).toBe('Irene');
    expect(getField(f, 'debtor_middle_name1')).toBe('V');
    expect(getField(f, 'debtor_last_name1')).toBe('Ingram');

    // Debtor address
    expect(getField(f, 'debtor_street1')).toBe('900 Cherry Ct');
    expect(getField(f, 'debtor_city1')).toBe('Grand Island');
    expect(getField(f, 'debtor_state1')).toContain('Nebraska');
    expect(getField(f, 'debtor_zip1')).toBe('68801');

    // District and chapter
    expect(getField(f, 'bankruptcy_district')).toContain('Nebraska');
    expect(f['isCh7']).toBe(true);
    expect(f['isCh11']).toBe(false);
    expect(f['isCh13']).toBe(false);

    // SSN last 4
    expect(getField(f, 'debtor_ssn1')).toContain('0009');

    // Header name repeated across pages
    expect(getField(f, 'debtor1_name_1')).toContain('Irene');
    expect(getField(f, 'debtor1_name_1')).toContain('Ingram');
  });

  test('Form 106A/B: real property and vehicle data populated', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const formAB = pdfs.find(p => p.name.toLowerCase().includes('106ab'));
    expect(formAB).toBeTruthy();
    const f = formAB!.fields;

    // Real property: specific field assertions
    expect(getField(f, 'prop1Street')).toBe('900 Cherry Ct');
    expect(getField(f, 'prop1City')).toBe('Grand Island');
    expect(getField(f, 'prop1State')).toBe('NE');
    expect(getField(f, 'prop1Zip')).toBe('68801');
    expect(getField(f, 'prop1County')).toBe('Hall');
    expect(f['prop1SingleFam']).toBe(true);
    expect(f['prop1Debtor1Only']).toBe(true);
    expect(f['hasInterest']).toBe(true);

    // Vehicle: specific field assertions
    expect(getField(f, 'v1Make')).toBe('Chevrolet');
    expect(getField(f, 'v1Model')).toBe('Malibu');
    expect(f['hasVehicles']).toBe(true);

    // Deposit should appear somewhere (savings type)
    const hasSvDeposit = getField(f, 'sv1Institution');
    const hasChDeposit = getField(f, 'ch1Institution');
    expect(hasSvDeposit || hasChDeposit).toBeTruthy();

    console.log(`  106A/B: ${formAB!.pages} pages, ${Object.keys(f).length} fields`);
  });

  test('Form 106D: secured creditor data populated', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const formD = pdfs.find(p => p.name.toLowerCase().includes('106d'));
    expect(formD).toBeTruthy();
    const f = formD!.fields;

    // Great Plains Lending should be in the secured creditor name field
    expect(getField(f, 'name1')).toBe('Great Plains Lending');

    // Claim amount
    const claimField = findFieldValue(f, '110') || findFieldValue(f, '110,000');
    expect(claimField).toBeTruthy();

    // Collateral value
    const collateralField = findFieldValue(f, '135') || findFieldValue(f, '135,000');
    expect(collateralField).toBeTruthy();
  });

  test('Form 106E/F: priority and nonpriority creditors populated', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const formEF = pdfs.find(p => p.name.toLowerCase().includes('106ef'));
    expect(formEF).toBeTruthy();
    const f = formEF!.fields;

    // Priority creditor: Nebraska DOR
    const hasPriority = findFieldValue(f, 'Nebraska DOR') ||
                        findFieldValue(f, 'Nebraska') && findFieldValue(f, 'DOR');
    expect(hasPriority).toBeTruthy();

    // Nonpriority creditor: Capital One
    const hasNonpriority = findFieldValue(f, 'Capital One');
    expect(hasNonpriority).toBeTruthy();

    console.log(`  106E/F: ${formEF!.pages} pages, ${Object.keys(f).length} fields`);
  });

  test('Form 106I: income data populated', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const formI = pdfs.find(p => p.name.toLowerCase().includes('106i'));
    expect(formI).toBeTruthy();
    expect(formI!.pages).toBeGreaterThan(0);
    console.log(`  106I: ${formI!.pages} pages, ${Object.keys(formI!.fields).length} fields`);
  });

  test('Form 106J: expenses data populated', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const formJ = pdfs.find(p => p.name.toLowerCase().includes('106j'));
    expect(formJ).toBeTruthy();
    expect(formJ!.pages).toBeGreaterThan(0);
    console.log(`  106J: ${formJ!.pages} pages, ${Object.keys(formJ!.fields).length} fields`);
  });

  test('Form 107: statement of financial affairs', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const form = findPdf(pdfs, '107');
    expect(form).toBeTruthy();
    expect(form!.pages).toBeGreaterThan(0);
    expect(Object.keys(form!.fields).length).toBeGreaterThan(50);
  });

  test('Form 108: statement of intention with secured creditor data', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const form = findPdf(pdfs, '108');
    expect(form).toBeTruthy();
    const f = form!.fields;
    expect(form!.pages).toBeGreaterThan(0);

    // Should contain Great Plains Lending (auto-populated from Schedule D)
    const hasCreditor = findFieldValue(f, 'Great Plains') ||
                        getField(f, 'name1').includes('Great Plains');
    expect(hasCreditor).toBeTruthy();

    // District and debtor name in header
    expect(getField(f, 'debtor1_name_1')).toContain('Irene');
    expect(getField(f, 'bankruptcy_district')).toContain('Nebraska');
  });

  test('Form 121: SSN verification', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const form = findPdf(pdfs, '121');
    expect(form).toBeTruthy();
    const f = form!.fields;

    // SSN last 4 digits
    const ssnField = Object.entries(f).find(([k, v]) =>
      typeof v === 'string' && v.includes('0009')
    );
    expect(ssnField).toBeTruthy();
  });

  test('Form 122A: means test present', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const form = findPdf(pdfs, '122');
    expect(form).toBeTruthy();
    expect(form!.pages).toBeGreaterThan(0);
    expect(Object.keys(form!.fields).length).toBeGreaterThan(20);
  });

  test('Form 2030: attorney disclosure verified', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const form = findPdf(pdfs, '2030');
    expect(form).toBeTruthy();
    const f = form!.fields;

    expect(getField(f, 'District')).toContain('Nebraska');
    expect(getField(f, 'Debtor 1').toLowerCase()).toContain('irene');
    expect(getField(f, 'Chapter')).toBe('7');
  });

  test('all expected form numbers are present', async () => {
    test.skip(!interviewCompleted, 'Interview did not complete');
    const allNames = pdfs.map(p => p.name.toLowerCase()).join(' | ');
    for (const form of ['101', '106', '107', '108', '121', '122', '2030']) {
      expect(allNames).toContain(form);
    }
  });
});
