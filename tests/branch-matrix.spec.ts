/**
 * Branch coverage matrix — the show-if / branch-gap paths the manifest flags.
 *
 * The happy-path scenario specs all pick "Primarily business debts" on the
 * single Form 101 debt-kind radio (from which 107 q6 and the 122A
 * non_consumer_debts flag now DERIVE), which short-circuits the means test
 * entirely (no 122A income screens, no review_122). That is exactly the
 * branch where the shipped crashes lived:
 *
 *  - B1: single + consumer debts → the 122A gross_wages2 BRANCH GAP
 *    (collected only for married-filing, read for ANY consumer-debt filer —
 *    single filers crashed at assembly until commit f755a48).
 *  - B2: joint + consumer debts + "Married filing jointly" → drives the
 *    gross_wages2 *collection* screen itself, plus the 107 D2-income builder
 *    path for a two-debtor case (the checkbox `.get()` fix region).
 *  - B3: single + consumer debts + "Married NOT filing" + separated →
 *    separated_status only exists behind a show-if on that filing_status
 *    choice (the 122A SHOW-IF GAP the manifest caught).
 *
 * Every case runs ALL THE WAY THROUGH to PDF assembly — these crashes only
 * surface when the form builders read the variables, not mid-interview.
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE, JOINT_COUPLE, TestScenario } from './fixtures';
import { runFullInterview } from './navigation-helpers';
import { finishAndAssertAllPdfs } from './assert-helpers';
import { findPdf } from './pdf-helpers';

test.describe('Branch matrix: means-test consumer-debt branches', () => {
  test.setTimeout(600_000);

  test('B1: single filer + consumer debts (Not married) assembles all PDFs', async ({ page }) => {
    const scenario: TestScenario = {
      ...SIMPLE_SINGLE,
      meansTest: { consumerDebts: true, filingStatusIndex: 0 },
    };
    await runFullInterview(page, scenario);
    const pdfs = await finishAndAssertAllPdfs(page);

    // The single Form 101 debt-kind answer must land on BOTH derived forms
    // (107 q6 and the 101 Part 6 checkboxes) — proves the derivation reaches
    // paper, not just that assembly doesn't crash.
    const f101 = findPdf(pdfs, '101');
    expect(f101?.fields['consumer_debts_true'],
      'Form 101 Part 6 "primarily consumer" checkbox').toBeTruthy();
    expect(f101?.fields['business_debts_true'],
      'Form 101 Part 6 business checkbox must be unchecked').toBeFalsy();
    const f107 = findPdf(pdfs, '107');
    expect(f107?.fields['yesBothConsumerDebts'],
      'Form 107 q6 consumer-debts checkbox (derived from Form 101)').toBeTruthy();
  });

  test('B2: joint filers + consumer debts (Married filing jointly) assembles all PDFs', async ({ page }) => {
    const scenario: TestScenario = {
      ...JOINT_COUPLE,
      meansTest: { consumerDebts: true, filingStatusIndex: 1 },
    };
    await runFullInterview(page, scenario);
    // Two-debtor consumer branch: collects gross_wages2 (the screen single
    // filers never see) and exercises the 107 builder's D2 region.
    await finishAndAssertAllPdfs(page);
  });

  test('B3: single + consumer debts (Married NOT filing, separated) assembles all PDFs', async ({ page }) => {
    const scenario: TestScenario = {
      ...SIMPLE_SINGLE,
      meansTest: { consumerDebts: true, filingStatusIndex: 2, separatedStatusIndex: 1 },
    };
    await runFullInterview(page, scenario);
    await finishAndAssertAllPdfs(page);
  });

  test('B4: single filer + "Other" debt kind assembles all PDFs with both 101 boxes off', async ({ page }) => {
    // The third radio option (reporting_type = '3'): reveals the optional
    // "Other type" show-if field, derives primarily_consumer=False /
    // non_consumer=True (means test short-circuits like business), and checks
    // NEITHER Part 6 box on Form 101.
    const scenario: TestScenario = {
      ...SIMPLE_SINGLE,
      name: 'debt-kind-other',
      meansTest: { debtKind: 'other' },
    };
    await runFullInterview(page, scenario);
    const pdfs = await finishAndAssertAllPdfs(page);

    const f101 = findPdf(pdfs, '101');
    expect(f101?.fields['consumer_debts_true'],
      'Form 101 consumer checkbox must be unchecked for "Other"').toBeFalsy();
    expect(f101?.fields['business_debts_true'],
      'Form 101 business checkbox must be unchecked for "Other"').toBeFalsy();
    const f107 = findPdf(pdfs, '107');
    expect(f107?.fields['noConsumerDebts'],
      'Form 107 q6 "No" checkbox (derived from Form 101 "Other")').toBeTruthy();
  });
});
