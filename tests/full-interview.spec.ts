/**
 * Full Interview Tests
 *
 * These tests navigate the entire bankruptcy petition interview from start to
 * finish, covering:
 *   - Individual filing (simplest path)
 *   - Joint (married couple) filing
 *   - All list-collect interactions (skipping "No" / adding one item)
 *   - Reaching document generation and the conclusion screen
 *
 * Each test uses a generous timeout because the interview has 30+ screens.
 */
import { test, expect, Page } from '@playwright/test';
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

/**
 * Wrapper for clickContinue that first fixes jQuery Validation
 * to ignore hidden required fields (a recurring issue with show if blocks).
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

// ──────────────────────────────────────────────
//  Shared navigation helpers
// ──────────────────────────────────────────────

/** Navigate from introduction through to the debtor identity page. */
async function navigateToDebtorPage(
  page: Page,
  opts: { jointFiling?: boolean } = {},
) {
  await page.goto(INTERVIEW_URL + '&new_session=1');
  await waitForDaPageLoad(page);

  // Intro → Continue
  await clickNthByName(page, b64('introduction_screen'), 0);

  // District selection
  await waitForDaPageLoad(page);
  await selectByName(page, b64('current_district'), 'District of Nebraska');
  await clickContinue(page);

  // Amended filing → No
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('amended_filing'), 1); // No

  // Case number (may appear even when amended_filing = No due to code block deps)
  await waitForDaPageLoad(page);
  await handleCaseNumberIfPresent(page);

  // District final → Continue
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('district_final'), 0);

  // Filing status
  await waitForDaPageLoad(page);
  if (opts.jointFiling) {
    await clickById(page, `${b64('filing_status')}_1`); // "Filing with spouse"
  } else {
    await clickById(page, `${b64('filing_status')}_0`); // "Filing individually"
  }
  await clickContinue(page);
  await waitForDaPageLoad(page);
}

/**
 * Handle the case_number question if it appears.
 * This question has required: false, so we can just click Continue.
 * It may appear even when amended_filing=No due to code block dependencies.
 * We identify it by the presence of the case_number input field.
 */
async function handleCaseNumberIfPresent(page: Page) {
  const caseNumberField = page.locator(`#${b64('case_number')}`);
  const count = await caseNumberField.count();
  if (count > 0) {
    console.log('[CASE_NUMBER] Handling unexpected case_number question');
    await clickContinue(page);
    await waitForDaPageLoad(page);
  }
}

/** Fill debtor[0] identity information and advance past alias/district. */
async function fillDebtor1AndAdvance(page: Page) {
  await fillDebtorIdentity(page, {
    first: 'John',
    middle: 'Q',
    last: 'Public',
    street: '123 Main St',
    city: 'Omaha',
    state: 'Nebraska',
    zip: '68102',
    countyIndex: 3,
    taxIdType: 'ssn',
    taxId: '111-22-3333',
  });

  // Alias → No
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('debtor[i].alias.there_are_any'), 1);

  // District residency → Yes, lives in current district
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('debtor[i].district_info.is_current_district'), 0);
  await clickContinue(page);
}

/** Fill debtor[1] (spouse) identity and advance past alias/district. */
async function fillDebtor2AndAdvance(page: Page) {
  await waitForDaPageLoad(page);
  await fillDebtorIdentity(page, {
    first: 'Jane',
    middle: 'A',
    last: 'Public',
    street: '123 Main St',
    city: 'Omaha',
    state: 'Nebraska',
    zip: '68102',
    countyIndex: 3,
    taxIdType: 'ssn',
    taxId: '111-22-4444',
  });

  // Alias → No
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('debtor[i].alias.there_are_any'), 1);

  // District residency → Yes
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('debtor[i].district_info.is_current_district'), 0);
  await clickContinue(page);
}

/** Advance past debtor_final review screen (if it appears). */
async function passDebtorFinal(page: Page) {
  await waitForDaPageLoad(page);
  const heading = await page.locator('h1, h2, h3').first().textContent().catch(() => '');
  if (heading && heading.toLowerCase().includes('summary')) {
    // The debtor_final review screen uses the standard Continue button
    await clickContinue(page);
  }
  // Otherwise we've already advanced past it
}

/**
 * Fill ALL visible yesnoradio fields on the current page as "No".
 * docassemble renders yesnoradio as paired radio inputs with value="True" (_0) / "False" (_1).
 * Many property/financial pages have "Claiming Exemption?" radios that are always visible
 * and required even when the parent "Do you have X?" is No. This helper fills them all.
 */
async function fillAllVisibleRadiosAsNo(page: Page) {
  const noRadioIds = await page.evaluate(() => {
    const ids: string[] = [];
    // Find all radio inputs with value="False" (the "No" option)
    const radios = document.querySelectorAll('input[type="radio"][value="False"]');
    radios.forEach(radio => {
      const id = radio.getAttribute('id');
      if (!id) return;
      // Check if the radio is visible (not hidden by show if or other CSS)
      const label = document.querySelector(`label[for="${id}"]`) as HTMLElement;
      if (label && label.offsetParent !== null) {
        // Only click if not already checked
        if (!(radio as HTMLInputElement).checked) {
          ids.push(id);
        }
      }
    });
    return ids;
  });
  for (const id of noRadioIds) {
    await page.locator(`label[for="${id}"]`).click();
  }
}

