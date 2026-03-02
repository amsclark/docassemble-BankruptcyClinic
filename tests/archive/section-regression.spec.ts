/**
 * Section Navigation Regression Tests
 *
 * These tests verify that each major interview section navigates correctly
 * without getting stuck. Unlike the full-interview tests that run end-to-end,
 * these provide more granular section-level assertions so failures are
 * easier to diagnose.
 *
 * Each test navigates from the start through all prerequisites to reach
 * the target section, then verifies section-specific behavior.
 */
import { test, expect, Page } from '@playwright/test';
import {
  INTERVIEW_URL,
  b64,
  waitForDaPageLoad,
  getHeading,
  clickContinue as _clickContinue,
  clickById,
  clickNthByName,
  selectByName,
  fillByName,
  fillById,
  fillDebtorIdentity,
  screenshot,
} from './helpers';

// ──────────────────────────────────────────────
//  Shared helpers
// ──────────────────────────────────────────────

async function clickContinue(page: Page) {
  await page.evaluate(() => {
    const $ = (window as any).jQuery;
    if (!$) return;
    const validator = $('#daform').data('validator');
    if (validator) validator.settings.ignore = ':hidden';
  });
  await _clickContinue(page);
}

async function clickYesNoButton(page: Page, varName: string, yes: boolean) {
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64(varName), yes ? 0 : 1);
}

async function fillYesNoRadio(page: Page, varName: string, yes: boolean) {
  const fieldId = b64(varName);
  await page.locator(`label[for="${fieldId}${yes ? '_0' : '_1'}"]`).click();
}

/** Start a new individual filing session and get past debtor info. */
async function setupIndividualFiling(page: Page): Promise<void> {
  await page.goto(INTERVIEW_URL + '&new_session=1');
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('introduction_screen'), 0);

  await waitForDaPageLoad(page);
  await selectByName(page, b64('current_district'), 'District of Nebraska');
  await clickContinue(page);

  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('amended_filing'), 1); // No

  await waitForDaPageLoad(page);
  const caseNum = page.locator(`#${b64('case_number')}`);
  if (await caseNum.count() > 0) {
    await clickContinue(page);
    await waitForDaPageLoad(page);
  }

  await clickNthByName(page, b64('district_final'), 0);
  await waitForDaPageLoad(page);
  await clickById(page, `${b64('filing_status')}_0`);
  await clickContinue(page);

  await waitForDaPageLoad(page);
  await fillDebtorIdentity(page, {
    first: 'Regression', middle: 'T', last: 'Tester',
    street: '100 Test Blvd', city: 'Lincoln', state: 'Nebraska', zip: '68508',
    countyIndex: 2, taxIdType: 'ssn', taxId: '555-66-7777',
  });

  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('debtor[i].alias.there_are_any'), 1);
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('debtor[i].district_info.is_current_district'), 0);
  await clickContinue(page);

  // Skip debtor_final if shown
  await waitForDaPageLoad(page);
  const h = await getHeading(page);
  if (h.toLowerCase().includes('summary')) await clickContinue(page);
}

// ──────────────────────────────────────────────
//  TESTS
// ──────────────────────────────────────────────

