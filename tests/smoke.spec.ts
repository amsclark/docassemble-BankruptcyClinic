import { test, expect } from '@playwright/test';
import {
  INTERVIEW_URL,
  b64,
  waitForDaPageLoad,
  getHeading,
  screenshot,
  clickContinue,
  clickById,
  clickNthByName,
  selectByName,
  fillById,
  fillByName,
} from './helpers';

test.describe('Smoke Tests', () => {
  test('Interview loads and displays introduction', async ({ page }) => {
    await page.goto(INTERVIEW_URL);
    await waitForDaPageLoad(page);

    // Verify the page has loaded by checking for the continue/intro button
    const heading = await getHeading(page);
    console.log(`📍 Interview loaded with heading: "${heading}"`);

    // The first page should have an introduction_screen button or a heading
    const hasIntroButton = await page
      .locator(`[name="${b64('introduction_screen')}"]`)
      .count();
    expect(hasIntroButton).toBeGreaterThan(0);

    await screenshot(page, 'smoke-intro');
  });

  test('Can navigate past introduction to district selection', async ({
    page,
  }) => {
    await page.goto(INTERVIEW_URL);
    await waitForDaPageLoad(page);

    // Click the introduction button
    await clickNthByName(page, b64('introduction_screen'), 0);
    await waitForDaPageLoad(page);

    // Should now be on the district selection page
    const heading = await getHeading(page);
    console.log(`📍 After intro: heading = "${heading}"`);

    // Look for the district dropdown
    const districtDropdown = await page
      .locator(`select[name="${b64('current_district')}"]`)
      .count();
    expect(districtDropdown).toBeGreaterThan(0);

    await screenshot(page, 'smoke-district');
  });

  test('Can select district and proceed to amendment question', async ({
    page,
  }) => {
    await page.goto(INTERVIEW_URL);
    await waitForDaPageLoad(page);

    // Click intro
    await clickNthByName(page, b64('introduction_screen'), 0);
    await waitForDaPageLoad(page);

    // Select district
    await selectByName(
      page,
      b64('current_district'),
      'District of Nebraska',
    );
    await clickContinue(page);
    await waitForDaPageLoad(page);

    // Should now be on the amendment question page
    const heading = await getHeading(page);
    console.log(`📍 After district: heading = "${heading}"`);

    // Should have amended_filing radio buttons
    const amendedRadio = await page
      .locator(`[name="${b64('amended_filing')}"]`)
      .count();
    expect(amendedRadio).toBeGreaterThan(0);

    await screenshot(page, 'smoke-amendment');
  });

  test('Can reach filing status question (individual vs joint)', async ({
    page,
  }) => {
    await page.goto(INTERVIEW_URL);
    await waitForDaPageLoad(page);

    // Intro → District → Amendment → Case Number → District Final → Filing Status
    await clickNthByName(page, b64('introduction_screen'), 0);
    await waitForDaPageLoad(page);

    await selectByName(
      page,
      b64('current_district'),
      'District of Nebraska',
    );
    await clickContinue(page);

    // Click "No" for amended filing
    await clickNthByName(page, b64('amended_filing'), 1);
    await waitForDaPageLoad(page);

    // Case number page - fill and continue
    await page.waitForTimeout(500);
    await fillByName(page, b64('case_number'), '8:24-bk-00001');
    await clickContinue(page);

    // District final page - click continue
    await clickNthByName(page, b64('district_final'), 0);
    await waitForDaPageLoad(page);

    // Should now be on filing status page
    const heading = await getHeading(page);
    console.log(`📍 Filing status page: heading = "${heading}"`);

    await screenshot(page, 'smoke-filing-status');
  });
});
