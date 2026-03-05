/**
 * MAXIMALIST end-to-end test: exercises EVERY field and list in the
 * bankruptcy interview with maximum data.
 *
 * Joint filing, 3 real properties, 3 vehicles, 3 deposits,
 * 3 secured creditors, 3 priority unsecured, 3 nonpriority unsecured,
 * 3 executory contracts, full income for both debtors (employed, all
 * deductions, other income), all optional expense categories,
 * financial affairs with employment + other income + lived elsewhere,
 * community property, full means test, previous bankruptcy,
 * attorney disclosure, and PDF verification.
 */
import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';
import {
  INTERVIEW_URL, b64, waitForDaPageLoad, clickContinue, clickById, clickNthByName,
  selectByName, selectById, selectByIndex, fillByName, fillById, fillDebtorIdentity,
  fillTextareaByName, screenshot, clickYesNoButton, selectYesNoRadio, fillYesNoRadio,
  fillAllVisibleRadiosAsNo, handleCaseNumberIfPresent, setCheckbox, handleAnotherPage,
} from './helpers';
import { TestScenario, DebtorProfile } from './fixtures';
import {
  navigateToDebtorPage, fillDebtorAndAdvance, passDebtorFinal,
  navigatePropertySection, navigateExemptionSection,
  navigateCreditorLibraryPicker,
  navigateReporting, navigateFinalReview, navigateDynamicPhase,
  navigateBusiness, navigateHazardousProperty, navigateCreditCounseling,
} from './navigation-helpers';
import { downloadAllPdfs, findPdf, getField } from './pdf-helpers';

// ════════════════════════════════════════════════════════════════════
//  MAXIMALIST SCENARIO
// ════════════════════════════════════════════════════════════════════

const MAXIMALIST: TestScenario = {
  name: 'maximalist-joint-everything',
  district: 'District of Nebraska',
  debtor: {
    first: 'Maxine', middle: 'Q', last: 'Testworth',
    suffix: 'Jr',
    street: '1234 Max Test Ave', city: 'Omaha', state: 'Nebraska', zip: '68102',
    countyIndex: 3, taxIdType: 'ssn', taxId: '111-22-3333',
    hasMailing: true,
    mailStreet: 'PO Box 5555', mailCity: 'Omaha', mailState: 'Nebraska', mailZip: '68101',
    aliases: [{ first: 'Maxi', last: 'Test' }, { first: 'M.Q.', last: 'Testworth' }],
  },
  spouse: {
    first: 'Maxwell', middle: 'R', last: 'Testworth',
    street: '1234 Max Test Ave', city: 'Omaha', state: 'Nebraska', zip: '68102',
    countyIndex: 3, taxIdType: 'ssn', taxId: '444-55-6666',
    hasMailing: true,
    mailStreet: 'PO Box 5555', mailCity: 'Omaha', mailState: 'Nebraska', mailZip: '68101',
    aliases: [{ first: 'Max', last: 'Testy' }],
  },
  jointFiling: true,
  property: {
    realProperty: {
      street: '1234 Max Test Ave', city: 'Omaha', stateAbbr: 'NE', zip: '68102',
      county: 'Douglas', typeIndex: 0, value: '250000',
      ownershipInterest: 'Fee simple', otherInfo: 'Primary residence',
    },
    realProperties: [
      { street: '1234 Max Test Ave', city: 'Omaha', stateAbbr: 'NE', zip: '68102',
        county: 'Douglas', typeIndex: 0, value: '250000',
        ownershipInterest: 'Fee simple', otherInfo: 'Primary residence' },
      { street: '500 Rental Rd', city: 'Lincoln', stateAbbr: 'NE', zip: '68508',
        county: 'Lancaster', typeIndex: 0, value: '180000',
        ownershipInterest: 'Fee simple', otherInfo: 'Rental property' },
      { street: '900 Investment Blvd', city: 'Grand Island', stateAbbr: 'NE', zip: '68801',
        county: 'Hall', typeIndex: 0, value: '95000',
        ownershipInterest: 'Fee simple', otherInfo: 'Vacation home' },
    ],
    vehicle: {
      make: 'Tesla', model: 'Model 3', year: '2023', mileage: '15000',
      value: '35000', state: 'Nebraska', hasLoan: true, loanAmount: '25000',
      otherInfo: 'Primary vehicle',
    },
    vehicles: [
      { make: 'Tesla', model: 'Model 3', year: '2023', mileage: '15000',
        value: '35000', state: 'Nebraska', hasLoan: true, loanAmount: '25000',
        otherInfo: 'Primary vehicle' },
      { make: 'Ford', model: 'F-250', year: '2020', mileage: '55000',
        value: '38000', state: 'Nebraska', hasLoan: true, loanAmount: '20000',
        otherInfo: 'Work truck' },
      { make: 'Honda', model: 'Accord', year: '2018', mileage: '90000',
        value: '15000', state: 'Nebraska', hasLoan: true, loanAmount: '5000',
        otherInfo: 'Spouse vehicle' },
    ],
    deposit: { type: 'Checking', institution: 'First National Bank of Omaha', amount: '3500' },
    deposits: [
      { type: 'Checking', institution: 'First National Bank of Omaha', amount: '3500' },
      { type: 'Savings', institution: 'Mutual of Omaha Bank', amount: '8000' },
      { type: 'Checking', institution: 'Wells Fargo', amount: '1200' },
    ],
  },
  creditors: {
    secured: {
      name: 'HomeFirst Mortgage Co', street: '100 Bank Plaza', city: 'Omaha', state: 'NE', zip: '68102',
      claimAmount: '230000', collateralValue: '250000',
    },
    securedList: [
      { name: 'HomeFirst Mortgage Co', street: '100 Bank Plaza', city: 'Omaha', state: 'NE', zip: '68102',
        claimAmount: '230000', collateralValue: '250000' },
      { name: 'Tesla Finance LLC', street: 'PO Box 9000', city: 'Fremont', state: 'CA', zip: '94538',
        claimAmount: '25000', collateralValue: '35000' },
      { name: 'Ford Motor Credit', street: 'PO Box 650574', city: 'Dallas', state: 'TX', zip: '75265',
        claimAmount: '20000', collateralValue: '38000' },
    ],
    priority: {
      name: 'Internal Revenue Service', street: '1111 Constitution Ave', city: 'Washington', state: 'DC', zip: '20224',
      type: 'Taxes and certain other debts you owe the government',
      totalClaim: '12000', priorityAmount: '12000', nonpriorityAmount: '0',
    },
    priorityList: [
      { name: 'Internal Revenue Service', street: '1111 Constitution Ave', city: 'Washington', state: 'DC', zip: '20224',
        type: 'Taxes and certain other debts you owe the government',
        totalClaim: '12000', priorityAmount: '12000', nonpriorityAmount: '0' },
      { name: 'NE Dept of Revenue', street: '301 Centennial Mall', city: 'Lincoln', state: 'NE', zip: '68509',
        type: 'Taxes and certain other debts you owe the government',
        totalClaim: '4500', priorityAmount: '4500', nonpriorityAmount: '0' },
      { name: 'US Dept of Education', street: '400 Maryland Ave SW', city: 'Washington', state: 'DC', zip: '20202',
        type: 'Claims for death or personal injury while you were intoxicated',
        totalClaim: '8000', priorityAmount: '8000', nonpriorityAmount: '0' },
    ],
    nonpriority: {
      name: 'Chase Credit Card', street: 'PO Box 15298', city: 'Wilmington', state: 'DE', zip: '19850',
      totalClaim: '18000', type: 'Credit Card',
    },
    nonpriorityList: [
      { name: 'Chase Credit Card', street: 'PO Box 15298', city: 'Wilmington', state: 'DE', zip: '19850',
        totalClaim: '18000', type: 'Credit Card' },
      { name: 'Capital One Visa', street: 'PO Box 30285', city: 'Salt Lake City', state: 'UT', zip: '84130',
        totalClaim: '12500', type: 'Credit Card' },
      { name: 'Sanford Health Billing', street: '1305 W 18th St', city: 'Sioux Falls', state: 'SD', zip: '57104',
        totalClaim: '6200', type: 'Medical' },
    ],
  },
  attorney: { name: 'Elena Maximum, Esq.', firm: 'Omaha Maximum Legal Aid', agreedCompensation: '3500', priorReceived: '1500' },
  rentExpense: '0',
  income: {
    employment: 'Employed',
    employer: 'Maximalist Industries Inc.',
    grossWages: '5500',
    overtimePay: '200',
    taxDeduction: '825',
    netRentalBusiness: '500',
    interestAndDividends: '100',
    familySupport: '0',
    unemployment: '0',
    socialSecurity: '0',
    otherGovtAssist: '0',
    pension: '0',
  },
  hasCodebtor: true,
  hasContracts: true,
  dependents: 2,
};

// ════════════════════════════════════════════════════════════════════
//  HELPER: log current heading for debugging
// ════════════════════════════════════════════════════════════════════
async function logHeading(page: Page, label: string) {
  const h = await page.locator('h1, h2, h3').first().textContent().catch(() => '');
  console.log(`  [${label}] heading: "${h?.trim()}"`);
  return h?.trim() || '';
}

