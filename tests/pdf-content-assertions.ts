/**
 * PDF content assertions — verify the assembled forms carry the RIGHT VALUES,
 * not merely that they assemble. For a legal filing, a wrong dollar amount or
 * a dropped creditor is worse than a crash: it gets filed with the court.
 *
 * Two layers:
 *
 *  1. assertCrossFormConsistency(pdfs) — universal invariants that hold for
 *     ANY scenario, no fixture knowledge needed. Form 106Sum (Summary of
 *     Assets & Liabilities) repeats totals computed on 106AB / 106EF / 106I /
 *     106J, so the same number must appear on both forms. Likewise debtor
 *     name and district must be identical across every form. These catch
 *     calculation drift, dict/field-name mismatches, and builder regressions
 *     without hardcoding any expected value.
 *
 *  2. assertScenarioPdfValues(pdfs, scenario) — fixture-derived absolute
 *     checks (names, address, SSN last-4, claim totals, rent, wages) plus the
 *     cross-form layer. Call this from every scenario spec after
 *     downloadAllPdfs().
 *
 * Field names come from the PDF-builder code blocks in
 * data/questions/1xx-question-blocks.yml (e.g. main['debtor_first_name1'],
 * ef['p2Total'], summary_fields['3b']). If a builder renames a field, update
 * here — the manifest tooling guarantees the variables exist; this layer
 * guarantees the values land.
 */
import { expect } from '@playwright/test';
import { PdfInfo, findPdf, getField } from './pdf-helpers';
import { TestScenario } from './fixtures';

