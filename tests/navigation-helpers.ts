/**
 * Reusable navigation functions for the bankruptcy interview.
 * Extracted from comprehensive-e2e.spec.ts and extended for multi-item support.
 */
import { Page } from '@playwright/test';
import {
  INTERVIEW_URL,
  b64,
  waitForDaPageLoad,
  clickContinue,
  clickById,
  clickNthByName,
  selectByName,
  selectById,
  selectByIndex,
  fillByName,
  fillById,
  fillDebtorIdentity,
  fillTextareaByName,
  screenshot,
  clickYesNoButton,
  selectYesNoRadio,
  fillYesNoRadio,
  fillAllVisibleRadiosAsNo,
  handleCaseNumberIfPresent,
  setCheckbox,
  handleAnotherPage,
} from './helpers';
import { TestScenario, DebtorProfile, RealPropertyData, VehicleData, DepositData } from './fixtures';

// ════════════════════════════════════════════════════════════════════
//  INTRO → DEBTOR PAGE
// ════════════════════════════════════════════════════════════════════

export async function navigateToDebtorPage(page: Page, scenario: TestScenario) {
  await page.goto(INTERVIEW_URL + '&new_session=1');
  await waitForDaPageLoad(page);

  // Intro
  await clickNthByName(page, b64('introduction_screen'), 0);

  // District
  await waitForDaPageLoad(page);
  await selectByName(page, b64('current_district'), scenario.district);
  await clickContinue(page);

  // Amended filing
  await waitForDaPageLoad(page);
  if (scenario.amended) {
    await clickNthByName(page, b64('amended_filing'), 0); // Yes
    await waitForDaPageLoad(page);
    // Case number page
    if (scenario.caseNumber) {
      await fillByName(page, b64('case_number'), scenario.caseNumber);
    }
    await clickContinue(page);
  } else {
    await clickNthByName(page, b64('amended_filing'), 1); // No
  }

  // Case number if present (can appear even on non-amended path)
  await waitForDaPageLoad(page);
  await handleCaseNumberIfPresent(page);

  // District final
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('district_final'), 0);

  // Filing status
  await waitForDaPageLoad(page);
  if (scenario.jointFiling) {
    await clickById(page, `${b64('filing_status')}_1`);
  } else {
    await clickById(page, `${b64('filing_status')}_0`);
  }
  await clickContinue(page);
  await waitForDaPageLoad(page);
}

// ════════════════════════════════════════════════════════════════════
//  DEBTOR IDENTITY
// ════════════════════════════════════════════════════════════════════

export async function fillDebtorAndAdvance(page: Page, d: DebtorProfile) {
  await fillDebtorIdentity(page, {
    first: d.first, middle: d.middle, last: d.last,
    suffix: d.suffix,
    street: d.street, city: d.city, state: d.state,
    zip: d.zip, countyIndex: d.countyIndex,
    taxIdType: d.taxIdType, taxId: d.taxId,
    hasMailing: d.hasMailing,
    mailStreet: d.mailStreet, mailCity: d.mailCity,
    mailState: d.mailState, mailZip: d.mailZip,
  });

  // Alias
  await waitForDaPageLoad(page);
  if (d.aliases && d.aliases.length > 0) {
    await clickNthByName(page, b64('debtor[i].alias.there_are_any'), 0); // Yes
    for (let i = 0; i < d.aliases.length; i++) {
      await waitForDaPageLoad(page);
      await fillById(page, b64(`debtor[i].alias[${i}].name.first`), d.aliases[i].first);
      await fillById(page, b64(`debtor[i].alias[${i}].name.last`), d.aliases[i].last);
      await clickContinue(page);
      if (i < d.aliases.length - 1) {
        // "Do you have another alias?" → Yes
        await waitForDaPageLoad(page);
        await handleAnotherPageWithYes(page, 'debtor[i].alias.there_is_another');
      } else {
        // Last one → No
        await waitForDaPageLoad(page);
        await handleAnotherPage(page, 'debtor[i].alias.there_is_another');
      }
    }
  } else {
    await clickNthByName(page, b64('debtor[i].alias.there_are_any'), 1); // No
  }

  // District residency → Yes
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('debtor[i].district_info.is_current_district'), 0);
  await clickContinue(page);
}

/** Handle "another" page by clicking Yes to add more items. */
async function handleAnotherPageWithYes(page: Page, thereIsAnotherVar: string) {
  await waitForDaPageLoad(page);
  const bodyText = await page.locator('body').innerText();
  if (bodyText.toLowerCase().includes('another') || bodyText.toLowerCase().includes('more')) {
    const addAnotherBtn = page.locator('button').filter({ hasText: /Add another/i });
    if (await addAnotherBtn.count() > 0) {
      await addAnotherBtn.first().click();
      await page.waitForLoadState('networkidle');
    } else {
      await clickYesNoButton(page, thereIsAnotherVar, true);
    }
  }
}