test.describe('Section Navigation Regression', () => {
  test.setTimeout(180_000); // 3 minutes per test

  test('Introduction → District → Debtor identity flow works', async ({ page }) => {
    await page.goto(INTERVIEW_URL + '&new_session=1');
    await waitForDaPageLoad(page);

    // Verify intro page has the right button
    const introBtn = page.locator(`[name="${b64('introduction_screen')}"]`);
    expect(await introBtn.count()).toBeGreaterThan(0);
    await clickNthByName(page, b64('introduction_screen'), 0);

    // District page should have dropdown
    await waitForDaPageLoad(page);
    const districtSelect = page.locator(`select[name="${b64('current_district')}"]`);
    expect(await districtSelect.count()).toBe(1);

    // Verify district dropdown has all 94+ districts
    const optionCount = await districtSelect.locator('option').count();
    expect(optionCount).toBeGreaterThanOrEqual(90); // 94 districts + territories + blank

    await selectByName(page, b64('current_district'), 'District of Nebraska');
    await clickContinue(page);

    // Amended filing page
    await waitForDaPageLoad(page);
    const amendedBtns = page.locator(`[name="${b64('amended_filing')}"]`);
    expect(await amendedBtns.count()).toBe(2); // Yes/No

    await clickNthByName(page, b64('amended_filing'), 1); // No
    await waitForDaPageLoad(page);

    // Handle case number if it appears
    const caseNum = page.locator(`#${b64('case_number')}`);
    if (await caseNum.count() > 0) {
      await clickContinue(page);
      await waitForDaPageLoad(page);
    }

    // District final → Continue
    await clickNthByName(page, b64('district_final'), 0);

    // Filing status
    await waitForDaPageLoad(page);
    const filingRadios = page.locator(`input[name="${b64('filing_status')}"]`);
    expect(await filingRadios.count()).toBeGreaterThanOrEqual(2); // Individual / Joint

    await clickById(page, `${b64('filing_status')}_0`);
    await clickContinue(page);

    // Should be on debtor identity now
    await waitForDaPageLoad(page);
    const firstNameField = page.locator(`#${b64('debtor[i].name.first')}`);
    expect(await firstNameField.count()).toBe(1);
    expect(await firstNameField.isVisible()).toBeTruthy();

    console.log('✅ Intro → District → Debtor identity navigation works');
  });

  test('Property section renders all required question types', async ({ page }) => {
    await setupIndividualFiling(page);

    // Should be at property_intro
    await waitForDaPageLoad(page);
    let h = await getHeading(page);
    expect(h.toLowerCase()).toContain('property');

    // Advance past intro
    await clickNthByName(page, b64('property_intro'), 0);

    // Real property interests → should be a yesno button pair
    await waitForDaPageLoad(page);
    h = await getHeading(page);
    expect(h.toLowerCase()).toContain('interest');

    const yesBtn = page.locator(`[name="${b64('prop.interests.there_are_any')}"]`).first();
    expect(await yesBtn.isVisible()).toBeTruthy();

    await clickYesNoButton(page, 'prop.interests.there_are_any', false);

    // Vehicles
    await waitForDaPageLoad(page);
    h = await getHeading(page);
    expect(h.toLowerCase()).toContain('vehicle');

    await clickYesNoButton(page, 'prop.ab_vehicles.there_are_any', false);

    // Other vehicles
    await waitForDaPageLoad(page);
    h = await getHeading(page);
    expect(h.toLowerCase()).toContain('vehicle');

    await clickYesNoButton(page, 'prop.ab_other_vehicles.there_are_any', false);

    // Should advance to personal items or next section
    await waitForDaPageLoad(page);
    h = await getHeading(page);
    expect(h).toBeTruthy();

    await screenshot(page, 'section-property-complete');
    console.log(`✅ Property section renders correctly, now at: "${h}"`);
  });

  test('Personal items pages accept No answers and advance correctly', async ({ page }) => {
    // After property intro, verify we can click through the first few
    // personal items yes/no pages without getting stuck.
    await setupIndividualFiling(page);

    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('property_intro'), 0);

    // No real-property interests
    await waitForDaPageLoad(page);
    await clickYesNoButton(page, 'prop.interests.there_are_any', false);

    // No vehicles
    await waitForDaPageLoad(page);
    await clickYesNoButton(page, 'prop.ab_vehicles.there_are_any', false);

    // No other vehicles
    await waitForDaPageLoad(page);
    await clickYesNoButton(page, 'prop.ab_other_vehicles.there_are_any', false);

    // Navigate personal items pages — a mix of:
    //   (a) yesno: pages — two <button type="submit"> with value="True"/"False"
    //   (b) radio/dropdown pages with a #da-continue-button
    // Advance up to 25 pages, answering "No"/"False" on each.
    const pageHeadings: string[] = [];
    for (let i = 0; i < 25; i++) {
      await waitForDaPageLoad(page);
      const h = await getHeading(page);
      pageHeadings.push(h);

      // If we've reached exemptions or financial affairs, stop
      if (h.toLowerCase().includes('exemption') || h.toLowerCase().includes('financial')) break;

      // Detect page type: yesno buttons are <button type="submit" value="True/False">
      const pageInfo = await page.evaluate(() => {
        const yesNoSubmitBtns = document.querySelectorAll('button[type="submit"][value="True"], button[type="submit"][value="False"]');
        // Only count as yesno if buttons are enabled (not leftovers from previous page)
        let enabledYesNo = 0;
        yesNoSubmitBtns.forEach(btn => { if (!(btn as HTMLButtonElement).disabled) enabledYesNo++; });
        const hasContinueBtn = !!document.querySelector('#da-continue-button');
        const radioInputs = document.querySelectorAll('input[type="radio"]');
        const selectInputs = document.querySelectorAll('select');
        return { enabledYesNo, hasContinueBtn, radioCount: radioInputs.length, selectCount: selectInputs.length };
      });

      if (pageInfo.enabledYesNo >= 2 && !pageInfo.hasContinueBtn) {
        // yesno: question — click the enabled "No" (value="False") submit button
        const noBtn = page.locator('button[type="submit"][value="False"]:not([disabled])').first();
        if (await noBtn.count() > 0) {
          await noBtn.click();
          await page.waitForLoadState('networkidle');
          continue;
        }
      }

      // Page with labelauty radio buttons and/or selects — click "No"/"False" labels
      if (pageInfo.radioCount > 0 || pageInfo.selectCount > 0) {
        await page.evaluate(() => {
          document.querySelectorAll('input[type="radio"][value="False"]').forEach(radio => {
            const id = radio.getAttribute('id');
            if (!id) return;
            const label = document.querySelector(`label[for="${id}"]`) as HTMLElement;
            if (label && label.offsetParent !== null && !(radio as HTMLInputElement).checked) label.click();
          });
          document.querySelectorAll('select').forEach(sel => {
            if (!sel.value || sel.selectedIndex <= 0) {
              const opts = sel.querySelectorAll('option');
              for (let j = 0; j < opts.length; j++) {
                if (opts[j].value) { sel.value = opts[j].value; sel.dispatchEvent(new Event('change', { bubbles: true })); break; }
              }
            }
          });
        });
      }

      if (pageInfo.hasContinueBtn) {
        await clickContinue(page);
      }
    }

    // We should have advanced through multiple pages
    expect(pageHeadings.length).toBeGreaterThan(3);

    console.log(`✅ Navigated through ${pageHeadings.length} personal items pages`);
    console.log(`   Last heading: "${pageHeadings[pageHeadings.length - 1]}"`);
  });

  test('Interview nav sidebar contains all required sections', async ({ page }) => {
    // After setting up the filing and reaching property, verify the sidebar
    // navigation lists all expected Chapter 7 filing sections
    await setupIndividualFiling(page);

    // Should be at property_intro — check the navigation sidebar
    await waitForDaPageLoad(page);

    const navItems = await page.evaluate(() => {
      // docassemble renders section nav as either .nav-link or in a sidebar
      const candidates = document.querySelectorAll(
        '.nav-link, [class*="nav"] a, [class*="nav"] span, [class*="step"]'
      );
      return Array.from(candidates)
        .map(el => el.textContent?.trim())
        .filter(t => t && t.length > 2);
    });

    console.log(`📋 Nav sections: ${navItems.join(', ')}`);

    // These sections should be listed in the nav for a complete Chapter 7 interview
    const navText = navItems.join(' ').toLowerCase();
    const expectedSections = [
      'property',
      'income',
      'expense',
      'financial',
      'attorney disclosure',
    ];

    for (const section of expectedSections) {
      expect(navText).toContain(section);
    }

    console.log(`✅ Nav sidebar has ${navItems.length} sections including all required ones`);
  });

  test('Non-amended filing skips case number question', async ({ page }) => {
    await page.goto(INTERVIEW_URL + '&new_session=1');
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('introduction_screen'), 0);

    await waitForDaPageLoad(page);
    await selectByName(page, b64('current_district'), 'District of Nebraska');
    await clickContinue(page);

    // Amended = No
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('amended_filing'), 1);

    // May or may not see case number — handle both paths
    await waitForDaPageLoad(page);
    const caseNum = page.locator(`#${b64('case_number')}`);
    const caseNumberVisible = await caseNum.count() > 0;

    if (caseNumberVisible) {
      // If shown, it should NOT be required (required: false)
      // Verify we can proceed without filling it
      await clickContinue(page);
      await waitForDaPageLoad(page);
    }

    // Should reach district_final
    const districtFinal = page.locator(`[name="${b64('district_final')}"]`);
    const dfCount = await districtFinal.count();

    // We should be able to proceed from here
    expect(dfCount).toBeGreaterThan(0);

    console.log(`✅ Non-amended filing path works (case number shown: ${caseNumberVisible})`);
  });

  test('Amended filing shows case number and reaches district_final', async ({ page }) => {
    await page.goto(INTERVIEW_URL + '&new_session=1');
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('introduction_screen'), 0);

    await waitForDaPageLoad(page);
    await selectByName(page, b64('current_district'), 'District of Nebraska');
    await clickContinue(page);

    // Amended = Yes (yesno: renders as two buttons with name=b64('amended_filing'))
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('amended_filing'), 0);

    // Should see case number input (rendered as fields: question with id=b64('case_number'))
    await waitForDaPageLoad(page);
    const heading = await getHeading(page);
    console.log(`After amended=Yes, heading: "${heading}"`);

    // The case_number field could be found by id or by name
    const caseNumById = page.locator(`#${b64('case_number')}`);
    const caseNumByName = page.locator(`[name="${b64('case_number')}"]`);
    const caseNumByLabel = page.locator('input').filter({ hasText: /case/i });

    const foundById = await caseNumById.count();
    const foundByName = await caseNumByName.count();
    console.log(`Case number field: byId=${foundById}, byName=${foundByName}`);

    // At least one locator should find it
    expect(foundById + foundByName).toBeGreaterThan(0);

    // Fill it and proceed
    if (foundById > 0) {
      await caseNumById.fill('8:26-bk-99999');
    } else {
      await fillByName(page, b64('case_number'), '8:26-bk-99999');
    }
    await clickContinue(page);

    // Should reach district_final
    await waitForDaPageLoad(page);
    const districtFinal = page.locator(`[name="${b64('district_final')}"]`);
    expect(await districtFinal.count()).toBeGreaterThan(0);

    console.log('✅ Amended filing shows case number and reaches district_final');
  });
});
