/**
 * Creditor Library Tests
 *
 * Tests the shared creditor library feature:
 *   1. Admin interview – add/verify/delete creditors
 *   2. Main interview picker – creditors from the library appear as checkboxes
 *
 * These tests interact with docassemble's SQL-backed write_record() /
 * read_records() store, so order matters within each describe block.
 */
import { test, expect, Page } from '@playwright/test';

// ── File-level: force single worker since tests share DB state ──
test.describe.configure({ mode: 'serial' });
import {
  b64,
  waitForDaPageLoad,
  clickContinue as _clickContinue,
  fillByName,
  selectByName,
  screenshot,
} from './helpers';

// ──────────────────────────────────────────────
//  Constants
// ──────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const ADMIN_URL = `${BASE_URL}/interview?i=docassemble.playground1:creditor-library-admin.yml`;

const CLEANUP_URL = `${BASE_URL}/interview?i=docassemble.playground1:creditor-library-cleanup.yml`;

/** Test creditor data for seeding the library */
const TEST_CREDITOR = {
  name: 'Test Hospital Corp',
  street: '456 Medical Blvd',
  city: 'Omaha',
  state: 'NE',
  zip: '68102',
  type: 'Medical',
  account: '9876',
  notes: 'E2E test creditor',
};

const TEST_CREDITOR_2 = {
  name: 'Student Loan Services Inc',
  street: '789 Education Ave',
  city: 'Lincoln',
  state: 'NE',
  zip: '68501',
  type: 'Student loans',
  account: '1234',
  notes: 'Second test creditor',
};

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

/**
 * Wrapper for clickContinue that first fixes jQuery Validation
 * (matches the pattern used in full-interview.spec.ts).
 */
async function clickContinue(page: Page) {
  await page.evaluate(() => {
    const $ = (window as any).jQuery;
    if (!$) return;
    const validator = $('#daform').data('validator');
    if (validator) {
      validator.settings.ignore = ':hidden';
    }
  });
  await _clickContinue(page);
}

/** Start a new admin interview session. */
async function gotoAdmin(page: Page) {
  await page.goto(ADMIN_URL + '&new_session=1');
  await waitForDaPageLoad(page);
}

/** Click one of the main-menu buttons (Add / Delete / Refresh / Exit). */
async function clickMenuButton(page: Page, value: string) {
  // docassemble renders `buttons:` as <button name="<b64(field)>" value="<value>">
  const fieldB64 = b64('admin_menu_selection');
  await page.locator(`button[name="${fieldB64}"][value="${value}"]`).click();
  await page.waitForLoadState('networkidle');
}

/**
 * Add a creditor through the admin form.
 * Assumes we are on the main menu screen.
 */
async function addCreditorViaAdmin(
  page: Page,
  cred: typeof TEST_CREDITOR,
) {
  await clickMenuButton(page, 'add');
  await waitForDaPageLoad(page);

  // Fill the add-creditor form fields
  await fillByName(page, b64('new_creditor.name'), cred.name);
  await fillByName(page, b64('new_creditor.street'), cred.street);
  await fillByName(page, b64('new_creditor.city'), cred.city);
  // State is an <input type="state"> (docassemble custom), not a <select>
  await fillByName(page, b64('new_creditor.state'), cred.state);
  await fillByName(page, b64('new_creditor.zip'), cred.zip);
  // Creditor Type is a <select>
  await selectByName(page, b64('new_creditor.creditor_type'), cred.type);

  if (cred.account) {
    await fillByName(page, b64('new_creditor.account_suffix'), cred.account);
  }
  // Notes is a textarea
  if (cred.notes) {
    const notesSelector = `textarea[name="${b64('new_creditor.notes')}"]`;
    const hasTextarea = await page.locator(notesSelector).count();
    if (hasTextarea > 0) {
      await page.locator(notesSelector).fill(cred.notes);
    } else {
      await fillByName(page, b64('new_creditor.notes'), cred.notes);
    }
  }

  await clickContinue(page);
  await waitForDaPageLoad(page);

  // Now we're on the "Creditor Added" confirmation page
  const heading = await page.locator('h1, h2, h3').first().textContent();
  console.log(`[ADMIN] Confirmation heading: ${heading?.trim()}`);
  expect(heading?.trim()).toContain('Creditor Added');

  // Verify the confirmation text mentions the creditor name
  const bodyText = await page.locator('.da-page-content, .da-subquestion').textContent();
  expect(bodyText).toContain(cred.name);

  // Click "Back to Menu"
  const backButton = page.locator('button:has-text("Back to Menu")');
  await backButton.click();
  await page.waitForLoadState('networkidle');
  await waitForDaPageLoad(page);
}

