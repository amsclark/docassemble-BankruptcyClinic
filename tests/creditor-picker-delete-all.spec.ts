/**
 * Regression (Roxanne UAT follow-up, June 2026): after the picker injects
 * IRS / NE Dept of Revenue into the priority claims list, the filer can
 * DELETE BOTH rows and continue past Schedule E without being forced to
 * invent amounts.
 *
 * Empirical notes from the diagnosis this spec grew out of:
 *  - list-collect Delete hides the row + disables its inputs client-side (no
 *    form submit), so other rows' required fields can NOT block deletion;
 *  - the dead end was the injection force-setting there_are_any=True: with
 *    every row deleted, Continue silently re-rendered the same screen
 *    demanding a claim. The fix leaves there_are_any unset so deleting all
 *    rows re-asks the Schedule E gate, where "No" proceeds.
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import { waitForDaPageLoad, clickContinue, b64 } from './helpers';
import {
  navigateToDebtorPage, fillDebtorAndAdvance, passDebtorFinal,
} from './navigation-helpers';

async function getHeading(p: import('@playwright/test').Page) {
  return ((await p.locator('h1').first().textContent({ timeout: 5000 }).catch(() => '')) || '').trim();
}

test.setTimeout(420_000);

test('delete BOTH injected priority claims, then Continue', async ({ page }) => {
  await navigateToDebtorPage(page, SIMPLE_SINGLE);
  await fillDebtorAndAdvance(page, SIMPLE_SINGLE.debtor);
  await passDebtorFinal(page);

  let pickedCreditors = false;

  // Generic masked advance (same approach as probe-nonpriority-claim) until
  // the priority claim detail screen, selecting IRS + NDR on the picker.
  for (let i = 0; i < 80; i++) {
    // Settle BEFORE reading the heading: heading reads and clicks must not
    // straddle docassemble's ajax page swap (a click that lands on the NEXT
    // page silently answers it — this masqueraded as a "picker auto-advance"
    // product bug during diagnosis).
    await waitForDaPageLoad(page);
    const h = await getHeading(page);
    console.log(`[probe] step ${i}: "${h}"`);
    if (/about a priority unsecured claim/i.test(h)) break;
    if (/about a nonpriority unsecured claim/i.test(h)) {
      throw new Error('overshot to the nonpriority screen — picker selection did not inject priority claims');
    }

    if (/common creditors/i.test(h)) {
      // Skip the auto-added "None of the above" option — clicking it unchecks
      // the real selections (labelauty nota behavior). Target ONLY the
      // owe-money list: the picker now has a second, notice-only checkbox
      // group, and selecting a creditor in both lists is a validation error.
      const oweGroup = `[data-varname="${b64('library_selected_ids')}"]`;
      const optLabels = page.locator(`${oweGroup} label.danon-nota-checkbox[role="checkbox"]`);
      const labelCount = await optLabels.count();
      await waitForDaPageLoad(page);
      for (let k = 0; k < labelCount; k++) {
        const lab = optLabels.nth(k);
        if (await lab.isVisible().catch(() => false)) {
          await lab.click();
          await page.waitForTimeout(250);
        }
      }
      const checkedCount = await page.evaluate(() =>
        document.querySelectorAll('input[type="checkbox"]:checked').length);
      console.log(`[probe] picker labels=${labelCount} checked-after-click=${checkedCount}`);
      pickedCreditors = checkedCount > 0;
      await page.locator('#da-continue-button').click({ timeout: 10000 }).catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
      continue;
    }

    const hasContinue = (await page.locator('#da-continue-button').count()) > 0;
    if (!hasContinue) {
      // yes/no button page: prefer No to skip optional sections
      const noBtn = page.locator('button.btn-da:visible').filter({ hasText: /^\s*No\s*$/ }).first();
      if ((await noBtn.count()) > 0) {
        await noBtn.click({ timeout: 10000 }).catch(() => {});
      } else {
        await page.locator('button.btn-da[value="False"]:visible').first().click({ timeout: 10000 }).catch(() => {});
      }
      await page.waitForLoadState('networkidle').catch(() => {});
      continue;
    }
    // Fill visible required-ish inputs with safe defaults and continue
    await page.evaluate(() => {
      const seen = new Set<string>();
      document.querySelectorAll('input[type="radio"]').forEach((r) => {
        const radio = r as HTMLInputElement;
        if (!radio.name || seen.has(radio.name)) return;
        seen.add(radio.name);
        const group = Array.from(document.querySelectorAll(
          `input[type="radio"][name="${CSS.escape(radio.name)}"]`)) as HTMLInputElement[];
        if (group.some((g) => g.checked)) return;
        const visible = group.filter((g) => {
          const lab = g.id && document.querySelector(`label[for="${CSS.escape(g.id)}"]`) as HTMLElement | null;
          return !!lab && (lab as HTMLElement).offsetParent !== null;
        });
        if (!visible.length) return;
        const no = visible.find((g) => g.value === 'False') ?? visible[visible.length - 1];
        const lab = document.querySelector(`label[for="${CSS.escape(no.id)}"]`) as HTMLElement;
        lab.click();
      });
      document.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], textarea').forEach((el) => {
        const input = el as HTMLInputElement;
        if (input.offsetParent === null || input.value) return;
        const grp = input.closest('.input-group');
        const isCurrency = !!(grp && /[$]/.test(grp.textContent || ''));
        if (input.type === 'date') input.value = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
        else if (isCurrency || input.type === 'number') input.value = '0';
        else input.value = 'N/A';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      document.querySelectorAll('select').forEach((el) => {
        const sel = el as HTMLSelectElement;
        if (sel.offsetParent === null || sel.value) return;
        for (const o of Array.from(sel.options)) {
          if (o.value) { sel.value = o.value; break; }
        }
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    await page.locator('#da-continue-button').click({ timeout: 10000 }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
  }

  expect(pickedCreditors, 'reached and used the Common Creditors picker').toBe(true);
  const heading = await getHeading(page);
  expect(heading, 'reached the priority claim screen').toMatch(/about a priority unsecured claim/i);

  // Both injected rows render with their names prefilled (input VALUES —
  // innerText doesn't include them)
  const inputValues = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input')).map((i) => (i as HTMLInputElement).value).join('|'));
  expect(inputValues).toContain('Internal Revenue Service');
  expect(inputValues).toContain('Nebraska Department of Revenue');

  // Delete EVERY row (click visible delete buttons until none remain)
  for (let i = 0; i < 6; i++) {
    const del = page.locator('button.dacollectremove:visible, button.dacollectremoveexisting:visible').first();
    if ((await del.count()) === 0) break;
    await del.click();
    await page.waitForTimeout(400);
  }
  const remainingDeletes = await page
    .locator('button.dacollectremove:visible, button.dacollectremoveexisting:visible').count();
  console.log(`[probe] visible delete buttons remaining: ${remainingDeletes}`);

  // Continue — deleting every row is an explicit "I have none": the flow
  // must move on to Schedule F (this used to silently re-render the claim
  // screen, demanding amounts for creditors the filer just deleted).
  await clickContinue(page);
  // Settle: a concurrent ajax racing the submit makes the submit stale and
  // silently discarded (empirically observed during diagnosis).
  await page.waitForTimeout(1500);
  await waitForDaPageLoad(page);
  const afterHeading = await getHeading(page);
  console.log(`[probe] after deleting all + Continue: "${afterHeading}"`);
  expect(afterHeading, 'flow continues past Schedule E with zero claims')
    .toMatch(/about a nonpriority unsecured claim/i);
});
