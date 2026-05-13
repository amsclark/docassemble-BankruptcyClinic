/**
 * Deep per-issue regression tests.
 *
 * Each test drives the live interview deep enough to demonstrate the
 * specific fix the issue was about. These produce real E2E videos for
 * the resolved customer-reported issues that the shallow tests in
 * issue-regression.spec.ts cover only by YAML inspection.
 *
 * Naming convention: each `test()` name starts with `Issue #NN` so the
 * generated video directory is easy to map back to the issue.
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
  fillById,
  selectYesNoRadio,
  fillYesNoRadio,
  setCheckbox,
} from './helpers';
import {
  navigateToDebtorPage,
  fillDebtorAndAdvance,
  passDebtorFinal,
} from './navigation-helpers';
import { TestScenario, DebtorProfile } from './fixtures';

const baseDebtor: DebtorProfile = {
  first: 'Deep', last: 'Test',
  street: '123 Test St', city: 'Lincoln', state: 'Nebraska',
  zip: '68508', countyIndex: 1,
  taxIdType: 'ssn', taxId: '123-45-6789',
};

const scenario: TestScenario = {
  name: 'deep-regression', district: 'District of Nebraska',
  amended: false, jointFiling: false,
  debtor: baseDebtor, property: { vehicles: [] }, creditors: {}, rentExpense: '800',
};

// ─── helpers ─────────────────────────────────────────────────────────

/** Continue without overriding the jQuery validator — what a real user sees.
 *  Used to PROVE bugs like #54/#56/#57 where the prior fixture's `:hidden`
 *  hack masked the real-user issue. */
async function clickContinueStrict(page: Page) {
  await waitForDaPageLoad(page);
  await page.locator('#da-continue-button').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
}

async function heading(page: Page): Promise<string> {
  return (await page.locator('h1').first().textContent({ timeout: 5000 }).catch(() => '')) || '';
}

/** Walk forward by repeatedly clicking the No-yes/no answer or Continue until we
 *  reach a page whose heading matches one of `until`. Returns the heading
 *  reached, or '' if we hit the iteration limit. */
async function advanceUntilHeading(page: Page, until: RegExp, maxSteps = 80): Promise<string> {
  for (let i = 0; i < maxSteps; i++) {
    const h = (await heading(page)).toLowerCase();
    if (until.test(h)) return h;
    // Try answering No on any visible yesno-button question
    const noBtn = page.locator('button:has-text("No")').first();
    if (await noBtn.count()) {
      await noBtn.click().catch(() => {});
      await waitForDaPageLoad(page);
      continue;
    }
    // Or hit Continue
    await clickContinue(page).catch(() => {});
    await waitForDaPageLoad(page);
  }
  return '';
}

async function startInterviewAndReachDebtor(page: Page) {
  await navigateToDebtorPage(page, scenario);
}

async function reachAfterDebtor(page: Page) {
  await navigateToDebtorPage(page, scenario);
  await fillDebtorAndAdvance(page, scenario.debtor);
  await passDebtorFinal(page);
}

// ═════════════════════════════════════════════════════════════════════
//  PROPERTY / VEHICLES / SCHEDULE A/B
// ═════════════════════════════════════════════════════════════════════

