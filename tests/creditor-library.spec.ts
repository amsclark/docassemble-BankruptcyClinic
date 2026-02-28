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
import {
  b64,
  waitForDaPageLoad,
  clickContinue as _clickContinue,
  clickNthByName,
  selectByName,
  selectById,
  selectByIndex,
  fillById,
  fillByName,
  fillDebtorIdentity,
  screenshot,
  clickYesNo,
  INTERVIEW_URL,
} from './helpers';

// ──────────────────────────────────────────────
//  Constants
// ──────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const ADMIN_URL = `${BASE_URL}/interview?i=docassemble.playground1:creditor-library-admin.yml`;

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
 * Clean up all creditors from the library by deleting them one by one.
 * Used in afterEach to ensure test isolation.
 */
async function cleanupAllCreditors(page: Page) {
  await gotoAdmin(page);

  // Check if there are creditors to delete
  const pageText = await page.locator('body').textContent();
  if (pageText?.includes('library is empty')) {
    console.log('[CLEANUP] Library already empty');
    return;
  }

  // Click Delete
  await clickMenuButton(page, 'delete');
  await waitForDaPageLoad(page);

  // Check if we got the "Nothing to Delete" page
  const heading = await page.locator('h1, h2, h3').first().textContent();
  if (heading?.trim() === 'Nothing to Delete') {
    console.log('[CLEANUP] Nothing to delete');
    return;
  }

  // Select all checkboxes
  const checkboxes = page.locator('input[type="checkbox"]');
  const count = await checkboxes.count();
  console.log(`[CLEANUP] Selecting ${count} creditors for deletion`);
  for (let i = 0; i < count; i++) {
    const cb = checkboxes.nth(i);
    if (!(await cb.isChecked())) {
      await cb.check();
    }
  }

  // Submit
  await clickContinue(page);
  await waitForDaPageLoad(page);

  // Confirm deletion
  const confHeading = await page.locator('h1, h2, h3').first().textContent();
  console.log(`[CLEANUP] Deletion result: ${confHeading?.trim()}`);
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

    // Find the checkbox for TEST_CREDITOR_2 and check it
    // Checkboxes have labels with the creditor name
    const label2 = page.locator(`label:has-text("${TEST_CREDITOR_2.name}")`);
    await expect(label2).toBeVisible();
    // Click the label (or the checkbox input near it)
    const checkbox = label2.locator('input[type="checkbox"]');
    const cbCount = await checkbox.count();
    if (cbCount > 0) {
      await checkbox.check();
    } else {
      // The label itself may trigger the checkbox
      await label2.click();
    }

    await clickContinue(page);
    await waitForDaPageLoad(page);

    // Confirmation page
    const confHeading = await page.locator('h1, h2, h3').first().textContent();
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
//  Main Interview Picker Tests
// ══════════════════════════════════════════════
test.describe('Creditor Library – Picker in Main Interview', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ browser }) => {
    // Clean up any leftover creditors before picker tests
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
    // Clean up creditors seeded during these tests
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

  test('Picker shows empty message when library is empty', async ({
    page,
  }) => {
    // Ensure library is empty first
    await cleanupAllCreditors(page);

    // Navigate main interview to the picker page
    await navigateToPickerPage(page);

    // The picker should show the empty-library message
    const body = await page.locator('body').textContent();
    expect(body).toContain('No common creditors');
    console.log('[PICKER] ✅ Empty library message shown in picker');

    await screenshot(page, 'picker-empty');
  });

  test('Picker shows library creditors as checkboxes', async ({ page }) => {
    // First seed a creditor via the admin interview
    await gotoAdmin(page);
    await addCreditorViaAdmin(page, TEST_CREDITOR);

    // Now navigate the main interview to the picker
    await navigateToPickerPage(page);

    // The picker should show the creditor as a checkbox
    const body = await page.locator('body').textContent();
    expect(body).toContain(TEST_CREDITOR.name);
    expect(body).toContain('commonly-seen creditors');

    // Verify there's at least one checkbox
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);
    console.log(`[PICKER] ✅ Found ${count} creditor checkbox(es) in picker`);

    await screenshot(page, 'picker-with-creditor');
  });

  test('Selecting a creditor and continuing works', async ({ page }) => {
    // Seed the creditor (may already exist from prior test, but that's fine)
    await gotoAdmin(page);
    const body0 = await page.locator('body').textContent();
    if (!body0?.includes(TEST_CREDITOR.name)) {
      await addCreditorViaAdmin(page, TEST_CREDITOR);
    }

    // Navigate to the picker
    await navigateToPickerPage(page);

    // Check the creditor's checkbox
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);

    // Check the first checkbox (our test creditor)
    await checkboxes.first().check();
    console.log('[PICKER] Checked first creditor checkbox');

    // Click Continue — this should process the injection and move on
    await clickContinue(page);
    await waitForDaPageLoad(page);

    // After the picker, we should be on the secured creditors (106D) page
    // or whatever comes next in the mandatory block
    const heading = await page
      .locator('h1, h2, h3')
      .first()
      .textContent()
      .then((t) => t?.trim() ?? '');
    console.log(`[PICKER] After selection, landed on: "${heading}"`);

    // The interview should have continued without error
    // (If there was a server error, heading would be "Error" or blank)
    expect(heading).not.toBe('');
    expect(heading.toLowerCase()).not.toContain('error');
    console.log('[PICKER] ✅ Creditor selection processed successfully');

    await screenshot(page, 'picker-after-selection');
  });
});

// ──────────────────────────────────────────────
//  Navigation helper – get to the picker page
// ──────────────────────────────────────────────

/**
 * Navigate the main interview from the start all the way to the
 * creditor library picker page. This follows the same flow as
 * full-interview.spec.ts but stops at the picker.
 */