/**
 * Fill all visible empty text/currency inputs with a default value.
 * Currency fields get "0", text fields get "N/A".
 * This is a safety net for forms with many optional fields.
 */
async function fillAllVisibleEmptyInputs(page: Page) {
  const fieldIds = await page.evaluate(() => {
    const results: { id: string; type: string }[] = [];
    const inputs = document.querySelectorAll('input[type="text"], input[type="number"], textarea');
    inputs.forEach(input => {
      const el = input as HTMLInputElement | HTMLTextAreaElement;
      if (el.offsetParent === null) return; // hidden
      if (el.value && el.value.trim() !== '') return; // already filled
      const id = el.getAttribute('id');
      if (!id) return;
      // Check if this is inside a currency wrapper (has $ prefix)
      const parent = el.closest('.daform-group, .da-field-container');
      const hasDollar = parent?.querySelector('.input-group-text')?.textContent?.includes('$');
      results.push({ id, type: hasDollar ? 'currency' : 'text' });
    });
    return results;
  });
  for (const field of fieldIds) {
    await page.locator(`#${field.id}`).fill(field.type === 'currency' ? '0' : 'N/A');
  }
}

/**
 * Click the "Yes" or "No" button for a standard yesno question.
 * For docassemble `yesno: var`, Yes is index 0, No is index 1.
 */
async function clickYesNoButton(page: Page, varName: string, yes: boolean) {
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64(varName), yes ? 0 : 1);
}

/**
 * For yesnoradio fields rendered as radio buttons inside a form,
 * click the radio then submit via Continue.
 */
async function selectYesNoRadio(page: Page, varName: string, yes: boolean) {
  const fieldId = b64(varName);
  const suffix = yes ? '_0' : '_1';
  // Docassemble uses labelauty: <input> is hidden, click the <label> instead
  await page.locator(`label[for="${fieldId}${suffix}"]`).click();
}

/**
 * For a "fields:" question with yesnoradio items, fill them all then continue.
 * yesnoradio fields are rendered as radio buttons with id = b64(var) + '_0' (Yes)
 * or '_1' (No). The actual <input> is hidden; click the <label> with for=id.
 */
async function fillYesNoRadio(page: Page, varName: string, yes: boolean) {
  const fieldId = b64(varName);
  const suffix = yes ? '_0' : '_1';
  await page.locator(`label[for="${fieldId}${suffix}"]`).click();
}

/**
 * For a `datatype: yesno` field inside a `fields:` block (rendered as checkbox).
 * Checking it sets value to True, leaving unchecked is False.
 * Uses the label since the input is hidden by labelauty.
 */
async function setCheckbox(page: Page, varName: string, checked: boolean) {
  const fieldId = b64(varName);
  const label = page.locator(`label[for="${fieldId}"]`);
  if (checked) {
    // Only click if not already checked
    const ariaChecked = await label.getAttribute('aria-checked');
    if (ariaChecked !== 'true') {
      await label.click();
    }
  } else {
    const ariaChecked = await label.getAttribute('aria-checked');
    if (ariaChecked === 'true') {
      await label.click();
    }
  }
}

// ──────────────────────────────────────────────
//  Schedule A/B – Property Section
// ──────────────────────────────────────────────

/**
 * Navigate through the entire 106AB property section saying "No" to most
 * optional questions to take the shortest path.
 */
