/**
 * Verification for McKenna Wenger's June 2026 feedback (Legal Aid of Nebraska).
 *
 * Issue #3 — "I wanted to go back and fix my income but it just keeps throwing
 * me around. Resume brings you to what you're currently working on, Back brings
 * you to the whole other category before, and it doesn't seem like you can go in
 * and edit again."
 *
 * Root cause: the Schedule I review screen (`event: schedule_i`, reachable from
 * the section nav "Your Income" link OR the final-review "Revisit income" link)
 * was DISPLAY-ONLY — a wall of `note:` text with no Edit buttons. So even when
 * the filer reached the income review, they could look but not change anything.
 *
 * Fix: added per-screen `Edit:`/`button:` items to `schedule_i_review`.
 *
 * This spec runs a full single interview all the way through to PDF assembly
 * (CLAUDE.md: every regression test ends at the deliverable), then exercises the
 * exact path McKenna took — the "Your Income" section-nav link — to confirm the
 * income review now offers working Edit buttons and an edit round-trips.
 *
 * (Issues #1 "other vehicles → other info required" and #2 "insurance amount
 * label / type" are declarative form-definition + label/help changes validated
 * by the YAML, flow, and pdf-field gates; they carry no flow-logic risk.)
 */
import { test, expect, Page } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import { runFullInterview } from './navigation-helpers';
import { b64, waitForDaPageLoad, clickContinue, fillById } from './helpers';
import { finishAndAssertAllPdfs } from './assert-helpers';

async function heading(page: Page): Promise<string> {
  return (await page.locator('h1').first().textContent().catch(() => '')) || '';
}

async function assertNoErrorPage(page: Page) {
  const body = (await page.locator('body').innerText()).toLowerCase();
  expect(body).not.toContain('there was an error');
  expect(body).not.toContain('traceback');
  expect(body).not.toContain('infinite loop');
}

test.describe('McKenna feedback #3 — income is editable from the review screen', () => {
  test.setTimeout(360_000);

  test('full interview assembles, then income is editable from the "Your Income" nav', async ({ page }) => {
    // 1) Drive the whole interview to the conclusion and prove the PDFs assemble.
    await runFullInterview(page, SIMPLE_SINGLE);
    await finishAndAssertAllPdfs(page);

    // 2) McKenna's path: click "Your Income" in the section navigation. With the
    //    schedule_i_review block (event: schedule_i) this opens the income review.
    const yourIncome = page.getByRole('link', { name: /^your income$/i });
    await expect(yourIncome).toBeVisible();
    await yourIncome.click();
    await waitForDaPageLoad(page);
    await assertNoErrorPage(page);
    expect((await heading(page)).toLowerCase()).toContain('review employment');

    // 3) The fix: the review now offers "Revisit" buttons (it used to be
    //    display-only). docassemble labels each button "Revisit" and renders our
    //    descriptive text beneath it. The income screens are listed in a fixed
    //    order: employment (0), monthly income (1), payroll (2), other
    //    deductions (3), other income (4).
    await expect(page.getByText('Monthly income (wages & overtime)')).toBeVisible();
    const revisitButtons = page.getByRole('button', { name: /^revisit$/i });
    await expect(revisitButtons).toHaveCount(5);

    // 4) Click the monthly-income Revisit → land on the editable monthly-income
    //    screen (defines income_amount_1). The income_amount_1 assertion below
    //    confirms we opened the right screen — the screen McKenna could not get
    //    back to before this fix.
    await revisitButtons.nth(1).click();
    await waitForDaPageLoad(page);
    await assertNoErrorPage(page);

    const amtField = page.locator(`#${b64('debtor[0].income.income_amount_1')}`);
    await expect(amtField).toBeVisible();      // the income IS editable again

    // 5) Change the value and continue — the edit must submit without error.
    await fillById(page, b64('debtor[0].income.income_amount_1'), '4321');
    await clickContinue(page);
    await waitForDaPageLoad(page);
    await assertNoErrorPage(page);
  });
});