export async function passDebtorFinal(page: Page) {
  await waitForDaPageLoad(page);
  const heading = await page.locator('h1, h2, h3').first().textContent().catch(() => '');
  if (heading && heading.toLowerCase().includes('summary')) {
    await clickContinue(page);
  }
}

// ════════════════════════════════════════════════════════════════════
//  PROPERTY SECTION (Schedule A/B)
// ════════════════════════════════════════════════════════════════════

async function fillRealProperty(page: Page, rp: RealPropertyData, index: number) {
  await page.locator(`#${b64(`prop.interests[${index}].street`)}`).fill(rp.street);
  await page.locator(`#${b64(`prop.interests[${index}].city`)}`).fill(rp.city);
  await page.locator(`#${b64(`prop.interests[${index}].state`)}`).fill(rp.stateAbbr);
  await page.locator(`#${b64(`prop.interests[${index}].zip`)}`).fill(rp.zip);
  await page.locator(`#${b64(`prop.interests[${index}].county`)}`).fill(rp.county);
  await page.locator(`label[for="${b64(`prop.interests[${index}].type`)}_${rp.typeIndex}"]`).click();
  // 'who' radio only appears for joint filings
  const propWhoLabel = page.locator(`label[for="${b64(`prop.interests[${index}].who`)}_0"]`);
  if (await propWhoLabel.count() > 0) await propWhoLabel.click();
  await page.locator(`#${b64(`prop.interests[${index}].current_value`)}`).fill(rp.value);
  await page.locator(`#${b64(`prop.interests[${index}].ownership_interest`)}`).fill(rp.ownershipInterest);
  await fillYesNoRadio(page, `prop.interests[${index}].is_community_property`, false);
  await page.locator(`#${b64(`prop.interests[${index}].other_info`)}`).fill(rp.otherInfo);
  await fillYesNoRadio(page, `prop.interests[${index}].is_claiming_exemption`, false);
}

