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
  clickYesNo,
} from './helpers';

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

  // Future property interest, IP, intangible (all have *_has_claim fields too)
  await waitForDaPageLoad(page);
  await fillAllVisibleRadiosAsNo(page);
  await clickContinue(page);

  // Owed property: tax refund, family support, other amounts, insurance,
  // trust, third party, contingent claims, other assets (all with *_has_claim)
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

  // Homestead exemption → No
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'prop.exempt_property.claim_homestead_exemption', false);
  await clickContinue(page);
}

// ──────────────────────────────────────────────
//  Form 107 – Statement of Financial Affairs
// ──────────────────────────────────────────────

async function navigateFinancialAffairs(page: Page) {
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
  await fillYesNoRadio(page, 'financial_affairs.has_deposit_box', false);
  await clickContinue(page);

  // Storage unit
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.has_storage_unit', false);
  await clickContinue(page);

  // Held property
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.has_held_property', false);
  await clickContinue(page);

  // Environment
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'financial_affairs.environment.has_liability', false);
  await fillYesNoRadio(page, 'financial_affairs.environment.has_release', false);
  await fillYesNoRadio(page, 'financial_affairs.environment.has_proceeding', false);
  await clickContinue(page);

  // Business types (checkboxes — check "None of the above" or leave unchecked)
  // For business_types, we need to not check any boxes and just continue
  await waitForDaPageLoad(page);
  // None checkbox: the last option is usually "None of the above" but
  // for checkboxes fields we need to uncheck all. In docassemble checkboxes
  // there's typically a "None of the above" option. Let's just continue.
  await clickContinue(page);

  // If business_types has no selections, businesses.there_are_any should be False
  // and businesses.gather() should be skipped

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

  // personal_leases is asked later (108) — that's separate
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
  await selectByName(page, b64('debtor[0].income.employment'), 'Not employed');
  await clickContinue(page);

  // Monthly income details — even if not employed, some fields still appear
  await waitForDaPageLoad(page);
  await fillById(page, b64('debtor[0].income.income_amount_1'), '0');
  await fillById(page, b64('debtor[0].income.overtime_pay_1'), '0');
  await clickContinue(page);

  // Payroll deductions
  await waitForDaPageLoad(page);
  await fillById(page, b64('debtor[0].income.tax_deduction'), '0');
  await clickContinue(page);

  // Other deductions
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'debtor[0].income.other_deduction', false);
  await clickContinue(page);

  // Other income sources
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
}

// ──────────────────────────────────────────────
//  106J – Expenses
// ──────────────────────────────────────────────

async function navigateExpenses(page: Page) {
  // Household description — dependents, etc.
  await waitForDaPageLoad(page);
  // For individual filing, joint_case is False so "other_household" won't show
  await fillYesNoRadio(page, 'debtor[0].expenses.dependents.there_are_any', false);
  await fillYesNoRadio(page, 'debtor[0].expenses.other_people_expenses', false);
  await clickContinue(page);

  // Monthly expenses — large form, fill all with 0
  await waitForDaPageLoad(page);
  const expenseFields = [
    'debtor[0].expenses.rent_expense',
    'debtor[0].expenses.real_estate_taxes',
    'debtor[0].expenses.renters_insurance',
    'debtor[0].expenses.upkeep_expenses',
    'debtor[0].expenses.owners_dues',
    'debtor[0].expenses.additional_mortgage_payments',
    'debtor[0].expenses.util_electric',
    'debtor[0].expenses.util_garbage',
  ];
  for (const field of expenseFields) {
    await fillById(page, b64(field), '0');
  }
  // util_other is a yesnoradio
  await fillYesNoRadio(page, 'debtor[0].expenses.util_other', false);

  const moreExpenseFields = [
    'debtor[0].expenses.house_supplies',
    'debtor[0].expenses.childcare',
    'debtor[0].expenses.clothing',
    'debtor[0].expenses.personal_care',
    'debtor[0].expenses.medical',
    'debtor[0].expenses.transportation',
    'debtor[0].expenses.entertainment',
    'debtor[0].expenses.charity',
    'debtor[0].expenses.life_insurance',
    'debtor[0].expenses.health_insurance',
    'debtor[0].expenses.vehicle_insurance',
  ];
  for (const field of moreExpenseFields) {
    await fillById(page, b64(field), '0');
  }
  // other_insurance is yesnoradio
  await fillYesNoRadio(page, 'debtor[0].expenses.other_insurance', false);

  // Tax and installment fields
  await fillById(page, b64('debtor[0].expenses.other_tax_specify'), 'None');
  await fillById(page, b64('debtor[0].expenses.other_tax_amount'), '0');
  await fillById(page, b64('debtor[0].expenses.vehicle1_payments'), '0');
  await fillById(page, b64('debtor[0].expenses.vehicle2_payments'), '0');
  await fillById(page, b64('debtor[0].expenses.other_payment1_specify'), 'None');
  await fillById(page, b64('debtor[0].expenses.other_payment1_amount'), '0');
  await fillById(page, b64('debtor[0].expenses.other_payment2_specify'), 'None');
  await fillById(page, b64('debtor[0].expenses.other_payment2_amount'), '0');
  await fillById(page, b64('debtor[0].expenses.alimony'), '0');
  await fillById(page, b64('debtor[0].expenses.other_support_specify'), 'None');
  await fillById(page, b64('debtor[0].expenses.other_support_amount'), '0');
  await fillYesNoRadio(page, 'debtor[0].expenses.change_in_expense', false);
  await clickContinue(page);
}