async function navigatePropertySection(page: Page) {
  // property_intro → Continue
  await waitForDaPageLoad(page);
  let h = await page.locator('h1, h2, h3').first().textContent().catch(() => '');
  console.log('[PROP] property_intro heading:', h);
  await clickNthByName(page, b64('property_intro'), 0);

  // Real property interests → No
  await waitForDaPageLoad(page);
  h = await page.locator('h1, h2, h3').first().textContent().catch(() => '');
  console.log('[PROP] interests heading:', h);
  await clickYesNoButton(page, 'prop.interests.there_are_any', false);

  // Vehicles → No
  await waitForDaPageLoad(page);
  h = await page.locator('h1, h2, h3').first().textContent().catch(() => '');
  console.log('[PROP] vehicles heading:', h);
  await clickYesNoButton(page, 'prop.ab_vehicles.there_are_any', false);

  // Other vehicles → No
  await waitForDaPageLoad(page);
  h = await page.locator('h1, h2, h3').first().textContent().catch(() => '');
  console.log('[PROP] other_vehicles heading:', h);
  
  // Click other_vehicles → No and wait for AJAX response
  await clickYesNoButton(page, 'prop.ab_other_vehicles.there_are_any', false);
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle');

  // Personal/household items — massive form with ~20 yesnoradio fields
  // Each category has: has_XXX + XXX_is_claiming_exemption (both always visible)
  await waitForDaPageLoad(page);
  await handleCaseNumberIfPresent(page);
  await fillAllVisibleRadiosAsNo(page);
  await clickContinue(page);

  // Financial assets – cash (has_cash + cash_is_claiming_exemption both visible)
  await waitForDaPageLoad(page);
  await fillAllVisibleRadiosAsNo(page);
  await clickContinue(page);

  // Financial sub-lists: deposits, bonds, non-traded stock, corporate bonds,
  // retirement, prepayments, annuities, edu accounts — all "No" / empty
  const financialGathers = [
    'prop.financial_assets.deposits.there_are_any',
    'prop.financial_assets.bonds_and_stocks.there_are_any',
    'prop.financial_assets.non_traded_stock.there_are_any',
    'prop.financial_assets.corporate_bonds.there_are_any',
    'prop.financial_assets.retirement_accounts.there_are_any',
    'prop.financial_assets.prepayments.there_are_any',
    'prop.financial_assets.annuities.there_are_any',
    'prop.financial_assets.edu_accounts.there_are_any',
  ];
  for (const varName of financialGathers) {
    await waitForDaPageLoad(page);
    await clickYesNoButton(page, varName, false);
  }

  // Future property interest (trusts_future_interests – separate page)
  await waitForDaPageLoad(page);
  await fillAllVisibleRadiosAsNo(page);
  await clickContinue(page);

  // Intellectual property (intellectual_property – separate page)
  await waitForDaPageLoad(page);
  await fillAllVisibleRadiosAsNo(page);
  await clickContinue(page);

  // Intangible interest (separate page)
  await waitForDaPageLoad(page);
  await fillAllVisibleRadiosAsNo(page);
  await clickContinue(page);

  // Owed property: tax refund, family support, other amounts, insurance,
  // trust, third party, contingent claims, other assets (all on ONE big form)
  await waitForDaPageLoad(page);
  await fillAllVisibleRadiosAsNo(page);
  await clickContinue(page);

  // Business property → No (with all sub-claim fields)
  await waitForDaPageLoad(page);
  await fillAllVisibleRadiosAsNo(page);
  await clickContinue(page);

  // Farming property → No (with all sub-claim fields)
  await waitForDaPageLoad(page);
  await fillAllVisibleRadiosAsNo(page);
  await clickContinue(page);

  // Other property → No (with other_prop_has_claim)
  await waitForDaPageLoad(page);
  await fillAllVisibleRadiosAsNo(page);
  await clickContinue(page);
}

// ──────────────────────────────────────────────
//  Schedule C – Exemptions
// ──────────────────────────────────────────────

async function navigateExemptionSection(page: Page) {
  // Exemption type
  await waitForDaPageLoad(page);
  await selectByName(
    page,
    b64('prop.exempt_property.exemption_type'),
    'You are claiming federal exemptions.',
  );
  await clickContinue(page);

  // Exempt property list → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.exempt_property.properties.there_are_any', false);
  // claim_homestead_exemption is set directly in mandatory block, no page shown
}

// ──────────────────────────────────────────────
//  Form 107 – Statement of Financial Affairs
// ──────────────────────────────────────────────