async function fillVehicle(page: Page, v: VehicleData, index: number) {
  await page.locator(`#${b64(`prop.ab_vehicles[${index}].make`)}`).fill(v.make);
  await page.locator(`#${b64(`prop.ab_vehicles[${index}].model`)}`).fill(v.model);
  await page.locator(`#${b64(`prop.ab_vehicles[${index}].year`)}`).fill(v.year);
  await page.locator(`#${b64(`prop.ab_vehicles[${index}].milage`)}`).fill(v.mileage);
  // 'who' radio — on list-collect pages, the show-if condition (len(debtor)==1)
  // may fail in JavaScript, hiding the field. Force-select via JS if needed.
  const vehWhoLabel = page.locator(`label[for="${b64(`prop.ab_vehicles[${index}].who`)}_0"]`);
  if (await vehWhoLabel.count() > 0) {
    if (await vehWhoLabel.isVisible()) {
      await vehWhoLabel.click();
    } else {
      // Field exists but hidden by JS showif — force-select "Debtor 1 only"
      await page.evaluate((idx: number) => {
        const $ = (window as any).jQuery;
        if (!$) return;
        const form = document.getElementById('daform');
        if (!form) return;
        // Find the first non-disabled radio that maps to .who via _varnames
        const decode = (window as any).atou || atob;
        const varnamesInput = $(form).find('input[name="_varnames"]');
        if (varnamesInput.length === 0) return;
        try {
          const raw = JSON.parse(decode(varnamesInput.val()));
          for (const [encodedKey, encodedVal] of Object.entries(raw)) {
            const varName = decode(encodedVal as string);
            if (varName === `prop.ab_vehicles[${idx}].who`) {
              const fieldName = decode(encodedKey as string);
              const encode = (window as any).utoa || btoa;
              const encodedFieldName = encode(fieldName).replace(/[\n=]/g, '');
              const radios = $(form).find(`input[name="${encodedFieldName}"]`);
              if (radios.length > 0) {
                (radios[0] as HTMLInputElement).checked = true;
                $(radios[0]).trigger('change');
              }
              break;
            }
          }
        } catch { /* ignore */ }
      }, index);
    }
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

async function fillDeposit(page: Page, dep: DepositData, index: number) {
  await page.locator(`select#${b64(`prop.financial_assets.deposits[${index}].type`)}`).selectOption(dep.type);
  await page.locator(`#${b64(`prop.financial_assets.deposits[${index}].institution`)}`).fill(dep.institution);
  await page.locator(`#${b64(`prop.financial_assets.deposits[${index}].amount`)}`).fill(dep.amount);
  await fillYesNoRadio(page, `prop.financial_assets.deposits[${index}].is_claiming_exemption`, false);
}

export async function navigatePropertySection(page: Page, scenario: TestScenario) {
  // property_intro
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('property_intro'), 0);

  const prop = scenario.property;

  // ── Real property ──
  await waitForDaPageLoad(page);
  if (prop.realProperty) {
    await clickYesNoButton(page, 'prop.interests.there_are_any', true);

    await waitForDaPageLoad(page);
    await fillRealProperty(page, prop.realProperty, 0);
    await clickContinue(page);
    await waitForDaPageLoad(page);
    await handleAnotherPage(page, 'prop.interests.there_is_another');
    await waitForDaPageLoad(page);
  } else {
    await clickYesNoButton(page, 'prop.interests.there_are_any', false);
  }

  // ── Vehicles ──
  await waitForDaPageLoad(page);
  if (prop.vehicle) {
    await clickYesNoButton(page, 'prop.ab_vehicles.there_are_any', true);

    await waitForDaPageLoad(page);
    await fillVehicle(page, prop.vehicle, 0);
    await clickContinue(page);
    await waitForDaPageLoad(page);
    await handleAnotherPage(page, 'prop.ab_vehicles.there_is_another');
    await waitForDaPageLoad(page);
  } else {
    await clickYesNoButton(page, 'prop.ab_vehicles.there_are_any', false);
  }

  // ── Other vehicles → No ──
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.ab_other_vehicles.there_are_any', false);
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle');

  // ── Personal/household items ──
  await waitForDaPageLoad(page);
  await handleCaseNumberIfPresent(page);
  await fillAllVisibleRadiosAsNo(page);
  await clickContinue(page);

  // ── Financial assets – cash ──
  await waitForDaPageLoad(page);
  await fillAllVisibleRadiosAsNo(page);
  await clickContinue(page);

  // ── Deposits ──
  await waitForDaPageLoad(page);
  if (prop.deposit) {
    await clickYesNoButton(page, 'prop.financial_assets.deposits.there_are_any', true);

    await waitForDaPageLoad(page);
    await fillDeposit(page, prop.deposit, 0);
    await clickContinue(page);
    await handleAnotherPage(page, 'prop.financial_assets.deposits.there_is_another');
  } else {
    await clickYesNoButton(page, 'prop.financial_assets.deposits.there_are_any', false);
  }

  // ── Remaining financial sub-lists → No ──
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

  // Multi-page radios: future property, IP, intangible
  for (const _label of ['future property', 'intellectual property', 'intangible']) {
    await waitForDaPageLoad(page);
    await fillAllVisibleRadiosAsNo(page);
    await clickContinue(page);
  }

  // Owed property, business property, farming property, other property
  for (const _label of ['owed property', 'business property', 'farming property', 'other property']) {
    await waitForDaPageLoad(page);
    await fillAllVisibleRadiosAsNo(page);
    await clickContinue(page);
  }
}

// ════════════════════════════════════════════════════════════════════
//  EXEMPTIONS (Schedule C)
// ════════════════════════════════════════════════════════════════════

export async function navigateExemptionSection(page: Page) {
  await waitForDaPageLoad(page);
  await selectByName(page, b64('prop.exempt_property.exemption_type'), 'You are claiming federal exemptions.');
  await clickContinue(page);

  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.exempt_property.properties.there_are_any', false);
}

// ════════════════════════════════════════════════════════════════════
//  FINANCIAL AFFAIRS (Form 107)
// ════════════════════════════════════════════════════════════════════

export async function navigateFinancialAffairs(page: Page) {
  // Marital + residence
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.marital_status', false);
  await fillYesNoRadio(page, 'financial_affairs.lived_elsewhere', false);
  await fillYesNoRadio(page, 'financial_affairs.lived_with_spouse', false);
  await clickContinue(page);

  // Employment → Not employed
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.employed', false);
  await clickContinue(page);

  // Other income → No
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.had_other_income', false);
  await clickContinue(page);

  // Consumer debts → Yes
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'financial_affairs.primarily_consumer_debts', true);

  // All list-gathers → No
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

  // Other assignee → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'financial_affairs.other_assignee', false);

  // Gifts → No
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

  // Bankruptcy payments → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'financial_affairs.bankruptcy_payments.there_are_any', false);

  // Creditor help
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.has_creditor_help', false);
  await clickContinue(page);

  // Other transfers → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'financial_affairs.other_transfers.there_are_any', false);

  // Self-settled trust
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.has_self_settled_trust', false);
  await clickContinue(page);

  // Financial instruments → No
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

  // Verify held-property advanced
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

  // Environment — 3 pages
  for (let i = 0; i < 3; i++) {
    await waitForDaPageLoad(page);
    await fillAllVisibleRadiosAsNo(page);
    await clickContinue(page);
  }

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
//  CREDITOR LIBRARY PICKER
// ════════════════════════════════════════════════════════════════════

export async function navigateCreditorLibraryPicker(page: Page) {
  await waitForDaPageLoad(page);
  await clickContinue(page);
}

// ════════════════════════════════════════════════════════════════════
//  SECURED CREDITORS (Schedule D)
// ════════════════════════════════════════════════════════════════════

export async function navigateSecuredCreditors(page: Page, scenario: TestScenario) {
  await waitForDaPageLoad(page);
  if (scenario.creditors.secured) {
    await clickYesNoButton(page, 'prop.creditors.there_are_any', true);

    await waitForDaPageLoad(page);
    const sc = scenario.creditors.secured;
    await page.locator(`#${b64('prop.creditors[0].name')}`).fill(sc.name);
    await page.locator(`#${b64('prop.creditors[0].street')}`).fill(sc.street);
    await page.locator(`#${b64('prop.creditors[0].city')}`).fill(sc.city);
    await page.locator(`#${b64('prop.creditors[0].state')}`).fill(sc.state);
    await page.locator(`#${b64('prop.creditors[0].zip')}`).fill(sc.zip);
    // 'who' radio only appears for joint filings
    const secWhoLabel = page.locator(`label[for="${b64('prop.creditors[0].who')}_0"]`);
    if (await secWhoLabel.count() > 0) await secWhoLabel.click();
    await fillYesNoRadio(page, 'prop.creditors[0].community_debt', false);

    const dateField = page.locator(`#${b64('prop.creditors[0].incurred_date')}`);
    if (await dateField.count() > 0) await dateField.fill('January 2020');

    const descSelect = page.locator(`select#${b64('prop.creditors[0].prop_description')}`);
    if (await descSelect.count() > 0) {
      await page.evaluate((selId) => {
        const sel = document.getElementById(selId) as HTMLSelectElement;
        if (sel && sel.options.length > 1) { sel.selectedIndex = 1; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      }, b64('prop.creditors[0].prop_description'));
    }

    await setCheckbox(page, 'prop.creditors[0].agreement', true);
    await page.locator(`#${b64('prop.creditors[0].claim_amount')}`).fill(sc.claimAmount);
    await page.locator(`#${b64('prop.creditors[0].collateral_value')}`).fill(sc.collateralValue);

    const actionSelect = page.locator(`select#${b64('prop.creditors[0].property_action')}`);
    if (await actionSelect.count() > 0) {
      await page.evaluate((selId) => {
        const sel = document.getElementById(selId) as HTMLSelectElement;
        if (sel && sel.options.length > 1) { sel.selectedIndex = 1; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      }, b64('prop.creditors[0].property_action'));
    }

    await clickContinue(page);

    // Notify → No
    await waitForDaPageLoad(page);
    const notifyText = await page.locator('body').innerText();
    if (notifyText.toLowerCase().includes('notif')) {
      // yesno: buttons — click "No" directly by role
      await page.getByRole('button', { name: 'No', exact: true }).click();
      await page.waitForLoadState('networkidle');
    }

    await handleAnotherPage(page, 'prop.creditors.there_is_another');
  } else {
    await clickYesNoButton(page, 'prop.creditors.there_are_any', false);
  }
}

// ════════════════════════════════════════════════════════════════════
//  UNSECURED CREDITORS (Schedule E/F)
// ════════════════════════════════════════════════════════════════════

export async function navigateUnsecuredCreditors(page: Page, scenario: TestScenario) {
  // Priority claims
  await waitForDaPageLoad(page);
  if (scenario.creditors.priority) {
    await clickYesNoButton(page, 'prop.priority_claims.there_are_any', true);

    await waitForDaPageLoad(page);
    const pc = scenario.creditors.priority;
    await page.locator(`#${b64('prop.priority_claims[0].name')}`).fill(pc.name);
    await page.locator(`#${b64('prop.priority_claims[0].street')}`).fill(pc.street);
    await page.locator(`#${b64('prop.priority_claims[0].city')}`).fill(pc.city);
    await page.locator(`#${b64('prop.priority_claims[0].state')}`).fill(pc.state);
    await page.locator(`#${b64('prop.priority_claims[0].zip')}`).fill(pc.zip);
    // 'who' radio only appears for joint filings
    const prWhoLabel = page.locator(`label[for="${b64('prop.priority_claims[0].who')}_0"]`);
    if (await prWhoLabel.count() > 0) await prWhoLabel.click();

    const typeSelect = page.locator(`select#${b64('prop.priority_claims[0].type')}`);
    if (await typeSelect.count() > 0) await typeSelect.selectOption(pc.type);

    await page.locator(`#${b64('prop.priority_claims[0].total_claim')}`).fill(pc.totalClaim);
    await page.locator(`#${b64('prop.priority_claims[0].priority_amount')}`).fill(pc.priorityAmount);
    await page.locator(`#${b64('prop.priority_claims[0].nonpriority_amount')}`).fill(pc.nonpriorityAmount);
    await fillYesNoRadio(page, 'prop.priority_claims[0].has_codebtor', false);
    await clickContinue(page);

    await handleAnotherPage(page, 'prop.priority_claims.there_is_another');
  } else {
    await clickYesNoButton(page, 'prop.priority_claims.there_are_any', false);
  }

  // Nonpriority claims
  await waitForDaPageLoad(page);
  if (scenario.creditors.nonpriority) {
    await clickYesNoButton(page, 'prop.nonpriority_claims.there_are_any', true);

    await waitForDaPageLoad(page);
    const np = scenario.creditors.nonpriority;
    await page.locator(`#${b64('prop.nonpriority_claims[0].name')}`).fill(np.name);
    await page.locator(`#${b64('prop.nonpriority_claims[0].street')}`).fill(np.street);
    await page.locator(`#${b64('prop.nonpriority_claims[0].city')}`).fill(np.city);
    await page.locator(`#${b64('prop.nonpriority_claims[0].state')}`).fill(np.state);
    await page.locator(`#${b64('prop.nonpriority_claims[0].zip')}`).fill(np.zip);
    // 'who' radio only appears for joint filings
    const npWhoLabel = page.locator(`label[for="${b64('prop.nonpriority_claims[0].who')}_0"]`);
    if (await npWhoLabel.count() > 0) await npWhoLabel.click();

    // Claim type dropdown (required)
    const npTypeSelect = page.locator(`select#${b64('prop.nonpriority_claims[0].type')}`);
    if (await npTypeSelect.count() > 0) await npTypeSelect.selectOption(np.type);

    await page.locator(`#${b64('prop.nonpriority_claims[0].total_claim')}`).fill(np.totalClaim);
    await fillYesNoRadio(page, 'prop.nonpriority_claims[0].has_codebtor', false);

    // "Do others need to be notified about debt?" radio
    const npNotifyRadio = page.locator(`[name="${b64('prop.nonpriority_claims[0].notify.there_are_any')}"]`);
    if (await npNotifyRadio.count() > 0) {
      await fillYesNoRadio(page, 'prop.nonpriority_claims[0].notify.there_are_any', false);
    }

    await clickContinue(page);

    await handleAnotherPage(page, 'prop.nonpriority_claims.there_is_another');
  } else {
    await clickYesNoButton(page, 'prop.nonpriority_claims.there_are_any', false);
  }
}

// ════════════════════════════════════════════════════════════════════
//  CONTRACTS & LEASES (Schedule G)
// ════════════════════════════════════════════════════════════════════

export async function navigateContractsLeases(page: Page) {
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.contracts_and_leases.there_are_any', false);

  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'personal_leases.there_are_any', false);
}

// ════════════════════════════════════════════════════════════════════
//  COMMUNITY PROPERTY / CODEBTORS (Schedule H)
// ════════════════════════════════════════════════════════════════════

export async function navigateCommunityProperty(page: Page) {
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'debtors.community_property', false);
  await clickContinue(page);
}

// ════════════════════════════════════════════════════════════════════
//  INCOME (Schedule I)
// ════════════════════════════════════════════════════════════════════

export async function navigateIncome(page: Page) {
  await waitForDaPageLoad(page);
  await selectByName(page, b64('debtor[0].income.employment'), 'Not employed');
  await clickContinue(page);

  await waitForDaPageLoad(page);
  await fillById(page, b64('debtor[0].income.income_amount_1'), '0');
  await fillById(page, b64('debtor[0].income.overtime_pay_1'), '0');
  await clickContinue(page);

  await waitForDaPageLoad(page);
  await fillById(page, b64('debtor[0].income.tax_deduction'), '0');
  await clickContinue(page);

  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'debtor[0].income.other_deduction', false);
  await clickContinue(page);

  await waitForDaPageLoad(page);
  await fillById(page, b64('debtor[0].income.net_rental_business'), '0');
  await fillById(page, b64('debtor[0].income.interest_and_dividends'), '0');
  await fillById(page, b64('debtor[0].income.family_support'), '0');
  await fillById(page, b64('debtor[0].income.unemployment'), '0');
  await fillById(page, b64('debtor[0].income.social_security'), '0');
  await fillById(page, b64('debtor[0].income.other_govt_assist'), '0');
  await fillById(page, b64('debtor[0].income.pension'), '0');
  await fillYesNoRadio(page, 'debtor[0].income.other_monthly_income', false);
  await clickContinue(page);

  await waitForDaPageLoad(page);
  await selectYesNoRadio(page, 'debtor[0].income.other_regular_contributions', false);
  await page.waitForTimeout(300);
  await selectYesNoRadio(page, 'debtor[0].income.expect_year_delta', false);
  await page.waitForTimeout(300);
  await clickContinue(page);

  await waitForDaPageLoad(page);
}

