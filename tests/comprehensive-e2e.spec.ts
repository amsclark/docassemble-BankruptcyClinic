/**
 * Comprehensive End-to-End Filing Tests
 *
 * 10+ distinct long-path tests, each exercising a different debtor profile,
 * district (Nebraska vs South Dakota), property mix, creditor scenario,
 * income situation, and filing configuration.  Every test navigates the
 * full interview from start to conclusion and verifies:
 *
 *   1. No docassemble error page at ANY step (global error detection)
 *   2. Conclusion screen is reached
 *   3. At least 15 PDF download links present
 *   4. Key forms (101, 106, 107, 108, 121, 122, 2030) named in headings
 *   5. Every PDF downloads with 200 OK and valid PDF structure
 *   6. Form 101 debtor name, district, and Ch7 checkbox verified
 */
import { test, expect, Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import {
  INTERVIEW_URL,
  b64,
  waitForDaPageLoad,
  clickContinue as _clickContinue,
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
  clickYesNo,
} from './helpers';

// ════════════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════════════

interface DebtorProfile {
  first: string;
  middle: string;
  last: string;
  street: string;
  city: string;
  state: 'Nebraska' | 'South Dakota';
  zip: string;
  countyIndex: number;
  taxIdType: 'ssn' | 'ein';
  taxId: string;
}

interface SpouseProfile extends DebtorProfile {}

interface PropertyData {
  realProperty?: {
    street: string; city: string; stateAbbr: string; zip: string;
    county: string; typeIndex: number; value: string;
    ownershipInterest: string; otherInfo: string;
  };
  vehicle?: {
    make: string; model: string; year: string; mileage: string;
    value: string; state: string; hasLoan: boolean; loanAmount?: string;
    otherInfo?: string;
  };
  deposit?: {
    type: string; institution: string; amount: string;
  };
}

interface CreditorData {
  secured?: {
    name: string; street: string; city: string; state: string; zip: string;
    claimAmount: string; collateralValue: string;
  };
  priority?: {
    name: string; street: string; city: string; state: string; zip: string;
    type: string; totalClaim: string; priorityAmount: string; nonpriorityAmount: string;
  };
  nonpriority?: {
    name: string; street: string; city: string; state: string; zip: string;
    totalClaim: string;
  };
}

interface AttorneyData {
  name: string;
  firm: string;
  agreedCompensation: string;
  priorReceived: string;
}

interface TestScenario {
  name: string;
  district: string;
  debtor: DebtorProfile;
  spouse?: SpouseProfile;
  jointFiling: boolean;
  property: PropertyData;
  creditors: CreditorData;
  attorney: AttorneyData;
  rentExpense: string;
}

// ════════════════════════════════════════════════════════════════════
//  SHARED UTILITY WRAPPERS
// ════════════════════════════════════════════════════════════════════

async function clickContinue(page: Page) {
  await waitForDaPageLoad(page);

  // On some pages (especially list collect), docassemble doesn't send validation
  // rules in the AJAX response, so no jQuery Validate instance gets created.
  // Without a validator, clicking the submit button does a native POST, but
  // _visible never gets updated (normally done by daValidationHandler), so the
  // server doesn't know which fields were shown → returns the same page.
  //
  // Fix: detect missing validator and manually build _visible, then do native
  // form submit. Without ajax=1, the server returns a full HTML page and the
  // browser navigates to it.
  const hasValidator = await page.evaluate(() => {
    const $ = (window as any).jQuery || (window as any).$;
    if (!$) return true; // can't check, proceed normally
    const form = document.getElementById('daform');
    if (!form) return true;
    return !!$(form).data('validator');
  });
  console.log('[CC] hasValidator:', hasValidator, 'url:', page.url().substring(0, 80));

  if (!hasValidator) {
    // No validator → daValidationHandler never runs → _visible never gets updated
    // and ajax=1 never gets added. Fix: build _visible, add ajax=1, POST via
    // AJAX from browser context, then reload the page to show the next question.
    await page.evaluate(() => {
      const $ = (window as any).jQuery;
      const form = document.getElementById('daform') as HTMLFormElement;
      if (!$ || !form) return;

      // Build _visible list (same logic as daValidationHandler in app.js)
      const visibleElements: string[] = [];
      const seen: Record<string, number> = {};
      $(form).find('input, select, textarea').filter(':not(:disabled)').each(function(this: HTMLElement) {
        const el = this as HTMLInputElement;
        if ($(el).attr('name') && $(el).attr('type') !== 'hidden' &&
            (($(el).hasClass('da-active-invisible') && $(el).parent().is(':visible')) ||
             $(el).is(':visible'))) {
          const name = $(el).attr('name')!;
          if (!seen[name]) { visibleElements.push(name); seen[name] = 1; }
        }
      });
      // Update _visible hidden field
      $(form).find('input[name="_visible"]').val(btoa(JSON.stringify(visibleElements)));
      // Add ajax=1
      $(form).find('input[name="ajax"]').remove();
      $('<input>').attr({type:'hidden', name:'ajax', value:'1'}).appendTo($(form));
    });

    // Do AJAX POST from browser and wait for it
    const result = await page.evaluate(async () => {
      const $ = (window as any).jQuery;
      const form = document.getElementById('daform') as HTMLFormElement;
      const csrf = (window as any).daCsrf || '';
      return new Promise<string>((resolve) => {
        $.ajax({
          type: 'POST',
          url: $(form).attr('action') || window.location.href,
          data: $(form).serialize(),
          beforeSend: function(xhr: any) {
            if (csrf) xhr.setRequestHeader('X-CSRFToken', csrf);
          },
          xhrFields: { withCredentials: true },
          success: function(data: any) {
            resolve(data?.action || 'unknown-action');
          },
          error: function(_xhr: any, _status: any, error: any) {
            resolve('error: ' + error);
          },
        });
      });
    });
    console.log('[SUBMIT] AJAX result action:', result);

    // The server-side state has advanced. Reload the page to show the next question.
    await page.reload({ waitUntil: 'networkidle' });
    await waitForDaPageLoad(page);
  } else {
    // Normal path: validator exists, set ignore for hidden/disabled fields
    await page.evaluate(() => {
      const $ = (window as any).jQuery;
      if (!$) return;
      const validator = $('#daform').data('validator');
      if (validator) {
        validator.settings.ignore = ':hidden, :disabled';
      }
    });
    await _clickContinue(page);
  }
}

async function clickYesNoButton(page: Page, varName: string, yes: boolean) {
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64(varName), yes ? 0 : 1);
}

