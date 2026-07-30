/**
 * Regression: prod crash `DAErrorMissingVariable: ... reference to a variable
 * 'financial_affairs.consumer_debt_payments[0].payment_on_petition'`
 * (docassemble2 error mail, 2026-07-30 02:53 + 02:57 UTC).
 *
 * Root cause: docassemble `exec`s code blocks against the interview namespace,
 * so a `for` loop target in a code block is a WRITE to that global name. The
 * 107 builder looped `for payment in financial_affairs.consumer_debt_payments:`
 * (and over insider_payments / insider_benefits / bankruptcy_payments), which
 * rebound the GLOBAL `payment` DAObject — the Form 103A installment
 * application — to a SOFA list item. The 103A builder then read
 * `payment.payment_on_petition`, which resolved against the wrong object and
 * had no question to define it. Dead end: the mandatory block re-runs every
 * screen, so once 107 had assembled the filer could not proceed at all.
 *
 * Trigger: choose "pay the fee in installments" (Form 103A defines `payment`)
 * AND have at least one SOFA payment entry (a non-empty list is what makes the
 * loop body execute and clobber the name). Both happy-path helper defaults —
 * "pay the entire fee" and SOFA all-No — hid this, so this spec drives the
 * actual failing branch and runs through to PDF assembly.
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE, TestScenario } from './fixtures';
import { runFullInterview } from './navigation-helpers';
import { finishAndAssertAllPdfs } from './assert-helpers';

const SCN: TestScenario = {
  ...SIMPLE_SINGLE,
  name: 'installments-with-sofa-payments',
  // Non-empty SOFA q6 list → the 107 builder's payment loop actually runs.
  consumerDebtPayments: [
    {
      name: 'Cornhusker Credit Union',
      street: '1200 O St',
      city: 'Lincoln',
      state: 'Nebraska',
      zip: '68508',
      paymentDates: '06/02/2026 $620.00\n07/02/2026 $620.00',
      totalAmount: '1240',
      amountOwed: '4300',
      paymentFor: 'Loan repayment',
    },
  ],
  // Installments branch → the global `payment` object (Form 103A) exists and is
  // read by the 103A builder at assembly.
  caseDetails: {
    feePayment: 'installments',
    paymentOnPetition: true,
    initialPaymentAmount: '78',
    // ISO format — the collect page renders <input type="date">. Computed
    // relative to today so the 90-day cap assertions never go stale.
    installments: [{ amount: '260', date: isoDaysFromNow(30) }],
    // Tried first; the server-side 90-day cap (Roxanne UAT 2026-07-29) must
    // reject it before the valid date above is accepted.
    invalidInstallmentDate: isoDaysFromNow(120),
  },
};

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

test.setTimeout(600_000);

test('installments + SOFA consumer-debt payments assembles (global `payment` not clobbered by 107 loops)', async ({
  page,
}) => {
  await runFullInterview(page, SCN);

  // Nav regression (Roxanne 2026-07-29): choosing installments used to
  // overwrite nav section index 3 — the "Property" entry — with a duplicate
  // "Case Detail". Property must still be in the left-hand menu.
  await expect(
    page.locator('.danavdiv, #daTOC, nav').first(),
    'left-hand menu lost its "Property" section (nav index clobber)',
  ).toContainText('Property');

  // The crash surfaced as an error page while assembling 103A. Assert the
  // interview reached assembly and produced the forms, including 103A.
  const pdfs = await finishAndAssertAllPdfs(page, { mustInclude: ['101', '103', '106', '107', '122'] });

  const names = pdfs.map((p) => p.name.toLowerCase()).join(' | ');
  expect(names, 'Form 103A (installment application) did not assemble').toContain('103');
});