/**
 * Clean up all creditors from the library by loading the cleanup interview.
 * This is much more reliable than trying to interact with checkboxes.
 */
async function cleanupAllCreditors(page: Page) {
  await page.goto(CLEANUP_URL + '&new_session=1');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const body = await page.locator('body').textContent().catch(() => '');
  if (body?.includes('Deleted')) {
    const match = body.match(/Deleted (\d+) creditor/);
    console.log(`[CLEANUP] ${match ? match[0] : 'Completed'}`);
  } else if (body?.includes('Error')) {
    console.log(`[CLEANUP] Error during cleanup — may already be empty`);
  } else {
    console.log(`[CLEANUP] Cleanup page loaded`);
  }
}

// ══════════════════════════════════════════════
//  Admin Interview Tests
// ══════════════════════════════════════════════
test.describe('Creditor Library – Admin Interview', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ browser }) => {
    // Clean up any leftover creditors from prior runs
    let page: Page | null = null;
    try {
      const context = await browser.newContext();
      page = await context.newPage();
      await cleanupAllCreditors(page);
    } catch (e) {
      console.log(`[SETUP] beforeAll cleanup error: ${e}`);
    } finally {
      if (page) await page.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    // Clean up after all admin tests
    let page: Page | null = null;
    try {
      const context = await browser.newContext();
      page = await context.newPage();
      await cleanupAllCreditors(page);
    } catch (e) {
      console.log(`[CLEANUP] afterAll error: ${e}`);
    } finally {
      if (page) await page.close();
    }
  });

  test('Admin interview loads with empty library', async ({ page }) => {
    await gotoAdmin(page);

    const heading = await page.locator('h1, h2, h3').first().textContent();
    expect(heading?.trim()).toBe('Creditor Library Manager');

    // Should show the empty message
    const body = await page.locator('body').textContent();
    expect(body).toContain('library is empty');
    console.log('[ADMIN] ✅ Empty library message displayed');

    await screenshot(page, 'admin-empty-library');
  });

  test('Can add a creditor to the library', async ({ page }) => {
    await gotoAdmin(page);
    await addCreditorViaAdmin(page, TEST_CREDITOR);

    // After "Back to Menu", we should be on the main menu with the creditor listed
    const heading = await page.locator('h1, h2, h3').first().textContent();
    expect(heading?.trim()).toBe('Creditor Library Manager');

    const body = await page.locator('body').textContent();
    expect(body).toContain(TEST_CREDITOR.name);
    expect(body).toContain('creditors)');
    console.log(`[ADMIN] ✅ Creditor "${TEST_CREDITOR.name}" appears in library table`);

    await screenshot(page, 'admin-one-creditor');
  });

  test('Can add a second creditor', async ({ page }) => {
    await gotoAdmin(page);

    // First verify the first creditor is still there
    const body1 = await page.locator('body').textContent();
    expect(body1).toContain(TEST_CREDITOR.name);

    await addCreditorViaAdmin(page, TEST_CREDITOR_2);

    // Both creditors should now appear
    const body2 = await page.locator('body').textContent();
    expect(body2).toContain(TEST_CREDITOR.name);
    expect(body2).toContain(TEST_CREDITOR_2.name);
    expect(body2).toContain('creditors)');
    console.log('[ADMIN] ✅ Both creditors appear in library table');

    await screenshot(page, 'admin-two-creditors');
  });

  test('Can delete a specific creditor', async ({ page }) => {
    await gotoAdmin(page);

    // Click Delete
    await clickMenuButton(page, 'delete');
    await waitForDaPageLoad(page);

    const heading = await page.locator('h1, h2, h3').first().textContent();
    expect(heading?.trim()).toBe('Delete Creditors');

    // Find all checkboxes — we need to check ONLY the TEST_CREDITOR_2 ones
    // docassemble uses labelauty: hidden <input> + visible <label role="checkbox">
    // IMPORTANT: clicking the label causes a double-toggle (browser + labelauty)
    // so we must directly set the input's checked state via JavaScript.
    const allCheckboxInputs = page.locator('input[type="checkbox"]');
    const inputCount = await allCheckboxInputs.count();
    console.log(`[ADMIN] Delete page has ${inputCount} checkbox(es)`);

    // Find the checkbox input whose label mentions TEST_CREDITOR_2, check it
    const checked = await page.evaluate((credName) => {
      const labels = Array.from(document.querySelectorAll('label[role="checkbox"]'));
      for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        const ariaLabel = label.getAttribute('aria-label') || '';
        if (ariaLabel.includes(credName)) {
          const forId = label.getAttribute('for');
          if (forId) {
            const input = document.getElementById(forId) as HTMLInputElement;
            if (input) {
              input.checked = true;
              input.dispatchEvent(new Event('change', { bubbles: true }));
              // Update labelauty visual state
              label.setAttribute('aria-checked', 'true');
              label.classList.add('labelauty-checked');
            }
          }
          // Also uncheck "None of the above" if it exists
          const noneInput = document.getElementById('_ignore0') as HTMLInputElement;
          if (noneInput && noneInput.checked) {
            noneInput.checked = false;
            noneInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
          return true;
        }
      }
      return false;
    }, TEST_CREDITOR_2.name);
    console.log(`[ADMIN] Checked TEST_CREDITOR_2 via JS: ${checked}`);
    expect(checked).toBe(true);
    await page.waitForTimeout(500);

    await clickContinue(page);
    await waitForDaPageLoad(page);

    // Confirmation page
    const confHeading = await page.locator('h1, h2, h3').first().textContent();
    console.log(`[ADMIN] After delete submit: heading = "${confHeading?.trim()}"`);
    expect(confHeading?.trim()).toBe('Creditors Deleted');

    // Go back to menu
    await page.locator('button:has-text("Back to Menu")').click();
    await page.waitForLoadState('networkidle');
    await waitForDaPageLoad(page);

    // Verify TEST_CREDITOR_2 is gone but TEST_CREDITOR remains
    const body = await page.locator('body').textContent();
    expect(body).toContain(TEST_CREDITOR.name);
    expect(body).not.toContain(TEST_CREDITOR_2.name);
    expect(body).toContain('creditors)');
    console.log('[ADMIN] ✅ Deleted one creditor, other remains');

    await screenshot(page, 'admin-after-delete');
  });

  test('Refresh reloads the menu', async ({ page }) => {
    await gotoAdmin(page);

    // Click Refresh
    await clickMenuButton(page, 'refresh');
    await waitForDaPageLoad(page);

    // Should still show the remaining creditor
    const heading = await page.locator('h1, h2, h3').first().textContent();
    expect(heading?.trim()).toBe('Creditor Library Manager');

    const body = await page.locator('body').textContent();
    expect(body).toContain(TEST_CREDITOR.name);
    console.log('[ADMIN] ✅ Refresh reloads menu correctly');
  });
});

