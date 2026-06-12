/**
 * Regression tests for Roxanne's June-2026 UAT feedback batch (Legal Aid of NE).
 *
 * The runtime test drives the actual broken path she reported (joint filing
 * accepted the same person entered twice). The static tests pin the YAML /
 * Python wiring of each fix so a refactor can't silently undo them — the
 * behavior itself is covered by the unit tests (test_exemption_totals.py, run
 * in-container) and the end-to-end scenario specs.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import {
  b64,
  waitForDaPageLoad,
  fillDebtorIdentity,
} from './helpers';
import {
  navigateToDebtorPage,
  fillDebtorAndAdvance,
} from './navigation-helpers';
import { JOINT_COUPLE } from './fixtures';

const Q = 'docassemble/BankruptcyClinic/data/questions/';
const read = (f: string) => readFileSync(Q + f, 'utf8');

test.describe('Roxanne UAT June 2026 — static wiring', () => {
  test('joint filing: cross-debtor duplicate name/SSN validation exists', async ({ page: _ }) => {
    const y = read('101-question-blocks.yml');
    expect(y, 'duplicate-SSN check').toContain("Each spouse must enter their own tax ID");
    expect(y, 'duplicate-name check').toContain('Debtor 2 has the same name as Debtor 1');
    // It compares debtor[i] against debtor[0] inside the i==1 branch
    expect(y).toMatch(/if i == 1:[\s\S]{0,400}debtor\[0\]\.tax_id/);
  });

  test('credit counseling: certificate date must be within 180 days, not future', async ({ page: _ }) => {
    const y = read('101-question-blocks.yml');
    expect(y, '180-day window enforced').toMatch(/counseling_date[\s\S]{0,600}_days_ago > 180/);
    expect(y, 'future dates rejected').toContain('The counseling date cannot be in the future.');
  });

  test('annuities offer the § 44-371 exemption (not the wages list)', async ({ page: _ }) => {
    const y = read('106AB-question-blocks.yml');
    // Both annuity law dropdowns use the 'annuity' category…
    const annuityChoices = y.match(/annuities\[i\]\.exemption_laws(_2)?[\s\S]{0,120}?get_exemption_choices_or_combined\(exemption_filing_state,'(\w+)'\)/g) ?? [];
    expect(annuityChoices.length, 'both annuity law dropdowns found').toBe(2);
    for (const c of annuityChoices) expect(c).toContain("'annuity'");
    // …and the category resolves to the § 44-371 life-insurance/annuity law.
    const objects = readFileSync('docassemble/BankruptcyClinic/objects.py', 'utf8');
    expect(objects).toMatch(/'annuity':\s+\['life_insurance', 'retirement', 'wildcard', 'unknown'\]/);
    expect(objects).toContain("'life_insurance': 'Life insurance and annuity contracts (Neb. Rev. Stat. § 44-371)'");
    // exemptions.js (the client-side tracker copy) carries the same law string.
    const js = readFileSync('docassemble/BankruptcyClinic/data/static/exemptions.js', 'utf8');
    expect(js).toContain("law: 'Life insurance and annuity contracts (Neb. Rev. Stat. § 44-371)', limit: 100000");
  });

  test('exemption summary totals cover every claiming category', async ({ page: _ }) => {
    const objects = readFileSync('docassemble/BankruptcyClinic/objects.py', 'utf8');
    // Spot-check the category map inside compute_exemption_totals: financial
    // assets, owed property, business, farm and the flat personal-property
    // categories all feed the running totals now.
    for (const marker of [
      "(fa, 'annuities', 'has_claim', 'sub_100', 'amount')",
      "(fa, 'deposits', 'is_claiming_exemption', 'sub_100', 'amount')",
      "(fa, 'cash_is_claiming_exemption', 'cash_sub_100', 'cash_value', 'cash_')",
      "(owed, 'tax_refund_has_claim'",
      "(biz, 'ar_has_claim'",
      "(farm, 'has_animal_claim'",
      "(prop, 'jewelry_is_claiming_exemption'",
    ]) {
      expect(objects, `claims walker covers ${marker}`).toContain(marker);
    }
  });

  test('Schedule C: an entered exemption amount is a dollar-amount claim, not 100% FMV', async ({ page: _ }) => {
    const objects = readFileSync('docassemble/BankruptcyClinic/objects.py', 'utf8');
    // New semantics: any entered amount > 0 => specific-dollar claim.
    expect(objects).toMatch(/def claiming_less_than_full[\s\S]{0,1200}return amt > 0/);
    // The 106C auto-populate derives the flag from explicitness, not amount<value.
    const y106c = read('106C-question-blocks.yml');
    expect(y106c).toContain("_item.not_full_exemption = _entry['explicit']");
  });

  test('means test: median income is looked up, never typed by the filer', async ({ page: _ }) => {
    const y122a = read('122A-question-blocks.yml');
    // No question field collects monthly_income.median_income any more…
    expect(y122a).not.toMatch(/-\s*Median family income[^\n]*:\s*monthly_income\.median_income/);
    // …it is defined by code from the DOJ table lookup.
    expect(y122a).toMatch(/monthly_income\.median_income = get_median_family_income\(/);
    const objects = readFileSync('docassemble/BankruptcyClinic/objects.py', 'utf8');
    expect(objects).toContain('def get_median_family_income(');
    // Review screen compares against the same figure that lands on the PDF.
    expect(y122a).toContain('overall_means_income < monthly_income.median_income');
  });

  test('Schedule E detail screen is labeled as PRIORITY claims', async ({ page: _ }) => {
    const y = read('106EF-question-blocks.yml');
    expect(y).toContain('Tell the court about a priority unsecured claim');
    expect(y).toMatch(/priority_unsecured_claim_details[\s\S]{0,400}Schedule E/);
  });

  test('creditor picker: owe-money wording and idempotent injection', async ({ page: _ }) => {
    const y = read('creditor-library-picker.yml');
    expect(y, 'picker explains selections become claims').toContain('Only select a creditor if you actually owe it money.');
    expect(y, 'injection skips creditors already present').toContain('_already_present');
  });

  test('creditor matrix: conclusion page has a real download link', async ({ page: _ }) => {
    const y = read('101-question-blocks.yml');
    expect(y).toContain('mailing_matrix_file.url_for(attachment=True)');
    // The old inline dump (bare ${ mailing_matrix_file }) is gone.
    expect(y).not.toMatch(/^\s*\$\{ mailing_matrix_file \}\s*$/m);
  });

  test('106I: employer state is abbreviated on the PDF', async ({ page: _ }) => {
    const y = read('106I-question-blocks.yml');
    expect(y).toMatch(/income1\['state'\+str\(i\)\] = state_abbr\(debt\.income\.employer_state\)/);
  });

  test('disposable-income summary is wired in after Schedule J', async ({ page: _ }) => {
    const yj = read('106J-question-blocks.yml');
    const yvp = read('voluntary-petition.yml');
    expect(yj).toContain('id: income_expense_summary');
    expect(yj).toContain('schedule_j_net_income = schedule_i_take_home_total - schedule_j_total_expenses');
    expect(yvp, 'mandatory flow gates on the summary').toContain('income_expense_summary_acknowledged');
    // Final review shows the totals too.
    const yfr = read('final-review.yml');
    expect(yfr).toContain('schedule_i_take_home_total');
    expect(yfr).toContain('schedule_j_net_income');
  });

  test('fee waiver: 103B counts are integers and expenses default from Schedule J', async ({ page: _ }) => {
    const y = read('103B-question-blocks.yml');
    expect(y).toContain("waive['sizeTotal'] = int(family.total_number)");
    expect(y).toContain('family.dependent_count = int(_fw_dep_count)');
    expect(y).toMatch(/family\.average_monthly_expenses\s*\n\s*datatype: currency\s*\n\s*default: \$\{ schedule_j_total_expenses \}/);
  });
});

test.describe('Roxanne UAT June 2026 — runtime', () => {
  test('joint filing rejects the same person entered as both debtors', async ({ page }) => {
    await navigateToDebtorPage(page, JOINT_COUPLE);
    await fillDebtorAndAdvance(page, JOINT_COUPLE.debtor);

    // Debtor 2 screen: enter EXACTLY the same identity as Debtor 1 (Roxanne's
    // test run did this and the interview accepted it).
    await waitForDaPageLoad(page);
    await fillDebtorIdentity(page, {
      first: JOINT_COUPLE.debtor.first,
      middle: JOINT_COUPLE.debtor.middle,
      last: JOINT_COUPLE.debtor.last,
      street: JOINT_COUPLE.debtor.street,
      city: JOINT_COUPLE.debtor.city,
      state: JOINT_COUPLE.debtor.state,
      zip: JOINT_COUPLE.debtor.zip,
      countyIndex: JOINT_COUPLE.debtor.countyIndex,
      taxIdType: JOINT_COUPLE.debtor.taxIdType,
      taxId: JOINT_COUPLE.debtor.taxId,   // same SSN as Debtor 1
    });

    // fillDebtorIdentity submits the page; the duplicate must be rejected.
    await waitForDaPageLoad(page);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Each spouse must enter their own tax ID');
    // Still on the Debtor 2 identity screen (not advanced to aliases).
    await expect(page.locator(`#${b64('debtor[i].name.first')}`)).toBeAttached();

    // Correcting the SSN lets the filer proceed.
    await fillDebtorIdentity(page, {
      first: JOINT_COUPLE.spouse!.first,
      middle: JOINT_COUPLE.spouse!.middle,
      last: JOINT_COUPLE.spouse!.last,
      street: JOINT_COUPLE.spouse!.street,
      city: JOINT_COUPLE.spouse!.city,
      state: JOINT_COUPLE.spouse!.state,
      zip: JOINT_COUPLE.spouse!.zip,
      countyIndex: JOINT_COUPLE.spouse!.countyIndex,
      taxIdType: JOINT_COUPLE.spouse!.taxIdType,
      taxId: JOINT_COUPLE.spouse!.taxId,
    });
    await waitForDaPageLoad(page);
    const afterFix = await page.locator('body').innerText();
    expect(afterFix).not.toContain('Each spouse must enter their own tax ID');
  });
});