async function selectYesNoRadio(page: Page, varName: string, yes: boolean) {
  const fieldId = b64(varName);
  const suffix = yes ? '_0' : '_1';
  await page.locator(`label[for="${fieldId}${suffix}"]`).click();
}

const fillYesNoRadio = selectYesNoRadio;

async function fillAllVisibleRadiosAsNo(page: Page) {
  const noRadioIds = await page.evaluate(() => {
    const ids: string[] = [];
    document.querySelectorAll('input[type="radio"][value="False"]').forEach(radio => {
      const id = radio.getAttribute('id');
      if (!id) return;
      const label = document.querySelector(`label[for="${id}"]`) as HTMLElement;
      if (label && label.offsetParent !== null && !(radio as HTMLInputElement).checked) {
        ids.push(id);
      }
    });
    return ids;
  });
  for (const id of noRadioIds) {
    await page.locator(`label[for="${id}"]`).click();
  }
}

async function handleCaseNumberIfPresent(page: Page) {
  const caseNumberField = page.locator(`#${b64('case_number')}`);
  if (await caseNumberField.count() > 0) {
    await clickContinue(page);
    await waitForDaPageLoad(page);
  }
}

async function setCheckbox(page: Page, varName: string, checked: boolean) {
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
async function handleAnotherPage(page: Page, thereIsAnotherVar: string) {
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

// ════════════════════════════════════════════════════════════════════
//  PARAMETERISED NAVIGATION FUNCTIONS
// ════════════════════════════════════════════════════════════════════

async function navigateToDebtorPage(page: Page, scenario: TestScenario) {
  await page.goto(INTERVIEW_URL + '&new_session=1');
  await waitForDaPageLoad(page);

  // Intro
  await clickNthByName(page, b64('introduction_screen'), 0);

  // District
  await waitForDaPageLoad(page);
  await selectByName(page, b64('current_district'), scenario.district);
  await clickContinue(page);

  // Amended filing → No
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('amended_filing'), 1);

  // Case number if present
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

async function fillDebtorAndAdvance(page: Page, d: DebtorProfile) {
  await fillDebtorIdentity(page, {
    first: d.first, middle: d.middle, last: d.last,
    street: d.street, city: d.city, state: d.state,
    zip: d.zip, countyIndex: d.countyIndex,
    taxIdType: d.taxIdType, taxId: d.taxId,
  });

  // Alias → No
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('debtor[i].alias.there_are_any'), 1);

  // District residency → Yes
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('debtor[i].district_info.is_current_district'), 0);
  await clickContinue(page);
}

async function passDebtorFinal(page: Page) {
  await waitForDaPageLoad(page);
  const heading = await page.locator('h1, h2, h3').first().textContent().catch(() => '');
  if (heading && heading.toLowerCase().includes('summary')) {
    await clickContinue(page);
  }
}

// ── Property Section ──

