import { Page } from '@playwright/test';

/** Base URL for the docassemble interview */
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const INTERVIEW_PACKAGE = process.env.INTERVIEW_PACKAGE || 'docassemble.BankruptcyClinic:data/questions/voluntary-petition.yml';
export const INTERVIEW_URL =
  `${BASE_URL}/interview?i=${INTERVIEW_PACKAGE}#page1`;

/** Base64-url-encode a docassemble field name (strips trailing '=' padding). */
export const b64 = (str: string): string =>
  Buffer.from(str).toString('base64').replace(/=+$/, '');

// ──────────────────────────────────────────────
//  Page-level helpers
// ──────────────────────────────────────────────

/** Wait for the docassemble `daPageLoad` jQuery event (with fallback).
 *  After every page load, asserts that the page is NOT a docassemble error.
 *  This catches server-side errors (500s, traceback pages, "not in the allowed
 *  fields" errors, etc.) immediately instead of letting tests silently proceed.
 */
export async function waitForDaPageLoad(page: Page, label = '') {
  // Wait for network to settle first
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch {
    /* timeout – continue anyway */
  }

  try {
    await page.evaluate(() =>
      new Promise<void>((resolve) => {
        if (typeof (window as any).$ !== 'undefined') {
          const $ = (window as any).$;
          $(document).on('daPageLoad', () => resolve());
          if (document.readyState === 'complete') setTimeout(resolve, 300);
        } else {
          document.readyState === 'complete'
            ? setTimeout(resolve, 300)
            : window.addEventListener('load', () => resolve());
        }
      }),
    );
  } catch {
    /* swallow – we'll continue anyway */
  }

  // Brief pause to let any redirects or AJAX updates settle
  await page.waitForTimeout(200);

  // ── Global docassemble error detection ──
  // After every page transition, check if docassemble is showing an error page.
  // This catches "variable not in allowed fields", traceback errors, 500s, etc.
  let errorInfo: { heading: string; message: string; traceback: string; url: string } | null = null;
  try {
    errorInfo = await page.evaluate(() => {
      const body = document.body?.innerText || '';
      const heading = document.querySelector('h1, h2')?.textContent || '';
      const headingLower = heading.toLowerCase();
      const bodyLower = body.toLowerCase();

    // Detect docassemble error pages
    const isError =
      headingLower.includes('error') ||
      bodyLower.includes('there was an error') ||
      bodyLower.includes('traceback') ||
      bodyLower.includes('was not in the allowed fields') ||
      bodyLower.includes('internal server error') ||
      bodyLower.includes('interview has an error');

    if (!isError) return null;

    // Extract the traceback or error details
    const traceEl = document.querySelector('pre, code, .daerror, .alert-danger, blockquote');
    const traceback = traceEl?.textContent?.substring(0, 2000) || '';
    return {
      heading,
      message: body.substring(0, 1500),
      traceback,
      url: window.location.href,
    };
  });
  } catch {
    // Page may have been closed during test teardown — not an error
    return;
  }

  if (errorInfo) {
    const ctx = label ? ` [${label}]` : '';
    const msg = [
      `\n🚨 DOCASSEMBLE ERROR DETECTED${ctx}`,
      `   URL: ${errorInfo.url}`,
      `   Heading: ${errorInfo.heading}`,
      errorInfo.traceback
        ? `   Traceback:\n${errorInfo.traceback}`
        : `   Body:\n${errorInfo.message}`,
    ].join('\n');
    console.error(msg);
    throw new Error(`Docassemble error page detected${ctx}: ${errorInfo.heading}`);
  }
}

/**
 * Wait for the page to be **stable** — no in-flight network requests, no
 * docassemble buttons in a `[disabled]` transition state, and no DOM
 * mutations across two consecutive animation frames.
 *
 * This is the canonical "is the page ready for the next user input?" wait.
 * Use it everywhere a test would otherwise call `page.waitForTimeout(N)`
 * to cover a docassemble in-page transition (yes/no auto-submit, show-if
 * reveal, AJAX submit, etc.). Eliminates timing guesses.
 *
 * Strategy:
 *   1. networkidle — HTTP is quiet
 *   2. no `button.btn-da[disabled]` — docassemble's yesno-button transition is done
 *   3. no DOM mutations for 2 consecutive requestAnimationFrame ticks
 *
 * If the page doesn't settle within `timeout` ms, returns silently; callers
 * shouldn't crash — but the next locator call will surface whatever is wrong.
 */