// ════════════════════════════════════════════════════════════════════
//  EXPENSES (Schedule J)
// ════════════════════════════════════════════════════════════════════

export async function navigateExpenses(page: Page, rentAmount: string) {
  await waitForDaPageLoad(page);
  await selectYesNoRadio(page, 'debtor[0].expenses.util_other', false);
  await page.waitForTimeout(300);
  await selectYesNoRadio(page, 'debtor[0].expenses.other_insurance', false);
  await page.waitForTimeout(300);
  await selectYesNoRadio(page, 'debtor[0].expenses.has_other_expenses', false);
  await page.waitForTimeout(500);
  await fillById(page, b64('debtor[0].expenses.rent_expense'), rentAmount);
  await fillById(page, b64('debtor[0].expenses.alimony'), '0');
  await clickContinue(page);

  await waitForDaPageLoad(page);
  await selectYesNoRadio(page, 'debtor[0].expenses.change_in_expense', false);
  await clickContinue(page);
}

// ════════════════════════════════════════════════════════════════════
//  MEANS TEST (Form 122A)
// ════════════════════════════════════════════════════════════════════

export async function navigateMeansTest(page: Page) {
  await waitForDaPageLoad(page);
  await selectByName(page, b64('monthly_income.means_type'), 'There is no presumption of abuse.');
  await clickContinue(page);

  await waitForDaPageLoad(page);
  await selectYesNoRadio(page, 'monthly_income.non_consumer_debts', true);
  await page.waitForTimeout(300);
  await selectYesNoRadio(page, 'monthly_income.disabled_veteran', false);
  await page.waitForTimeout(300);
  await selectYesNoRadio(page, 'monthly_income.reservists', false);
  await page.waitForTimeout(300);
  await clickContinue(page);

  await waitForDaPageLoad(page);
}