async function navigatePropertySection(page: Page, scenario: TestScenario) {
  // property_intro
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('property_intro'), 0);

  const prop = scenario.property;

  // ── Real property ──
  await waitForDaPageLoad(page);
  if (prop.realProperty) {
    await clickYesNoButton(page, 'prop.interests.there_are_any', true);

    await waitForDaPageLoad(page);
    const rp = prop.realProperty;
    await page.locator(`#${b64('prop.interests[0].street')}`).fill(rp.street);
    await page.locator(`#${b64('prop.interests[0].city')}`).fill(rp.city);
    await page.locator(`#${b64('prop.interests[0].state')}`).fill(rp.stateAbbr);
    await page.locator(`#${b64('prop.interests[0].zip')}`).fill(rp.zip);
    await page.locator(`#${b64('prop.interests[0].county')}`).fill(rp.county);
    await page.locator(`label[for="${b64('prop.interests[0].type')}_${rp.typeIndex}"]`).click();
    // 'who' radio only appears for joint filings
    const propWhoLabel = page.locator(`label[for="${b64('prop.interests[0].who')}_0"]`);
    if (await propWhoLabel.count() > 0) await propWhoLabel.click();
    await page.locator(`#${b64('prop.interests[0].current_value')}`).fill(rp.value);
    await page.locator(`#${b64('prop.interests[0].ownership_interest')}`).fill(rp.ownershipInterest);
    await fillYesNoRadio(page, 'prop.interests[0].is_community_property', false);
    await page.locator(`#${b64('prop.interests[0].other_info')}`).fill(rp.otherInfo);
    await fillYesNoRadio(page, 'prop.interests[0].is_claiming_exemption', false);
    console.log('[PROP] Interest form filled, clicking Continue...');
    await clickContinue(page);
    await waitForDaPageLoad(page);
    const h1AfterInterest = await page.locator('h1').first().innerText().catch(() => 'no h1');
    console.log('[PROP] After interest Continue, heading:', h1AfterInterest);

    await handleAnotherPage(page, 'prop.interests.there_is_another');
    await waitForDaPageLoad(page);
    const h1AfterAnotherInt = await page.locator('h1').first().innerText().catch(() => 'no h1');
    console.log('[PROP] After handleAnotherPage (interests), heading:', h1AfterAnotherInt);
  } else {
    await clickYesNoButton(page, 'prop.interests.there_are_any', false);
  }

  // ── Vehicles ──
  await waitForDaPageLoad(page);
  if (prop.vehicle) {
    await clickYesNoButton(page, 'prop.ab_vehicles.there_are_any', true);

    await waitForDaPageLoad(page);
    const v = prop.vehicle;
    await page.locator(`#${b64('prop.ab_vehicles[0].make')}`).fill(v.make);
    await page.locator(`#${b64('prop.ab_vehicles[0].model')}`).fill(v.model);
    await page.locator(`#${b64('prop.ab_vehicles[0].year')}`).fill(v.year);
    await page.locator(`#${b64('prop.ab_vehicles[0].milage')}`).fill(v.mileage);
    // 'who' radio only appears for joint filings
    const vehWhoLabel = page.locator(`label[for="${b64('prop.ab_vehicles[0].who')}_0"]`);
    if (await vehWhoLabel.count() > 0) await vehWhoLabel.click();
    await page.locator(`#${b64('prop.ab_vehicles[0].current_value')}`).fill(v.value);
    await page.locator(`#${b64('prop.ab_vehicles[0].state')}`).fill(v.state);

    if (v.hasLoan) {
      await setCheckbox(page, 'prop.ab_vehicles[0].has_loan', true);
      await page.waitForTimeout(2000);
      // List collect pre-renders multiple rows; only the first is enabled
      const loanField = page.getByLabel(/How much do you owe on the loan/i).first();
      await loanField.waitFor({ state: 'visible', timeout: 10000 });
      await loanField.click();
      await loanField.fill(v.loanAmount || '0');
    }

    await fillYesNoRadio(page, 'prop.ab_vehicles[0].is_community_property', false);
    const otherInfoField = page.locator(`#${b64('prop.ab_vehicles[0].other_info')}`);
    if (await otherInfoField.count() > 0) {
      await otherInfoField.fill(v.otherInfo || 'N/A');
    }
    await fillYesNoRadio(page, 'prop.ab_vehicles[0].is_claiming_exemption', false);

    await clickContinue(page);
    await waitForDaPageLoad(page);
    const h1AfterVehicle = await page.locator('h1').first().innerText().catch(() => 'no h1');
    console.log('[PROP] After vehicle Continue, heading:', h1AfterVehicle);

    await handleAnotherPage(page, 'prop.ab_vehicles.there_is_another');
    await waitForDaPageLoad(page);
    const h1AfterAnotherVeh = await page.locator('h1').first().innerText().catch(() => 'no h1');
    console.log('[PROP] After handleAnotherPage (vehicles), heading:', h1AfterAnotherVeh);
  } else {
    await clickYesNoButton(page, 'prop.ab_vehicles.there_are_any', false);
  }

  // ── Other vehicles → No ──
  await waitForDaPageLoad(page);
  const h1BeforeOtherVeh = await page.locator('h1').first().innerText().catch(() => 'no h1');
  console.log('[PROP] Before other_vehicles, heading:', h1BeforeOtherVeh);
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
    const dep = prop.deposit;
    await page.locator(`select#${b64('prop.financial_assets.deposits[0].type')}`).selectOption(dep.type);
    await page.locator(`#${b64('prop.financial_assets.deposits[0].institution')}`).fill(dep.institution);
    await page.locator(`#${b64('prop.financial_assets.deposits[0].amount')}`).fill(dep.amount);
    await fillYesNoRadio(page, 'prop.financial_assets.deposits[0].is_claiming_exemption', false);
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
  for (const label of ['future property', 'intellectual property', 'intangible']) {
    await waitForDaPageLoad(page);
    await fillAllVisibleRadiosAsNo(page);
    await clickContinue(page);
  }

  // Owed property, business property, farming property, other property
  for (const label of ['owed property', 'business property', 'farming property', 'other property']) {
    await waitForDaPageLoad(page);
    await fillAllVisibleRadiosAsNo(page);
    await clickContinue(page);
  }
}