// ══════════════════════════════════════════════
//  Picker Tests (using standalone test interview)
// ══════════════════════════════════════════════
const PICKER_TEST_URL = `${BASE_URL}/interview?i=docassemble.playground1:creditor-library-picker-test.yml`;

test.describe('Creditor Library – Picker', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ browser }) => {
    let page: Page | null = null;
    try {
      const context = await browser.newContext();
      page = await context.newPage();
      await cleanupAllCreditors(page);
    } catch (e) {
      console.log(`[SETUP] beforeAll cleanup error: ${e}`);
    } finally {
      if (page) await page.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    let page: Page | null = null;
    try {
      const context = await browser.newContext();
      page = await context.newPage();
      await cleanupAllCreditors(page);
    } catch (e) {
      console.log(`[CLEANUP] afterAll error: ${e}`);
    } finally {
      if (page) await page.close();
    }
  });

  test('Picker shows empty message when library is empty', async ({ page }) => {
    // Ensure library is empty first
    await cleanupAllCreditors(page);

    // Go directly to the picker via the standalone test interview
    await page.goto(PICKER_TEST_URL + '&new_session=1');
    await waitForDaPageLoad(page);

    const heading = await page.locator('h1, h2, h3').first().textContent();
    expect(heading?.trim()).toBe('Common Creditors');

    // Should show the empty-library message
    const body = await page.locator('body').textContent();
    expect(body).toContain('No common creditors');
    console.log('[PICKER] ✅ Empty library message shown in picker');

    await screenshot(page, 'picker-empty');
  });

  test('Picker shows library creditors as checkboxes', async ({ page }) => {
    // Seed a creditor via the admin interview
    await gotoAdmin(page);
    await addCreditorViaAdmin(page, TEST_CREDITOR);

    // Go to the picker test interview
    await page.goto(PICKER_TEST_URL + '&new_session=1');
    await waitForDaPageLoad(page);

    const heading = await page.locator('h1, h2, h3').first().textContent();
    expect(heading?.trim()).toBe('Common Creditors');

    // The picker should show the creditor
    const body = await page.locator('body').textContent();
    expect(body).toContain(TEST_CREDITOR.name);
    expect(body).toContain('commonly-seen creditors');

    // Verify there's at least one labelauty checkbox
    const checkboxLabels = page.locator('label[role="checkbox"]');
    const count = await checkboxLabels.count();
    expect(count).toBeGreaterThanOrEqual(1); // at least 1 creditor + maybe "None"
    console.log(`[PICKER] ✅ Found ${count} creditor checkbox label(s) in picker`);

    await screenshot(page, 'picker-with-creditor');
  });

  test('Selecting a creditor injects it into the claims list', async ({ page }) => {
    // Seed the creditor (may already exist from prior test)
    await gotoAdmin(page);
    const body0 = await page.locator('body').textContent();
    if (!body0?.includes(TEST_CREDITOR.name)) {
      await addCreditorViaAdmin(page, TEST_CREDITOR);
    }

    // Go to the picker test interview
    await page.goto(PICKER_TEST_URL + '&new_session=1');
    await waitForDaPageLoad(page);

    // Check the creditor's checkbox via JS (labelauty double-toggle workaround)
    const checkedPicker = await page.evaluate(() => {
      const inputs = document.querySelectorAll(
        'input[type="checkbox"].danon-nota-checkbox',
      ) as NodeListOf<HTMLInputElement>;
      if (inputs.length === 0) return false;
      inputs[0].checked = true;
      inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      const label = document.querySelector(`label[for="${inputs[0].id}"]`);
      if (label) label.setAttribute('aria-checked', 'true');
      return true;
    });
    expect(checkedPicker).toBe(true);
    console.log('[PICKER] Checked first creditor checkbox via JS');

    // Click Continue — this processes the injection and shows the result page
    await clickContinue(page);
    await waitForDaPageLoad(page);

    // The standalone test interview shows "Picker Test Complete"
    const heading = await page.locator('h1, h2, h3').first().textContent();
    console.log(`[PICKER] After selection: "${heading?.trim()}"`);
    expect(heading?.trim()).toBe('Picker Test Complete');

    // Verify the creditor was injected
    const resultBody = await page.locator('body').textContent();
    expect(resultBody).toContain('Injected 1 creditor');
    expect(resultBody).toContain(TEST_CREDITOR.name);
    console.log('[PICKER] ✅ Creditor was injected into claims list');

    await screenshot(page, 'picker-after-selection');
  });
});


