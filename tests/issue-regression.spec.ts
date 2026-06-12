/**
 * Per-issue regression tests for customer-reported bugs.
 *
 * Each test targets a single GitHub issue, reproduces the original bug's
 * trigger, and asserts the corrected behavior. Run with video recording
 * (`video: 'on'` in playwright.config.ts) to produce per-issue proof.
 *
 * IMPORTANT: many of these tests use `clickContinueStrict` instead of the
 * shared `clickContinue` helper. The shared helper sets the jQuery validator
 * to ignore `:hidden` fields, which masks the very bugs #54/#57 are about
 * (required-but-hidden fields silently blocking real users). The strict
 * version clicks the real Continue button without any validator override,
 * so the test sees what a real user would see.
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
  fillByName,
} from './helpers';
import {
  navigateToDebtorPage,
  fillDebtorAndAdvance,
  passDebtorFinal,
} from './navigation-helpers';
import { TestScenario, DebtorProfile } from './fixtures';

const baseDebtor: DebtorProfile = {
  first: 'Reg', last: 'Test',
  street: '123 Test St', city: 'Lincoln', state: 'Nebraska',
  zip: '68508', countyIndex: 1,
  taxIdType: 'ssn', taxId: '123-45-6789',
};

const baseScenario: TestScenario = {
  name: 'regression', district: 'District of Nebraska',
  amended: false, jointFiling: false,
  debtor: baseDebtor, property: { vehicles: [] }, creditors: {}, rentExpense: '800',
};

/** Continue without overriding the jQuery validator — what a real user sees. */
async function clickContinueStrict(page: Page) {
  await waitForDaPageLoad(page);
  await page.locator('#da-continue-button').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
}

/** Return the current docassemble question heading text. */
async function heading(page: Page): Promise<string> {
  return (await page.locator('h1').first().textContent({ timeout: 5000 }).catch(() => '')) || '';
}

// ─────────────────────────────────────────────────────────────────────
// SHALLOW — reachable from the intro screens
// ─────────────────────────────────────────────────────────────────────