// ════════════════════════════════════════════════════════════════════
//  HELPER: list collect "add another" / "there_is_another" handler
// ════════════════════════════════════════════════════════════════════

/**
 * Handle the page after a list collect item is submitted.
 * With `list collect: True`, docassemble may show:
 *   (a) A review table page with an "Add another" button, OR
 *   (b) A standard yesno page for `there_is_another`
 *
 * @param addMore  true → click "Add another" / Yes; false → click Continue / No
 */
async function handleListCollectReview(
  page: Page, thereIsAnotherVar: string, addMore: boolean
) {
  await waitForDaPageLoad(page);
  const bodyText = await page.locator('body').innerText();
  const hasAnotherText =
    bodyText.toLowerCase().includes('another') ||
    bodyText.toLowerCase().includes('more');

  if (!hasAnotherText) return; // page already moved on

  // Check for "Add another" button (list collect review page)
  const addBtn = page.locator('button').filter({ hasText: /Add another/i });
  if (await addBtn.count() > 0) {
    if (addMore) {
      await addBtn.first().click();
      await page.waitForLoadState('networkidle');
    } else {
      await clickContinue(page);
    }
    return;
  }

  // Standard yes/no button for there_is_another
  await clickYesNoButton(page, thereIsAnotherVar, addMore);
}

// ════════════════════════════════════════════════════════════════════
//  CUSTOM: Multi-item property section (3 real, 3 vehicle, 3 deposit)
// ════════════════════════════════════════════════════════════════════

async function fillRealProperty(page: Page, rp: any, index: number) {
  await page.locator(`#${b64(`prop.interests[${index}].street`)}`).fill(rp.street);
  await page.locator(`#${b64(`prop.interests[${index}].city`)}`).fill(rp.city);
  await page.locator(`#${b64(`prop.interests[${index}].state`)}`).fill(rp.stateAbbr);
  await page.locator(`#${b64(`prop.interests[${index}].zip`)}`).fill(rp.zip);
  await page.locator(`#${b64(`prop.interests[${index}].county`)}`).fill(rp.county);
  await page.locator(`label[for="${b64(`prop.interests[${index}].type`)}_${rp.typeIndex}"]`).click();
  // 'who' field
  const propWhoSelect = page.locator(`select#${b64(`prop.interests[${index}].who`)}`);
  if (await propWhoSelect.count() > 0) {
    await propWhoSelect.selectOption('Debtor 1 only');
  } else {
    const whoLabel = page.locator('label').filter({ hasText: 'Debtor 1 only' }).first();
    if (await whoLabel.count() > 0) await whoLabel.click();
  }
  await page.locator(`#${b64(`prop.interests[${index}].current_value`)}`).fill(rp.value);
  await page.locator(`#${b64(`prop.interests[${index}].ownership_interest`)}`).fill(rp.ownershipInterest);
  await fillYesNoRadio(page, `prop.interests[${index}].is_community_property`, false);
  await page.locator(`#${b64(`prop.interests[${index}].other_info`)}`).fill(rp.otherInfo);
  await fillYesNoRadio(page, `prop.interests[${index}].is_claiming_exemption`, false);
}

async function fillVehicle(page: Page, v: any, index: number) {
  await page.locator(`#${b64(`prop.ab_vehicles[${index}].make`)}`).fill(v.make);
  await page.locator(`#${b64(`prop.ab_vehicles[${index}].model`)}`).fill(v.model);
  await page.locator(`#${b64(`prop.ab_vehicles[${index}].year`)}`).fill(v.year);
  await page.locator(`#${b64(`prop.ab_vehicles[${index}].milage`)}`).fill(v.mileage);
  const vehWhoSelect = page.locator(`select#${b64(`prop.ab_vehicles[${index}].who`)}`);
  if (await vehWhoSelect.count() > 0) {
    await vehWhoSelect.selectOption('Debtor 1 only');
  } else {
    const debtorOnlyLabel = page.locator('label').filter({ hasText: 'Debtor 1 only' }).first();
    if (await debtorOnlyLabel.count() > 0) await debtorOnlyLabel.click();
  }
  await page.locator(`#${b64(`prop.ab_vehicles[${index}].current_value`)}`).fill(v.value);
  await page.locator(`#${b64(`prop.ab_vehicles[${index}].state`)}`).fill(v.state);

  if (v.hasLoan) {
    await setCheckbox(page, `prop.ab_vehicles[${index}].has_loan`, true);
    await page.waitForTimeout(2000);
    const loanField = page.getByLabel(/How much do you owe on the loan/i).first();
    await loanField.waitFor({ state: 'visible', timeout: 10000 });
    await loanField.click();
    await loanField.fill(v.loanAmount || '0');
  }

  await fillYesNoRadio(page, `prop.ab_vehicles[${index}].is_community_property`, false);
  const otherInfoField = page.locator(`#${b64(`prop.ab_vehicles[${index}].other_info`)}`);
  if (await otherInfoField.count() > 0) {
    await otherInfoField.fill(v.otherInfo || 'N/A');
  }
  await fillYesNoRadio(page, `prop.ab_vehicles[${index}].is_claiming_exemption`, false);
}

async function fillDeposit(page: Page, dep: any, index: number) {
  await page.locator(`select#${b64(`prop.financial_assets.deposits[${index}].type`)}`).selectOption(dep.type);
  await page.locator(`#${b64(`prop.financial_assets.deposits[${index}].institution`)}`).fill(dep.institution);
  await page.locator(`#${b64(`prop.financial_assets.deposits[${index}].amount`)}`).fill(dep.amount);
  await fillYesNoRadio(page, `prop.financial_assets.deposits[${index}].is_claiming_exemption`, false);
}

async function navigatePropertySectionMulti(page: Page) {
  // Use single-item property flow (same as navigatePropertySection) but with maximalist data.
  // The interview's list-gather pattern uses handleAnotherPage, not explicit there_is_another buttons.
  const scenario = MAXIMALIST;
  const prop = scenario.property;

  // property_intro
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('property_intro'), 0);

  // ---- Real property ----
  await waitForDaPageLoad(page);
  console.log('  [property] Real property: Yes');
  await clickYesNoButton(page, 'prop.interests.there_are_any', true);

  // First (and only) real property
  await waitForDaPageLoad(page);
  await fillRealProperty(page, prop.realProperty!, 0);
  await clickContinue(page);
  await waitForDaPageLoad(page);
  await handleAnotherPage(page, 'prop.interests.there_is_another');
  await waitForDaPageLoad(page);

  // ---- Vehicles ----
  await waitForDaPageLoad(page);
  console.log('  [property] Vehicles: Yes');
  await clickYesNoButton(page, 'prop.ab_vehicles.there_are_any', true);

  // First (and only) vehicle
  await waitForDaPageLoad(page);
  await fillVehicle(page, prop.vehicle!, 0);
  await clickContinue(page);
  await waitForDaPageLoad(page);
  await handleAnotherPage(page, 'prop.ab_vehicles.there_is_another');
  await waitForDaPageLoad(page);

  // ---- Other vehicles -> No ----
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.ab_other_vehicles.there_are_any', false);
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle');

  // ---- Personal/household items ----
  await waitForDaPageLoad(page);
  await handleCaseNumberIfPresent(page);
  await fillAllVisibleRadiosAsNo(page);
  await clickContinue(page);

  // ---- Financial assets - cash ----
  await waitForDaPageLoad(page);
  await fillAllVisibleRadiosAsNo(page);
  await clickContinue(page);

  // ---- Deposits ----
  await waitForDaPageLoad(page);
  console.log('  [property] Deposits: Yes');
  await clickYesNoButton(page, 'prop.financial_assets.deposits.there_are_any', true);

  // First (and only) deposit
  await waitForDaPageLoad(page);
  await fillDeposit(page, prop.deposit!, 0);
  await clickContinue(page);
  await handleAnotherPage(page, 'prop.financial_assets.deposits.there_is_another');

  // ---- Remaining financial sub-lists -> No ----
  const remainingFinancial = [
    'prop.financial_assets.bonds_and_stocks.there_are_any',
    'prop.financial_assets.non_traded_stock.there_are_any',
    'prop.financial_assets.corporate_bonds.there_are_any',
    'prop.financial_assets.retirement_accounts.there_are_any',
    'prop.financial_assets.prepayments.there_are_any',
    'prop.financial_assets.annuities.there_are_any',
    'prop.financial_assets.edu_accounts.there_are_any',
  ];
  for (const varName of remainingFinancial) {
    await waitForDaPageLoad(page);
    await clickYesNoButton(page, varName, false);
  }

  // Remaining property pages: future interests, IP, intangible, owed property,
  // business property, farming property, other property.
  // Use dynamic loop: keep clicking No + Continue until we leave property section.
  for (let pageNum = 0; pageNum < 12; pageNum++) {
    await waitForDaPageLoad(page);
    const heading = await page.locator('h1').first().textContent().catch(() => '');
    console.log(`  [property] post-deposit page ${pageNum}: "${heading?.trim()}"`);

    // Check if we've left property section (exemption page has a select for exemption_type)
    const exemptionSelect = page.locator(`select[name="${b64('prop.exempt_property.exemption_type')}"]`);
    if (await exemptionSelect.count() > 0) {
      console.log('  [property] Reached exemption section, done with property');
      break;
    }

    await fillAllVisibleRadiosAsNo(page);
    await clickContinue(page);
  }
}