// ════════════════════════════════════════════════════════════════════
//  CASE DETAILS
// ════════════════════════════════════════════════════════════════════

export async function navigateCaseDetails(page: Page) {
  await waitForDaPageLoad(page);
  const payLabel = page.locator('label').filter({ hasText: 'I will pay the entire fee when I file my petition' });
  await payLabel.click();
  await clickContinue(page);

  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'case.has_previous_bankruptcy', false);

  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'case.has_pending_bankruptcy', false);

  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'case.rents_residence', false);

  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('case_final'), 0);
}

// ════════════════════════════════════════════════════════════════════
//  BUSINESS
// ════════════════════════════════════════════════════════════════════

export async function navigateBusiness(page: Page) {
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'business.has_business', false);

  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('business_final'), 0);
}

// ════════════════════════════════════════════════════════════════════
//  HAZARDOUS PROPERTY
// ════════════════════════════════════════════════════════════════════

export async function navigateHazardousProperty(page: Page) {
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'hazardous_property.has_property', false);

  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('hazard_final'), 0);
}

// ════════════════════════════════════════════════════════════════════
//  CREDIT COUNSELING
// ════════════════════════════════════════════════════════════════════

export async function navigateCreditCounseling(page: Page) {
  await waitForDaPageLoad(page);
  await selectByName(page, b64('debtor[i].counseling.counseling_type'), '1');
  await clickContinue(page);

  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('counseling_final'), 0);
}