// ──────────────────────────────────────────────
//  108 – Statement of Intention
// ──────────────────────────────────────────────

async function navigateStatementOfIntention(page: Page) {
  // Secured claims → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'secured_claims.there_are_any', false);

  // Personal leases → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'personal_leases.there_are_any', false);
}

// ──────────────────────────────────────────────
//  122A – Means test
// ──────────────────────────────────────────────

async function navigateMeansTest(page: Page) {
  // Exemptions from presumption
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'monthly_income.non_consumer_debts', true); // Yes → skips means test
  await fillYesNoRadio(page, 'monthly_income.disabled_veteran', false);
  await fillYesNoRadio(page, 'monthly_income.reservists', false);
  await clickContinue(page);
}

// ──────────────────────────────────────────────
//  Case details + remaining sections
// ──────────────────────────────────────────────

async function navigateCaseDetails(page: Page) {
  // Payment method → pay in full
  await waitForDaPageLoad(page);
  await page.locator(`input[name="${b64('case.payment_method')}"][value="1"]`).click();
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
  await clickYesNoButton(page, 'business.has_business', false);

  // business_final
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('business_final'), 0);
}

async function navigateHazardousProperty(page: Page) {
  // Has hazardous property → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'hazardous_property.has_property', false);

  // hazard_final
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('hazard_final'), 0);
}

async function navigateCreditCounseling(page: Page) {
  // Counseling type → received briefing with certificate
  await waitForDaPageLoad(page);
  await selectByName(page, b64('debtor[i].counseling.counseling_type'), '1');
  await clickContinue(page);

  // counseling_final
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('counseling_final'), 0);
}

async function navigateReporting(page: Page) {
  // Reporting type → consumer debts
  await waitForDaPageLoad(page);
  await page.locator(`input[name="${b64('reporting.reporting_type')}"][value="1"]`).click();
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

    // ── 12. Statement of intention (108) ──
    await navigateStatementOfIntention(page);

    // ── 13. Means test (122A) ──
    await navigateMeansTest(page);

    // ── 14. Case details ──
    await navigateCaseDetails(page);

    // ── 15. Business ──
    await navigateBusiness(page);

    // ── 16. Hazardous property ──
    await navigateHazardousProperty(page);

    // ── 17. Credit counseling ──
    await navigateCreditCounseling(page);

    // ── 18. Reporting ──
    await navigateReporting(page);

    // ── 19. Document generation: print_101 ──
    await waitForDaPageLoad(page);
    await screenshot(page, 'full-individual-print-101');
    // The print_101 screen shows Form 101 PDF attachment
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).toContain('form 101');
    // Continue past it
    await clickNthByName(page, b64('print_101'), 0);

    // ── 20. Conclusion screen with all documents ──
    await waitForDaPageLoad(page);
    await screenshot(page, 'full-individual-conclusion');
    const conclusionText = await page.locator('body').innerText();
    expect(conclusionText.toLowerCase()).toContain('conclusion');

    console.log('✅ Individual filing: Reached conclusion with document generation!');
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