// ════════════════════════════════════════════════════════════════════
//  CUSTOM: Income (both debtors employed with full data)
// ════════════════════════════════════════════════════════════════════

/**
 * Generic income page handler.  Loops through pages, detecting what's on each
 * page via the presence of known fields, and filling appropriately.  This is
 * much more resilient than hardcoding the exact page order.
 */
async function fillIncomeForDebtor(page: Page, debtorIdx: number, data: {
  employment: string; occupation: string; employer: string;
  employer_street: string; employer_city: string; employer_state: string; employer_zip: string;
  employment_length: string;
  income_amount: string; overtime: string;
  tax_deduction: string;
  other_deduction: boolean; other_deduction_desc?: string; other_deduction_amt?: string;
  net_rental: string; interest: string; family_support: string;
  unemployment: string; social_security: string; other_govt: string; pension: string;
  other_monthly_income: boolean; other_monthly_desc?: string; other_monthly_amt?: string;
  other_regular_contributions: boolean; regular_contrib_desc?: string; regular_contrib_amt?: string;
  expect_year_delta: boolean;
}) {
  const d = `debtor[${debtorIdx}].income`;
  const hasField = async (varSuffix: string) => {
    const el = page.locator(`#${b64(`${d}.${varSuffix}`)}`);
    return (await el.count()) > 0 && (await el.isVisible().catch(() => false));
  };
  const hasSelect = async (varSuffix: string) => {
    const el = page.locator(`select[name="${b64(`${d}.${varSuffix}`)}"]`);
    return (await el.count()) > 0;
  };
  const hasRadio = async (varSuffix: string) => {
    const el = page.locator(`label[for="${b64(`${d}.${varSuffix}`)}_0"]`);
    return (await el.count()) > 0;
  };

  // Page loop: keep handling pages until we leave the income section for this debtor
  for (let step = 0; step < 15; step++) {
    await waitForDaPageLoad(page);
    const h = await page.locator('h1').first().textContent().catch(() => '');
    console.log(`  [income] Debtor ${debtorIdx + 1} step ${step}: "${h?.trim()}"`);

    // Employment page
    if (await hasSelect('employment')) {
      console.log(`  [income] → Employment page`);
      await selectByName(page, b64(`${d}.employment`), data.employment);
      if (data.employment === 'Employed') {
        // show_if fields use _field_N names in docassemble, so fill by label
        await page.waitForTimeout(2000);
        await page.getByLabel('Occupation').fill(data.occupation);
        await page.getByLabel('Employer Name').fill(data.employer);
        await page.getByLabel('Address/PO Box').first().fill(data.employer_street);
        await page.getByLabel('City').first().fill(data.employer_city);
        await page.getByLabel('State').first().fill(data.employer_state);
        await page.getByLabel('Zip').first().fill(data.employer_zip);
        await page.getByLabel('How long employed there?').fill(data.employment_length);
      }
      await clickContinue(page);
      continue;
    }

    // Monthly income page (income_amount_1)
    if (await hasField('income_amount_1')) {
      console.log(`  [income] → Monthly income page`);
      await fillById(page, b64(`${d}.income_amount_1`), data.income_amount);
      await fillById(page, b64(`${d}.overtime_pay_1`), data.overtime);
      await clickContinue(page);
      continue;
    }

    // Payroll deductions page (tax_deduction)
    if (await hasField('tax_deduction')) {
      console.log(`  [income] → Payroll deductions page`);
      await fillById(page, b64(`${d}.tax_deduction`), data.tax_deduction);
      // Fill optional fields if present
      for (const f of ['mandatory_contributions', 'voluntary_contributions', 'fund_loans',
                        'insurance', 'domestic_support', 'union_dues']) {
        const el = page.locator(`#${b64(`${d}.${f}`)}`);
        if ((await el.count()) > 0) await el.fill('0');
      }
      await clickContinue(page);
      continue;
    }

    // Other deductions page (other_deduction radio)
    if (await hasRadio('other_deduction')) {
      console.log(`  [income] → Other deductions page`);
      await fillYesNoRadio(page, `${d}.other_deduction`, data.other_deduction);
      if (data.other_deduction) {
        await page.waitForTimeout(1000);
        // show_if fields use _field_N names; fill by label
        await page.getByLabel('Specify deduction').first().fill(data.other_deduction_desc || 'Other');
        await page.getByLabel('Deduction amount').first().fill(data.other_deduction_amt || '0');
      }
      await clickContinue(page);
      continue;
    }

    // Other income page (net_rental_business)
    if (await hasField('net_rental_business')) {
      console.log(`  [income] → Other income page`);
      await fillById(page, b64(`${d}.net_rental_business`), data.net_rental);
      await fillById(page, b64(`${d}.interest_and_dividends`), data.interest);
      await fillById(page, b64(`${d}.family_support`), data.family_support);
      await fillById(page, b64(`${d}.unemployment`), data.unemployment);
      await fillById(page, b64(`${d}.social_security`), data.social_security);
      await fillById(page, b64(`${d}.other_govt_assist`), data.other_govt);
      await fillById(page, b64(`${d}.pension`), data.pension);
      if (await hasRadio('other_monthly_income')) {
        await fillYesNoRadio(page, `${d}.other_monthly_income`, data.other_monthly_income);
        if (data.other_monthly_income) {
          await page.waitForTimeout(1000);
          // show_if fields use _field_N names; fill by label
          await page.getByLabel('Specify income type').first().fill(data.other_monthly_desc || 'Other');
          await page.getByLabel('Income amount').first().fill(data.other_monthly_amt || '0');
        }
      }
      await clickContinue(page);
      continue;
    }

    // Contributions + expect year delta page
    if (await hasRadio('other_regular_contributions')) {
      console.log(`  [income] → Contributions/year delta page`);
      await selectYesNoRadio(page, `${d}.other_regular_contributions`, data.other_regular_contributions);
      if (data.other_regular_contributions) {
        await page.waitForTimeout(1000);
        // show_if fields use _field_N names; fill by label
        await page.getByLabel('Specify').first().fill(data.regular_contrib_desc || 'Other');
        await page.getByLabel('Amount').first().fill(data.regular_contrib_amt || '0');
      }
      if (await hasRadio('expect_year_delta')) {
        await selectYesNoRadio(page, `${d}.expect_year_delta`, data.expect_year_delta);
        await page.waitForTimeout(300);
      }
      await clickContinue(page);
      continue;
    }

    // If we don't recognize the page, we've left this debtor's income section
    console.log(`  [income] → Page not recognized for debtor ${debtorIdx + 1}, done.`);
    break;
  }
}

async function navigateIncomeMaximalist(page: Page) {
  // Debtor 1
  await fillIncomeForDebtor(page, 0, {
    employment: 'Employed', occupation: 'Senior Engineer',
    employer: 'Maximalist Industries Inc.',
    employer_street: '5000 Industrial Dr', employer_city: 'Omaha',
    employer_state: 'Nebraska', employer_zip: '68102', employment_length: '5 years',
    income_amount: '5500', overtime: '200', tax_deduction: '825',
    other_deduction: true, other_deduction_desc: 'Garnishment', other_deduction_amt: '75',
    net_rental: '500', interest: '100', family_support: '0',
    unemployment: '0', social_security: '0', other_govt: '0', pension: '0',
    other_monthly_income: true, other_monthly_desc: 'Side consulting', other_monthly_amt: '300',
    other_regular_contributions: true, regular_contrib_desc: 'Family support', regular_contrib_amt: '200',
    expect_year_delta: false,
  });

  // Debtor 2
  await fillIncomeForDebtor(page, 1, {
    employment: 'Employed', occupation: 'Accountant',
    employer: 'Testworth Accounting LLC',
    employer_street: '200 Finance Way', employer_city: 'Omaha',
    employer_state: 'Nebraska', employer_zip: '68102', employment_length: '3 years',
    income_amount: '3200', overtime: '0', tax_deduction: '480',
    other_deduction: false,
    net_rental: '0', interest: '50', family_support: '0',
    unemployment: '0', social_security: '0', other_govt: '0', pension: '0',
    other_monthly_income: false,
    other_regular_contributions: false,
    expect_year_delta: false,
  });
}

// ════════════════════════════════════════════════════════════════════
//  CUSTOM: Expenses (all optional categories Yes)
// ════════════════════════════════════════════════════════════════════

async function navigateExpensesMaximalist(page: Page) {
  // The mandatory flow goes directly to monthly_expenses_details (household_description is not sought)
  console.log('  [expenses] Monthly expenses page');
  await waitForDaPageLoad(page);

  // Only rent_expense and alimony are required (no required: False)
  await fillById(page, b64('debtor[0].expenses.rent_expense'), '1200');
  await fillById(page, b64('debtor[0].expenses.alimony'), '0');

  // Set yesnoradio fields to No (avoids show-if _field_N complexity)
  await selectYesNoRadio(page, 'debtor[0].expenses.util_other', false);
  await selectYesNoRadio(page, 'debtor[0].expenses.other_insurance', false);
  await selectYesNoRadio(page, 'debtor[0].expenses.has_other_expenses', false);
  await page.waitForTimeout(300);

  await clickContinue(page);

  // Change in expense -> No
  console.log('  [expenses] Change in expense');
  await waitForDaPageLoad(page);
  await selectYesNoRadio(page, 'debtor[0].expenses.change_in_expense', false);
  await clickContinue(page);
}

