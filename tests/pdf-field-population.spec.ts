/**
 * End-to-end proof that the 106AB template-field-name fixes actually populate
 * the assembled PDF (and a permanent regression guard against them silently
 * reverting). The 106AB template field names are misspelled
 * (`hasJewlery`/`jewleryAmt`/`jewleryDescription`); the builder wrote the
 * correct spellings, so every filer's Schedule A/B jewelry line shipped blank.
 * docassemble fills by EXACT field-name match, so this can ONLY pass when the
 * builder keys match the (misspelled) template field names.
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE, TestScenario } from './fixtures';
import { runFullInterview } from './navigation-helpers';
import { downloadAllPdfs, findPdf, getField } from './pdf-helpers';

test.describe('PDF field population — fixed template-name mismatches', () => {
  test.setTimeout(420_000);

  test('106AB jewelry line populates (template fields are misspelled)', async ({ page }) => {
    const scenario: TestScenario = {
      ...SIMPLE_SINGLE,
      name: 'jewelry-population',
      property: { jewelry: { description: 'Gold wedding ring and watch', value: '1500' } },
    };
    await runFullInterview(page, scenario);

    const pdfs = await downloadAllPdfs(page);
    const ab = findPdf(pdfs, '106A') || findPdf(pdfs, '106ab') || findPdf(pdfs, '106AB');
    expect(ab, '106AB PDF assembled').toBeTruthy();

    // These are the MISSPELLED template field names the builder now writes to.
    expect(getField(ab!.fields, 'jewleryDescription'),
      'jewelry description on Schedule A/B').toContain('Gold wedding ring');
    expect(getField(ab!.fields, 'jewleryAmt'),
      'jewelry value on Schedule A/B').toContain('1,500');
    expect(ab!.fields['hasJewlery'],
      'has-jewelry checkbox on Schedule A/B').toBe(true);
  });
});
