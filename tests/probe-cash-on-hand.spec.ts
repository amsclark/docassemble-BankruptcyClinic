/**
 * Probe: does the cash_on_hand page advance under strict Continue when the
 * user picks "No" on the only required field (`prop.financial_assets.has_cash`)?
 *
 * If this passes, the walker's silent-block report was a walker-side false
 * positive (radio-setting bug) rather than a real silent block.
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import { b64, waitForDaPageLoad } from './helpers';
import {
  navigateToDebtorPage, fillDebtorAndAdvance, passDebtorFinal,
} from './navigation-helpers';

async function getHeading(p: import('@playwright/test').Page) {
  return ((await p.locator('h1').first().textContent({ timeout: 5000 }).catch(() => '')) || '').trim();
}

async function advanceUntilHeading(p: import('@playwright/test').Page, target: RegExp, maxSteps = 50) {
  for (let i = 0; i < maxSteps; i++) {
    const h = await getHeading(p);
    if (target.test(h)) return h;
    // Click No on any yesno-button page; otherwise click Continue (masked)
    const noBtn = p.locator(`button.btn-da[value="False"]:visible`).first();
    if (await noBtn.count() > 0) {
      // Make sure it's a docassemble yesno button (not the in-page Back)
      const isContinue = (await p.locator('#da-continue-button').count()) > 0;
      if (!isContinue) {
        await noBtn.click().catch(() => {});
        await p.waitForLoadState('networkidle').catch(() => {});
        continue;
      }
    }
    // Fall through: masked click
    const { clickContinue } = await import('./helpers');
    // Pick "No" on any radio groups
    await p.evaluate(() => {
      document.querySelectorAll('input[type="radio"]').forEach((r) => {
        const radio = r as HTMLInputElement;
        const name = radio.name;
        if (!name) return;
        const group = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`);
        const anyChecked = Array.from(group).some(g => (g as HTMLInputElement).checked);
        if (anyChecked) return;
        const noOne = Array.from(group).find(g => {
          const v = (g as HTMLInputElement).value;
          return v === 'False' || v === 'No' || v === 'false';
        });
        const target = (noOne || group[0]) as HTMLInputElement;
        const lab = target?.id ? document.querySelector(`label[for="${target.id}"]`) as HTMLElement : null;
        if (lab) lab.click();
        else { target.checked = true; target.dispatchEvent(new Event('change', { bubbles: true })); }
      });
    });
    await clickContinue(p);
    await waitForDaPageLoad(p);
  }
  return await getHeading(p);
}

test.setTimeout(420_000);

test('cash_on_hand advances under strict Continue with label-click on radio', async ({ page }) => {
  await navigateToDebtorPage(page, SIMPLE_SINGLE);
  await fillDebtorAndAdvance(page, SIMPLE_SINGLE.debtor);
  await passDebtorFinal(page);

  // Drive forward until "What is your cash on hand?" appears.
  const heading = await advanceUntilHeading(page, /cash on hand/i, 50);
  console.log(`[probe] arrived at: "${heading}"`);
  expect(heading.toLowerCase()).toContain('cash on hand');

  // Click label for No on the only required field (has_cash).
  const hasCashId = b64('prop.financial_assets.has_cash');
  // Bootstrap-styled radios: the "No" is _1.
  await page.locator(`label[for="${hasCashId}_1"]`).click();
  await page.waitForTimeout(400);

  // STRICT Continue — no validator hack.
  await page.locator('#da-continue-button').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  const after = await getHeading(page);
  console.log(`[probe] after strict Continue: "${after}"`);
  expect(after.toLowerCase()).not.toContain('cash on hand');
});