async function navigateToPickerPage(page: Page) {
  await page.goto(INTERVIEW_URL + '&new_session=1');
  await waitForDaPageLoad(page);

  // 1. Intro → Continue
  await clickNthByName(page, b64('introduction_screen'), 0);

  // 2. District selection
  await waitForDaPageLoad(page);
  await selectByName(page, b64('current_district'), 'District of Nebraska');
  await clickContinue(page);

  // 3. Amended filing → No
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('amended_filing'), 1); // No

  // 4. Case number (may appear)
  await waitForDaPageLoad(page);
  await handleCaseNumberIfPresent(page);

  // 5. District final → Continue
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('district_final'), 0);

  // 6. Filing status – individual
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('filing_type'), 0); // individual

  // 7. Debtor identity
  await waitForDaPageLoad(page);
  await fillDebtorIdentity(page, {
    first: 'CredLib',
    middle: 'Test',
    last: 'User',
    street: '123 Test St',
    city: 'Omaha',
    state: 'NE',
    zip: '68102',
    countyIndex: 1,
    taxIdType: 'ssn',
    taxId: '111-22-3333',
  });

  // 8–onwards: Navigate through all section screens until we reach the picker
  // The picker appears before the creditor gather sections.
  // We navigate through sections by detecting page headings and responding.
  const MAX_PAGES = 120;
  for (let i = 0; i < MAX_PAGES; i++) {
    await waitForDaPageLoad(page);

    const heading = await page
      .locator('h1, h2, h3')
      .first()
      .textContent()
      .then((t) => t?.trim() ?? '')
      .catch(() => '');

    // Check if we've reached the picker
    if (heading === 'Common Creditors') {
      console.log(`[NAV] ✅ Reached creditor picker after ${i} pages`);
      return;
    }

    // Check for error pages
    if (heading.toLowerCase().includes('error')) {
      console.log(`[NAV] ❌ Hit error page: ${heading}`);
      await screenshot(page, `nav-error-${i}`);
      throw new Error(`Hit error page at step ${i}: ${heading}`);
    }

    // Try to find and interact with common field types
    const handled = await handleGenericPage(page);
    if (!handled) {
      console.log(`[NAV] ⚠️ Could not handle page ${i}: "${heading}"`);
      await screenshot(page, `nav-stuck-${i}`);
      throw new Error(`Stuck at page ${i}: "${heading}"`);
    }
  }

  throw new Error('Did not reach creditor picker within page limit');
}

/**
 * Handle a generic docassemble page by trying different interaction strategies.
 * Returns true if it successfully handled the page, false otherwise.
 */
async function handleGenericPage(page: Page): Promise<boolean> {
  // Strategy 1: Look for Yes/No buttons (most common pattern in interview)
  const yesNoButtons = page.locator('button.btn-primary, button.btn-secondary, button.btn-da');
  const buttonCount = await yesNoButtons.count();

  // Strategy 2: Look for action buttons (like intro_screen, district_final, etc.)
  const nameButtons = page.locator('button[name]');
  const nameCount = await nameButtons.count();

  // Strategy 3: Look for radio buttons  
  const radios = page.locator('input[type="radio"]');
  const radioCount = await radios.count();

  // Strategy 4: Check for the continue button
  const continueBtn = page.locator('#da-continue-button');
  const hasContinue = (await continueBtn.count()) > 0;

  // If there are radio buttons, click the first one (usually "No" or first option)
  if (radioCount > 0) {
    // For Yes/No radios, try to click "No" (second option, index 1)
    // to skip gather loops and move through quickly
    if (radioCount === 2) {
      await radios.nth(1).click(); // "No"
    } else {
      await radios.first().click();
    }
    if (hasContinue) {
      await clickContinue(page);
    }
    return true;
  }

  // If there are named buttons but no radios, click the first button
  if (nameCount > 0 && !hasContinue) {
    // Check if any button says "No" — prefer that to skip things
    const noButton = page.locator('button:has-text("No")');
    if ((await noButton.count()) > 0) {
      await noButton.first().click();
      await page.waitForLoadState('networkidle');
      return true;
    }
    await nameButtons.first().click();
    await page.waitForLoadState('networkidle');
    return true;
  }

  // If there's a continue button, just click it
  if (hasContinue) {
    // Check for required text fields and fill with placeholder
    const textInputs = page.locator('input[type="text"]:visible:not([readonly])');
    const textCount = await textInputs.count();
    for (let i = 0; i < textCount; i++) {
      const val = await textInputs.nth(i).inputValue();
      if (!val) {
        await textInputs.nth(i).fill('test');
      }
    }

    // Check for required selects and pick first non-empty option
    const selects = page.locator('select:visible');
    const selectCount = await selects.count();
    for (let i = 0; i < selectCount; i++) {
      const options = selects.nth(i).locator('option');
      const optCount = await options.count();
      if (optCount > 1) {
        const val = await selects.nth(i).inputValue();
        if (!val) {
          const opt1Val = await options.nth(1).getAttribute('value');
          if (opt1Val) {
            await selects.nth(i).selectOption(opt1Val);
          }
        }
      }
    }

    await clickContinue(page);
    return true;
  }

  return false;
}

/**
 * Handle the case-number page if it appears.
 */
async function handleCaseNumberIfPresent(page: Page) {
  const heading = await page
    .locator('h1, h2, h3')
    .first()
    .textContent()
    .then((t) => t?.trim() ?? '')
    .catch(() => '');

  if (heading.toLowerCase().includes('case number') || heading.toLowerCase().includes('case no')) {
    await clickContinue(page);
    await waitForDaPageLoad(page);
  }
}
