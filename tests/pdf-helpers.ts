import { Page, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

/** Info about a single downloaded PDF. */
export interface PdfInfo {
  name: string;
  href: string;
  buffer: Buffer;
  pages: number;
  fields: Record<string, string | boolean | undefined>;
}

/** Download a single PDF from a link and return its Buffer. */
export async function downloadPdf(page: Page, href: string): Promise<Buffer> {
  const response = await page.request.get(href);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('pdf');
  return Buffer.from(await response.body());
}

/** Parse a PDF buffer and return all form field values as a flat record. */
export async function getPdfFieldValues(buffer: Buffer): Promise<Record<string, string | boolean | undefined>> {
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const fieldMap: Record<string, string | boolean | undefined> = {};
  try {
    const form = pdfDoc.getForm();
    for (const field of form.getFields()) {
      const name = field.getName();
      const ctor = field.constructor.name;
      if (ctor === 'PDFTextField') fieldMap[name] = (field as any).getText() ?? '';
      else if (ctor === 'PDFCheckBox') fieldMap[name] = (field as any).isChecked();
      else if (ctor === 'PDFDropdown') {
        const sel = (field as any).getSelected();
        fieldMap[name] = sel?.length ? sel[0] : '';
      }
      else if (ctor === 'PDFRadioGroup') fieldMap[name] = (field as any).getSelected() ?? '';
    }
  } catch { /* no form fields */ }
  return fieldMap;
}

/** Assert that specific fields in a PDF buffer match expected values. */
export async function assertPdfContains(
  buffer: Buffer,
  fieldChecks: Record<string, string | boolean | RegExp>,
): Promise<void> {
  const fields = await getPdfFieldValues(buffer);
  for (const [key, expected] of Object.entries(fieldChecks)) {
    const actual = fields[key];
    if (expected instanceof RegExp) {
      expect(String(actual ?? '')).toMatch(expected);
    } else {
      expect(actual).toBe(expected);
    }
  }
}

/** Download all PDFs from the conclusion page. Returns array of PdfInfo. */
export async function downloadAllPdfs(page: Page): Promise<PdfInfo[]> {
  const downloadLinks = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/uploadedfile/"]');
    return Array.from(links).map(a => ({
      name: a.textContent?.trim() || '',
      href: (a as HTMLAnchorElement).href,
    }));
  });

  const formHeadings = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('h3'))
      .map(h => h.textContent?.trim() || '')
      .filter(t => t.toLowerCase().startsWith('form'));
  });

  const pdfInfos: PdfInfo[] = [];
  for (let i = 0; i < downloadLinks.length; i++) {
    const response = await page.request.get(downloadLinks[i].href);
    expect(response.status()).toBe(200);
    const buffer = Buffer.from(await response.body());
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const fields = await getPdfFieldValues(buffer);
    pdfInfos.push({
      name: formHeadings[i] || downloadLinks[i].name,
      href: downloadLinks[i].href,
      buffer,
      pages: pdfDoc.getPageCount(),
      fields,
    });
  }
  return pdfInfos;
}

/** Find a PDF by form number (e.g., '101', '106D', '2030'). */
export function findPdf(pdfs: PdfInfo[], formNum: string): PdfInfo | undefined {
  return pdfs.find(p => p.name.toLowerCase().includes(formNum.toLowerCase()));
}

/** Get a string value from a field map, coercing booleans to 'true'/'false'. */
export function getField(fields: Record<string, string | boolean | undefined>, key: string): string {
  const val = fields[key];
  if (typeof val === 'string') return val;
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  return '';
}