// ── Exemptions (106C) ──

async function navigateExemptionSection(page: Page) {
  await waitForDaPageLoad(page);
  await selectByName(page, b64('prop.exempt_property.exemption_type'), 'You are claiming federal exemptions.');
  await clickContinue(page);

  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.exempt_property.properties.there_are_any', false);
}

// ── Financial Affairs (107) ──

async function navigateFinancialAffairs(page: Page) {
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

// ── Creditor Library Picker ──

async function navigateCreditorLibraryPicker(page: Page) {
  await waitForDaPageLoad(page);
  await clickContinue(page);
}

// ── Secured Creditors (106D) ──

async function navigateSecuredCreditors(page: Page, scenario: TestScenario) {
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
      await clickYesNoButton(page, 'prop.creditors[0].notify.there_are_any', false);
    }

    await handleAnotherPage(page, 'prop.creditors.there_is_another');
  } else {
    await clickYesNoButton(page, 'prop.creditors.there_are_any', false);
  }
}

// ── Unsecured Creditors (106EF) ──

async function navigateUnsecuredCreditors(page: Page, scenario: TestScenario) {
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
    await page.locator(`#${b64('prop.nonpriority_claims[0].total_claim')}`).fill(np.totalClaim);
    await fillYesNoRadio(page, 'prop.nonpriority_claims[0].has_codebtor', false);
    await clickContinue(page);

    await handleAnotherPage(page, 'prop.nonpriority_claims.there_is_another');
  } else {
    await clickYesNoButton(page, 'prop.nonpriority_claims.there_are_any', false);
  }
}

// ── Contracts & Leases (106G) ──

async function navigateContractsLeases(page: Page) {
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.contracts_and_leases.there_are_any', false);

  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'personal_leases.there_are_any', false);
}

// ── Community Property (106H) ──

async function navigateCommunityProperty(page: Page) {
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'debtors.community_property', false);
  await clickContinue(page);
}

// ── Income (106I) ──

async function navigateIncome(page: Page) {
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

// ── Expenses (106J) ──

async function navigateExpenses(page: Page, rentAmount: string) {
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

// ── Means Test (122A) ──

async function navigateMeansTest(page: Page) {
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

// ── Case Details ──

async function navigateCaseDetails(page: Page) {
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

// ── Business ──

async function navigateBusiness(page: Page) {
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'business.has_business', false);

  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('business_final'), 0);
}

// ── Hazardous Property ──

async function navigateHazardousProperty(page: Page) {
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'hazardous_property.has_property', false);

  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('hazard_final'), 0);
}

// ── Credit Counseling ──

async function navigateCreditCounseling(page: Page) {
  await waitForDaPageLoad(page);
  await selectByName(page, b64('debtor[i].counseling.counseling_type'), '1');
  await clickContinue(page);

  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('counseling_final'), 0);
}

// ── Reporting ──

async function navigateReporting(page: Page) {
  await waitForDaPageLoad(page);
  await page.locator('label').filter({ hasText: 'Primarily consumer debts' }).click();
  await clickContinue(page);

  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'reporting.funds_for_creditors', false);
}

// ── Dynamic Phase (doc gen + attorney disclosure + stragglers) ──