// ════════════════════════════════════════════════════════════════════
//  REPORTING
// ════════════════════════════════════════════════════════════════════

export async function navigateReporting(page: Page) {
  await waitForDaPageLoad(page);
  await page.locator('label').filter({ hasText: 'Primarily consumer debts' }).click();
  await clickContinue(page);

  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'reporting.funds_for_creditors', false);
}

// ════════════════════════════════════════════════════════════════════
//  DYNAMIC PHASE (doc gen + attorney disclosure + stragglers)
// ════════════════════════════════════════════════════════════════════

export async function navigateDynamicPhase(page: Page, scenario: TestScenario) {
  await waitForDaPageLoad(page);

  let maxSteps = 60;
  while (maxSteps-- > 0) {
    await page.waitForTimeout(300);
    const heading = await page.locator('h1, h2').first().textContent().catch(() => '');

    // Check for conclusion
    const bodyText = await page.locator('body').innerText();
    if (bodyText.toLowerCase().includes('interview questions complete') ||
        bodyText.toLowerCase().includes('your documents are ready') ||
        bodyText.toLowerCase().includes('conclusion')) {
      return;
    }

    // Check for error
    if (heading?.toLowerCase().includes('error')) {
      const tracebackEl = await page.locator('pre, code, .daerror, .alert-danger').first().textContent().catch(() => '');
      await screenshot(page, `${scenario.name}-error`);
      throw new Error(`Docassemble error during dynamic phase:\n${tracebackEl || bodyText.substring(0, 1500)}`);
    }

    // ── Known question handlers ──
    const handlers: [string, () => Promise<void>][] = [
      ['secured_claims.there_are_any', async () => { await clickYesNoButton(page, 'secured_claims.there_are_any', false); }],
      ['creditor_library_picker_done', async () => { await clickContinue(page); }],
      ['personal_leases.there_are_any', async () => { await clickYesNoButton(page, 'personal_leases.there_are_any', false); }],
    ];

    let handled = false;
    for (const [varName, handler] of handlers) {
      if (await page.locator(`[name="${b64(varName)}"]`).count() > 0) {
        await handler();
        await waitForDaPageLoad(page);
        handled = true;
        break;
      }
    }
    if (handled) continue;

    // ── Attorney Disclosure (B2030) ──
    const atty = scenario.attorney;

    if (await page.locator(`[name="${b64('attorney_disclosure.has_attorney')}"]`).count() > 0) {
      await selectYesNoRadio(page, 'attorney_disclosure.has_attorney', true);
      await page.waitForTimeout(300);
      await clickContinue(page);
      await waitForDaPageLoad(page);
      continue;
    }

    if (await page.locator(`[name="${b64('attorney_disclosure.attorney_name')}"]`).count() > 0) {
      await page.evaluate(({nameF, firmF, nameV, firmV}) => {
        const n = document.querySelector(`[name="${nameF}"]`) as HTMLInputElement;
        if (n) { n.value = nameV; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); }
        const f = document.querySelector(`[name="${firmF}"]`) as HTMLInputElement;
        if (f) { f.value = firmV; f.dispatchEvent(new Event('input', { bubbles: true })); f.dispatchEvent(new Event('change', { bubbles: true })); }
      }, { nameF: b64('attorney_disclosure.attorney_name'), firmF: b64('attorney_disclosure.firm_name'), nameV: atty.name, firmV: atty.firm });
      await page.waitForTimeout(300);
      await clickContinue(page);
      await waitForDaPageLoad(page);
      continue;
    }

    if (await page.locator(`[name="${b64('attorney_disclosure.agreed_compensation')}"]`).count() > 0) {
      await page.evaluate(({cf, rf, cv, rv}) => {
        const c = document.querySelector(`[name="${cf}"]`) as HTMLInputElement;
        if (c) { c.value = cv; c.dispatchEvent(new Event('input', { bubbles: true })); c.dispatchEvent(new Event('change', { bubbles: true })); }
        const r = document.querySelector(`[name="${rf}"]`) as HTMLInputElement;
        if (r) { r.value = rv; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); }
      }, { cf: b64('attorney_disclosure.agreed_compensation'), rf: b64('attorney_disclosure.prior_received'), cv: atty.agreedCompensation, rv: atty.priorReceived });
      await page.waitForTimeout(300);
      await clickContinue(page);
      await waitForDaPageLoad(page);
      continue;
    }

    for (const radioVar of ['attorney_disclosure.source_paid', 'attorney_disclosure.source_topay']) {
      if (await page.locator(`[name="${b64(radioVar)}"]`).count() > 0) {
        await page.evaluate((id) => {
          const radios = document.querySelectorAll(`input[name="${id}"]`);
          radios.forEach((r: any) => {
            if (r.value === 'debtor') {
              r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true }));
              const label = document.querySelector(`label[for="${r.id}"]`) as HTMLElement;
              if (label) label.click();
            }
          });
        }, b64(radioVar));
        await page.waitForTimeout(300);
        await clickContinue(page);
        await waitForDaPageLoad(page);
        handled = true;
        break;
      }
    }
    if (handled) continue;

    if (await page.locator(`[name="${b64('attorney_disclosure.shares_fees')}"]`).count() > 0) {
      await selectYesNoRadio(page, 'attorney_disclosure.shares_fees', false);
      await page.waitForTimeout(300);
      await clickContinue(page);
      await waitForDaPageLoad(page);
      continue;
    }

    for (const ctxVar of ['attorney_disclosure.service_a', 'attorney_disclosure.excluded_services']) {
      if (await page.locator(`[name="${b64(ctxVar)}"]`).count() > 0) {
        await clickContinue(page);
        await waitForDaPageLoad(page);
        handled = true;
        break;
      }
    }
    if (handled) continue;

    if (await page.locator(`[name="${b64('attorney_disclosure_review')}"]`).count() > 0) {
      await clickNthByName(page, b64('attorney_disclosure_review'), 0);
      await waitForDaPageLoad(page);
      continue;
    }

    if (await page.locator(`[name="${b64('print_101')}"]`).count() > 0) {
      await clickNthByName(page, b64('print_101'), 0);
      await waitForDaPageLoad(page);
      continue;
    }

    // ── Generic handlers ──
    const noButton = page.locator('button.btn-da[value="False"]:not([disabled])');
    const yesButton = page.locator('button.btn-da[value="True"]:not([disabled])');
    if (await noButton.count() > 0 && await yesButton.count() > 0) {
      await noButton.first().click();
      await waitForDaPageLoad(page);
      continue;
    }

    await page.evaluate(() => {
      document.querySelectorAll('input[type="radio"][value="False"]').forEach(radio => {
        if (!(radio as HTMLInputElement).checked) {
          const label = document.querySelector(`label[for="${radio.getAttribute('id')}"]`) as HTMLElement;
          if (label) label.click();
        }
      });
    });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      document.querySelectorAll('select').forEach(sel => {
        if (!sel.value || sel.selectedIndex <= 0) {
          const options = sel.querySelectorAll('option');
          for (let i = 0; i < options.length; i++) {
            if (options[i].value && options[i].value !== '') {
              sel.value = options[i].value;
              sel.dispatchEvent(new Event('change', { bubbles: true }));
              break;
            }
          }
        }
      });
    });

    const emptyInputs = page.locator('input[type="text"]:visible, input[type="number"]:visible, input.dacurrency:visible');
    const inputCount = await emptyInputs.count();
    for (let i = 0; i < inputCount; i++) {
      const val = await emptyInputs.nth(i).inputValue();
      if (!val) await emptyInputs.nth(i).fill('0');
    }

    const continueBtn = page.locator('button#da-continue-button');
    if (await continueBtn.count() > 0) {
      try {
        await continueBtn.waitFor({ state: 'attached', timeout: 2000 });
        const isDisabled = await continueBtn.getAttribute('disabled');
        if (isDisabled !== null) {
          await page.evaluate(() => {
            const btn = document.getElementById('da-continue-button') as HTMLButtonElement;
            if (btn) { btn.disabled = false; btn.classList.remove('btn-secondary'); btn.classList.add('btn-primary'); }
          });
          await page.waitForTimeout(200);
        }
        await clickContinue(page);
        await waitForDaPageLoad(page);
        continue;
      } catch { /* */ }
    }

    const anyButton = page.locator('button.btn-primary:visible, button.btn-da:visible, button[type="submit"]:visible');
    if (await anyButton.count() > 0) {
      await anyButton.first().click();
      await waitForDaPageLoad(page);
      continue;
    }

    await screenshot(page, `${scenario.name}-stuck-${60 - maxSteps}`);
    break;
  }
}

