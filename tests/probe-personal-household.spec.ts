/**
 * Probe: does the personal_household_items page (Schedule A/B's massive
 * multi-yesnoradio screen) advance under strict Continue when the user picks
 * No on every top-level yesnoradio (the realistic minimum-effort case)?
 *
 * This is the page the walker most loudly flagged as a silent block. We
 * believe that was a walker-side false positive caused by setting
 * `.checked = true` without a label click. Real users click labels.
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import { waitForDaPageLoad } from './helpers';
import {
  navigateToDebtorPage, fillDebtorAndAdvance, passDebtorFinal,
} from './navigation-helpers';

async function getHeading(p: import('@playwright/test').Page) {
  return ((await p.locator('h1').first().textContent({ timeout: 5000 }).catch(() => '')) || '').trim();
}

async function advanceUntilHeading(p: import('@playwright/test').Page, target: RegExp, maxSteps = 30) {
  for (let i = 0; i < maxSteps; i++) {
    const h = await getHeading(p);
    if (target.test(h)) return h;
    const noBtn = p.locator(`button:has-text("No"):visible`).first();
    const hasContinue = (await p.locator('#da-continue-button').count()) > 0;
    if (await noBtn.count() > 0 && !hasContinue) {
      await noBtn.click().catch(() => {});
      await p.waitForLoadState('networkidle').catch(() => {});
      continue;
    }
    const { clickContinue } = await import('./helpers');
    await p.evaluate(() => {
      document.querySelectorAll('input[type="radio"]').forEach((r) => {
        const radio = r as HTMLInputElement;
        const name = radio.name;
        if (!name) return;
        const group = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`);
        if (Array.from(group).some(g => (g as HTMLInputElement).checked)) return;
        const noOne = Array.from(group).find(g => {
          const v = (g as HTMLInputElement).value;
          return v === 'False' || v === 'No' || v === 'false';
        });
        const t = (noOne || group[0]) as HTMLInputElement;
        const lab = t?.id ? document.querySelector(`label[for="${t.id}"]`) as HTMLElement : null;
        if (lab) lab.click();
        else { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); }
      });
    });
    await clickContinue(p);
    await waitForDaPageLoad(p);
  }
  return await getHeading(p);
}

test.setTimeout(420_000);

test('personal_household_items advances under strict Continue with all-No', async ({ page }) => {
  await navigateToDebtorPage(page, SIMPLE_SINGLE);
  await fillDebtorAndAdvance(page, SIMPLE_SINGLE.debtor);
  await passDebtorFinal(page);

  const heading = await advanceUntilHeading(page, /describe your personal and household items/i, 30);
  console.log(`[probe] arrived at: "${heading}"`);
  expect(heading.toLowerCase()).toContain('personal and household items');

  // Click every top-level yesnoradio "No" via label click. CRITICAL: check
  // the LABEL's visibility, not the input — docassemble's Bootstrap
  // `btn-check` pattern intentionally hides the input (`offsetParent === null`)
  // and uses the label as the visible/clickable element.
  await page.evaluate(() => {
    const seen = new Set<string>();
    document.querySelectorAll('input[type="radio"]').forEach((r) => {
      const radio = r as HTMLInputElement;
      const name = radio.name;
      if (!name || seen.has(name)) return;
      seen.add(name);
      const group = Array.from(
        document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)
      ) as HTMLInputElement[];
      if (group.some(g => g.checked)) return;
      // Filter to inputs whose LABEL is visible (Bootstrap btn-check pattern)
      const visibleByLabel = group.filter(g => {
        if (!g.id) return false;
        const lab = document.querySelector(`label[for="${CSS.escape(g.id)}"]`) as HTMLElement | null;
        return !!lab && lab.offsetParent !== null;
      });
      if (visibleByLabel.length === 0) return;
      const noOne = visibleByLabel.find(g => {
        const v = g.value;
        return v === 'False' || v === 'No' || v === 'false';
      });
      const target = noOne || visibleByLabel[0];
      const lab = document.querySelector(`label[for="${CSS.escape(target.id)}"]`) as HTMLElement;
      lab.click();
    });
  });
  await page.waitForTimeout(800);

  // STRICT Continue.
  await page.locator('#da-continue-button').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const after = await getHeading(page);
  console.log(`[probe] after strict Continue: "${after}"`);
  expect(after.toLowerCase()).not.toContain('personal and household items');
});