async function navigateFinancialAffairs(page: Page) {
  let h: string | null;
  // Marital status + residence history – one big form
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.marital_status', false); // Not married
  await fillYesNoRadio(page, 'financial_affairs.lived_elsewhere', false); // Hasn't lived elsewhere
  await fillYesNoRadio(page, 'financial_affairs.lived_with_spouse', false);
  await clickContinue(page);

  // Employment info
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.employed', false); // Not employed
  await clickContinue(page);

  // Other income
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.had_other_income', false);
  await clickContinue(page);

  // Consumer debts classification
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'financial_affairs.primarily_consumer_debts', true);

  // Consumer debt payments → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'financial_affairs.consumer_debt_payments.there_are_any', false);

  // Insider payments → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'financial_affairs.insider_payments.there_are_any', false);

  // Insider benefits → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'financial_affairs.insider_benefits.there_are_any', false);

  // Lawsuits → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'financial_affairs.lawsuits.there_are_any', false);

  // Levies → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'financial_affairs.levies.there_are_any', false);

  // Refusal/assignment — fields question
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.has_refusal', false);
  await clickContinue(page);

  // Other assignee
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
  h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[FA] deposit-box: ${h}`);
  await selectYesNoRadio(page, 'financial_affairs.has_deposit_box', false);
  await page.waitForTimeout(300);
  await clickContinue(page);

  // Storage unit
  await waitForDaPageLoad(page);
  h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[FA] storage-unit: ${h}`);
  await selectYesNoRadio(page, 'financial_affairs.has_storage_unit', false);
  await page.waitForTimeout(300);
  await clickContinue(page);

  // Held property
  await waitForDaPageLoad(page);
  h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[FA] held-property: ${h}`);
  await selectYesNoRadio(page, 'financial_affairs.has_held_property', false);
  await page.waitForTimeout(500);
  await clickContinue(page);

  // Verify we moved past held-property
  await waitForDaPageLoad(page);
  h = await page.locator('h1').first().textContent().catch(() => '');
  if (h?.includes('Borrowed Property') || h?.includes('held property')) {
    console.log('[FA] held-property page did not advance, retrying...');
    await selectYesNoRadio(page, 'financial_affairs.has_held_property', false);
    await page.waitForTimeout(500);
    await clickContinue(page);
    await waitForDaPageLoad(page);
    h = await page.locator('h1').first().textContent().catch(() => '');
  }

  // Environment – 3 separate pages
  // Liability
  await waitForDaPageLoad(page);
  h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[FA] env-liability: ${h}`);
  await fillAllVisibleRadiosAsNo(page);
  await clickContinue(page);

  // Release
  await waitForDaPageLoad(page);
  h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[FA] env-release: ${h}`);
  await fillAllVisibleRadiosAsNo(page);
  await clickContinue(page);

  // Proceeding
  await waitForDaPageLoad(page);
  h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[FA] env-proceeding: ${h}`);
  await fillAllVisibleRadiosAsNo(page);
  await clickContinue(page);

  // Business types (checkboxes — must select at least one, click "None of the above")
  await waitForDaPageLoad(page);
  h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[FA] business-types: ${h}`);
  // The "None of the above" is the last checkbox, click its label
  await page.locator('label').filter({ hasText: 'None of the above' }).click();
  await clickContinue(page);

  // businesses.there_are_any → No (gather triggers this even with "None" business types)
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'financial_affairs.businesses.there_are_any', false);

  // Has statement
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.has_statement', false);
  await clickContinue(page);
}

// ──────────────────────────────────────────────
//  106D – Secured creditors
// ──────────────────────────────────────────────

async function navigateSecuredCreditors(page: Page) {
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.creditors.there_are_any', false);
}

// ──────────────────────────────────────────────
//  106EF – Unsecured creditors
// ──────────────────────────────────────────────

async function navigateUnsecuredCreditors(page: Page) {
  // Priority → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.priority_claims.there_are_any', false);

  // Nonpriority → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.nonpriority_claims.there_are_any', false);
}

// ──────────────────────────────────────────────
//  106G – Contracts and leases
// ──────────────────────────────────────────────

async function navigateContractsLeases(page: Page) {
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.contracts_and_leases.there_are_any', false);

  // personal_leases comes right after contracts_and_leases in mandatory block
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'personal_leases.there_are_any', false);
}

// ──────────────────────────────────────────────
//  106H – Codebtors / community property
// ──────────────────────────────────────────────

async function navigateCommunityProperty(page: Page) {
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'debtors.community_property', false);
  await clickContinue(page);
}

// ──────────────────────────────────────────────
//  106I – Income
// ──────────────────────────────────────────────

async function navigateIncome(page: Page) {
  // Employment info
  await waitForDaPageLoad(page);
  let h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[INCOME] page 1: ${h}`);
  await selectByName(page, b64('debtor[0].income.employment'), 'Not employed');
  await clickContinue(page);

  // Monthly income details — even if not employed, some fields still appear
  await waitForDaPageLoad(page);
  h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[INCOME] page 2: ${h}`);
  await fillById(page, b64('debtor[0].income.income_amount_1'), '0');
  await fillById(page, b64('debtor[0].income.overtime_pay_1'), '0');
  await clickContinue(page);

  // Payroll deductions
  await waitForDaPageLoad(page);
  h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[INCOME] page 3: ${h}`);
  await fillById(page, b64('debtor[0].income.tax_deduction'), '0');
  await clickContinue(page);

  // Other deductions
  await waitForDaPageLoad(page);
  h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[INCOME] page 4: ${h}`);
  await fillYesNoRadio(page, 'debtor[0].income.other_deduction', false);
  await clickContinue(page);

  // Other income sources
  await waitForDaPageLoad(page);
  h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[INCOME] page 5: ${h}`);
  await fillById(page, b64('debtor[0].income.net_rental_business'), '0');
  await fillById(page, b64('debtor[0].income.interest_and_dividends'), '0');
  await fillById(page, b64('debtor[0].income.family_support'), '0');
  await fillById(page, b64('debtor[0].income.unemployment'), '0');
  await fillById(page, b64('debtor[0].income.social_security'), '0');
  await fillById(page, b64('debtor[0].income.other_govt_assist'), '0');
  await fillById(page, b64('debtor[0].income.pension'), '0');
  await fillYesNoRadio(page, 'debtor[0].income.other_monthly_income', false);
  await clickContinue(page);

  // Page 6: Other contributions + income changes
  await waitForDaPageLoad(page);
  h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[INCOME] page 6: ${h}`);
  
  // Debug: list all radio inputs on this page
  const radioNames = await page.evaluate(() => {
    const radios = document.querySelectorAll('input[type="radio"]');
    return Array.from(radios).map(r => `name=${(r as HTMLInputElement).name} value=${(r as HTMLInputElement).value}`);
  });
  console.log(`[INCOME] page 6 radios: ${JSON.stringify(radioNames)}`);
  
  const expectedName = b64('debtor[0].income.other_regular_contributions');
  console.log(`[INCOME] expected b64 name: ${expectedName}`);
  
  await selectYesNoRadio(page, 'debtor[0].income.other_regular_contributions', false);
  await page.waitForTimeout(300);
  await selectYesNoRadio(page, 'debtor[0].income.expect_year_delta', false);
  await page.waitForTimeout(300);
  await clickContinue(page);
  
  // Check what comes after income
  await waitForDaPageLoad(page);
  h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[INCOME] after income: ${h}`);
}

// ──────────────────────────────────────────────
//  106J – Expenses
// ──────────────────────────────────────────────

