import { Page } from '@playwright/test';

/** Base URL for the docassemble interview */
export const INTERVIEW_URL =
  'https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1';

/** Base64-url-encode a docassemble field name (strips trailing '=' padding). */
export const b64 = (str: string): string =>
  Buffer.from(str).toString('base64').replace(/=+$/, '');

// ──────────────────────────────────────────────
//  Page-level helpers
// ──────────────────────────────────────────────

/** Wait for the docassemble `daPageLoad` jQuery event (with fallback). */
export async function waitForDaPageLoad(page: Page, label = '') {
  try {
    await page.evaluate(() =>
      new Promise<void>((resolve) => {
        if (typeof (window as any).$ !== 'undefined') {
          const $ = (window as any).$;
          $(document).on('daPageLoad', () => resolve());
          if (document.readyState === 'complete') setTimeout(resolve, 150);
        } else {
          document.readyState === 'complete'
            ? setTimeout(resolve, 150)
            : window.addEventListener('load', () => resolve());
        }
      }),
    );
  } catch {
    /* swallow – we'll continue anyway */
  }
}

/** Return the text of the first heading on the page. */
export async function getHeading(page: Page): Promise<string> {
  await page.waitForSelector('h1, h2, h3', { timeout: 5000 }).catch(() => {});
  return page
    .locator('h1, h2, h3')
    .first()
    .textContent()
    .then((t) => t?.trim() ?? '')
    .catch(() => '');
}

/** Save a full-page screenshot into `test-results/`. */
export async function screenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

// ──────────────────────────────────────────────
//  Click helpers
// ──────────────────────────────────────────────

/** Click the standard docassemble Continue button. */
export async function clickContinue(page: Page) {
  await waitForDaPageLoad(page);
  await page.locator('#da-continue-button').click();
  await page.waitForLoadState('networkidle');
}

/** Click an element by its DOM id. */
export async function clickById(page: Page, id: string) {
  await waitForDaPageLoad(page);
  await page.evaluate((id: string) => {
    document.getElementById(id)?.click();
  }, id);
  await page.waitForLoadState('networkidle');
}

/** Click the nth element that matches `[name="<name>"]`. */
export async function clickNthByName(page: Page, name: string, index = 0) {
  await waitForDaPageLoad(page);
  await page.locator(`[name="${name}"]`).nth(index).click();
  await page.waitForLoadState('networkidle');
}

/** Click the nth element with a given class. */
export async function clickNthByClass(page: Page, className: string, index = 0) {
  await waitForDaPageLoad(page);
  await page.evaluate(
    ({ className, index }) => {
      const els = document.getElementsByClassName(className);
      if (els.length > index) {
        const el = els[index] as HTMLElement;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.click();
      }
    },
    { className, index },
  );
  await page.waitForLoadState('networkidle');
}

// ──────────────────────────────────────────────
//  Fill helpers
// ──────────────────────────────────────────────

/** Fill a field located by its DOM id (uses Playwright `.fill()`). */
export async function fillById(page: Page, id: string, value: string) {
  await waitForDaPageLoad(page);
  await page.evaluate(
    ({ id, value }) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    { id, value },
  );
}

/** Fill the first element matching `[name="<name>"]`. */
export async function fillByName(page: Page, name: string, value: string) {
  await waitForDaPageLoad(page);
  await page.evaluate(
    ({ name, value }) => {
      const els = document.getElementsByName(name);
      if (els.length > 0) {
        const el = els[0] as HTMLInputElement;
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    { name, value },
  );
}

/** Fill a textarea by name. */
export async function fillTextareaByName(page: Page, name: string, value: string) {
  await page.locator(`textarea[name="${name}"]`).fill(value);
}

/** Select a dropdown option by its DOM id (triggers change event). */
export async function selectById(page: Page, id: string, value: string) {
  await waitForDaPageLoad(page);
  await page.evaluate(
    ({ id, value }) => {
      const el = document.getElementById(id) as HTMLSelectElement | null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.value = value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    { id, value },
  );
}

/** Select dropdown by index. */
export async function selectByIndex(page: Page, id: string, index: number) {
  await waitForDaPageLoad(page);
  await page.evaluate(
    ({ id, index }) => {
      const el = document.getElementById(id) as HTMLSelectElement | null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.selectedIndex = index;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    { id, index },
  );
}

/** Select a dropdown by name attribute. */
export async function selectByName(page: Page, name: string, value: string) {
  await waitForDaPageLoad(page);
  await page.locator(`select[name="${name}"]`).selectOption(value);
}

// ──────────────────────────────────────────────
//  Composite helpers (common multi-step actions)
// ──────────────────────────────────────────────

/** Click a yes/no radio. `yes = true` clicks the first option, `false` clicks the second. */
export async function clickYesNo(page: Page, fieldName: string, yes: boolean) {
  const idx = yes ? 0 : 1;
  await clickNthByName(page, b64(fieldName), idx);
}

/**
 * Helper function to fill in debtor identity information.
 * @param {Object} debtor - The debtor object containing identity information.
 */
export async function fillDebtorIdentity(
  page: Page,
  opts: {
    first: string;
    middle: string;
    last: string;
    suffix?: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    countyIndex?: number;
    hasMailing?: boolean;
    mailStreet?: string;
    mailCity?: string;
    mailState?: string;
    mailZip?: string;
    taxIdType?: 'ssn' | 'ein';
    taxId?: string;
  },
) {
  // Name fields
  await fillById(page, b64('debtor[i].name.first'), opts.first);
  await fillById(page, b64('debtor[i].name.middle'), opts.middle);
  await fillById(page, b64('debtor[i].name.last'), opts.last);
  if (opts.suffix) await fillById(page, b64('debtor[i].name.suffix'), opts.suffix);

  // Address fields
  await fillById(page, b64('debtor[i].address.address'), opts.street);
  await fillById(page, b64('debtor[i].address.city'), opts.city);
  await selectById(page, b64('debtor[i].address.state'), opts.state);
  await fillById(page, b64('debtor[i].address.zip'), opts.zip);

  // Wait for county dropdown to populate after state selection
  await page.waitForTimeout(1000);
  if (opts.countyIndex !== undefined) {
    await selectByIndex(page, b64('debtor[i].address.county'), opts.countyIndex);
  }

  // Mailing address
  if (opts.hasMailing) {
    await clickById(page, b64('debtor[i].has_other_mailing_address'));
    await page.waitForTimeout(500);
    await fillById(page, b64('_field_13'), opts.mailStreet ?? '');
    await fillById(page, b64('_field_14'), opts.mailCity ?? '');
    await fillById(page, b64('_field_15'), opts.mailState ?? '');
    await fillById(page, b64('_field_16'), opts.mailZip ?? '');
  }

  // Tax ID
  if (opts.taxIdType === 'ssn') {
    await clickById(page, b64('debtor[i].tax_id.tax_id_type') + '_0');
    await page.waitForTimeout(500);
    await fillById(page, b64('_field_19'), opts.taxId ?? '');
  }

  // Submit the debtor info page
  await clickNthByName(page, b64('debtor_basic_info'), 0);
}

/**
 * Helper function to load the interview page.
 * @param {string} page - The page to load.
 */
export async function loadInterviewPage(page: Page) {
  await page.goto(INTERVIEW_URL);
}

/**
 * Helper function to click on a button.
 * @param {string} buttonSelector - The selector for the button to click.
 */
export async function clickButton(page: Page, buttonSelector: string) {
  await page.locator(buttonSelector).click();
}

// Additional helper functions can be added here for more comprehensive testing.