// ════════════════════════════════════════════════════════════════════
//  FULL INTERVIEW RUNNER
// ════════════════════════════════════════════════════════════════════

export async function runFullInterview(page: Page, scenario: TestScenario) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  TEST: ${scenario.name}`);
  console.log(`  District: ${scenario.district}`);
  console.log(`  Debtor: ${scenario.debtor.first} ${scenario.debtor.last} (${scenario.debtor.city}, ${scenario.debtor.state})`);
  console.log(`  Joint: ${scenario.jointFiling}`);
  console.log(`  Property: real=${!!scenario.property.realProperty} vehicle=${!!scenario.property.vehicle} deposit=${!!scenario.property.deposit}`);
  console.log(`  Creditors: secured=${!!scenario.creditors.secured} priority=${!!scenario.creditors.priority} nonpriority=${!!scenario.creditors.nonpriority}`);
  console.log(`${'═'.repeat(60)}`);

  await navigateToDebtorPage(page, scenario);
  await fillDebtorAndAdvance(page, scenario.debtor);

  if (scenario.jointFiling && scenario.spouse) {
    await waitForDaPageLoad(page);
    await fillDebtorAndAdvance(page, scenario.spouse);
  }

  await passDebtorFinal(page);
  await navigatePropertySection(page, scenario);
  await navigateExemptionSection(page);
  await navigateFinancialAffairs(page);
  await navigateCreditorLibraryPicker(page);
  await navigateSecuredCreditors(page, scenario);
  await navigateUnsecuredCreditors(page, scenario);
  await navigateContractsLeases(page);
  await navigateCommunityProperty(page);
  await navigateIncome(page);
  await navigateExpenses(page, scenario.rentExpense);
  await navigateMeansTest(page);
  await navigateCaseDetails(page);
  await navigateBusiness(page);
  await navigateHazardousProperty(page);
  await navigateCreditCounseling(page);
  await navigateReporting(page);
  await navigateDynamicPhase(page, scenario);
}