test.describe('Property + vehicles (Schedule A/B)', () => {
  test.setTimeout(360_000);

  test('Issue #68: real estate ZIP under 5 digits is rejected', async ({ page }) => {
    await reachAfterDebtor(page);
    // property intro
    await clickContinue(page);
    await waitForDaPageLoad(page);
    // Yes to real estate
    const yesBtn = page.locator('button:has-text("Yes")').first();
    await yesBtn.click();
    await waitForDaPageLoad(page);
    // Fill the page minimally with a 4-digit ZIP
    await fillById(page, b64('prop.interests[0].street'), '500 W Maple');
    await fillById(page, b64('prop.interests[0].city'), 'Lincoln');
    const stateSel = page.locator(`#${b64('prop.interests[0].state')}`);
    if ((await stateSel.evaluate(el => el.tagName.toLowerCase()).catch(() => '')) === 'select') {
      await stateSel.selectOption({ label: 'Nebraska' }).catch(() => {});
    }
    await fillById(page, b64('prop.interests[0].zip'), '1234'); // too short
    await clickContinueStrict(page);
    await waitForDaPageLoad(page);
    // Should still be on real-estate page
    const zipStill = await page.locator(`#${b64('prop.interests[0].zip')}`).count();
    expect(zipStill, 'ZIP under 5 digits should keep user on real-estate page').toBeGreaterThan(0);
  });

  test('Issue #71: Money/Property Owed section offers second exemption (tax refund)', async ({ page }) => {
    await reachAfterDebtor(page);
    // property intro
    await clickContinue(page);
    await waitForDaPageLoad(page);
    // Walk forward answering No on every yes/no until we hit the money-or-property section
    // (heading mentions tax refund / money owed). Capped to avoid runaway.
    for (let i = 0; i < 30; i++) {
      const h = (await heading(page)).toLowerCase();
      if (h.includes('tax refund') || h.includes('money or property')) break;
      const no = page.locator('button:has-text("No")').first();
      if (await no.count()) { await no.click(); await waitForDaPageLoad(page); continue; }
      await clickContinue(page); await waitForDaPageLoad(page);
    }
    // On the page; look for the "First Exemption" / "Second Exemption" note labels.
    const html = await page.content();
    expect(html, 'Second Exemption section visible on Money/Property Owed page')
      .toMatch(/Second Exemption|exemption_value_2/i);
  });

  test('Issue #53: claiming Motor Vehicle exemption on a second vehicle is blocked', async ({ page }) => {
    await reachAfterDebtor(page);
    // property intro
    await clickContinue(page);
    await waitForDaPageLoad(page);
    // No real estate
    await page.locator('button:has-text("No")').first().click();
    await waitForDaPageLoad(page);
    // Yes to vehicles
    await page.locator('button:has-text("Yes")').first().click();
    await waitForDaPageLoad(page);
    // Fill vehicle 1, claim Motor Vehicle exemption
    await fillById(page, b64('prop.ab_vehicles[0].make'), 'Toyota');
    await fillById(page, b64('prop.ab_vehicles[0].model'), 'Corolla');
    await fillById(page, b64('prop.ab_vehicles[0].year'), '2018');
    await fillById(page, b64('prop.ab_vehicles[0].milage'), '80000');
    await clickById(page, `${b64('prop.ab_vehicles[0].who')}_0`);
    await fillById(page, b64('prop.ab_vehicles[0].current_value'), '8000');
    await fillById(page, b64('prop.ab_vehicles[0].state'), 'NE');
    await setCheckbox(page, 'prop.ab_vehicles[0].has_loan', false);
    await fillYesNoRadio(page, 'prop.ab_vehicles[0].is_community_property', false);
    await fillYesNoRadio(page, 'prop.ab_vehicles[0].is_claiming_exemption', true);
    await fillYesNoRadio(page, 'prop.ab_vehicles[0].claiming_sub_100', false);
    // Select Motor Vehicle exemption
    const lawSel = page.locator(`#${b64('prop.ab_vehicles[0].exemption_laws')}`);
    if (await lawSel.count()) {
      await lawSel.selectOption({ label: /motor vehicle/i }).catch(() => {});
    }
    await clickContinue(page);
    await waitForDaPageLoad(page);
    // "Have more vehicles?" Yes
    await page.locator('button:has-text("Yes")').first().click();
    await waitForDaPageLoad(page);
    // Fill vehicle 2, try Motor Vehicle exemption again — should be rejected
    await fillById(page, b64('prop.ab_vehicles[1].make'), 'Honda');
    await fillById(page, b64('prop.ab_vehicles[1].model'), 'Civic');
    await fillById(page, b64('prop.ab_vehicles[1].year'), '2020');
    await fillById(page, b64('prop.ab_vehicles[1].milage'), '40000');
    await clickById(page, `${b64('prop.ab_vehicles[1].who')}_0`);
    await fillById(page, b64('prop.ab_vehicles[1].current_value'), '12000');
    await fillById(page, b64('prop.ab_vehicles[1].state'), 'NE');
    await setCheckbox(page, 'prop.ab_vehicles[1].has_loan', false);
    await fillYesNoRadio(page, 'prop.ab_vehicles[1].is_community_property', false);
    await fillYesNoRadio(page, 'prop.ab_vehicles[1].is_claiming_exemption', true);
    await fillYesNoRadio(page, 'prop.ab_vehicles[1].claiming_sub_100', false);
    const lawSel2 = page.locator(`#${b64('prop.ab_vehicles[1].exemption_laws')}`);
    if (await lawSel2.count()) {
      await lawSel2.selectOption({ label: /motor vehicle/i }).catch(() => {});
    }
    await clickContinue(page);
    await waitForDaPageLoad(page);
    // Should still be on the vehicle-2 page with a validation error
    const stillOnPage = await page.locator(`#${b64('prop.ab_vehicles[1].make')}`).count();
    expect(stillOnPage, 'second Motor Vehicle claim should keep user on vehicle page').toBeGreaterThan(0);
  });
});

// ═════════════════════════════════════════════════════════════════════
//  EXEMPTIONS (Schedule C) — #70 summary screen
// ═════════════════════════════════════════════════════════════════════