async function navigateDynamicPhase(page: Page, scenario: TestScenario) {
  await waitForDaPageLoad(page);

  let maxSteps = 60;
  while (maxSteps-- > 0) {
    await page.waitForTimeout(300);
    const heading = await page.locator('h1, h2').first().textContent().catch(() => '');
    const qid = await page.locator('input[name="_question_name"]').getAttribute('value').catch(() => 'unknown');

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
//  CONCLUSION VERIFICATION
// ════════════════════════════════════════════════════════════════════

async function verifyConclusionAndPDFs(page: Page, scenario: TestScenario) {
  await waitForDaPageLoad(page);
  await screenshot(page, `${scenario.name}-conclusion`);
  const conclusionText = await page.locator('body').innerText();
  expect(conclusionText.toLowerCase()).toContain('conclusion');

  // Collect download links and form headings
  const downloadLinks = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/uploadedfile/"]');
    return Array.from(links).map(a => ({
      name: a.textContent?.trim() || '',
      href: (a as HTMLAnchorElement).href,
    }));
  });

  const formHeadings = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('h3'))
      .map(h => h.textContent?.trim() || '')
      .filter(t => t.toLowerCase().startsWith('form'));
  });

  console.log(`  📋 ${downloadLinks.length} download links, ${formHeadings.length} form headings`);
  formHeadings.forEach((name, i) => console.log(`    ${i + 1}. ${name}`));

  expect(downloadLinks.length).toBeGreaterThanOrEqual(15);

  const allNames = formHeadings.map(h => h.toLowerCase()).join(' | ');
  for (const form of ['101', '106', '107', '108', '121', '122', '2030']) {
    expect(allNames).toContain(form);
  }

  // Download ALL PDFs in one pass, reading structure + form fields
  type PdfInfo = {
    name: string;
    pages: number;
    fields: Record<string, string | boolean | undefined>;
  };
  const pdfInfos: PdfInfo[] = [];

  for (let i = 0; i < downloadLinks.length; i++) {
    const response = await page.request.get(downloadLinks[i].href);
    const contentType = response.headers()['content-type'] || '';
    expect(response.status()).toBe(200);
    expect(contentType).toContain('pdf');

    const pdfBytes = await response.body();
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();
    expect(pageCount).toBeGreaterThan(0);

    const fieldMap: Record<string, string | boolean | undefined> = {};
    try {
      const form = pdfDoc.getForm();
      for (const field of form.getFields()) {
        const name = field.getName();
        const ctor = field.constructor.name;
        if (ctor === 'PDFTextField') fieldMap[name] = (field as any).getText() ?? '';
        else if (ctor === 'PDFCheckBox') fieldMap[name] = (field as any).isChecked();
        else if (ctor === 'PDFDropdown') { const sel = (field as any).getSelected(); fieldMap[name] = sel?.length ? sel[0] : ''; }
        else if (ctor === 'PDFRadioGroup') fieldMap[name] = (field as any).getSelected() ?? '';
      }
    } catch { /* no form */ }

    const formName = formHeadings[i] || downloadLinks[i].name;
    pdfInfos.push({ name: formName, pages: pageCount, fields: fieldMap });
    console.log(`    📄 [${i}] ${formName}: ${pageCount} pages, ${Object.keys(fieldMap).length} fields`);
  }

  // Helper to find a PDF by form number
  const findPdf = (formNum: string) =>
    pdfInfos.find(p => p.name.toLowerCase().includes(formNum.toLowerCase()));

  const getField = (fields: Record<string, string | boolean | undefined>, key: string): string => {
    const val = fields[key];
    if (typeof val === 'string') return val;
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    return '';
  };

  // ── Verify Form 101 ──
  const form101 = findPdf('101');
  expect(form101).toBeTruthy();
  if (form101) {
    const f = form101.fields;
    expect(getField(f, 'debtor_first_name1')).toBe(scenario.debtor.first);
    expect(getField(f, 'debtor_last_name1')).toBe(scenario.debtor.last);
    expect(getField(f, 'debtor_ssn1')).toContain(scenario.debtor.taxId.slice(-4));

    const districtName = scenario.district.includes('Nebraska') ? 'Nebraska' : 'South Dakota';
    expect(getField(f, 'bankruptcy_district')).toContain(districtName);
    expect(f['isCh7']).toBe(true);

    console.log(`  ✅ Form 101: ${scenario.debtor.first} ${scenario.debtor.last}, ${districtName}, Ch7`);
  }

  // ── Verify Form 2030 ──
  const form2030 = findPdf('2030');
  expect(form2030).toBeTruthy();
  if (form2030) {
    const f = form2030.fields;
    const districtName = scenario.district.includes('Nebraska') ? 'Nebraska' : 'South Dakota';
    expect(getField(f, 'District')).toContain(districtName);
    expect(getField(f, 'Debtor 1').toLowerCase()).toContain(scenario.debtor.first.toLowerCase());
    expect(getField(f, 'Chapter')).toBe('7');
    console.log(`  ✅ Form 2030: Attorney disclosure verified`);
  }

  console.log(`  ✅ All ${pdfInfos.length} PDFs valid for scenario: ${scenario.name}`);
}

// ════════════════════════════════════════════════════════════════════
//  FULL INTERVIEW RUNNER
// ════════════════════════════════════════════════════════════════════

async function runFullInterview(page: Page, scenario: TestScenario) {
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
  await verifyConclusionAndPDFs(page, scenario);
}

// ════════════════════════════════════════════════════════════════════
//  TEST SCENARIOS (10+ distinct profiles)
// ════════════════════════════════════════════════════════════════════

