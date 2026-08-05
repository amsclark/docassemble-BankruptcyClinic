/**
 * Regression: the assembled PDFs a real user receives must be FLATTENED, and
 * the whole petition must be available as ONE file.
 *
 * Phil Martin (Legal Aid of Nebraska, UAT August 2026) reported two problems
 * with the documents he was emailed:
 *
 *   1. "on the pdf that was emailed to me has a 'Reset' button at the bottom.
 *      I pushed it just to see if it would work. It does. It deleted
 *      everything."  20 of the 27 official USCourts B-form templates ship a
 *      /ResetForm pushbutton plus embedded form JavaScript, and nothing set
 *      `editable:` on the attachments, so every assembled form went out as a
 *      live fillable form with a working wipe-everything button.
 *   2. "it looks like only the first 9 pages are there. Only Form 101 but none
 *      of the Schedules" — ~20 separate attachments in one email is easy to
 *      read as "only Form 101 arrived".
 *
 * This spec drives PRODUCTION_INTERVIEW_URL — i.e. WITHOUT the `pdf_editable=1`
 * override the other specs use to keep reading AcroForm values — so it
 * exercises exactly what a filer downloads.
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import { runFullInterview } from './navigation-helpers';
import { downloadAllPdfs, findPdf } from './pdf-helpers';
import { finishAndAssertAllPdfs } from './assert-helpers';
import { PRODUCTION_INTERVIEW_URL, screenshot } from './helpers';

test.describe('Assembled PDFs are flattened and offered as one packet', () => {
  test.setTimeout(420_000);

  test('no Reset button, no fillable fields, and a combined petition packet', async ({ page }) => {
    await runFullInterview(page, SIMPLE_SINGLE, PRODUCTION_INTERVIEW_URL);
    await screenshot(page, 'pdf-flattening-conclusion');

    // Whole deliverable assembled, no error page. minPdfs is 15 as elsewhere;
    // the combined packet is an extra download on top of the individual forms.
    const pdfs = await finishAndAssertAllPdfs(page);
    console.log(`  Downloaded ${pdfs.length} PDFs`);
    for (const p of pdfs) console.log(`    - ${p.name} (${p.pages}p, ${Object.keys(p.fields).length} fields)`);

    // ── 1. Every delivered PDF is flattened ──
    for (const pdf of pdfs) {
      expect(pdf.pages, `${pdf.name} has no pages`).toBeGreaterThan(0);

      // getPdfFieldValues() returns {} when there is no AcroForm at all. This
      // is the assertion that matters: pdftk's `flatten` stamps the field
      // appearances into the page content and drops every widget annotation,
      // so there is no longer anything to click. (The literal "ResetForm"
      // string can still linger in an orphaned object / the document-level
      // JavaScript name tree — with zero widget annotations nothing can
      // trigger it, so the raw bytes are the wrong thing to assert on.)
      const fieldNames = Object.keys(pdf.fields);
      expect(
        fieldNames,
        `${pdf.name} still has fillable form fields (not flattened): ${fieldNames.slice(0, 5).join(', ')}`,
      ).toHaveLength(0);
    }

    // ── 2. The whole petition is downloadable as a single file ──
    const packet = pdfs.find((p) => /packet/i.test(p.name));
    expect(packet, 'no combined petition packet was offered on the conclusion page').toBeTruthy();

    const form101 = findPdf(pdfs, '101');
    expect(form101).toBeTruthy();

    // The packet is the concatenation of every form, so it must be
    // substantially longer than Form 101 alone (Phil got 9 pages and thought
    // that was the whole filing).
    const otherPages = pdfs
      .filter((p) => p !== packet)
      .reduce((sum, p) => sum + p.pages, 0);
    console.log(`  Packet: ${packet!.pages} pages; individual forms total ${otherPages}`);
    expect(packet!.pages).toBe(otherPages);
    expect(packet!.pages).toBeGreaterThan(form101!.pages);
  });

  test('the pdf_editable=1 test override still produces fillable forms', async ({ page }) => {
    // Guards the escape hatch the field-value specs depend on: if this ever
    // stops working, those specs would silently assert against empty field
    // maps instead of failing loudly.
    await runFullInterview(page, SIMPLE_SINGLE);
    const pdfs = await downloadAllPdfs(page);
    const form101 = findPdf(pdfs, '101');
    expect(form101).toBeTruthy();
    expect(Object.keys(form101!.fields).length).toBeGreaterThan(0);
  });
});