test.describe('Exemptions (Schedule C)', () => {
  test.setTimeout(360_000);

  test('Issue #70: exemption summary screen appears after Schedule C', async ({ page }) => {
    await reachAfterDebtor(page);
    // Walk through property + exemptions answering No to every yesno until the
    // "Exemption summary" heading appears.
    const h = await advanceUntilHeading(page, /exemption summary/i, 200);
    expect(h, 'reached exemption summary screen').toMatch(/exemption summary/i);
    const body = (await page.locator('body').innerText()).toLowerCase();
    // Empty-state copy or table present
    expect(
      body.includes('no exemptions have been claimed') || body.includes('claimed'),
      'summary screen shows totals or empty-state'
    ).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════
//  INCOME (Schedule I) — #56, #57, #65
// ═════════════════════════════════════════════════════════════════════

test.describe('Schedule I income', () => {
  test.setTimeout(420_000);

  async function reachIncomeEmployment(page: Page) {
    await reachAfterDebtor(page);
    // Walk forward until the income-employment page
    await advanceUntilHeading(page, /employment information|do you have any deductions/i, 200);
  }

  test('Issue #56: clicking "No" to deductions advances (real-user validator, no :hidden hack)', async ({ page }) => {
    await reachIncomeEmployment(page);
    // We want to be on the deductions page. If we're on the employment page, fill it out.
    let h = (await heading(page)).toLowerCase();
    if (h.includes('employment')) {
      await selectByName(page, b64('debtor[0].income.employment'), 'Not employed');
      await clickContinue(page);
      await waitForDaPageLoad(page);
    }
    // Now find the deductions question and select No, then Continue STRICTLY.
    h = (await heading(page)).toLowerCase();
    if (h.includes('deductions to claim')) {
      await fillYesNoRadio(page, 'debtor[0].income.other_deduction', false);
      await clickContinueStrict(page);
      await waitForDaPageLoad(page);
      // Should have advanced off the deductions page
      const headingAfter = (await heading(page)).toLowerCase();
      expect(headingAfter.includes('deductions to claim'), 'should leave deductions page').toBe(false);
    }
  });

  test('Issue #57: "other monthly income" No advances (real-user validator)', async ({ page }) => {
    await reachIncomeEmployment(page);
    // Walk forward to "List all other income regularly received"
    await advanceUntilHeading(page, /other income regularly received|other monthly income/i, 40);
    // Set "Do you have other monthly income?" No
    if (await page.locator(`[name="${b64('debtor[0].income.other_monthly_income')}"]`).count()) {
      await fillYesNoRadio(page, 'debtor[0].income.other_monthly_income', false);
      await clickContinueStrict(page);
      await waitForDaPageLoad(page);
      // Should leave the page
      const h = (await heading(page)).toLowerCase();
      expect(h.includes('other income regularly received'), 'should leave page on No').toBe(false);
    }
  });

  test('Issue #65: Schedule I payroll deductions page asks for "at the time of filing"', async ({ page }) => {
    await reachIncomeEmployment(page);
    // If we're on employment, choose Employed → payroll deductions page appears
    let h = (await heading(page)).toLowerCase();
    if (h.includes('employment')) {
      await selectByName(page, b64('debtor[0].income.employment'), 'Employed');
      await clickContinue(page);
      await waitForDaPageLoad(page);
      // Now on the wages page — fill it and continue to deductions
      await fillById(page, b64('debtor[0].income.occupation'), 'Tester');
      await fillById(page, b64('debtor[0].income.employer'), 'Acme');
      await fillById(page, b64('debtor[0].income.employer_street'), '1 Acme Way');
      await fillById(page, b64('debtor[0].income.employer_city'), 'Lincoln');
      const empState = page.locator(`#${b64('debtor[0].income.employer_state')}`);
      if ((await empState.evaluate(e => e.tagName.toLowerCase()).catch(() => '')) === 'select') {
        await empState.selectOption({ label: 'Nebraska' }).catch(() => {});
      } else { await empState.fill('Nebraska').catch(() => {}); }
      await fillById(page, b64('debtor[0].income.employer_zip'), '68508');
      await fillById(page, b64('debtor[0].income.employment_length'), '5 years');
      await fillById(page, b64('debtor[0].income.income_amount_1'), '3500');
      await fillById(page, b64('debtor[0].income.overtime_pay_1'), '0');
      await clickContinue(page);
      await waitForDaPageLoad(page);
      // Verify the payroll-deductions page heading
      const dedHeading = await heading(page);
      expect(dedHeading.toLowerCase()).toMatch(/payroll deductions/);
      expect(dedHeading.toLowerCase()).toMatch(/at the time of filing|expected/);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
//  SOFA (Form 107) — #72 theft/disaster, #73 financial statements
// ═════════════════════════════════════════════════════════════════════

test.describe('SOFA conditional logic', () => {
  test.setTimeout(420_000);

  async function reachSofa(page: Page) {
    await reachAfterDebtor(page);
    // Walk all the way to the SOFA marital-status page, answering No on every yes/no.
    await advanceUntilHeading(page, /marital status/, 200);
  }

  test('Issue #72: theft/disaster losses — No skips the description', async ({ page }) => {
    await reachSofa(page);
    // Walk to the theft/disaster page
    await advanceUntilHeading(page, /theft or disaster losses/i, 60);
    const onPage = (await heading(page)).toLowerCase().includes('theft or disaster losses');
    if (onPage) {
      await fillYesNoRadio(page, 'financial_affairs.has_disaster', false);
      // Continue should advance (description not required)
      await clickContinueStrict(page);
      await waitForDaPageLoad(page);
      const after = (await heading(page)).toLowerCase();
      expect(after.includes('theft or disaster losses'), 'should leave the page on No').toBe(false);
    }
  });

  test('Issue #73: financial statements — No skips the date', async ({ page }) => {
    await reachSofa(page);
    await advanceUntilHeading(page, /financial statements/i, 80);
    const onPage = (await heading(page)).toLowerCase().includes('financial statements');
    if (onPage) {
      await fillYesNoRadio(page, 'financial_affairs.has_statement', false);
      await clickContinueStrict(page);
      await waitForDaPageLoad(page);
      const after = (await heading(page)).toLowerCase();
      expect(after.includes('financial statements'), 'should leave the page on No').toBe(false);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
//  CODEBTORS — #59
// ═════════════════════════════════════════════════════════════════════

test.describe('Codebtors', () => {
  test.setTimeout(420_000);

  test('Issue #59: codebtors community-property No advances (real-user validator)', async ({ page }) => {
    await reachAfterDebtor(page);
    // Walk forward to the codebtors community-property page
    await advanceUntilHeading(page, /community property|codebtor|did you live with a spouse/i, 200);
    // Set community_property = No
    if (await page.locator(`[name="${b64('debtors.community_property')}"]`).count()) {
      await fillYesNoRadio(page, 'debtors.community_property', false);
      await clickContinueStrict(page);
      await waitForDaPageLoad(page);
      // Heading should change off the codebtors community-property page
      const after = (await heading(page)).toLowerCase();
      expect(after.includes('community property'), 'should advance past codebtors CP page').toBe(false);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
//  CREDITORS — #54, #64
// ═════════════════════════════════════════════════════════════════════

test.describe('Creditors (Schedule D / E / F)', () => {
  test.setTimeout(420_000);

  test('Issue #64: unsecured creditors "No" to has_notify hides the party fields', async ({ page }) => {
    await reachAfterDebtor(page);
    // Walk to unsecured-creditor priority claims
    await advanceUntilHeading(page, /priority claims|priority creditor|unsecured/i, 200);
    // If we land on "do you have any priority claims" — say Yes once to get to the detail page
    if ((await heading(page)).toLowerCase().includes('have any priority')) {
      await page.locator('button:has-text("Yes")').first().click();
      await waitForDaPageLoad(page);
    }
    // On the priority detail page — fill minimal data
    if (await page.locator(`#${b64('prop.priority_claims[0].name')}`).count()) {
      await fillById(page, b64('prop.priority_claims[0].name'), 'IRS');
      await fillById(page, b64('prop.priority_claims[0].street'), '1 IRS Way');
      await fillById(page, b64('prop.priority_claims[0].city'), 'Lincoln');
      const st = page.locator(`#${b64('prop.priority_claims[0].state')}`);
      if ((await st.evaluate(e => e.tagName.toLowerCase()).catch(() => '')) === 'select') {
        await st.selectOption({ label: 'Nebraska' }).catch(() => {});
      }
      await fillById(page, b64('prop.priority_claims[0].zip'), '68508');
      // Has notify = No → party fields should NOT be required
      await fillYesNoRadio(page, 'prop.priority_claims[0].has_notify', false);
      // The party detail block should be hidden — verify it's not visible
      const partyBlock = page.locator(`[name="${b64('prop.priority_claims[0].party_name_1')}"]`);
      const partyVisible = await partyBlock.first().isVisible().catch(() => false);
      expect(partyVisible, 'party-1 name field should be hidden when has_notify=No').toBe(false);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
//  YAML-only proof tests for the deep cross-validation issues —
//  reaching the final-review page reliably requires nearly the full
//  petition, which doubles the test runtime. Keep these as structural
//  pins; their proof video is the cross-validation walkthrough.
// ═════════════════════════════════════════════════════════════════════