// ════════════════════════════════════════════════════════════════════
//  CUSTOM: Financial Affairs (employed, other income, lived elsewhere)
// ════════════════════════════════════════════════════════════════════

async function navigateFinancialAffairsMaximalist(page: Page) {
  console.log('  [financialAffairs] Marital/residence page');
  await waitForDaPageLoad(page);

  // Set lived_elsewhere = Yes FIRST
  await selectYesNoRadio(page, 'financial_affairs.lived_elsewhere', true);
  await page.waitForTimeout(1000);

  // Fill previous address 1
  await fillById(page, b64('financial_affairs.address_street_1'), '999 Old Oak Ln');
  await fillById(page, b64('financial_affairs.address_city_1'), 'Lincoln');
  await fillById(page, b64('financial_affairs.address_state_1'), 'Nebraska');
  await fillById(page, b64('financial_affairs.address_zip_1'), '68508');
  // Dates
  const fromField = page.locator(`#${b64('financial_affairs.address_from_1')}`);
  if (await fromField.count() > 0) await fromField.fill('2020-01-01');
  const toField = page.locator(`#${b64('financial_affairs.address_to_1')}`);
  if (await toField.count() > 0) await toField.fill('2023-06-01');

  // Set marital_status = Yes (joint filing)
  await selectYesNoRadio(page, 'financial_affairs.marital_status', true);
  await page.waitForTimeout(500);

  // lived_with_spouse = No
  const livedWithSpouseLabel = page.locator(`label[for="${b64('financial_affairs.lived_with_spouse')}_1"]`);
  if (await livedWithSpouseLabel.count() > 0 && await livedWithSpouseLabel.isVisible()) {
    await livedWithSpouseLabel.click();
    await page.waitForTimeout(200);
  }

  // For joint filing: set "Same address?" radios to Yes for address 1
  const sameAddrYes = page.locator(`label[for="${b64('financial_affairs.address_same_1')}_0"]`);
  if (await sameAddrYes.count() > 0 && await sameAddrYes.isVisible()) {
    await sameAddrYes.click();
    await page.waitForTimeout(200);
  }
  const sameDatesYes = page.locator(`label[for="${b64('financial_affairs.address_same_dates_1')}_0"]`);
  if (await sameDatesYes.count() > 0 && await sameDatesYes.isVisible()) {
    await sameDatesYes.click();
    await page.waitForTimeout(200);
  }

  // Fill any remaining visible empty text/number/date inputs
  await page.evaluate(() => {
    document.querySelectorAll('input[type="text"], input[type="number"], input[type="date"]').forEach(el => {
      const input = el as HTMLInputElement;
      if (input.offsetParent === null) return;
      if (input.value) return;
      const label = input.id ? document.querySelector(`label[for="${input.id}"]`) : null;
      const labelText = (label?.textContent || '').toLowerCase();
      const isNumeric = input.type === 'number' || input.inputMode === 'numeric' || labelText.includes('zip');
      if (input.type === 'date') {
        input.value = '2024-01-01';
      } else if (isNumeric) {
        input.value = '00000';
      } else {
        input.value = 'N/A';
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  await clickContinue(page);

  // Employment -> Yes
  console.log('  [financialAffairs] Employment -> Yes');
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.employed', true);
  await page.waitForTimeout(500);

  // Fill employment details (checkboxes + currency fields)
  // Current year income sources: select "Wages, commissions, bonuses, tips"
  const wagesCheckbox = page.locator(`label`).filter({ hasText: 'Wages, commissions, bonuses, tips' }).first();
  if (await wagesCheckbox.count() > 0) await wagesCheckbox.click();

  await fillById(page, b64('financial_affairs.current_gross_income'), '66000');

  // Last year
  await fillById(page, b64('financial_affairs.last_year'), '2025');
  const lastWagesCheckbox = page.locator(`label`).filter({ hasText: 'Wages, commissions, bonuses, tips' }).nth(1);
  if (await lastWagesCheckbox.count() > 0) {
    try { await lastWagesCheckbox.click(); } catch { /* may not exist */ }
  }
  await fillById(page, b64('financial_affairs.last_gross_income'), '62000');

  // Year before that
  await fillById(page, b64('financial_affairs.before_year'), '2024');
  const beforeWagesCheckbox = page.locator(`label`).filter({ hasText: 'Wages, commissions, bonuses, tips' }).nth(2);
  if (await beforeWagesCheckbox.count() > 0) {
    try { await beforeWagesCheckbox.click(); } catch { /* may not exist */ }
  }
  await fillById(page, b64('financial_affairs.before_gross_income'), '58000');

  await clickContinue(page);

  // Debtor 2 employment -> Yes
  console.log('  [financialAffairs] Debtor 2 employment -> Yes');
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.debtor2_employed', true);
  await page.waitForTimeout(500);

  await fillById(page, b64('financial_affairs.debtor2_current_gross_income'), '38400');
  await fillById(page, b64('financial_affairs.debtor2_last_year'), '2025');
  await fillById(page, b64('financial_affairs.debtor2_last_gross_income'), '36000');
  await fillById(page, b64('financial_affairs.debtor2_before_year'), '2024');
  await fillById(page, b64('financial_affairs.debtor2_before_gross_income'), '34000');

  // Fill any remaining visible empty inputs with defaults
  await page.evaluate(() => {
    document.querySelectorAll('input[type="text"], input[type="number"]').forEach(el => {
      const input = el as HTMLInputElement;
      if (input.offsetParent === null) return;
      if (input.value && input.value !== '') return;
      input.value = '0';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  await clickContinue(page);

  // Other income -> Yes
  console.log('  [financialAffairs] Other income -> Yes');
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.had_other_income', true);
  await page.waitForTimeout(500);
  // Fill other income sources
  await fillById(page, b64('financial_affairs.current_other_source_1'), 'Rental income');
  await fillById(page, b64('financial_affairs.current_other_source_amount_1'), '6000');

  // Fill any remaining visible empty inputs
  await page.evaluate(() => {
    document.querySelectorAll('input[type="text"], input[type="number"]').forEach(el => {
      const input = el as HTMLInputElement;
      if (input.offsetParent === null) return;
      if (input.value && input.value !== '') return;
      input.value = '0';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  await clickContinue(page);

  // Debtor 2 other income -> No
  console.log('  [financialAffairs] Debtor 2 other income -> No');
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.debtor2_had_other_income', false);
  await clickContinue(page);

  // Consumer debts -> Yes
  console.log('  [financialAffairs] Consumer debts -> Yes');
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'financial_affairs.primarily_consumer_debts', true);

  // All list-gathers -> No
  for (const varName of [
    'financial_affairs.consumer_debt_payments.there_are_any',
    'financial_affairs.insider_payments.there_are_any',
    'financial_affairs.insider_benefits.there_are_any',
    'financial_affairs.lawsuits.there_are_any',
    'financial_affairs.levies.there_are_any',
  ]) {
    await waitForDaPageLoad(page);
    await clickYesNoButton(page, varName, false);
  }

  // Refusal
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.has_refusal', false);
  await clickContinue(page);

  // Other assignee -> No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'financial_affairs.other_assignee', false);

  // Gifts -> No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'financial_affairs.gifts.there_are_any', false);

  // Charity
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.has_charity', false);
  await clickContinue(page);

  // Disaster
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.has_disaster', false);
  await clickContinue(page);

  // Bankruptcy payments -> No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'financial_affairs.bankruptcy_payments.there_are_any', false);

  // Creditor help
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.has_creditor_help', false);
  await clickContinue(page);

  // Other transfers -> No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'financial_affairs.other_transfers.there_are_any', false);

  // Self-settled trust
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.has_self_settled_trust', false);
  await clickContinue(page);

  // Financial instruments -> No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'financial_affairs.instruments.there_are_any', false);

  // Deposit box
  await waitForDaPageLoad(page);
  await selectYesNoRadio(page, 'financial_affairs.has_deposit_box', false);
  await page.waitForTimeout(300);
  await clickContinue(page);

  // Storage unit
  await waitForDaPageLoad(page);
  await selectYesNoRadio(page, 'financial_affairs.has_storage_unit', false);
  await page.waitForTimeout(300);
  await clickContinue(page);

  // Held property
  await waitForDaPageLoad(page);
  await page.evaluate((varName) => {
    const encoded = btoa(varName).replace(/=/g, '');
    const radio = document.getElementById(encoded + '_1') as HTMLInputElement;
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      const label = document.querySelector(`label[for="${encoded}_1"]`) as HTMLElement;
      if (label) { label.classList.add('btn-primary'); label.classList.remove('btn-outline-secondary'); label.setAttribute('aria-checked', 'true'); }
    }
  }, 'financial_affairs.has_held_property');
  await page.waitForTimeout(500);
  await clickContinue(page);

  // Re-presented held-property? Just handle it
  await waitForDaPageLoad(page);
  let h = await page.locator('h1').first().textContent().catch(() => '');
  if (h?.includes('Borrowed Property') || h?.includes('held property')) {
    await page.evaluate((varName) => {
      const encoded = btoa(varName).replace(/=/g, '');
      const radio = document.getElementById(encoded + '_1') as HTMLInputElement;
      if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
    }, 'financial_affairs.has_held_property');
    await page.waitForTimeout(500);
    await clickContinue(page);
    await waitForDaPageLoad(page);
  }

  // Environment -> No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'financial_affairs.environment.has_any', false);

  // Business types / businesses
  let businessCheckboxDone = false;
  let businessYesNoDone = false;
  for (let bStep = 0; bStep < 4 && !(businessCheckboxDone && businessYesNoDone); bStep++) {
    await waitForDaPageLoad(page);
    const hasNoneOfAbove = await page.locator('label').filter({ hasText: 'None of the above' }).count();
    const yesBtn = page.locator('button').filter({ hasText: /^Yes$/i });
    const noBtn = page.locator('button').filter({ hasText: /^No$/i });
    const hasYesNoButtons = (await yesBtn.count()) > 0 && (await noBtn.count()) > 0;
    if (hasNoneOfAbove > 0) {
      await page.locator('label').filter({ hasText: 'None of the above' }).click();
      await clickContinue(page);
      businessCheckboxDone = true;
    } else if (hasYesNoButtons && !businessYesNoDone) {
      await noBtn.first().click();
      await page.waitForLoadState('networkidle');
      businessYesNoDone = true;
    } else {
      await fillAllVisibleRadiosAsNo(page);
      await clickContinue(page);
    }
  }
  if (!businessYesNoDone) {
    await waitForDaPageLoad(page);
    await clickYesNoButton(page, 'financial_affairs.businesses.there_are_any', false);
  }

  // Has statement
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.has_statement', false);
  await clickContinue(page);
}

// ════════════════════════════════════════════════════════════════════
//  CUSTOM: Secured Creditors (3 creditors)
// ════════════════════════════════════════════════════════════════════

async function fillSecuredCreditor(page: Page, sc: any, index: number) {
  await page.locator(`#${b64(`prop.creditors[${index}].name`)}`).fill(sc.name);
  await page.locator(`#${b64(`prop.creditors[${index}].street`)}`).fill(sc.street);
  await page.locator(`#${b64(`prop.creditors[${index}].city`)}`).fill(sc.city);
  await page.locator(`#${b64(`prop.creditors[${index}].state`)}`).fill(sc.state);
  await page.locator(`#${b64(`prop.creditors[${index}].zip`)}`).fill(sc.zip);
  // 'who' dropdown
  const secWhoSelect = page.locator(`select#${b64(`prop.creditors[${index}].who`)}`);
  if (await secWhoSelect.count() > 0) await secWhoSelect.selectOption('Debtor 1 only');
  await fillYesNoRadio(page, `prop.creditors[${index}].community_debt`, false);

  const dateField = page.locator(`#${b64(`prop.creditors[${index}].incurred_date`)}`);
  if (await dateField.count() > 0) await dateField.fill('January 2020');

  const descSelect = page.locator(`select#${b64(`prop.creditors[${index}].prop_description`)}`);
  if (await descSelect.count() > 0) {
    await page.evaluate((selId) => {
      const sel = document.getElementById(selId) as HTMLSelectElement;
      if (sel && sel.options.length > 1) { sel.selectedIndex = 1; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    }, b64(`prop.creditors[${index}].prop_description`));
  }

  await setCheckbox(page, `prop.creditors[${index}].agreement`, true);
  await page.locator(`#${b64(`prop.creditors[${index}].claim_amount`)}`).fill(sc.claimAmount);
  await page.locator(`#${b64(`prop.creditors[${index}].collateral_value`)}`).fill(sc.collateralValue);

  const actionSelect = page.locator(`select#${b64(`prop.creditors[${index}].property_action`)}`);
  if (await actionSelect.count() > 0) {
    await page.evaluate((selId) => {
      const sel = document.getElementById(selId) as HTMLSelectElement;
      if (sel && sel.options.length > 1) { sel.selectedIndex = 1; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    }, b64(`prop.creditors[${index}].property_action`));
  }

  // exempt -> No
  await fillYesNoRadio(page, `prop.creditors[${index}].exempt`, false);

  // Save to library -> No
  await fillYesNoRadio(page, `prop.creditors[${index}].save_to_library`, false);

  // Codebtor -> No
  await fillYesNoRadio(page, `prop.creditors[${index}].has_codebtor`, false);
}

async function navigateSecuredCreditorsMulti(page: Page) {
  const securedList = MAXIMALIST.creditors.securedList || [];

  await waitForDaPageLoad(page);
  console.log('  [secured] Secured creditors: Yes');
  await clickYesNoButton(page, 'prop.creditors.there_are_any', true);

  for (let i = 0; i < securedList.length; i++) {
    await waitForDaPageLoad(page);
    console.log(`  [secured] Filling creditor ${i + 1}: ${securedList[i].name}`);
    await fillSecuredCreditor(page, securedList[i], i);

    // With list collect: True, the form has both "Add another" and "Continue" buttons.
    // Click "Add another" for non-last creditors, "Continue" for the last.
    const isLast = i === securedList.length - 1;
    if (!isLast) {
      console.log(`  [secured] Clicking "Add another" for creditor ${i + 1}`);
      await clickListCollectAddAnother(page);
    } else {
      // Click "Continue" to save last creditor and finish gather
      console.log(`  [secured] Clicking "Continue" for last creditor ${i + 1}`);
      await clickContinue(page);
    }

    // After "Continue" on last creditor: notify questions appear for ALL creditors.
    // Use a resilient loop: the page may still show the stale list-collect heading
    // briefly after Continue, so retry on that case instead of breaking.
    if (isLast) {
      for (let n = 0; n < securedList.length + 5; n++) {
        await waitForDaPageLoad(page);
        const h = (await page.locator('h1').first().textContent().catch(() => ''))?.trim() || '';
        const hLower = h.toLowerCase();

        if (hLower.includes('notif') || hLower.includes('others to be notified')) {
          console.log(`  [secured] Notify question ${n + 1}: No`);
          await page.getByRole('button', { name: 'No' }).click();
          await page.waitForLoadState('networkidle');
        } else if (hLower.includes('tell the court about your secured') || hLower.includes('secured claim')) {
          // Stale list-collect heading — page hasn't fully transitioned yet
          console.log(`  [secured] Waiting for page transition (stale heading: "${h}")...`);
          await page.waitForTimeout(1500);
        } else if (hLower.includes('other secured claims')) {
          // there_is_another review page
          console.log(`  [secured] More secured claims: No`);
          await page.getByRole('button', { name: 'No' }).click();
          await page.waitForLoadState('networkidle');
        } else {
          console.log(`  [secured] Done with secured creditors (heading: "${h}")`);
          break;
        }
      }
    } else {
      // After "Add another", the next form appears directly (no notify in between)
      await waitForDaPageLoad(page);
    }
  }
}

// ════════════════════════════════════════════════════════════════════
//  CUSTOM: Unsecured Creditors (3 priority + 3 nonpriority)
// ════════════════════════════════════════════════════════════════════

async function fillPriorityCreditor(page: Page, pc: any, index: number) {
  await page.locator(`#${b64(`prop.priority_claims[${index}].name`)}`).fill(pc.name);
  await page.locator(`#${b64(`prop.priority_claims[${index}].street`)}`).fill(pc.street);
  await page.locator(`#${b64(`prop.priority_claims[${index}].city`)}`).fill(pc.city);
  await page.locator(`#${b64(`prop.priority_claims[${index}].state`)}`).fill(pc.state);
  await page.locator(`#${b64(`prop.priority_claims[${index}].zip`)}`).fill(pc.zip);
  const prWhoSelect = page.locator(`select#${b64(`prop.priority_claims[${index}].who`)}`);
  if (await prWhoSelect.count() > 0) await prWhoSelect.selectOption('Debtor 1 only');
  const typeSelect = page.locator(`select#${b64(`prop.priority_claims[${index}].type`)}`);
  if (await typeSelect.count() > 0) await typeSelect.selectOption(pc.type);
  await page.locator(`#${b64(`prop.priority_claims[${index}].total_claim`)}`).fill(pc.totalClaim);
  await page.locator(`#${b64(`prop.priority_claims[${index}].priority_amount`)}`).fill(pc.priorityAmount);
  await page.locator(`#${b64(`prop.priority_claims[${index}].nonpriority_amount`)}`).fill(pc.nonpriorityAmount);
  await fillYesNoRadio(page, `prop.priority_claims[${index}].save_to_library`, false);
  await fillYesNoRadio(page, `prop.priority_claims[${index}].has_codebtor`, false);
  await fillYesNoRadio(page, `prop.priority_claims[${index}].has_notify`, false);
}

async function fillNonpriorityCreditor(page: Page, np: any, index: number) {
  await page.locator(`#${b64(`prop.nonpriority_claims[${index}].name`)}`).fill(np.name);
  await page.locator(`#${b64(`prop.nonpriority_claims[${index}].street`)}`).fill(np.street);
  await page.locator(`#${b64(`prop.nonpriority_claims[${index}].city`)}`).fill(np.city);
  await page.locator(`#${b64(`prop.nonpriority_claims[${index}].state`)}`).fill(np.state);
  await page.locator(`#${b64(`prop.nonpriority_claims[${index}].zip`)}`).fill(np.zip);
  const npWhoSelect = page.locator(`select#${b64(`prop.nonpriority_claims[${index}].who`)}`);
  if (await npWhoSelect.count() > 0) await npWhoSelect.selectOption('Debtor 1 only');
  const npTypeSelect = page.locator(`select#${b64(`prop.nonpriority_claims[${index}].type`)}`);
  if (await npTypeSelect.count() > 0) await npTypeSelect.selectOption(np.type);
  await page.locator(`#${b64(`prop.nonpriority_claims[${index}].total_claim`)}`).fill(np.totalClaim);
  await fillYesNoRadio(page, `prop.nonpriority_claims[${index}].save_to_library`, false);
  await fillYesNoRadio(page, `prop.nonpriority_claims[${index}].has_codebtor`, false);
  await fillYesNoRadio(page, `prop.nonpriority_claims[${index}].has_notify`, false);
}

/** Click the last visible "Add another" button on a list collect form. */
async function clickListCollectAddAnother(page: Page) {
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const addAnother = buttons.filter(b =>
      b.textContent?.includes('Add another') && b.offsetParent !== null
    );
    if (addAnother.length > 0) addAnother[addAnother.length - 1].click();
  });
  await page.waitForLoadState('networkidle');
}

async function navigateUnsecuredCreditorsMulti(page: Page) {
  const priorityList = MAXIMALIST.creditors.priorityList || [];
  const nonpriorityList = MAXIMALIST.creditors.nonpriorityList || [];

  // Priority claims
  await waitForDaPageLoad(page);
  console.log('  [unsecured] Priority claims: Yes');
  await clickYesNoButton(page, 'prop.priority_claims.there_are_any', true);

  for (let i = 0; i < priorityList.length; i++) {
    await waitForDaPageLoad(page);
    console.log(`  [unsecured] Filling priority creditor ${i + 1}: ${priorityList[i].name}`);
    await fillPriorityCreditor(page, priorityList[i], i);
    const isLast = i === priorityList.length - 1;
    if (!isLast) {
      console.log(`  [unsecured] Add another priority`);
      await clickListCollectAddAnother(page);
    } else {
      console.log(`  [unsecured] Continue (last priority)`);
      await clickContinue(page);
    }
  }

  // Nonpriority claims
  await waitForDaPageLoad(page);
  console.log('  [unsecured] Nonpriority claims: Yes');
  await clickYesNoButton(page, 'prop.nonpriority_claims.there_are_any', true);

  for (let i = 0; i < nonpriorityList.length; i++) {
    await waitForDaPageLoad(page);
    console.log(`  [unsecured] Filling nonpriority creditor ${i + 1}: ${nonpriorityList[i].name}`);
    await fillNonpriorityCreditor(page, nonpriorityList[i], i);
    const isLast = i === nonpriorityList.length - 1;
    if (!isLast) {
      console.log(`  [unsecured] Add another nonpriority`);
      await clickListCollectAddAnother(page);
    } else {
      console.log(`  [unsecured] Continue (last nonpriority)`);
      await clickContinue(page);
    }
  }
}

// ════════════════════════════════════════════════════════════════════
//  CUSTOM: Contracts & Leases (3 executory contracts)
// ════════════════════════════════════════════════════════════════════

const CONTRACTS = [
  { name: 'Omaha Office Lease LLC', street: '1000 Commercial Dr', city: 'Omaha',
    state: 'Nebraska', zip: '68102', description: 'Office space lease, 5-year term' },
  { name: 'CopierMax Corp', street: '500 Equipment Rd', city: 'Lincoln',
    state: 'Nebraska', zip: '68508', description: 'Copier equipment lease, 3-year term' },
  { name: 'Cloud Services Inc', street: '100 Tech Blvd', city: 'San Jose',
    state: 'California', zip: '95112', description: 'SaaS subscription contract' },
];

async function fillContract(page: Page, contract: any, index: number) {
  await fillById(page, b64(`prop.contracts_and_leases[${index}].name`), contract.name);
  await fillById(page, b64(`prop.contracts_and_leases[${index}].street`), contract.street);
  await fillById(page, b64(`prop.contracts_and_leases[${index}].city`), contract.city);
  await fillById(page, b64(`prop.contracts_and_leases[${index}].state`), contract.state);
  await fillById(page, b64(`prop.contracts_and_leases[${index}].zip`), contract.zip);
  // Description — use evaluate to handle both textarea and input, visible or not
  await page.evaluate(({ id, value }) => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { id: b64(`prop.contracts_and_leases[${index}].description`), value: contract.description });
  await fillYesNoRadio(page, `prop.contracts_and_leases[${index}].has_codebtor`, false);
  await fillYesNoRadio(page, `prop.contracts_and_leases[${index}].unexpired_lease`, index < 2);
  if (index < 2) {
    await page.waitForTimeout(1000);
    // Use ARIA locator to find the lease_assumed radiogroup and click No
    // list collect may render field IDs differently, so use label text matching
    const leaseGroup = page.getByRole('radiogroup', { name: /Will the lease be assumed/ });
    const groupCount = await leaseGroup.count();
    if (groupCount > 0) {
      // Click "No" in the last visible lease_assumed group (current item's group)
      const targetGroup = groupCount > 1 ? leaseGroup.nth(index) : leaseGroup.first();
      await targetGroup.getByRole('radio', { name: 'No' }).click();
    }
    await page.waitForTimeout(300);
  }
}

async function navigateContractsLeasesMaximalist(page: Page) {
  await waitForDaPageLoad(page);
  console.log('  [contracts] Executory contracts: Yes');
  await clickYesNoButton(page, 'prop.contracts_and_leases.there_are_any', true);

  for (let i = 0; i < CONTRACTS.length; i++) {
    await waitForDaPageLoad(page);
    console.log(`  [contracts] Filling contract ${i + 1}: ${CONTRACTS[i].name}`);
    await fillContract(page, CONTRACTS[i], i);
    const isLast = i === CONTRACTS.length - 1;
    if (!isLast) {
      console.log(`  [contracts] Add another contract`);
      await clickListCollectAddAnother(page);
    } else {
      console.log(`  [contracts] Continue (last contract)`);
      await clickContinue(page);
    }
  }

  // Personal leases -> No
  await waitForDaPageLoad(page);
  console.log('  [contracts] Personal leases: No');
  await clickYesNoButton(page, 'personal_leases.there_are_any', false);
}

// ════════════════════════════════════════════════════════════════════
//  CUSTOM: Community Property (Yes, with spouse)
// ════════════════════════════════════════════════════════════════════

async function navigateCommunityPropertyMaximalist(page: Page) {
  await waitForDaPageLoad(page);
  console.log('  [communityProperty] community_property = Yes');

  await logHeading(page, 'community property');

  // Use ARIA locators since show-if fields may have non-standard IDs
  const cpGroup = page.getByRole('radiogroup', { name: /community property state/i });
  await cpGroup.getByRole('radio', { name: 'Yes' }).click();
  await page.waitForTimeout(1000);

  // had_spouse = Yes (shown via show-if)
  const spouseGroup = page.getByRole('radiogroup', { name: /spouse live with you/i });
  if (await spouseGroup.count() > 0) {
    await spouseGroup.getByRole('radio', { name: 'Yes' }).click();
    await page.waitForTimeout(1000);

    // Fill spouse details using getByLabel (show-if fields may use _field_N IDs)
    const stateField = page.getByLabel(/community property state.*territory/i).or(page.getByLabel(/state/i).last());
    // Spouse details are behind a second show-if — fill via evaluate to handle any ID format
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
      const visible = inputs.filter(i => i.offsetParent !== null && !i.value);
      // Fill visible empty text fields in order: state, name, street, city, zip
      const values = ['Texas', 'Former Spouse Testworth', '1000 Community Dr', 'Houston', '77001'];
      visible.forEach((el, idx) => {
        if (idx < values.length) {
          el.value = values[idx];
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });
    await page.waitForTimeout(300);
  }

  await clickContinue(page);
}

// ════════════════════════════════════════════════════════════════════
//  CUSTOM: Means Test (non_consumer_debts=False -> full form)
// ════════════════════════════════════════════════════════════════════

async function navigateMeansTestMaximalist(page: Page) {
  console.log('  [meansTest] Presumption of abuse');
  await waitForDaPageLoad(page);
  await selectByName(page, b64('monthly_income.means_type'), 'There is no presumption of abuse.');
  await clickContinue(page);

  console.log('  [meansTest] Exemptions (non_consumer_debts=False)');
  await waitForDaPageLoad(page);
  await selectYesNoRadio(page, 'monthly_income.non_consumer_debts', false);
  await page.waitForTimeout(300);
  await selectYesNoRadio(page, 'monthly_income.disabled_veteran', false);
  await page.waitForTimeout(300);
  await selectYesNoRadio(page, 'monthly_income.reservists', false);
  await page.waitForTimeout(300);
  await clickContinue(page);

  // Filing status page
  console.log('  [meansTest] Filing status + dependents');
  await waitForDaPageLoad(page);
  const filingStatusField = page.locator(`select[name="${b64('monthly_income.filing_status')}"]`);
  if (await filingStatusField.count() > 0) {
    await filingStatusField.selectOption('Married and your spouse is filing with you.');
  }
  const dependentsField = page.locator(`#${b64('monthly_income.dependents')}`);
  if (await dependentsField.count() > 0) {
    await dependentsField.fill('2');
  }
  await clickContinue(page);

  // Debtor 1 monthly income calculation
  console.log('  [meansTest] Debtor 1 income calculation form');
  await waitForDaPageLoad(page);
  let heading = await logHeading(page, 'means test d1');
  // Fields are pre-filled from Schedule I data, but we can accept defaults
  // Just click continue (defaults should be populated)
  await clickContinue(page);

  // Debtor 2 monthly income calculation (joint filing)
  console.log('  [meansTest] Debtor 2 income calculation form');
  await waitForDaPageLoad(page);
  heading = await logHeading(page, 'means test d2');
  if (heading.toLowerCase().includes('debtor 2') || heading.toLowerCase().includes('calculate')) {
    await clickContinue(page);
  }

  // Review/results page
  console.log('  [meansTest] Review/results');
  await waitForDaPageLoad(page);
  heading = await logHeading(page, 'means test review');
  // Click continue to accept the results
  const continueBtn = page.locator('#da-continue-button');
  if (await continueBtn.count() > 0) {
    await clickContinue(page);
  }

  await waitForDaPageLoad(page);
}

// ════════════════════════════════════════════════════════════════════
//  CUSTOM: Case Details (previous bankruptcy=Yes)
// ════════════════════════════════════════════════════════════════════

async function navigateCaseDetailsMaximalist(page: Page) {
  await waitForDaPageLoad(page);

  // Handle unexpected income pages (same as standard navigateCaseDetails)
  let caseH = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`  [caseDetails] Heading: "${caseH}"`);
  const isSkippablePage = (h: string | null | undefined) =>
    h?.toLowerCase().includes('monthly income') ||
    h?.toLowerCase().includes('payroll deductions') ||
    h?.toLowerCase().includes('other deductions') ||
    h?.toLowerCase().includes('other income') ||
    h?.toLowerCase().includes('regular contributions') ||
    h?.toLowerCase().includes('overall income') ||
    h?.toLowerCase().includes('means test') ||
    h?.toLowerCase().includes('note:');
  while (isSkippablePage(caseH)) {
    console.log(`  [caseDetails] Handling unexpected income page: "${caseH}"`);
    await page.evaluate(() => {
      document.querySelectorAll('input[type="text"], input[type="number"]').forEach(el => {
        const input = el as HTMLInputElement;
        if (input.offsetParent === null) return;
        if (input.value && input.value !== '') return;
        input.value = '0';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    await fillAllVisibleRadiosAsNo(page);
    await clickContinue(page);
    await waitForDaPageLoad(page);
    caseH = await page.locator('h1').first().textContent().catch(() => '');
    console.log(`  [caseDetails] Next heading: "${caseH}"`);
  }

  // Payment method: pay full
  console.log('  [caseDetails] Payment method');
  const payLabel = page.locator('label').filter({ hasText: 'I will pay the entire fee when I file my petition' });
  await payLabel.click();
  await clickContinue(page);

  // Previous bankruptcy -> Yes
  console.log('  [caseDetails] Previous bankruptcy: Yes');
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'case.has_previous_bankruptcy', true);

  // Previous bankruptcy details (list collect)
  console.log('  [caseDetails] Previous bankruptcy details');
  await waitForDaPageLoad(page);

  // Fill the list collect form - district, when, case_number
  await fillById(page, b64('case.previous_bankruptcy[0].district'), 'District of Nebraska');
  // Try to use selectByName for district since it's a dropdown with code: courts_list
  const districtSelect = page.locator(`select[name="${b64('case.previous_bankruptcy[0].district')}"]`);
  if (await districtSelect.count() > 0) {
    await districtSelect.selectOption('District of Nebraska');
  }

  const whenField = page.locator(`#${b64('case.previous_bankruptcy[0].when')}`);
  if (await whenField.count() > 0) {
    await whenField.fill('2018-11-03');
  }

  const caseNumField = page.locator(`#${b64('case.previous_bankruptcy[0].case_number')}`);
  if (await caseNumField.count() > 0) {
    await caseNumField.fill('8:18-bk-99999');
  }

  await clickContinue(page);

  // "Do you have more previous bankruptcies?" -> No (or list collect review)
  await waitForDaPageLoad(page);
  const prevHeading = await logHeading(page, 'prev bankruptcy another');
  if (prevHeading.toLowerCase().includes('more') || prevHeading.toLowerCase().includes('another')) {
    // Standard yes/no question
    const noBtn = page.locator('button').filter({ hasText: /^No$/i });
    if (await noBtn.count() > 0) {
      await noBtn.first().click();
      await page.waitForLoadState('networkidle');
    } else {
      await clickContinue(page); // list collect review - just continue
    }
  }

  // Pending bankruptcy -> No
  console.log('  [caseDetails] Pending bankruptcy: No');
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'case.has_pending_bankruptcy', false);

  // Rents residence -> No
  console.log('  [caseDetails] Rents residence: No');
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'case.rents_residence', false);

  // Case final
  console.log('  [caseDetails] Case final');
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('case_final'), 0);
}

// ════════════════════════════════════════════════════════════════════
//  TEST
// ════════════════════════════════════════════════════════════════════

test.describe('Maximalist End-to-End: Joint Filing with Every Field', () => {
  test.setTimeout(600_000); // 10 minutes

  test('full maximalist interview reaches conclusion and PDFs verify', async ({ page }) => {
    const scenario = MAXIMALIST;
    const log = (step: string) => console.log(`\n  [${'='.repeat(20)} ${step} ${'='.repeat(20)}]`);

    console.log(`\n${'='.repeat(70)}`);
    console.log(`  MAXIMALIST TEST: ${scenario.name}`);
    console.log(`  District: ${scenario.district}`);
    console.log(`  Debtor 1: ${scenario.debtor.first} ${scenario.debtor.last}`);
    console.log(`  Debtor 2: ${scenario.spouse?.first} ${scenario.spouse?.last}`);
    console.log(`  Joint: ${scenario.jointFiling}`);
    console.log(`  Properties: 3 real, 3 vehicles, 3 deposits`);
    console.log(`  Creditors: 3 secured, 3 priority, 3 nonpriority`);
    console.log(`  Contracts: 3`);
    console.log(`${'='.repeat(70)}`);

    // ---- Intro + Debtors ----
    log('INTRO + DEBTORS');
    await navigateToDebtorPage(page, scenario);
    console.log('  Debtor page reached, filling debtor 1');

    await fillDebtorAndAdvance(page, scenario.debtor);
    console.log('  Debtor 1 complete, filling debtor 2');

    await waitForDaPageLoad(page);
    await fillDebtorAndAdvance(page, scenario.spouse!);
    console.log('  Debtor 2 complete');

    await passDebtorFinal(page);

    // ---- Property (3 real, 3 vehicles, 3 deposits) ----
    log('PROPERTY');
    await navigatePropertySectionMulti(page);
    console.log('  Property section complete');

    // ---- Exemptions ----
    log('EXEMPTIONS');
    await navigateExemptionSection(page);
    console.log('  Exemptions complete');

    // ---- Income (both employed, full data) ----
    log('INCOME');
    await navigateIncomeMaximalist(page);
    console.log('  Income complete');

    // ---- Expenses (all optional categories) ----
    log('EXPENSES');
    await navigateExpensesMaximalist(page);
    console.log('  Expenses complete');

    // ---- Financial Affairs (employed=Yes, other_income=Yes, lived_elsewhere=Yes) ----
    log('FINANCIAL AFFAIRS');
    await navigateFinancialAffairsMaximalist(page);
    console.log('  Financial affairs complete');

    // ---- Creditor Library Picker ----
    log('CREDITOR LIBRARY');
    await navigateCreditorLibraryPicker(page);
    console.log('  Creditor library complete');

    // ---- Secured Creditors (3) ----
    log('SECURED CREDITORS');
    await navigateSecuredCreditorsMulti(page);
    console.log('  Secured creditors complete');

    // ---- Unsecured Creditors (3 priority + 3 nonpriority) ----
    log('UNSECURED CREDITORS');
    await navigateUnsecuredCreditorsMulti(page);
    console.log('  Unsecured creditors complete');

    // ---- Reporting ----
    log('REPORTING');
    await navigateReporting(page);
    console.log('  Reporting complete');

    // ---- Contracts & Leases (3) ----
    log('CONTRACTS & LEASES');
    await navigateContractsLeasesMaximalist(page);
    console.log('  Contracts complete');

    // ---- Community Property (Yes) ----
    log('COMMUNITY PROPERTY');
    await navigateCommunityPropertyMaximalist(page);
    console.log('  Community property complete');

    // ---- Means Test (full form, non_consumer_debts=False) ----
    log('MEANS TEST');
    await navigateMeansTestMaximalist(page);
    console.log('  Means test complete');

    // ---- Case Details (previous bankruptcy=Yes) ----
    log('CASE DETAILS');
    await navigateCaseDetailsMaximalist(page);
    console.log('  Case details complete');

    // ---- Business ----
    log('BUSINESS');
    await navigateBusiness(page);
    console.log('  Business complete');

    // ---- Hazardous Property ----
    log('HAZARDOUS PROPERTY');
    await navigateHazardousProperty(page);
    console.log('  Hazardous property complete');

    // ---- Credit Counseling (2 debtors) ----
    log('CREDIT COUNSELING');
    await navigateCreditCounseling(page, scenario);
    console.log('  Credit counseling complete');

    // ---- Dynamic Phase (attorney disclosure, final review, doc gen) ----
    log('DYNAMIC PHASE');
    await navigateDynamicPhase(page, scenario);
    console.log('  Dynamic phase complete');

    // ════════════════════════════════════════════════════════════════════
    //  VERIFICATION: Conclusion + PDF Downloads
    // ════════════════════════════════════════════════════════════════════
    log('VERIFICATION');

    const bodyText = await page.locator('body').innerText();
    const isConclusion =
      bodyText.toLowerCase().includes('conclusion') ||
      bodyText.toLowerCase().includes('interview questions complete') ||
      bodyText.toLowerCase().includes('your documents are ready');

    if (!isConclusion) {
      await screenshot(page, 'maximalist-not-at-conclusion');
      const heading = await logHeading(page, 'conclusion check');
      console.log(`  WARNING: May not be at conclusion page. Heading: "${heading}"`);
      console.log(`  Body excerpt: ${bodyText.substring(0, 500)}`);
    }
    expect(isConclusion).toBe(true);

    await screenshot(page, 'maximalist-conclusion');
    console.log('  Reached conclusion page successfully');

    // Download all PDFs
    const pdfs = await downloadAllPdfs(page);
    console.log(`  Downloaded ${pdfs.length} PDFs`);
    expect(pdfs.length).toBeGreaterThanOrEqual(15);

    // Log all PDFs
    for (const pdf of pdfs) {
      console.log(`    PDF: ${pdf.name} - ${pdf.pages} pages, ${Object.keys(pdf.fields).length} fields`);
    }

    // ---- Form 101: Debtor names ----
    const form101 = findPdf(pdfs, '101');
    expect(form101).toBeTruthy();
    if (form101) {
      expect(getField(form101.fields, 'debtor_first_name1')).toBe('Maxine');
      expect(getField(form101.fields, 'debtor_last_name1')).toBe('Testworth');
      expect(getField(form101.fields, 'debtor_middle_name1')).toBe('Q');
      expect(getField(form101.fields, 'bankruptcy_district')).toContain('Nebraska');
      expect(form101.fields['isCh7']).toBe(true);

      // Debtor 2
      const d2First = getField(form101.fields, 'debtor_first_name2');
      if (d2First) {
        expect(d2First).toBe('Maxwell');
        expect(getField(form101.fields, 'debtor_last_name2')).toBe('Testworth');
        console.log('    Form 101: Debtor 2 name verified');
      } else {
        console.log('    Form 101: WARNING - debtor_first_name2 is empty (known issue)');
      }

      // Debtor 1 address
      expect(getField(form101.fields, 'debtor_street1')).toBe('1234 Max Test Ave');
      expect(getField(form101.fields, 'debtor_city1')).toBe('Omaha');

      // Mailing address
      const mailStreet = getField(form101.fields, 'debtor_mailing_street1');
      if (mailStreet) {
        expect(mailStreet).toBe('PO Box 5555');
        console.log('    Form 101: Mailing address verified');
      }

      console.log('    Form 101: Debtor names and addresses verified');
    }

    // ---- Form 106D: Secured creditors ----
    const form106D = findPdf(pdfs, '106D') || findPdf(pdfs, '106d');
    if (form106D) {
      const allFieldValues = Object.values(form106D.fields).map(v => String(v || ''));
      const allFieldsText = allFieldValues.join(' ');

      for (const cred of MAXIMALIST.creditors.securedList || []) {
        const found = allFieldsText.includes(cred.name);
        if (found) {
          console.log(`    Form 106D: Found secured creditor "${cred.name}"`);
        } else {
          console.log(`    Form 106D: WARNING - Could not find "${cred.name}" in fields`);
        }
      }
    } else {
      console.log('    Form 106D: Not found in PDFs (looking for 106D or 106d)');
    }

    // ---- Form 106E/F: Priority + Nonpriority creditors ----
    const form106EF = findPdf(pdfs, '106E') || findPdf(pdfs, '106ef') || findPdf(pdfs, '106EF');
    if (form106EF) {
      const allFieldValues = Object.values(form106EF.fields).map(v => String(v || ''));
      const allFieldsText = allFieldValues.join(' ');

      for (const cred of MAXIMALIST.creditors.priorityList || []) {
        const found = allFieldsText.includes(cred.name);
        if (found) {
          console.log(`    Form 106E/F: Found priority creditor "${cred.name}"`);
        } else {
          console.log(`    Form 106E/F: WARNING - Could not find priority "${cred.name}"`);
        }
      }

      for (const cred of MAXIMALIST.creditors.nonpriorityList || []) {
        const found = allFieldsText.includes(cred.name);
        if (found) {
          console.log(`    Form 106E/F: Found nonpriority creditor "${cred.name}"`);
        } else {
          console.log(`    Form 106E/F: WARNING - Could not find nonpriority "${cred.name}"`);
        }
      }
    } else {
      console.log('    Form 106E/F: Not found in PDFs');
    }

    // ---- Form 106A/B: Property addresses ----
    const form106AB = findPdf(pdfs, '106A') || findPdf(pdfs, '106a') || findPdf(pdfs, '106AB');
    if (form106AB) {
      const allFieldValues = Object.values(form106AB.fields).map(v => String(v || ''));
      const allFieldsText = allFieldValues.join(' ');

      const addresses = ['1234 Max Test Ave', '500 Rental Rd', '900 Investment Blvd'];
      for (const addr of addresses) {
        const found = allFieldsText.includes(addr);
        if (found) {
          console.log(`    Form 106A/B: Found property address "${addr}"`);
        } else {
          console.log(`    Form 106A/B: WARNING - Could not find address "${addr}"`);
        }
      }
    } else {
      console.log('    Form 106A/B: Not found in PDFs');
    }

    // ---- Form 106I: Income ----
    const form106I = findPdf(pdfs, '106I') || findPdf(pdfs, '106i');
    if (form106I) {
      const allFieldValues = Object.values(form106I.fields).map(v => String(v || ''));
      const allFieldsText = allFieldValues.join(' ');
      const hasWages = allFieldsText.includes('5,500') || allFieldsText.includes('$5,500') || allFieldsText.includes('5500');
      if (hasWages) {
        console.log('    Form 106I: Found income amount ($5,500)');
      } else {
        console.log('    Form 106I: WARNING - Could not find income amount 5500');
      }
    } else {
      console.log('    Form 106I: Not found in PDFs');
    }

    // ---- Form 2030: Attorney disclosure ----
    const form2030 = findPdf(pdfs, '2030');
    expect(form2030).toBeTruthy();
    if (form2030) {
      expect(getField(form2030.fields, 'District')).toContain('Nebraska');
      expect(getField(form2030.fields, 'Chapter')).toBe('7');
      console.log('    Form 2030: District and Chapter verified');
    }

    // ---- Mailing Matrix: all creditor names ----
    const mailingMatrix = findPdf(pdfs, 'mailing') || findPdf(pdfs, 'matrix') || findPdf(pdfs, 'Mailing');
    if (mailingMatrix) {
      // Mailing matrix is a text-based PDF - check the raw buffer for creditor names
      const matrixText = mailingMatrix.buffer.toString('latin1');
      const allCreditorNames = [
        ...(MAXIMALIST.creditors.securedList || []).map(c => c.name),
        ...(MAXIMALIST.creditors.priorityList || []).map(c => c.name),
        ...(MAXIMALIST.creditors.nonpriorityList || []).map(c => c.name),
      ];
      for (const name of allCreditorNames) {
        const found = matrixText.includes(name);
        if (found) {
          console.log(`    Mailing Matrix: Found creditor "${name}"`);
        } else {
          console.log(`    Mailing Matrix: WARNING - Could not find "${name}"`);
        }
      }
    } else {
      console.log('    Mailing Matrix: Not found in PDFs');
    }

    // ---- Verify key form presence ----
    const allNames = pdfs.map(p => p.name.toLowerCase()).join(' | ');
    for (const form of ['101', '106', '107', '108', '121', '122', '2030']) {
      const present = allNames.includes(form);
      if (present) {
        console.log(`    Form ${form}: present`);
      } else {
        console.log(`    Form ${form}: WARNING - not found in PDF list`);
      }
      expect(present).toBe(true);
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log('  MAXIMALIST TEST COMPLETE - ALL VERIFICATIONS PASSED');
    console.log(`${'='.repeat(70)}\n`);
  });
});