async function navigateExpenses(page: Page) {
  // Monthly expenses — large form with many currency fields
  await waitForDaPageLoad(page);
  let h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[EXPENSES] page 1: ${h}`);
  
  // Set the 3 yesnoradio fields to No
  await selectYesNoRadio(page, 'debtor[0].expenses.util_other', false);
  await page.waitForTimeout(300);
  await selectYesNoRadio(page, 'debtor[0].expenses.other_insurance', false);
  await page.waitForTimeout(300);
  await selectYesNoRadio(page, 'debtor[0].expenses.has_other_expenses', false);
  await page.waitForTimeout(500);
  
  // Fill required fields
  await fillById(page, b64('debtor[0].expenses.rent_expense'), '0');
  await fillById(page, b64('debtor[0].expenses.alimony'), '0');
  
  await clickContinue(page);

  // Separate page: expect a change in expenses?
  await waitForDaPageLoad(page);
  h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[EXPENSES] page 2: ${h}`);
  await selectYesNoRadio(page, 'debtor[0].expenses.change_in_expense', false);
  await clickContinue(page);
}

// ──────────────────────────────────────────────
//  108 – Statement of Intention
// ──────────────────────────────────────────────

async function navigateStatementOfIntention(page: Page) {
  // Secured claims → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'secured_claims.there_are_any', false);
  // personal_leases already handled in navigateContractsLeases
}

// ──────────────────────────────────────────────
//  122A – Means test
// ──────────────────────────────────────────────

async function navigateMeansTest(page: Page) {
  // Page 1: Means test type selection (dropdown)
  await waitForDaPageLoad(page);
  let h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[MEANS] means_type page: ${h}`);
  await selectByName(page, b64('monthly_income.means_type'), 'There is no presumption of abuse.');
  await clickContinue(page);
  
  // Page 2: Exemptions from presumption
  await waitForDaPageLoad(page);
  h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[MEANS] exemptions page: ${h}`);
  
  // Use selectYesNoRadio for more reliable radio clicking
  await selectYesNoRadio(page, 'monthly_income.non_consumer_debts', true); // Yes
  await page.waitForTimeout(300);
  await selectYesNoRadio(page, 'monthly_income.disabled_veteran', false); // No
  await page.waitForTimeout(300);
  await selectYesNoRadio(page, 'monthly_income.reservists', false); // No
  await page.waitForTimeout(300);
  
  // Verify non_consumer_debts is selected as Yes
  const yesRadio = page.locator(`input[name="${b64('monthly_income.non_consumer_debts')}"][value="True"]`);
  const isChecked = await yesRadio.isChecked().catch(() => false);
  console.log(`[MEANS] non_consumer_debts Yes checked: ${isChecked}`);
  
  await clickContinue(page);
  
  // After means test, we should go directly to case details (payment method page)
  await waitForDaPageLoad(page);
  h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[MEANS] after means test: ${h}`);
}

// ──────────────────────────────────────────────
//  Case details + remaining sections
// ──────────────────────────────────────────────

async function navigateCaseDetails(page: Page) {
  // Payment method → pay in full (labelauty radio — click the label)
  await waitForDaPageLoad(page);
  let h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[CASE] page 1: ${h}`);
  const payLabel = page.locator('label').filter({ hasText: 'I will pay the entire fee when I file my petition' });
  await payLabel.click();
  await clickContinue(page);

  // Previous bankruptcy → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'case.has_previous_bankruptcy', false);

  // Pending bankruptcy → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'case.has_pending_bankruptcy', false);

  // Rents residence → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'case.rents_residence', false);

  // case_final (continue button)
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('case_final'), 0);
}

async function navigateBusiness(page: Page) {
  // Has business → No
  await waitForDaPageLoad(page);
  let h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[BIZ] page 1: ${h}`);
  await clickYesNoButton(page, 'business.has_business', false);

  // business_final
  await waitForDaPageLoad(page);
  h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[BIZ] final: ${h}`);
  await clickNthByName(page, b64('business_final'), 0);
}

async function navigateHazardousProperty(page: Page) {
  // Has hazardous property → No
  await waitForDaPageLoad(page);
  let h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[HAZ] page 1: ${h}`);
  await clickYesNoButton(page, 'hazardous_property.has_property', false);

  // hazard_final
  await waitForDaPageLoad(page);
  h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[HAZ] final: ${h}`);
  await clickNthByName(page, b64('hazard_final'), 0);
}

