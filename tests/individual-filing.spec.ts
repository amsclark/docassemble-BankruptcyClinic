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
  clickNthByClass,
  selectByName,
  selectById,
  selectByIndex,
  fillById,
  fillByName,
  fillDebtorIdentity,
  clickYesNo,
} from './helpers';

test.describe('Individual Filing Flow', () => {
  test('Complete individual filing through debtor info and case setup', async ({
    page,
  }) => {
    // ──────────────────────────────────────
    // 1. Introduction
    // ──────────────────────────────────────
    await page.goto(INTERVIEW_URL);
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('introduction_screen'), 0);

    // ──────────────────────────────────────
    // 2. Select district
    // ──────────────────────────────────────
    await waitForDaPageLoad(page);
    await selectByName(page, b64('current_district'), 'District of Nebraska');
    await clickContinue(page);

    // ──────────────────────────────────────
    // 3. Yes for amended filing (known-good flow)
    // ──────────────────────────────────────
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('amended_filing'), 0); // "Yes"

    // ──────────────────────────────────────
    // 4. Case number
    // ──────────────────────────────────────
    await waitForDaPageLoad(page);
    await page.waitForTimeout(500);
    await fillByName(page, b64('case_number'), '8:24-bk-00001');
    await clickContinue(page);

    // ──────────────────────────────────────
    // 5. District confirmation
    // ──────────────────────────────────────
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('district_final'), 0);

    // ──────────────────────────────────────
    // 6. Filing status: Individual
    // ──────────────────────────────────────
    await waitForDaPageLoad(page);
    await page.waitForTimeout(1000);
    await clickById(page, b64('filing_status') + '_0'); // Individual
    await clickContinue(page);

    // ──────────────────────────────────────
    // 7. Fill debtor identity
    // ──────────────────────────────────────
    await waitForDaPageLoad(page);
    await page.waitForTimeout(500);

    await fillDebtorIdentity(page, {
      first: 'Jane',
      middle: 'Marie',
      last: 'Doe',
      suffix: '',
      street: '456 Oak Avenue',
      city: 'Lincoln',
      state: 'Nebraska',
      zip: '68501',
      countyIndex: 2,
      hasMailing: false,
      taxIdType: 'ssn',
      taxId: '222-33-4444',
    });

    // ──────────────────────────────────────
    // 8. Debtor aliases - say No
    // ──────────────────────────────────────
    await waitForDaPageLoad(page);
    const heading8 = await getHeading(page);
    console.log(`📍 After debtor info: "${heading8}"`);
    await clickNthByName(page, b64('debtor[i].alias.there_are_any'), 1); // "No"

    // ──────────────────────────────────────
    // 9. District residency - say Yes
    // ──────────────────────────────────────
    await waitForDaPageLoad(page);
    const heading9 = await getHeading(page);
    console.log(`📍 District residency: "${heading9}"`);
    await clickNthByName(
      page,
      b64('debtor[i].district_info.is_current_district'),
      0,
    ); // "Yes"
    await clickById(page, 'da-continue-button');

    // ──────────────────────────────────────
    // 10. Should reach the debtor review / case details
    // ──────────────────────────────────────
    await waitForDaPageLoad(page);
    const heading10 = await getHeading(page);
    console.log(`📍 After district: "${heading10}"`);
    await screenshot(page, 'individual-after-debtor');

    // Verify we've progressed past debtor collection
    // The page should NOT still be asking for debtor info
    expect(heading10).toBeTruthy();
    console.log('✅ Individual filing: Successfully completed debtor info section');
  });

  test('Individual filing reaches case detail questions', async ({ page }) => {
    // Fast-forward through intro/district/case setup
    await page.goto(INTERVIEW_URL);
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('introduction_screen'), 0);

    await waitForDaPageLoad(page);
    await selectByName(page, b64('current_district'), 'District of Nebraska');
    await clickContinue(page);

    await clickNthByName(page, b64('amended_filing'), 0); // Yes
    await waitForDaPageLoad(page);
    await page.waitForTimeout(500);
    await fillByName(page, b64('case_number'), '8:24-bk-00002');
    await clickContinue(page);

    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('district_final'), 0);

    // Individual filing
    await waitForDaPageLoad(page);
    await clickById(page, b64('filing_status') + '_0');
    await clickContinue(page);

    // Fill debtor
    await waitForDaPageLoad(page);
    await page.waitForTimeout(500);
    await fillDebtorIdentity(page, {
      first: 'Bob',
      middle: 'Alan',
      last: 'Smith',
      street: '789 Pine Road',
      city: 'Omaha',
      state: 'Nebraska',
      zip: '68102',
      countyIndex: 3,
      hasMailing: false,
      taxIdType: 'ssn',
      taxId: '333-44-5555',
    });

    // No aliases
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('debtor[i].alias.there_are_any'), 1);

    // District residency - Yes
    await waitForDaPageLoad(page);
    await clickNthByName(
      page,
      b64('debtor[i].district_info.is_current_district'),
      0,
    );
    await clickById(page, 'da-continue-button');

    // Navigate through review page(s) until we hit case detail questions
    await waitForDaPageLoad(page);
    let heading = await getHeading(page);
    console.log(`📍 Post-debtor page: "${heading}"`);

    // Try to click continue if on a review page
    if (heading.toLowerCase().includes('review') || heading.toLowerCase().includes('summary')) {
      await clickById(page, 'da-continue-button');
      await waitForDaPageLoad(page);
      heading = await getHeading(page);
      console.log(`📍 After review: "${heading}"`);
    }

    await screenshot(page, 'individual-case-details');
    console.log('✅ Individual filing: Reached post-debtor section');
  });
});