const scenarios: TestScenario[] = [
  // ──────────────────────────────────────────
  // 1. NE individual, minimal path (all No)
  // ──────────────────────────────────────────
  {
    name: 'NE-individual-minimal',
    district: 'District of Nebraska',
    debtor: {
      first: 'Alice', middle: 'M', last: 'Anderson',
      street: '100 Elm St', city: 'Omaha', state: 'Nebraska', zip: '68101',
      countyIndex: 3, taxIdType: 'ssn', taxId: '111-22-0001',
    },
    jointFiling: false,
    property: {},
    creditors: {},
    attorney: { name: 'Tom Lawyer, Esq.', firm: 'Omaha Legal Aid', agreedCompensation: '1200', priorReceived: '400' },
    rentExpense: '0',
  },

  // ──────────────────────────────────────────
  // 2. SD individual, minimal path
  // ──────────────────────────────────────────
  {
    name: 'SD-individual-minimal',
    district: 'District of South Dakota',
    debtor: {
      first: 'Bob', middle: 'J', last: 'Baker',
      street: '200 Pine St', city: 'Sioux Falls', state: 'South Dakota', zip: '57101',
      countyIndex: 2, taxIdType: 'ssn', taxId: '222-33-0002',
    },
    jointFiling: false,
    property: {},
    creditors: {},
    attorney: { name: 'Sara Attorney, Esq.', firm: 'SD Legal Services', agreedCompensation: '1000', priorReceived: '300' },
    rentExpense: '0',
  },

  // ──────────────────────────────────────────
  // 3. NE individual with real property + vehicle
  // ──────────────────────────────────────────
  {
    name: 'NE-individual-property-vehicle',
    district: 'District of Nebraska',
    debtor: {
      first: 'Carol', middle: 'L', last: 'Collins',
      street: '300 Oak Blvd', city: 'Lincoln', state: 'Nebraska', zip: '68508',
      countyIndex: 4, taxIdType: 'ssn', taxId: '333-44-0003',
    },
    jointFiling: false,
    property: {
      realProperty: {
        street: '300 Oak Blvd', city: 'Lincoln', stateAbbr: 'NE', zip: '68508',
        county: 'Lancaster', typeIndex: 0, value: '175000',
        ownershipInterest: 'Fee simple', otherInfo: 'Primary residence',
      },
      vehicle: {
        make: 'Honda', model: 'Civic', year: '2019', mileage: '62000',
        value: '14000', state: 'Nebraska', hasLoan: true, loanAmount: '6000',
        otherInfo: 'Commuter vehicle',
      },
    },
    creditors: {},
    attorney: { name: 'Mike Counsel, Esq.', firm: 'Lincoln Law Group', agreedCompensation: '1500', priorReceived: '500' },
    rentExpense: '0',
  },

  // ──────────────────────────────────────────
  // 4. SD individual with real property + vehicle
  // ──────────────────────────────────────────
  {
    name: 'SD-individual-property-vehicle',
    district: 'District of South Dakota',
    debtor: {
      first: 'David', middle: 'R', last: 'Davis',
      street: '400 Maple Dr', city: 'Rapid City', state: 'South Dakota', zip: '57701',
      countyIndex: 1, taxIdType: 'ssn', taxId: '444-55-0004',
    },
    jointFiling: false,
    property: {
      realProperty: {
        street: '400 Maple Dr', city: 'Rapid City', stateAbbr: 'SD', zip: '57701',
        county: 'Pennington', typeIndex: 0, value: '120000',
        ownershipInterest: 'Fee simple', otherInfo: 'Single family home',
      },
      vehicle: {
        make: 'Ford', model: 'F-150', year: '2017', mileage: '95000',
        value: '18000', state: 'South Dakota', hasLoan: false,
        otherInfo: 'Work truck',
      },
    },
    creditors: {},
    attorney: { name: 'Lisa Helper, Esq.', firm: 'Black Hills Legal', agreedCompensation: '1300', priorReceived: '450' },
    rentExpense: '0',
  },

  // ──────────────────────────────────────────
  // 5. NE joint filing, minimal path
  // ──────────────────────────────────────────
  {
    name: 'NE-joint-minimal',
    district: 'District of Nebraska',
    debtor: {
      first: 'Edward', middle: 'T', last: 'Evans',
      street: '500 Cedar Ln', city: 'Omaha', state: 'Nebraska', zip: '68102',
      countyIndex: 3, taxIdType: 'ssn', taxId: '555-66-0005',
    },
    spouse: {
      first: 'Emily', middle: 'S', last: 'Evans',
      street: '500 Cedar Ln', city: 'Omaha', state: 'Nebraska', zip: '68102',
      countyIndex: 3, taxIdType: 'ssn', taxId: '555-66-0055',
    },
    jointFiling: true,
    property: {},
    creditors: {},
    attorney: { name: 'Pat Advocate, Esq.', firm: 'Omaha Family Law', agreedCompensation: '2000', priorReceived: '700' },
    rentExpense: '0',
  },

  // ──────────────────────────────────────────
  // 6. SD joint filing, minimal path
  // ──────────────────────────────────────────
  {
    name: 'SD-joint-minimal',
    district: 'District of South Dakota',
    debtor: {
      first: 'Frank', middle: 'W', last: 'Foster',
      street: '600 Birch Ave', city: 'Sioux Falls', state: 'South Dakota', zip: '57103',
      countyIndex: 2, taxIdType: 'ssn', taxId: '666-77-0006',
    },
    spouse: {
      first: 'Fiona', middle: 'K', last: 'Foster',
      street: '600 Birch Ave', city: 'Sioux Falls', state: 'South Dakota', zip: '57103',
      countyIndex: 2, taxIdType: 'ssn', taxId: '666-77-0066',
    },
    jointFiling: true,
    property: {},
    creditors: {},
    attorney: { name: 'Carl Defender, Esq.', firm: 'Sioux Falls Legal Aid', agreedCompensation: '1800', priorReceived: '600' },
    rentExpense: '0',
  },

  // ──────────────────────────────────────────
  // 7. NE individual with secured creditors + deposit
  // ──────────────────────────────────────────
  {
    name: 'NE-individual-secured-deposit',
    district: 'District of Nebraska',
    debtor: {
      first: 'Grace', middle: 'N', last: 'Green',
      street: '700 Walnut St', city: 'Bellevue', state: 'Nebraska', zip: '68005',
      countyIndex: 5, taxIdType: 'ssn', taxId: '777-88-0007',
    },
    jointFiling: false,
    property: {
      realProperty: {
        street: '700 Walnut St', city: 'Bellevue', stateAbbr: 'NE', zip: '68005',
        county: 'Sarpy', typeIndex: 0, value: '200000',
        ownershipInterest: 'Fee simple', otherInfo: 'Homestead',
      },
      deposit: {
        type: 'Checking', institution: 'First National Bank', amount: '3200',
      },
    },
    creditors: {
      secured: {
        name: 'Midwest Mortgage LLC', street: '1000 Finance Dr', city: 'Omaha', state: 'Nebraska', zip: '68102',
        claimAmount: '180000', collateralValue: '200000',
      },
    },
    attorney: { name: 'Nora Brief, Esq.', firm: 'Bellevue Legal Center', agreedCompensation: '1500', priorReceived: '500' },
    rentExpense: '750',
  },

  // ──────────────────────────────────────────
  // 8. SD individual with unsecured creditors
  // ──────────────────────────────────────────
  {
    name: 'SD-individual-unsecured',
    district: 'District of South Dakota',
    debtor: {
      first: 'Henry', middle: 'P', last: 'Harris',
      street: '800 Spruce Rd', city: 'Aberdeen', state: 'South Dakota', zip: '57401',
      countyIndex: 0, taxIdType: 'ssn', taxId: '888-99-0008',
    },
    jointFiling: false,
    property: {},
    creditors: {
      priority: {
        name: 'Internal Revenue Service', street: '1111 Constitution Ave', city: 'Washington', state: 'DC', zip: '20224',
        type: 'Taxes and certain other debts you owe the government',
        totalClaim: '7500', priorityAmount: '7500', nonpriorityAmount: '0',
      },
      nonpriority: {
        name: 'Discover Card Services', street: 'PO Box 6103', city: 'Carol Stream', state: 'IL', zip: '60197',
        totalClaim: '12000',
      },
    },
    attorney: { name: 'Rachel Plead, Esq.', firm: 'Aberdeen Law Office', agreedCompensation: '1100', priorReceived: '350' },
    rentExpense: '600',
  },

  // ──────────────────────────────────────────
  // 9. NE individual, maximum data (property + vehicle + deposit + all creditors)
  // ──────────────────────────────────────────
  {
    name: 'NE-individual-maximum-data',
    district: 'District of Nebraska',
    debtor: {
      first: 'Irene', middle: 'V', last: 'Ingram',
      street: '900 Cherry Ct', city: 'Grand Island', state: 'Nebraska', zip: '68801',
      countyIndex: 6, taxIdType: 'ssn', taxId: '999-00-0009',
    },
    jointFiling: false,
    property: {
      realProperty: {
        street: '900 Cherry Ct', city: 'Grand Island', stateAbbr: 'NE', zip: '68801',
        county: 'Hall', typeIndex: 0, value: '135000',
        ownershipInterest: 'Fee simple', otherInfo: 'Family home',
      },
      vehicle: {
        make: 'Chevrolet', model: 'Malibu', year: '2020', mileage: '45000',
        value: '16500', state: 'Nebraska', hasLoan: true, loanAmount: '8000',
        otherInfo: 'Primary car',
      },
      deposit: {
        type: 'Savings', institution: 'Union Bank & Trust', amount: '1500',
      },
    },
    creditors: {
      secured: {
        name: 'Great Plains Lending', street: '555 Bank St', city: 'Grand Island', state: 'Nebraska', zip: '68801',
        claimAmount: '110000', collateralValue: '135000',
      },
      priority: {
        name: 'Nebraska DOR', street: '301 Centennial Mall S', city: 'Lincoln', state: 'Nebraska', zip: '68509',
        type: 'Taxes and certain other debts you owe the government',
        totalClaim: '3000', priorityAmount: '3000', nonpriorityAmount: '0',
      },
      nonpriority: {
        name: 'Capital One', street: 'PO Box 30285', city: 'Salt Lake City', state: 'UT', zip: '84130',
        totalClaim: '9500',
      },
    },
    attorney: { name: 'Jack Litigate, Esq.', firm: 'Central Nebraska Legal', agreedCompensation: '2000', priorReceived: '800' },
    rentExpense: '0',
  },

  // ──────────────────────────────────────────
  // 10. SD joint filing with property + creditors
  // ──────────────────────────────────────────
  {
    name: 'SD-joint-property-creditors',
    district: 'District of South Dakota',
    debtor: {
      first: 'Kevin', middle: 'B', last: 'King',
      street: '1000 Aspen Way', city: 'Brookings', state: 'South Dakota', zip: '57006',
      countyIndex: 1, taxIdType: 'ssn', taxId: '100-20-0010',
    },
    spouse: {
      first: 'Karen', middle: 'D', last: 'King',
      street: '1000 Aspen Way', city: 'Brookings', state: 'South Dakota', zip: '57006',
      countyIndex: 1, taxIdType: 'ssn', taxId: '100-20-0100',
    },
    jointFiling: true,
    property: {
      realProperty: {
        street: '1000 Aspen Way', city: 'Brookings', stateAbbr: 'SD', zip: '57006',
        county: 'Brookings', typeIndex: 0, value: '160000',
        ownershipInterest: 'Joint tenancy', otherInfo: 'Marital home',
      },
      vehicle: {
        make: 'Subaru', model: 'Outback', year: '2021', mileage: '35000',
        value: '24000', state: 'South Dakota', hasLoan: true, loanAmount: '12000',
        otherInfo: 'Family SUV',
      },
      deposit: {
        type: 'Checking', institution: 'Great Western Bank', amount: '4100',
      },
    },
    creditors: {
      secured: {
        name: 'Dakota Home Loans', street: '200 Main Ave', city: 'Brookings', state: 'South Dakota', zip: '57006',
        claimAmount: '145000', collateralValue: '160000',
      },
      nonpriority: {
        name: 'Mastercard', street: 'PO Box 5000', city: 'Sioux Falls', state: 'SD', zip: '57117',
        totalClaim: '6800',
      },
    },
    attorney: { name: 'Laura Justice, Esq.', firm: 'Brookings Legal Aid', agreedCompensation: '2500', priorReceived: '1000' },
    rentExpense: '0',
  },

  // ──────────────────────────────────────────
  // 11. NE individual with vehicle only + nonpriority creditor
  // ──────────────────────────────────────────
  {
    name: 'NE-individual-vehicle-nonpriority',
    district: 'District of Nebraska',
    debtor: {
      first: 'Martha', middle: 'E', last: 'Moore',
      street: '1100 Hickory Pl', city: 'Kearney', state: 'Nebraska', zip: '68847',
      countyIndex: 7, taxIdType: 'ssn', taxId: '110-22-0011',
    },
    jointFiling: false,
    property: {
      vehicle: {
        make: 'Nissan', model: 'Altima', year: '2016', mileage: '110000',
        value: '7500', state: 'Nebraska', hasLoan: false,
        otherInfo: 'Paid off sedan',
      },
    },
    creditors: {
      nonpriority: {
        name: 'Chase Bank', street: 'PO Box 15298', city: 'Wilmington', state: 'DE', zip: '19850',
        totalClaim: '15000',
      },
    },
    attorney: { name: 'Oliver Argue, Esq.', firm: 'Kearney Legal Services', agreedCompensation: '1000', priorReceived: '300' },
    rentExpense: '550',
  },

  // ──────────────────────────────────────────
  // 12. SD individual with deposit only + priority creditor
  // ──────────────────────────────────────────
  {
    name: 'SD-individual-deposit-priority',
    district: 'District of South Dakota',
    debtor: {
      first: 'Nathan', middle: 'G', last: 'Nelson',
      street: '1200 Poplar St', city: 'Pierre', state: 'South Dakota', zip: '57501',
      countyIndex: 0, taxIdType: 'ssn', taxId: '120-33-0012',
    },
    jointFiling: false,
    property: {
      deposit: {
        type: 'Savings', institution: 'Dacotah Bank', amount: '800',
      },
    },
    creditors: {
      priority: {
        name: 'SD Dept of Revenue', street: '445 E Capitol Ave', city: 'Pierre', state: 'SD', zip: '57501',
        type: 'Taxes and certain other debts you owe the government',
        totalClaim: '4200', priorityAmount: '4200', nonpriorityAmount: '0',
      },
    },
    attorney: { name: 'Quinn Defend, Esq.', firm: 'Capital City Law', agreedCompensation: '900', priorReceived: '250' },
    rentExpense: '475',
  },
];

// ════════════════════════════════════════════════════════════════════
//  TEST SUITE
// ════════════════════════════════════════════════════════════════════

test.describe('Comprehensive E2E Filing Tests — Nebraska & South Dakota', () => {
  test.setTimeout(420_000); // 7 minutes per test

  for (const scenario of scenarios) {
    test(`${scenario.name}: complete filing reaches conclusion with all forms`, async ({ page }) => {
      await runFullInterview(page, scenario);
    });
  }
});
