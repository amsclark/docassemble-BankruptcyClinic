import { test, expect } from '@playwright/test';
import {
  INTERVIEW_URL, b64, waitForDaPageLoad, clickContinue,
  selectByName, fillById,
  clickYesNoButton, selectYesNoRadio, fillYesNoRadio,
  fillAllVisibleRadiosAsNo, handleAnotherPage,
} from './helpers';
import {
  navigateToDebtorPage, fillDebtorAndAdvance, passDebtorFinal,
  navigatePropertySection, navigateExemptionSection,
} from './navigation-helpers';
import { TestScenario } from './fixtures';

const SCENARIO: TestScenario = {
  name: 'employment-test',
  district: 'District of Nebraska',
  debtor: {
    first: 'Emp', middle: 'T', last: 'Test',
    street: '100 Test St', city: 'Omaha', state: 'Nebraska', zip: '68102',
    countyIndex: 3, taxIdType: 'ssn', taxId: '111-22-3333',
  },
  jointFiling: false,
  property: {
    realProperty: null as any,
    vehicle: null as any,
    deposit: { type: 'Checking', institution: 'Test Bank', amount: '100' },
  },
  creditors: { secured: null as any, priority: null as any, nonpriority: null as any },
};

test('employment Employed path', async ({ page }) => {
  test.setTimeout(120_000);
  
  await navigateToDebtorPage(page, SCENARIO);
  await fillDebtorAndAdvance(page, SCENARIO.debtor);
  await passDebtorFinal(page);
  await navigatePropertySection(page, SCENARIO);
  await navigateExemptionSection(page);

  await waitForDaPageLoad(page);
  console.log('On income page');

  // Select Employed and fill show-if fields by label
  await selectByName(page, b64('debtor[0].income.employment'), 'Employed');
  await page.waitForTimeout(2000);
  await page.getByLabel('Occupation').fill('Test Engineer');
  await page.getByLabel('Employer Name').fill('Test Corp');
  await page.getByLabel('Address/PO Box').first().fill('100 Main');
  await page.getByLabel('City').first().fill('Omaha');
  await page.getByLabel('State').first().fill('Nebraska');
  await page.getByLabel('Zip').first().fill('68102');
  await page.getByLabel('How long employed there?').fill('2 years');
  console.log('All fields filled');

  await clickContinue(page);
  await waitForDaPageLoad(page);

  const h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`After continue, heading: "${h}"`);
  expect(h?.toLowerCase()).not.toContain('employment');
  console.log('SUCCESS: moved past employment page');
});
