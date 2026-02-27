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
  await page.goto(INTERVIEW_URL);
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
  await page.locator(`#${fieldId}${suffix}`).click();
}

/**
 * For a "fields:" question with yesnoradio items, fill them all then continue.
 * yesnoradio fields are rendered as radio buttons with name = b64(var) and
 * value "True" or "False".
 */
async function fillYesNoRadio(page: Page, varName: string, yes: boolean) {
  const name = b64(varName);
  const value = yes ? 'True' : 'False';
  await page.locator(`input[name="${name}"][value="${value}"]`).click();
}

/**
 * For a `datatype: yesno` field inside a `fields:` block (rendered as checkbox).
 * Checking it sets value to True, leaving unchecked is False.
 */
async function setCheckbox(page: Page, varName: string, checked: boolean) {
  const name = b64(varName);
  const checkbox = page.locator(`input[name="${name}"]`).first();
  if (checked) {
    await checkbox.check();
  } else {
    await checkbox.uncheck();
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
  await clickNthByName(page, b64('property_intro'), 0);

  // Real property interests → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.interests.there_are_any', false);

  // Vehicles → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.ab_vehicles.there_are_any', false);

  // Other vehicles → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.ab_other_vehicles.there_are_any', false);

  // Personal/household items — large question with many yesnoradio fields
  // All default to No, just fill the required ones and continue
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'prop.has_household_goods', false);
  await fillYesNoRadio(page, 'prop.has_collectibles', false);
  await fillYesNoRadio(page, 'prop.has_hobby_equipment', false);
  await fillYesNoRadio(page, 'prop.has_firearms', false);
  await fillYesNoRadio(page, 'prop.has_clothes', false);
  await fillYesNoRadio(page, 'prop.has_jewelry', false);
  await fillYesNoRadio(page, 'prop.has_animals', false);
  await fillYesNoRadio(page, 'prop.has_other_household_items', false);
  await clickContinue(page);

  // Financial assets – cash
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'prop.financial_assets.has_cash', false);
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

  // Future property interest, IP, intangible
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'prop.financial_assets.has_future_property_interest', false);
  await fillYesNoRadio(page, 'prop.financial_assets.has_ip_interest', false);
  await fillYesNoRadio(page, 'prop.financial_assets.has_intangible_interest', false);
  await clickContinue(page);

  // Owed property: tax refund, family support, other amounts, insurance,
  // trust, third party, contingent claims, other assets
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'prop.owed_property.has_tax_refund', false);
  await fillYesNoRadio(page, 'prop.owed_property.has_family_support', false);
  await fillYesNoRadio(page, 'prop.owed_property.has_other_amounts', false);
  await fillYesNoRadio(page, 'prop.owed_property.has_insurance_interest', false);
  await fillYesNoRadio(page, 'prop.owed_property.has_trust', false);
  await fillYesNoRadio(page, 'prop.owed_property.has_third_party', false);
  await fillYesNoRadio(page, 'prop.owed_property.has_contingent_claims', false);
  await fillYesNoRadio(page, 'prop.owed_property.has_other_assets', false);
  await clickContinue(page);

  // Business property → No
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'prop.business_property.has_property', false);
  await clickContinue(page);

  // Farming property → No
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'prop.farming_property.has_property', false);
  await clickContinue(page);

  // Other property → No
  await waitForDaPageLoad(page);
  await fillYesNoRadio(page, 'prop.has_other_prop', false);
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
    await fillById(page, b64('prop.interests[i].street'), '456 Oak Ave');
    await fillById(page, b64('prop.interests[i].city'), 'Lincoln');
    await fillById(page, b64('prop.interests[i].state'), 'NE');
    await fillById(page, b64('prop.interests[i].zip'), '68508');
    await fillById(page, b64('prop.interests[i].county'), 'Lancaster');

    // Property type - checkboxes field. Check "Single-family home"
    // Checkbox name is b64('prop.interests[i].type') with value dict entries
    await page.locator(`input[name="${b64('prop.interests[i].type[B\'Single-family home\']')}"]`).check();

    // Who has an interest - radio button with code-generated choices
    // For individual filing, first choice is "Debtor 1 only"
    const whoName = b64('prop.interests[i].who');
    await page.locator(`input[name="${whoName}"]`).first().click();

    // Current property value
    await fillById(page, b64('prop.interests[i].current_value'), '150000');

    // Do you have a mortgage/loan? - datatype: yesno → checkbox
    // Leave unchecked for "No" (False)
    // setCheckbox only needed if we want True; unchecked = False by default

    // Ownership interest - textarea
    await fillById(page, b64('prop.interests[i].ownership_interest'), 'Fee simple');

    // Community property? - yesnoradio → radio buttons
    await fillYesNoRadio(page, 'prop.interests[i].is_community_property', false);

    // Other info
    await fillById(page, b64('prop.interests[i].other_info'), 'N/A');

    // Claiming exemption? - yesnoradio → radio buttons
    await fillYesNoRadio(page, 'prop.interests[i].is_claiming_exemption', false);

    // Submit this property interest
    await clickNthByName(page, b64('prop.interests[i].complete'), 0);

    // Should ask "Do you have more interests?"
    await waitForDaPageLoad(page);
    await screenshot(page, 'list-collect-another-interest');

    // Say No to adding more
    await clickYesNoButton(page, 'prop.interests.there_is_another', false);

    // Should advance to the next section (vehicles)
    await waitForDaPageLoad(page);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).toContain('vehicle');

    console.log('✅ List collect: Successfully added and completed a property interest!');
  });
});