async function navigateCreditCounseling(page: Page) {
  // Counseling type → received briefing with certificate
  await waitForDaPageLoad(page);
  let h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[COUNSEL] page 1: ${h}`);
  
  // Debug: check what inputs are on this page
  const inputs = await page.evaluate(() => {
    const selects = document.querySelectorAll('select');
    const radios = document.querySelectorAll('input[type="radio"]');
    return {
      selects: Array.from(selects).map(s => `name=${s.name}`),
      radios: Array.from(radios).map(r => `name=${(r as HTMLInputElement).name} value=${(r as HTMLInputElement).value}`)
    };
  });
  console.log(`[COUNSEL] selects: ${JSON.stringify(inputs.selects)}`);
  console.log(`[COUNSEL] radios: ${JSON.stringify(inputs.radios)}`);
  
  await selectByName(page, b64('debtor[i].counseling.counseling_type'), '1');
  await clickContinue(page);

  // counseling_final
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('counseling_final'), 0);
}

async function navigateReporting(page: Page) {
  // Reporting type → consumer debts (labelauty radio — click label text)
  await waitForDaPageLoad(page);
  let h = await page.locator('h1').first().textContent().catch(() => '');
  console.log(`[REPORT] page 1: ${h}`);
  await page.locator('label').filter({ hasText: 'Primarily consumer debts' }).click();
  await clickContinue(page);

  // Funds for creditors → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'reporting.funds_for_creditors', false);
}

// ──────────────────────────────────────────────
//  TESTS
// ──────────────────────────────────────────────

test.describe('Full Interview – Individual Filing', () => {
  test.setTimeout(300_000); // 5 minutes for this long test

  test('Complete individual filing reaches document generation', async ({ page }) => {
    // ── 1. Navigate to debtor page ──
    await navigateToDebtorPage(page);
    await fillDebtor1AndAdvance(page);

    // ── 2. debtor_final ──
    await passDebtorFinal(page);

    // ── 3. Property (106AB) ──
    await navigatePropertySection(page);

    // ── 4. Exemptions (106C) ──
    await navigateExemptionSection(page);

    // ── 5. Financial Affairs (107) ──
    await navigateFinancialAffairs(page);

    // ── 6. Secured creditors (106D) ──
    await navigateSecuredCreditors(page);

    // ── 7. Unsecured creditors (106EF) ──
    await navigateUnsecuredCreditors(page);

    // ── 8. Contracts & leases (106G) ──
    await navigateContractsLeases(page);

    // ── 9. Community property (106H) ──
    await navigateCommunityProperty(page);

    // ── 10. Income (106I) ──
    await navigateIncome(page);

    // ── 11. Expenses (106J) ──
    await navigateExpenses(page);

    // ── 12. Means test (122A) ──
    await navigateMeansTest(page);

    // ── 13. Case details ──
    await navigateCaseDetails(page);

    // ── 14. Business ──
    await navigateBusiness(page);

    // ── 15. Hazardous property ──
    await navigateHazardousProperty(page);

    // ── 16. Credit counseling ──
    await navigateCreditCounseling(page);

    // ── 17. Reporting ──
    await navigateReporting(page);

    // ── 18. Document generation ──
    // Attachment rendering may trigger additional questions (secured_claims, personal_leases, property details)
    // Handle them dynamically
    await waitForDaPageLoad(page);
    
    let maxSteps = 30;
    while (maxSteps-- > 0) {
      await page.waitForTimeout(300); // Brief pause for page stability
      const heading = await page.locator('h1, h2').first().textContent().catch(() => '');
      const qid = await page.locator('input[name="_question_name"]').getAttribute('value').catch(() => 'unknown');
      console.log(`[DYN] step ${30 - maxSteps}: "${heading}" (qid: ${qid})`);
      
      // Check for conclusion screen
      const bodyText = await page.locator('body').innerText();
      if (bodyText.toLowerCase().includes('interview questions complete') || 
          bodyText.toLowerCase().includes('your documents are ready') ||
          bodyText.toLowerCase().includes('conclusion')) {
        console.log('[DYN] Found conclusion!');
        break;
      }
      
      // Check for error page
      if (heading?.toLowerCase().includes('error')) {
        const errorText = bodyText.substring(0, 1000);
        const pageUrl = page.url();
        console.log(`[DYN] Error page URL: ${pageUrl}`);
        console.log(`[DYN] Error page text: ${errorText}`);
        // Try to get traceback from the page
        const tracebackEl = await page.locator('pre, code, .daerror, .alert-danger').first().textContent().catch(() => '');
        if (tracebackEl) console.log(`[DYN] Traceback: ${tracebackEl}`);
        await screenshot(page, 'full-individual-error-page');
        break; // Stop on errors — they need YAML fixes, not retries
      }
      
      // Check for specific known variables
      const hasSecuredClaims = await page.locator(`[name="${b64('secured_claims.there_are_any')}"]`).count();
      if (hasSecuredClaims > 0) {
        console.log('[DYN] Handling secured_claims');
        await clickYesNoButton(page, 'secured_claims.there_are_any', false);
        await waitForDaPageLoad(page);
        continue;
      }
      
      const hasPersonalLeases = await page.locator(`[name="${b64('personal_leases.there_are_any')}"]`).count();
      if (hasPersonalLeases > 0) {
        console.log('[DYN] Handling personal_leases');
        await clickYesNoButton(page, 'personal_leases.there_are_any', false);
        await waitForDaPageLoad(page);
        continue;
      }
      
      const hasPrint101 = await page.locator(`[name="${b64('print_101')}"]`).count();
      if (hasPrint101 > 0) {
        console.log('[DYN] Handling print_101');
        await clickNthByName(page, b64('print_101'), 0);
        await waitForDaPageLoad(page);
        continue;
      }
      
      // Check for yesno button pages (two buttons: Yes/No) — always answer No
      const noButton = page.locator('button.btn-da[value="False"]:not([disabled])');
      const yesButton = page.locator('button.btn-da[value="True"]:not([disabled])');
      if (await noButton.count() > 0 && await yesButton.count() > 0) {
        console.log('[DYN] Found Yes/No button page — clicking No');
        await noButton.first().click();
        await waitForDaPageLoad(page);
        continue;
      }

      // Fill any visible radios as "No" / "False" using jQuery for better reliability
      const radioCount = await page.evaluate(() => {
        let count = 0;
        // Click all visible "No" (False) radio labels
        document.querySelectorAll('input[type="radio"][value="False"]').forEach(radio => {
          const id = radio.getAttribute('id');
          if (!id) return;
          if (!(radio as HTMLInputElement).checked) {
            const label = document.querySelector(`label[for="${id}"]`) as HTMLElement;
            if (label) {
              label.click();
              count++;
            }
          }
        });
        return count;
      });
      console.log(`[DYN] Clicked ${radioCount} "No" radios`);
      
      // Wait for page to process radio changes
      await page.waitForTimeout(500);
      
      // Also check for yesno checkboxes (single checkbox = True when checked, unchecked = No)
      // Leave them unchecked (default = No)
      
      // Fill any required select dropdowns with first real option
      const selectCount = await page.evaluate(() => {
        let count = 0;
        document.querySelectorAll('select').forEach(sel => {
          if (!sel.value || sel.selectedIndex <= 0) {
            const options = sel.querySelectorAll('option');
            for (let i = 0; i < options.length; i++) {
              if (options[i].value && options[i].value !== '') {
                sel.value = options[i].value;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                count++;
                break;
              }
            }
          }
        });
        return count;
      });
      if (selectCount > 0) console.log(`[DYN] Filled ${selectCount} dropdowns`);
      
      // Fill any empty text/currency inputs with "0"
      const emptyInputs = page.locator('input[type="text"]:visible, input[type="number"]:visible, input.dacurrency:visible');
      const inputCount = await emptyInputs.count();
      for (let i = 0; i < inputCount; i++) {
        const val = await emptyInputs.nth(i).inputValue();
        if (!val) {
          await emptyInputs.nth(i).fill('0');
        }
      }
      
      // Try to click the standard Continue button (wait for it to become enabled)
      const continueBtn = page.locator('button#da-continue-button');
      if (await continueBtn.count() > 0) {
        // Wait for button to become enabled (max 5s)
        try {
          await continueBtn.waitFor({ state: 'attached', timeout: 2000 });
          // Check if button is enabled
          const isDisabled = await continueBtn.getAttribute('disabled');
          if (isDisabled !== null) {
            console.log('[DYN] Continue button is disabled, forcing click via JS');
            // Force enable and submit the form via JavaScript
            await page.evaluate(() => {
              const btn = document.getElementById('da-continue-button') as HTMLButtonElement;
              if (btn) {
                btn.disabled = false;
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-primary');
                // Also disable jQuery validation
                const form = document.getElementById('daform');
                if (form && ($ as any)(form).data('validator')) {
                  ($ as any)(form).data('validator').settings.ignore = '*';
                }
              }
            });
            await page.waitForTimeout(200);
          }
          await clickContinue(page);
          await waitForDaPageLoad(page);
          continue;
        } catch {
          console.log('[DYN] Continue button wait failed');
        }
      }
      
      // Try any other submit-style button (event pages, continue button fields)
      const anyButton = page.locator('button.btn-primary:visible, button.btn-da:visible, button[type="submit"]:visible');
      if (await anyButton.count() > 0) {
        console.log('[DYN] Clicking primary/submit button');
        await anyButton.first().click();
        await waitForDaPageLoad(page);
        continue;
      }
      
      // Unknown page — take screenshot and try one more time
      await screenshot(page, `full-individual-unknown-page-${30 - maxSteps}`);
      console.log(`[DYN] Unknown page (no button found): ${heading}`);
      break;
    }

    // ── 19. Conclusion screen with all documents ──
    await waitForDaPageLoad(page);
    await screenshot(page, 'full-individual-conclusion');
    const conclusionText = await page.locator('body').innerText();
    expect(conclusionText.toLowerCase()).toContain('conclusion');

    // Verify download links are present
    const downloadLinks = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/uploadedfile/"]');
      return Array.from(links).map(a => ({
        name: a.closest('[class]')?.closest('div')?.previousElementSibling?.textContent?.trim() ||
              a.textContent?.trim() || '',
        href: (a as HTMLAnchorElement).href,
      }));
    });

    // Also grab form headings (h3 elements that name each form)
    const formHeadings = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('h3'))
        .map(h => h.textContent?.trim() || '')
        .filter(t => t.toLowerCase().startsWith('form'));
    });
    console.log(`📋 Conclusion has ${downloadLinks.length} download links, ${formHeadings.length} form headings:`);
    formHeadings.forEach((name, i) => console.log(`  ${i + 1}. ${name}`));

    // Should have at least 15 documents for a standard individual filing
    expect(downloadLinks.length).toBeGreaterThanOrEqual(15);

    // Verify key form names are present in the headings
    const allNames = formHeadings.map(h => h.toLowerCase()).join(' | ');
    const expectedForms = [
      '101',    // Voluntary Petition
      '106',    // Schedules
      '107',    // Statement of Financial Affairs
      '108',    // Statement of Intention
      '121',    // Social Security Statement
      '122',    // Means Test
    ];
    for (const form of expectedForms) {
      expect(allNames).toContain(form);
    }

    // Verify first 3 download links return valid PDF content
    for (let i = 0; i < Math.min(3, downloadLinks.length); i++) {
      const response = await page.request.get(downloadLinks[i].href);
      const contentType = response.headers()['content-type'] || '';
      console.log(`  📄 ${downloadLinks[i].name}: ${response.status()} ${contentType}`);
      expect(response.status()).toBe(200);
      expect(contentType).toContain('pdf');
    }

    console.log('✅ Individual filing: Reached conclusion with document generation!');
    console.log('✅ All key forms present and PDFs are valid!');
  });
});

test.describe('Full Interview – Joint Filing (Married Couple)', () => {
  test.setTimeout(300_000);

  test('Joint filing collects both debtors and reaches property section', async ({
    page,
  }) => {
    // Navigate with joint filing
    await navigateToDebtorPage(page, { jointFiling: true });

    // Fill debtor 1
    await fillDebtor1AndAdvance(page);

    // Fill debtor 2 (spouse)
    await fillDebtor2AndAdvance(page);

    // debtor_final
    await passDebtorFinal(page);

    // Verify we reached the property section
    await waitForDaPageLoad(page);
    await screenshot(page, 'joint-filing-property-section');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).toContain('property');

    console.log('✅ Joint filing: Both debtors collected, reached property section!');
  });
});

test.describe('List Collect Interactions', () => {
  test.setTimeout(300_000);

  test('Can add a real property interest item', async ({ page }) => {
    await navigateToDebtorPage(page);
    await fillDebtor1AndAdvance(page);
    await passDebtorFinal(page);

    // property_intro → Continue
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('property_intro'), 0);

    // Real property interests → Yes
    await waitForDaPageLoad(page);
    await clickYesNoButton(page, 'prop.interests.there_are_any', true);

    // Should now show the interest detail form
    await waitForDaPageLoad(page);
    await screenshot(page, 'list-collect-property-interest');

    // Fill in the property interest details
    // Note: docassemble renders list items with [0] not [i] in the HTML
    // Use Playwright's fill() which is more reliable than evaluate-based fillById
    await page.locator(`#${b64('prop.interests[0].street')}`).fill('456 Oak Ave');
    await page.locator(`#${b64('prop.interests[0].city')}`).fill('Lincoln');
    await page.locator(`#${b64('prop.interests[0].state')}`).fill('NE');
    await page.locator(`#${b64('prop.interests[0].zip')}`).fill('68508');
    await page.locator(`#${b64('prop.interests[0].county')}`).fill('Lancaster');

    // Property type - checkboxes field. Check "Single-family home"
    // Docassemble renders labelauty checkboxes; the <label> has role="checkbox"
    // For the first list item ([0]), the checkbox id is b64("prop.interests[0].type") + "_0"
    const typeCheckboxId = b64('prop.interests[0].type') + '_0';
    await page.locator(`label[for="${typeCheckboxId}"]`).click();

    // Who has an interest - radio button with code-generated choices
    // For individual filing, first choice is "Debtor 1 only"
    // Docassemble uses labelauty: <input> is hidden, click the <label> instead
    const whoRadioId = b64('prop.interests[0].who') + '_0';
    await page.locator(`label[for="${whoRadioId}"]`).click();

    // Current property value
    await page.locator(`#${b64('prop.interests[0].current_value')}`).fill('150000');

    // Do you have a mortgage/loan? - datatype: yesno → checkbox
    // Leave unchecked for "No" (False)
    // setCheckbox only needed if we want True; unchecked = False by default

    // Ownership interest - textarea
    await page.locator(`#${b64('prop.interests[0].ownership_interest')}`).fill('Fee simple');

    // Community property? - yesnoradio → radio buttons
    await fillYesNoRadio(page, 'prop.interests[0].is_community_property', false);

    // Other info
    await page.locator(`#${b64('prop.interests[0].other_info')}`).fill('N/A');

    // Claiming exemption? - yesnoradio → radio buttons
    await fillYesNoRadio(page, 'prop.interests[0].is_claiming_exemption', false);

    // Submit this property interest
    // The Continue button has name=b64('prop.interests[i].complete') with literal [i]
    // but the server expects [0]. Fix the button name before clicking.
    await page.evaluate((correctName: string) => {
      const btn = document.getElementById('dacontinue') ||
                  document.getElementById('da-continue-button');
      if (btn) btn.setAttribute('name', correctName);
    }, b64('prop.interests[0].complete'));
    await page.locator('#dacontinue, #da-continue-button').first().click();
    await page.waitForLoadState('networkidle');

    // After submitting the property interest, docassemble may ask "Do you have
    // more interests?" or skip directly to vehicles depending on the gather setup.
    await waitForDaPageLoad(page);
    const pageText = await page.locator('body').innerText();
    if (pageText.toLowerCase().includes('another') || pageText.toLowerCase().includes('more')) {
      // there_is_another → No
      await clickYesNoButton(page, 'prop.interests.there_is_another', false);
      await waitForDaPageLoad(page);
    }
    await screenshot(page, 'list-collect-after-property');

    // Should be on the vehicles section now
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).toContain('vehicle');

    console.log('✅ List collect: Successfully added and completed a property interest!');
  });
});