export async function waitForPageStable(page: Page, timeout = 8000): Promise<void> {
  const deadline = Date.now() + timeout;

  // (1) Network idle
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});

  // (2) Wait until no docassemble button is mid-transition
  await page
    .waitForFunction(
      () => !document.querySelector('button.btn-da[disabled]'),
      undefined,
      { timeout: Math.max(deadline - Date.now(), 100), polling: 50 },
    )
    .catch(() => {});

  // (3) Wait for the DOM to stop mutating across 2 consecutive RAFs
  await page
    .evaluate(
      (msLeft) =>
        new Promise<void>((resolve) => {
          const deadlineLocal = performance.now() + msLeft;
          let stableFrames = 0;
          let mutations = 0;
          const obs = new MutationObserver(() => { mutations++; });
          obs.observe(document.body, {
            attributes: true,
            childList: true,
            subtree: true,
            characterData: true,
          });
          const tick = () => {
            if (mutations === 0) {
              stableFrames++;
              if (stableFrames >= 2) {
                obs.disconnect();
                return resolve();
              }
            } else {
              stableFrames = 0;
              mutations = 0;
            }
            if (performance.now() >= deadlineLocal) {
              obs.disconnect();
              return resolve();
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
      Math.max(deadline - Date.now(), 100),
    )
    .catch(() => {});
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

/**
 * Click Continue with validator workaround for AJAX-rendered pages.
 *
 * On AJAX-rendered pages (including list-collect), jQuery Validate may not
 * have `daValidationHandler` as its submit handler. Without it, the form
 * submit doesn't do the AJAX POST that docassemble expects. Also sets the
 * ignore selector to skip hidden fields that may be left by show-if logic.
 */
export async function clickContinue(page: Page) {
  await waitForDaPageLoad(page);

  await page.evaluate(() => {
    const $ = (window as any).jQuery;
    if (!$ || !$.fn.validate) return;
    const form = document.getElementById('daform');
    if (!form) return;

    let validator = $(form).data('validator');
    if (!validator) {
      validator = $(form).validate();
    }

    const daVH = (window as any).daValidationHandler;
    if (validator && daVH) {
      validator.settings.submitHandler = daVH;
    }
    if (validator) {
      validator.settings.ignore = ':hidden';
    }
  });

  await page.locator('#da-continue-button').click();
  await page.waitForLoadState('networkidle');
}

// ──────────────────────────────────────────────
//  Show-if-aware field resolution
// ──────────────────────────────────────────────
//
// docassemble names fields one of two ways depending on context:
//
//   1. **Top-level fields** (not inside a `show if:`): the input's `name` is
//      `b64(varName)` — e.g. `prop.has_household_goods` becomes
//      `cHJvcC5oYXNfaG91c2Vob2xkX2dvb2Rz`. Helpers like `selectYesNoRadio`
//      look up by `label[for="<b64>_0"]` and work fine.
//
//   2. **Show-if-conditional fields** (anywhere inside a `show if:`): the
//      input's `name` is `_field_4`, `_field_15`, `_field_26`, … — an opaque
//      counter, **not** the b64'd variable name. Helpers that look up by
//      `b64(varName)` silently no-op (or time out) on these.
//
// `resolveFieldId` handles both cases:
//   - Try `b64(varName)` first; if a radio with that name exists, use it.
//   - Otherwise look up by the question's `<label>` text — every field
//     renders its question as a `<label>` whose `for=` points at the
//     opaque `_field_N` id. The label's `textContent` is the YAML question
//     text (e.g. "Claiming Exemption?"), which is stable across docassemble
//     re-renderings.
//
// Use the canonical helpers below (`pickYesNo`, `fillField`, etc.) — they
// handle both naming conventions transparently.

/** Options for `resolveFieldId` / `pickYesNoradio` to disambiguate when a
 *  show-if'd field needs context. See `resolveFieldId` jsdoc for details. */
export interface FieldLookup {
  /** Question text from the YAML (e.g. "Claiming Exemption?"). Required when
   *  the field is inside a `show if:` (renamed to `_field_N`). */
  label?: string;
  /** Variable name of the show-if condition (e.g. `prop.has_household_goods`).
   *  Required when MULTIPLE show-ifs on the page share the same question label
   *  (e.g. "Claiming Exemption?" appears once per property category). */
  inShowIfOf?: string;
}

/**
 * Resolve a field's DOM id, looking up either by its b64'd variable name
 * (top-level) or by its question label text (show-if conditional).
 *
 * Returns null if the field can't be found by either route.
 *
 * docassemble names fields one of two ways:
 *   - Top-level: input `name` is `b64(varName)`
 *   - Show-if'd: input `name` is opaque `_field_N`, and the input lives
 *     inside a `<div class="dashowif" data-showif-var="<b64-of-show-if-var>">`
 *     container that also holds a label/text with the YAML question text.
 *
 * For the show-if'd case, anchor by:
 *   1. The matching `dashowif` container (filtered by `inShowIfOf` if given);
 *   2. The radio's parent or sibling label containing `label`.
 */
export async function resolveFieldId(
  page: Page,
  varName: string,
  lookup?: FieldLookup,
): Promise<string | null> {
  return await page.evaluate(
    ({ b64Name, qLabel, showIfVar }) => {
      // (1) Top-level case: input directly named `b64Name`
      const byName = document.querySelector(`input[name="${b64Name}"]`);
      if (byName) {
        const id = (byName as HTMLInputElement).id;
        if (id) {
          return id.replace(/_(0|1)$/, '');
        }
      }
      // (2) Show-if'd case: locate the dashowif container by `inShowIfOf`
      //     hint, then find the radio in it whose question label matches.
      if (!qLabel) return null;
      const showifContainers = Array.from(
        document.querySelectorAll('.dashowif'),
      ) as HTMLElement[];
      // Filter to containers whose data-showif-var matches if a hint was
      // provided; otherwise consider all show-if containers.
      const candidates = showIfVar
        ? showifContainers.filter((c) => c.getAttribute('data-showif-var') === showIfVar)
        : showifContainers;
      for (const container of candidates) {
        // Does this container contain a textual occurrence of the question
        // label? If so, find the radio(s) inside.
        const text = container.textContent ?? '';
        if (!text.includes(qLabel)) continue;
        const radios = container.querySelectorAll('input[type="radio"]');
        if (radios.length >= 2) {
          // Found a yesnoradio. Strip the _0/_1 suffix off the first radio's id.
          const id = (radios[0] as HTMLInputElement).id;
          if (id) return id.replace(/_(0|1)$/, '');
        }
      }
      return null;
    },
    {
      b64Name: b64(varName),
      qLabel: lookup?.label ?? null,
      showIfVar: lookup?.inShowIfOf ? b64(lookup.inShowIfOf) : null,
    },
  );
}

/**
 * Canonical "click Yes or No on a yesnoradio" helper that handles BOTH
 * top-level and show-if-conditional fields. Use this everywhere instead of
 * `selectYesNoRadio` / `fillYesNoRadio` / `clickYesNoButton` for radios.
 *
 * - For top-level fields, pass just `varName`.
 * - For show-if-conditional fields (which get opaque `_field_N` ids), pass
 *   `{ label: 'YAML question text', inShowIfOf: 'parent.var.name' }`. The
 *   `inShowIfOf` hint disambiguates when the same question label appears in
 *   multiple show-if containers (e.g. "Claiming Exemption?" on the
 *   personal_household_items page).
 *
 * Waits for page stability before AND after the click — eliminates the
 * `await page.waitForTimeout(N)` calls callers used to need.
 */
export async function pickYesNoradio(
  page: Page,
  varName: string,
  yes: boolean,
  lookup?: FieldLookup,
): Promise<void> {
  await waitForPageStable(page);
  const baseId = await resolveFieldId(page, varName, lookup);
  if (!baseId) {
    throw new Error(
      `pickYesNoradio: could not find a radio for "${varName}"` +
        (lookup?.label ? ` (label: "${lookup.label}")` : '') +
        (lookup?.inShowIfOf ? ` (inShowIfOf: ${lookup.inShowIfOf})` : '') +
        '. Tip: if this field is inside a `show if:`, pass both ' +
        '`{ label: "YAML question text", inShowIfOf: "parent.var.name" }`.',
    );
  }
  const suffix = yes ? '_0' : '_1';
  // Click the LABEL (Bootstrap btn-check pattern; the input is hidden).
  await page.locator(`label[for="${baseId}${suffix}"]`).click({ force: true });
  await waitForPageStable(page);
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

  // For docassemble yesno fields rendered as buttons, use more flexible text matching
  // index 0 = "Yes", index 1 = "No"
  const buttonText = index === 0 ? 'Yes' : 'No';

  // Try multiple approaches to find the right button
  let buttonLocator = page.locator(`button[name="${name}"]`).filter({ hasText: buttonText });
  let buttonCount = await buttonLocator.count();

  if (buttonCount === 0) {
    // Try with case-insensitive matching
    buttonLocator = page.locator(`button[name="${name}"]`).filter({ hasText: new RegExp(buttonText, 'i') });
    buttonCount = await buttonLocator.count();
  }

  if (buttonCount === 0) {
    // Try finding all buttons with this name and select by index
    const allButtons = page.locator(`button[name="${name}"]`);
    const allCount = await allButtons.count();
    if (allCount > index) {
      await allButtons.nth(index).click();
      await page.waitForLoadState('networkidle');
      return;
    }
  }

  if (buttonCount > 0) {
    // Found Yes/No buttons - use them
    await buttonLocator.first().click();
  } else {
    // Fallback to original approach for other field types
    const exactMatch = page.locator(`[name="${name}"]`);
    await exactMatch.nth(index).click();
  }

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
  await page.locator(`select[name="${name}"]`).waitFor({ state: 'attached', timeout: 15000 });
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
  // Wait for the first name field to be attached and visible
  const firstNameId = b64('debtor[i].name.first');
  await page.locator(`#${firstNameId}`).waitFor({ state: 'visible', timeout: 15000 });

  // Name fields
  await fillById(page, firstNameId, opts.first);
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
    await selectById(page, b64('_field_15'), opts.mailState ?? '');
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

// ──────────────────────────────────────────────
//  Docassemble-specific interaction helpers
// ──────────────────────────────────────────────

/** Click a yes/no button (docassemble btn-da style). `yes = true` clicks first (Yes), `false` clicks second (No). */
export async function clickYesNoButton(page: Page, varName: string, yes: boolean) {
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64(varName), yes ? 0 : 1);
}

/** Click a yes/no radio label (Bootstrap-styled). `yes = true` clicks _0 label, `false` clicks _1. */
export async function selectYesNoRadio(page: Page, varName: string, yes: boolean) {
  const fieldId = b64(varName);
  const suffix = yes ? '_0' : '_1';
  await page.locator(`label[for="${fieldId}${suffix}"]`).click();
}

/** Alias for selectYesNoRadio. */
export const fillYesNoRadio = selectYesNoRadio;

/** Click the "No" label on every visible radio that has value="False". */
export async function fillAllVisibleRadiosAsNo(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll('input[type="radio"][value="False"]').forEach(radio => {
      const id = radio.getAttribute('id');
      if (!id) return;
      const label = document.querySelector(`label[for="${id}"]`) as HTMLElement;
      if (label && label.offsetParent !== null && !(radio as HTMLInputElement).checked) {
        label.click();
      }
    });
  });
  // Small delay for show-if JS to process the clicks
  await page.waitForTimeout(500);
}

/** If a case_number field is visible on the current page, click Continue past it. */
export async function handleCaseNumberIfPresent(page: Page) {
  const caseNumberField = page.locator(`#${b64('case_number')}`);
  if (await caseNumberField.count() > 0) {
    await clickContinue(page);
    await waitForDaPageLoad(page);
  }
}

/** Set a docassemble checkbox (Bootstrap-styled label with aria-checked). */
export async function setCheckbox(page: Page, varName: string, checked: boolean) {
  const fieldId = b64(varName);
  const label = page.locator(`label[for="${fieldId}"]`);
  const ariaChecked = await label.getAttribute('aria-checked');
  if (checked && ariaChecked !== 'true') await label.click();
  else if (!checked && ariaChecked === 'true') await label.click();
}

/**
 * Handle "Do you have another?" pages — either a yes/no question or a list
 * collect review page with "Add another" / "Continue" buttons.
 */
export async function handleAnotherPage(page: Page, thereIsAnotherVar: string) {
  await waitForDaPageLoad(page);
  const bodyText = await page.locator('body').innerText();
  if (bodyText.toLowerCase().includes('another') || bodyText.toLowerCase().includes('more')) {
    const addAnotherBtn = page.locator('button').filter({ hasText: /Add another/i });
    if (await addAnotherBtn.count() > 0) {
      // List collect review — click Continue to proceed
      await clickContinue(page);
    } else {
      // Standard yes/no question
      await clickYesNoButton(page, thereIsAnotherVar, false);
    }
  }
}