/** Parse a docassemble currency() string ('$1,234.56') to a number; null if blank/unparseable. */
export function toNum(s: string | boolean | undefined): number | null {
  if (typeof s !== 'string' || s.trim() === '') return null;
  const n = parseFloat(s.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Assert two currency-formatted fields are numerically equal (both may be blank-vs-$0.00). */
function expectCurrencyEqual(
  actual: string, expected: string, label: string,
) {
  const a = toNum(actual) ?? 0;
  const e = toNum(expected) ?? 0;
  expect(Math.abs(a - e), `${label}: expected ${expected || '(blank)'} but form shows ${actual || '(blank)'}`).toBeLessThan(0.005);
}

interface FormSet {
  f101?: PdfInfo; ab?: PdfInfo; ef?: PdfInfo; i?: PdfInfo; j?: PdfInfo; sum?: PdfInfo;
}

function resolveForms(pdfs: PdfInfo[]): FormSet {
  return {
    f101: findPdf(pdfs, '101'),
    ab: findPdf(pdfs, '106ab'),
    ef: findPdf(pdfs, '106ef'),
    i: findPdf(pdfs, '106i'),
    j: findPdf(pdfs, '106j'),
    sum: findPdf(pdfs, '106 summary'),
  };
}

/**
 * Universal invariants — valid for every scenario.
 * Returns the number of invariants checked (so callers can assert > 0).
 */
export function assertCrossFormConsistency(pdfs: PdfInfo[]): number {
  const { f101, ab, ef, i, j, sum } = resolveForms(pdfs);
  let checked = 0;

  // ── Identity consistency: same debtor name + district on every form ──
  const withIdentity = [f101, ef, i, j, sum].filter(Boolean) as PdfInfo[];
  const names = withIdentity
    .map(p => getField(p.fields, 'debtor1_name_1') || getField(p.fields, 'Debtor 1'))
    .filter(n => n !== '');
  expect(names.length, 'no form carries a debtor-1 name field').toBeGreaterThan(0);
  for (const n of names) {
    expect(n, `debtor-1 name differs across forms: ${JSON.stringify(names)}`).toBe(names[0]);
    checked++;
  }
  const districts = withIdentity
    .map(p => getField(p.fields, 'bankruptcy_district') || getField(p.fields, 'Bankruptcy District Information'))
    .filter(d => d !== '');
  for (const d of districts) {
    expect(d, `district differs across forms: ${JSON.stringify(districts)}`).toBe(districts[0]);
    checked++;
  }

  // ── 106Sum lines must equal the source-form totals ──
  if (sum && ab) {
    expectCurrencyEqual(getField(sum.fields, '1a'), getField(ab.fields, 'p1TotalAmtFinal'), 'Sum 1a vs 106AB real-property total');
    expectCurrencyEqual(getField(sum.fields, '1b'), getField(ab.fields, 'totalPersonalProp'), 'Sum 1b vs 106AB personal-property total');
    expectCurrencyEqual(getField(sum.fields, '1c'), getField(ab.fields, 'totalABPropertyAmt'), 'Sum 1c vs 106AB grand total');
    checked += 3;
  }
  if (sum && ef) {
    expectCurrencyEqual(getField(sum.fields, '3a'), getField(ef.fields, 'p1Total'), 'Sum 3a vs 106EF priority total');
    expectCurrencyEqual(getField(sum.fields, '3b'), getField(ef.fields, 'p2Total'), 'Sum 3b vs 106EF nonpriority total');
    checked += 2;
  }
  if (sum) {
    const a3 = toNum(getField(sum.fields, '3a')) ?? 0;
    const b3 = toNum(getField(sum.fields, '3b')) ?? 0;
    expectCurrencyEqual(getField(sum.fields, '3c'), fmt(a3 + b3), 'Sum 3c = 3a + 3b');
    checked++;
  }
  if (sum && i) {
    expectCurrencyEqual(getField(sum.fields, '5'), getField(i.fields, 'combinedMonthlyTotal'), 'Sum 5 vs 106I combined monthly income');
    checked++;
  }
  if (sum && j) {
    expectCurrencyEqual(getField(sum.fields, '8'), getField(j.fields, 'overallTotal'), 'Sum 8 vs 106J total expenses');
    expectCurrencyEqual(getField(sum.fields, '9a'), getField(j.fields, 'netTotal'), 'Sum 9a vs 106J net income');
    checked += 2;
  }

  // ── Internal arithmetic on the source forms ──
  if (i) {
    // gross = wages + overtime, per debtor line 1
    const w = toNum(getField(i.fields, 'wages1'));
    const o = toNum(getField(i.fields, 'overtime1'));
    if (w !== null || o !== null) {
      expectCurrencyEqual(getField(i.fields, 'gross1'), fmt((w ?? 0) + (o ?? 0)), '106I gross1 = wages1 + overtime1');
      checked++;
    }
  }
  if (j) {
    const inc = toNum(getField(j.fields, 'incomeTotal'));
    const exp1 = toNum(getField(j.fields, 'debtor1Total'));
    if (inc !== null && exp1 !== null) {
      expectCurrencyEqual(getField(j.fields, 'netTotal'), fmt(inc - exp1), '106J netTotal = incomeTotal - debtor1Total');
      checked++;
    }
  }
  if (ef) {
    // 106EF Part-2 (nonpriority) total = sum of its category totals
    const cats = ['loansTotal', 'obligationsTotal', 'pensionsTotal', 'otherP2Total'];
    const catSum = cats.reduce((s, c) => s + (toNum(getField(ef.fields, c)) ?? 0), 0);
    const p2 = toNum(getField(ef.fields, 'p2Total'));
    if (p2 !== null) {
      // p2Total also folds in the medical category (not exposed as its own
      // field on the form) — so assert >= the visible categories, == when no
      // medical debt is in play is handled by scenario-level checks.
      expect(p2 + 0.005, `106EF p2Total (${p2}) < sum of visible category totals (${catSum})`).toBeGreaterThanOrEqual(catSum);
      checked++;
    }
  }

  return checked;
}

/**
 * Fixture-derived absolute checks + the universal layer. Call from every
 * scenario spec:
 *
 *   const pdfs = await downloadAllPdfs(page);
 *   assertScenarioPdfValues(pdfs, SIMPLE_SINGLE);
 */
export function assertScenarioPdfValues(pdfs: PdfInfo[], scenario: TestScenario): void {
  const { f101, ef, i, j } = resolveForms(pdfs);
  const d = scenario.debtor;

  // ── Form 101: identity block ──
  expect(f101, 'Form 101 missing from assembled PDFs').toBeTruthy();
  if (f101) {
    expect(getField(f101.fields, 'debtor_first_name1')).toBe(d.first);
    expect(getField(f101.fields, 'debtor_last_name1')).toBe(d.last);
    if (d.middle) expect(getField(f101.fields, 'debtor_middle_name1')).toBe(d.middle);
    expect(getField(f101.fields, 'debtor_street1')).toBe(d.street);
    expect(getField(f101.fields, 'debtor_city1')).toBe(d.city);
    expect(getField(f101.fields, 'debtor_state1')).toBe(d.state);
    expect(getField(f101.fields, 'debtor_zip1')).toBe(d.zip);
    if (d.taxIdType === 'ssn') {
      expect(getField(f101.fields, 'debtor_ssn1'), '101 SSN last-4').toBe(d.taxId.replace(/\D/g, '').slice(-4));
    }
    expect(getField(f101.fields, 'bankruptcy_district')).toContain(scenario.district.replace(/^District of /, ''));
    expect(f101.fields['isCh7'], '101 must be a Chapter 7 filing').toBe(true);

    if (scenario.jointFiling && scenario.spouse) {
      expect(getField(f101.fields, 'debtor_first_name2')).toBe(scenario.spouse.first);
      expect(getField(f101.fields, 'debtor_last_name2')).toBe(scenario.spouse.last);
    }
  }

  // ── Form 106EF: nonpriority claims must sum to the fixture's claims ──
  const npList = scenario.creditors?.nonpriorityList;
  if (ef && npList && npList.length > 0) {
    const expected = npList.reduce((s, c) => s + parseFloat(c.totalClaim), 0);
    expectCurrencyEqual(getField(ef.fields, 'p2Total'), fmt(expected),
      `106EF nonpriority total vs fixture's ${npList.length} claims`);
    // NB: the template's checkbox is hasNonPriorityClaims (the builder wrote a
    // nonexistent *UnsecuredCreditors name until June 2026 — this assertion is
    // what caught it).
    expect(ef.fields['hasNonPriorityClaims'], '106EF has-nonpriority checkbox').toBe(true);
  }

  // ── Form 106I: employment + wage lines ──
  if (i && scenario.income) {
    const inc = scenario.income;
    if (inc.employment === 'Employed') {
      expect(i.fields['isEmployed1'], '106I employed checkbox').toBe(true);
      if (inc.employer) expect(getField(i.fields, 'employer1')).toBe(inc.employer);
      if (inc.grossWages) expectCurrencyEqual(getField(i.fields, 'wages1'), fmt(parseFloat(inc.grossWages)), '106I wages1 vs fixture gross wages');
      if (inc.taxDeduction) expectCurrencyEqual(getField(i.fields, 'tax1'), fmt(parseFloat(inc.taxDeduction)), '106I tax1 vs fixture tax deduction');
    }
  }

  // ── Form 106J: rent ──
  if (j && scenario.rentExpense) {
    expectCurrencyEqual(getField(j.fields, 'rentExpense'), fmt(parseFloat(scenario.rentExpense)), '106J rent vs fixture');
  }

  // ── Universal invariants always run last (better failure locality above) ──
  const n = assertCrossFormConsistency(pdfs);
  console.log(`  ✓ PDF content: fixture values verified + ${n} cross-form invariants held`);
}