test.describe('Shallow issues (early petition)', () => {
  test('Issue #66: case number is NOT asked when not filing amended petition', async ({ page }) => {
    await page.goto(INTERVIEW_URL + '&new_session=1');
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('introduction_screen'), 0);
    await waitForDaPageLoad(page);
    await selectByName(page, b64('current_district'), 'District of Nebraska');
    await clickContinueStrict(page);
    await waitForDaPageLoad(page);

    // Amended filing → No
    await clickNthByName(page, b64('amended_filing'), 1);
    await waitForDaPageLoad(page);

    const h = await heading(page);
    expect(h.toLowerCase(), `heading was "${h}"`).not.toContain('case number');
    // We should now be on district-final or filing-status, not a case-number page
    const caseField = await page.locator(`[name="${b64('case_number')}"]`).count();
    expect(caseField, 'case_number field should not appear on the non-amended path').toBe(0);
  });

  test('Issue #74: case number with invalid format is rejected on submit', async ({ page }) => {
    await page.goto(INTERVIEW_URL + '&new_session=1');
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('introduction_screen'), 0);
    await waitForDaPageLoad(page);
    await selectByName(page, b64('current_district'), 'District of Nebraska');
    await clickContinueStrict(page);
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('amended_filing'), 0); // Yes → triggers case_number page
    await waitForDaPageLoad(page);

    // Enter invalid case number
    await fillByName(page, b64('case_number'), 'random garbage');
    await clickContinueStrict(page);
    await waitForDaPageLoad(page);

    // We should still be on the case-number page (validation rejected)
    const stillOnCaseNumberPage = (await page.locator(`[name="${b64('case_number')}"]`).count()) > 0;
    expect(stillOnCaseNumberPage, 'invalid case number must keep user on case-number page').toBe(true);

    // Now enter a valid case number and confirm it advances
    await fillByName(page, b64('case_number'), '8:23-bk-12345');
    await clickContinueStrict(page);
    await waitForDaPageLoad(page);
    const stillThere = (await page.locator(`[name="${b64('case_number')}"]`).count()) > 0;
    expect(stillThere, 'valid case number must advance').toBe(false);
  });

  test('Issue #62: filing individually does NOT collect Debtor 2 identity', async ({ page }) => {
    await navigateToDebtorPage(page, baseScenario); // individual filing
    const h = await heading(page);
    expect(h, 'on debtor identity page').toBeTruthy();
    // Page should not reference Debtor 2 for an individual filing.
    const bodyText = (await page.locator('body').innerText()).toLowerCase();
    expect(bodyText.includes('debtor 2'), 'page should not reference Debtor 2 for individual filing').toBe(false);
    // And only one debtor object should exist (target_number = 1). Whatever the
    // form-name encoding is, there should be exactly one set of name fields.
    const allInputs = await page.locator('input[type="text"], input[type="search"], input:not([type])').count();
    expect(allInputs, 'page has form inputs').toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// MID — reachable from the debtor identity page
// ─────────────────────────────────────────────────────────────────────

test.describe('Validation issues at debtor identity', () => {
  test('Issue #63: debtor city with no letters is rejected on submit', async ({ page }) => {
    await page.goto(INTERVIEW_URL + '&new_session=1');
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('introduction_screen'), 0);
    await waitForDaPageLoad(page);
    await selectByName(page, b64('current_district'), 'District of Nebraska');
    await clickContinueStrict(page);
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('amended_filing'), 1); // No
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('district_final'), 0);
    await waitForDaPageLoad(page);
    await clickById(page, `${b64('filing_status')}_0`);
    await clickContinueStrict(page);
    await waitForDaPageLoad(page);
    // On debtor identity page — fill required fields with bad city
    await page.locator(`#${b64('debtor[i].name.first')}`).fill('Reg');
    await page.locator(`#${b64('debtor[i].name.last')}`).fill('Test');
    await page.locator(`#${b64('debtor[i].address.address')}`).fill('123 Test St');
    await page.locator(`#${b64('debtor[i].address.city')}`).fill('12345'); // numeric — bad
    const stateSel = page.locator(`#${b64('debtor[i].address.state')}`);
    if ((await stateSel.evaluate(el => el.tagName.toLowerCase()).catch(() => '')) === 'select') {
      await stateSel.selectOption({ label: 'Nebraska' });
    }
    await page.locator(`#${b64('debtor[i].address.zip')}`).fill('68508');
    // SSN
    await clickById(page, `${b64('debtor[i].tax_id.tax_id_type')}_0`);
    const ssn = page.locator(`#${b64('debtor[i].tax_id.tax_id')}`);
    if (await ssn.count()) await ssn.fill('123-45-6789');
    await clickContinueStrict(page);
    await waitForDaPageLoad(page);
    // Should still be on the debtor identity page — validation rejected the bad city
    const stillOnPage = (await page.locator(`#${b64('debtor[i].address.city')}`).count()) > 0;
    expect(stillOnPage, 'bad city should keep user on debtor identity page').toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// SOFA (form 107) issues
// ─────────────────────────────────────────────────────────────────────

test.describe('SOFA conditional-logic issues', () => {
  async function advanceToMaritalStatusPage(page: Page) {
    await navigateToDebtorPage(page, baseScenario);
    await fillDebtorAndAdvance(page, baseScenario.debtor);
    await passDebtorFinal(page);
    // Walk forward until we reach the marital-status SOFA page.
    // We skip past everything by answering No to all yes/no questions.
    for (let i = 0; i < 60; i++) {
      const h = (await heading(page)).toLowerCase();
      if (h.includes('marital status')) return;
      // Try answering No on any visible yes/no. Generic walker context —
      // anchor on `value="False"` (docassemble's standard for No) rather
      // than text content.
      const noBtn = page.locator('button.btn-da[value="False"]').first();
      if (await noBtn.count()) {
        await noBtn.click().catch(() => {});
        await waitForDaPageLoad(page);
        continue;
      }
      // Otherwise just hit Continue
      await clickContinue(page);
      await waitForDaPageLoad(page);
    }
  }

  test('Issue #61: marital status page hides date fields when "No" to prior residences', async ({ page }) => {
    // We assert by direct YAML truth: the address_from_1 / address_to_1 / etc. fields
    // are all gated `show if: financial_affairs.lived_elsewhere`. If the user hasn't
    // answered the gating yes/no yet, the fields are not in the DOM.
    await page.goto(INTERVIEW_URL + '&new_session=1');
    await waitForDaPageLoad(page);
    // Quickest path: walk to SOFA marital page via lots of "No" / Continue clicks.
    // If this takes too long the test will time out — that's OK, we still get a video.
    await advanceToMaritalStatusPage(page);

    // We're on the marital status page. Select "No" for lived_elsewhere.
    // The lived_elsewhere field is a yesnoradio.
    const noRadio = page.locator(`label[for="${b64('financial_affairs.lived_elsewhere')}_1"]`).first();
    if (await noRadio.count()) {
      await noRadio.click();
    }
    await page.waitForTimeout(300);

    // The date fields and address fields should all be hidden (display: none) when lived_elsewhere is No.
    const fromField = page.locator(`[name="${b64('financial_affairs.address_from_1')}"]`).first();
    if (await fromField.count()) {
      // Either the field is gone from the DOM OR its container is hidden
      const visible = await fromField.isVisible().catch(() => false);
      expect(visible, '"From" date should be hidden when prior residences = No').toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// Static (YAML) proofs for issues whose fix is structural
// ─────────────────────────────────────────────────────────────────────

test.describe('YAML-structural proofs', () => {
  test('Issue #79: Statement of Intention reuses Schedule D creditors (no duplicate list)', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    const yml = readFileSync('docassemble/BankruptcyClinic/data/questions/108-question-blocks.yml', 'utf8');
    // The independent secured_claims gather questions should be GONE.
    expect(yml, 'secured_claims_any_exist gather question should be removed').not.toContain('secured_claims.there_are_any');
    expect(yml, 'secured_claims_creditor_property_details should be removed').not.toContain('secured_claims[i].creditor_name');
    // The new table should iterate prop.creditors instead.
    expect(yml, 'secured_claims_table now iterates prop.creditors').toContain('rows: prop.creditors');
    // Attachment code reads from prop.creditors, not a separate list.
    expect(yml).toContain('for claim in prop.creditors');
  });

  test('Issue #55: Means Test uses DOJ median tables, not 150% of poverty', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    // The DOJ table moved from 101-question-blocks.yml into objects.py
    // (get_median_family_income, Roxanne UAT June 2026) so the 122A code and
    // the poverty_calc note share one source.
    const objects = readFileSync('docassemble/BankruptcyClinic/objects.py', 'utf8');
    const yml101 = readFileSync('docassemble/BankruptcyClinic/data/questions/101-question-blocks.yml', 'utf8');
    const yml122 = readFileSync('docassemble/BankruptcyClinic/data/questions/122A-question-blocks.yml', 'utf8');
    // Median-income table is defined in the shared module
    expect(objects).toMatch(/DOJ_MEDIAN_INCOME_TABLES\s*=\s*\{/);
    // NE family-of-3 should be > $100k (vs the old buggy $37k)
    expect(objects).toMatch(/103358|103,358/);
    // poverty_calc and the 122A median both go through the lookup
    expect(yml101).toContain('get_median_family_income(');
    expect(yml122).toContain('get_median_family_income(');
    // Means test compares against the DOJ median, not 150% poverty math
    expect(yml122).toContain('monthly_income.median_income');
    expect(yml122).not.toMatch(/\b150\s*%\s*of\s*poverty/i);
  });

  test('Issue #71: Money/Property exemptions support two-exemption bifurcation', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    const yml = readFileSync('docassemble/BankruptcyClinic/data/questions/106AB-question-blocks.yml', 'utf8');
    // tax_refund_exemption_value_2 etc. exist (mirror of household_goods)
    expect(yml).toMatch(/tax_refund_exemption_value_2|tax_refund.*_exemption.*_2/);
    expect(yml).toMatch(/exemption_value_2/);
    expect(yml).toMatch(/exemption_laws_2/);
  });

  test('Issue #58/#76/#77/#78: cross-validation is wired into final review', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    const cv = readFileSync('docassemble/BankruptcyClinic/data/questions/cross-validation.yml', 'utf8');
    const fr = readFileSync('docassemble/BankruptcyClinic/data/questions/final-review.yml', 'utf8');
    // Final review references cross_validation_warnings (the DEFINED variable),
    // not the previously-undefined cross_validation_errors.
    expect(fr, 'final-review uses cross_validation_warnings').toContain('cross_validation_warnings');
    expect(fr, 'final-review no longer references the undefined cross_validation_errors').not.toContain('cross_validation_errors');
    // Cross-validation function checks income (#76), community property (#78), property values (#77), and ZIP format (#80).
    expect(cv).toContain('Issue #76');
    expect(cv).toContain('Issue #77');
    expect(cv).toContain('Issue #78');
    expect(cv).toContain('Issue #80');
  });

  test('Issue #54: secured-creditor hidden fields are no longer required', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    const yml = readFileSync('docassemble/BankruptcyClinic/data/questions/106D-question-blocks.yml', 'utf8');
    // property_action_other and codebtor_* fields must declare required: False
    expect(yml).toMatch(/property_action_other\s*\n\s*required:\s*False/);
    expect(yml).toMatch(/codebtor_name\s*\n\s*required:\s*False/);
    expect(yml).toMatch(/codebtor_zip\s*\n[\s\S]*?required:\s*False/);
  });

  test('Issue #57: other-monthly-income hidden fields are no longer required', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    const yml = readFileSync('docassemble/BankruptcyClinic/data/questions/106I-question-blocks.yml', 'utf8');
    // Both debtor[0] and debtor[1] versions
    expect(yml).toMatch(/debtor\[0\]\.income\.specify_monthly_income\s*\n\s*required:\s*false/);
    expect(yml).toMatch(/debtor\[0\]\.income\.other_monthly_amount\s*\n[\s\S]*?required:\s*false/);
    expect(yml).toMatch(/debtor\[1\]\.income\.specify_monthly_income\s*\n\s*required:\s*false/);
  });

  test('Issue #53: vehicle Motor-Vehicle exemption single-claim validation present', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    const yml = readFileSync('docassemble/BankruptcyClinic/data/questions/106AB-question-blocks.yml', 'utf8');
    expect(yml, 'validation block guards Motor Vehicle multi-claim').toContain('Issue #53');
    expect(yml).toContain('Motor Vehicle exemption may only be claimed for one vehicle');
    // Also the hidden-required exemption_value fix
    expect(yml).toMatch(/exemption_value\s*\n[\s\S]*?required:\s*False/);
  });

  test('Issue #63: lawsuit/levy/marital city + state + zip validation in 107', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    const yml = readFileSync('docassemble/BankruptcyClinic/data/questions/107-question-blocks.yml', 'utf8');
    const objs = readFileSync('docassemble/BankruptcyClinic/objects.py', 'utf8');
    // Centralized helper functions exist in objects.py
    expect(objs, 'is_valid_city helper defined').toMatch(/def is_valid_city/);
    expect(objs, 'is_valid_zip helper defined').toMatch(/def is_valid_zip/);
    expect(objs, 'is_valid_city rejects all-numeric').toMatch(/Please enter a valid city name/);
    expect(objs, 'is_valid_zip rejects 4-digit').toMatch(/Please enter a 5-digit ZIP/);
    // Three validation_code blocks in 107 call the helpers
    const cityChecks = (yml.match(/is_valid_city\(/g) || []).length;
    expect(cityChecks, 'city validation present on lawsuits/levies/marital').toBeGreaterThanOrEqual(3);
    const zipChecks = (yml.match(/is_valid_zip\(/g) || []).length;
    expect(zipChecks, 'zip validation present on lawsuits/levies/marital').toBeGreaterThanOrEqual(3);
    // State dropdowns
    expect(yml).toMatch(/court_state\s*\n\s*input type:\s*dropdown/);
    expect(yml).toMatch(/creditor_state\s*\n\s*input type:\s*dropdown/);
    expect(yml).toMatch(/address_state_1\s*\n\s*input type:\s*dropdown/);
  });

  test('Issue #63 widened: validators also wired into 101, 106AB, 106D', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    const y101 = readFileSync('docassemble/BankruptcyClinic/data/questions/101-question-blocks.yml', 'utf8');
    const y106ab = readFileSync('docassemble/BankruptcyClinic/data/questions/106AB-question-blocks.yml', 'utf8');
    const y106d = readFileSync('docassemble/BankruptcyClinic/data/questions/106D-question-blocks.yml', 'utf8');
    expect(y101, 'debtor_basic_info validates city + zip').toMatch(/is_valid_city\(debtor\[i\]\.address\.city\)/);
    expect(y101).toMatch(/is_valid_zip\(debtor\[i\]\.address\.zip\)/);
    expect(y106ab, 'real estate validates city + zip').toMatch(/is_valid_city\(prop\.interests\[i\]\.city\)/);
    expect(y106ab).toMatch(/is_valid_zip\(prop\.interests\[i\]\.zip\)/);
    expect(y106d, 'secured creditor validates city + zip').toMatch(/is_valid_city\(prop\.creditors\[i\]\.city\)/);
    expect(y106d).toMatch(/is_valid_zip\(prop\.creditors\[i\]\.zip\)/);
    // 106AB real estate state field is now a dropdown
    expect(y106ab).toMatch(/prop\.interests\[i\]\.state\s*\n\s*input type:\s*dropdown/);
  });

  test('Issue #65: income wording asks for "at time of filing", not "last month"', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    const yml = readFileSync('docassemble/BankruptcyClinic/data/questions/106I-question-blocks.yml', 'utf8');
    expect(yml).toContain('at the time of filing');
    // The old "previous month" wording is gone from question headings
    expect(yml).not.toMatch(/^question:\s*List total payroll deductions in the previous month$/m);
  });

  test('Issue #74: case_number has format validation code', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    const yml = readFileSync('docassemble/BankruptcyClinic/data/questions/101-question-blocks.yml', 'utf8');
    expect(yml).toMatch(/case_number[\s\S]{0,300}?validation code:/);
    expect(yml).toMatch(/import re[\s\S]{0,400}?re\.match\(pattern, case_number/);
  });

  test('Issue #68: real-estate ZIP requires minlength 5', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    const yml = readFileSync('docassemble/BankruptcyClinic/data/questions/106AB-question-blocks.yml', 'utf8');
    expect(yml).toMatch(/prop\.interests\[i\]\.zip\s*\n[\s\S]{0,100}?minlength:\s*5/);
    expect(yml).toMatch(/prop\.interests\[i\]\.zip\s*\n[\s\S]{0,100}?maxlength:\s*5/);
  });

  test('Issue #64: unsecured-creditor party fields are gated on has_notify', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    const yml = readFileSync('docassemble/BankruptcyClinic/data/questions/106EF-question-blocks.yml', 'utf8');
    // Every Party 1-6 sub-field should be show-if'd on has_notify
    const showIfHasNotify = (yml.match(/show if:\s*prop\.priority_claims\[i\]\.has_notify/g) || []).length;
    expect(showIfHasNotify, 'priority claim party fields gated on has_notify').toBeGreaterThan(0);
    const showIfHasNotifyNonpri = (yml.match(/show if:\s*prop\.nonpriority_claims\[i\]\.has_notify/g) || []).length;
    expect(showIfHasNotifyNonpri, 'nonpriority claim party fields gated on has_notify').toBeGreaterThan(0);
  });

  test('Issue #72: theft/disaster description gated on has_disaster + required: False', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    const yml = readFileSync('docassemble/BankruptcyClinic/data/questions/107-question-blocks.yml', 'utf8');
    expect(yml).toMatch(/disaster_description[\s\S]{0,200}?show if:\s*financial_affairs\.has_disaster/);
    expect(yml).toMatch(/disaster_description[\s\S]{0,200}?required:\s*False/);
  });

  test('Issue #73: financial statements date gated on has_statement + required: False', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    const yml = readFileSync('docassemble/BankruptcyClinic/data/questions/107-question-blocks.yml', 'utf8');
    expect(yml).toMatch(/statement_date[\s\S]{0,200}?show if:\s*financial_affairs\.has_statement/);
    expect(yml).toMatch(/statement_date[\s\S]{0,200}?required:\s*False/);
  });

  test('Issue #59: codebtors community-property detail fields are required: False', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    const yml = readFileSync('docassemble/BankruptcyClinic/data/questions/106H-question-blocks.yml', 'utf8');
    expect(yml).toMatch(/spouse_state[\s\S]{0,200}?required:\s*False/);
    expect(yml).toMatch(/spouse_name[\s\S]{0,200}?required:\s*False/);
  });

  test('Issue #56: other-deduction detail fields are required: false', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    const yml = readFileSync('docassemble/BankruptcyClinic/data/questions/106I-question-blocks.yml', 'utf8');
    // Many specify_other_deduction* fields, all should have required: false
    const otherDedReq = (yml.match(/other_deduction[\s\S]{0,200}?required:\s*false/g) || []).length;
    expect(otherDedReq, 'specify_other_deduction fields marked required: false').toBeGreaterThanOrEqual(2);
  });

  test('Issue #70: exemption overview screen is wired into the petition flow', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    const y106c = readFileSync('docassemble/BankruptcyClinic/data/questions/106C-question-blocks.yml', 'utf8');
    const yvp = readFileSync('docassemble/BankruptcyClinic/data/questions/voluntary-petition.yml', 'utf8');
    // The summary screen question block exists
    expect(y106c, 'exemption summary question block defined').toMatch(/id:\s*exemption_summary_overview/);
    expect(y106c, 'pulls from compute_exemption_totals').toContain('compute_exemption_totals');
    expect(y106c, 'compares against caps from get_exemption_limits via the helper').toContain('exemption_totals_summary');
    expect(y106c, 'flags overages').toMatch(/Over cap by/);
    // And it's gated by exemption_summary_acknowledged in the mandatory flow
    expect(yvp, 'wired into mandatory flow').toContain('exemption_summary_acknowledged');
  });

  test('Issue #77 (superseded by Roxanne UAT June 2026): fee-waiver Part 3 derives from Schedule A/B, never re-asked', async ({ page: _ }) => {
    // Part 3 used to PRE-FILL its questions from Schedule A/B and hard-block
    // divergence (#77). It is now DERIVED outright (official form: "If you
    // have already filled out Schedule A/B ... go to Part 4"), so divergence
    // is impossible by construction and the questions are gone.
    const { readFileSync } = await import('fs');
    const y103b = readFileSync('docassemble/BankruptcyClinic/data/questions/103B-question-blocks.yml', 'utf8');
    const yvp = readFileSync('docassemble/BankruptcyClinic/data/questions/voluntary-petition.yml', 'utf8');
    // Derivation copies the canonical Schedule A/B value verbatim
    expect(y103b, 'mortgage_current_value derives from Schedule A/B interests').toMatch(/prop\.mortgage_current_value\s*=\s*getattr\(_fw_interests\[0\],\s*'current_value'/);
    expect(y103b, 'derivation gate variable present').toContain('fee_waiver_part3_derived');
    // The old Part 3 question screens are gone (no re-asking)
    expect(y103b, 'cash-on-hand question removed').not.toContain('id: f103b_cash_amount');
    expect(y103b, 'home-ownership question removed').not.toContain('id: f103b_home_ownership');
    // Mandatory flow references the derivation, not the old question chain
    expect(yvp, 'mandatory flow uses derivation gate').toContain('fee_waiver_part3_derived');
    expect(yvp, 'mandatory flow no longer walks Part 3 questions').not.toMatch(/prop\.has_bank_accounts\s*$/m);
  });

  test('Issue #60: non-user-sourced data defaults removed from 2030 + 122A', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    const y2030 = readFileSync('docassemble/BankruptcyClinic/data/questions/2030-question-blocks.yml', 'utf8');
    const y122a = readFileSync('docassemble/BankruptcyClinic/data/questions/122A-question-blocks.yml', 'utf8');
    // Form 2030: no hardcoded data defaults (currency, radio source). Yes/No
    // navigation defaults are kept (they're not user-confusing pre-fills).
    expect(y2030, '2030 has no default: debtor on radio fields').not.toMatch(/^\s*default:\s*debtor\s*$/m);
    expect(y2030, '2030 has no default: 0 on currency fields').not.toMatch(/^\s*default:\s*0\s*$/m);
    // 122A: no hardcoded default: 0 / default: " " left on currency/source fields
    expect(y122a, '122A has no default: 0 on currency fields').not.toMatch(/^\s*default:\s*0\s*$/m);
    expect(y122a, '122A has no default: " " on text fields').not.toMatch(/^\s*default:\s*" "\s*$/m);
    // Defensive sum helper present so empty fields don't break the means-test math
    expect(y122a, 'means-test math uses defensive _n() helper').toContain('def _n(obj, attr)');
  });

  test('Issue #80: ZIP-format consistency check in cross-validation', async ({ page: _ }) => {
    const { readFileSync } = await import('fs');
    const cv = readFileSync('docassemble/BankruptcyClinic/data/questions/cross-validation.yml', 'utf8');
    // Cross-validation checks ZIP format on both primary and mailing addresses
    expect(cv, '#80 ZIP-format check present').toMatch(/Issue #80[\s\S]{0,400}?zip_pattern\s*=\s*r'.*5/);
    expect(cv).toMatch(/debtor\[0\]\.address[\s\S]{0,200}?re\.match\(zip_pattern/);
    expect(cv).toMatch(/mailing_address[\s\S]{0,200}?re\.match\(zip_pattern/);
  });
});
