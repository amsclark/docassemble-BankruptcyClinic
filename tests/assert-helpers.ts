import { expect, Page } from '@playwright/test';
import { downloadAllPdfs } from './pdf-helpers';

/**
 * Assert the interview ran ALL THE WAY THROUGH to PDF assembly without error.
 *
 * A passing mid-interview screen proves a *screen*, not the *deliverable*. Many
 * crashes (e.g. the 106AB grand-total sum, the means-test review loop) only
 * surface at final assembly or on a downstream screen, and a fix can introduce a
 * later failure. So every scenario/regression test must end here.
 *
 * Fails if the page is a docassemble error, if the conclusion/assembly screen
 * was not reached, or if the expected forms did not assemble.
 */
export async function finishAndAssertAllPdfs(
  page: Page,
  opts: { minPdfs?: number; mustInclude?: string[] } = {},
) {
  const body = (await page.locator('body').innerText()).toLowerCase();
  expect(body, 'interview ended on a docassemble error page').not.toContain('there was an error');
  const atEnd =
    body.includes('conclusion') ||
    body.includes('documents are ready') ||
    body.includes('interview questions complete');
  expect(atEnd, 'interview did not reach the conclusion / assembly screen').toBe(true);

  const pdfs = await downloadAllPdfs(page);
  expect(pdfs.length, 'no PDFs were produced at assembly').toBeGreaterThanOrEqual(opts.minPdfs ?? 15);

  const names = pdfs.map((p) => p.name.toLowerCase()).join(' | ');
  for (const f of opts.mustInclude ?? ['101', '106', '107', '122']) {
    expect(names, `expected form ${f} missing from assembled PDFs`).toContain(f);
  }
  return pdfs;
}
