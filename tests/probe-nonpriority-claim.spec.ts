/**
 * Probe: does the nonpriority_unsecured_claim_details page advance under
 * strict Continue when every visible required field is filled with a safe
 * default (radios → first option, currency → 0, text → "N/A", etc.)?
 *
 * Walker v4 reported this page as a silent block. If this probe PASSES, the
 * walker has another visibility/selector bug. If it FAILS, there is a real
 * silent-block condition on this page that needs a separate fix.
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

test.setTimeout(420_000);

test('nonpriority_unsecured_claim_details — strict Continue with safe-default fill', async ({ page }) => {
  await navigateToDebtorPage(page, SIMPLE_SINGLE);
  await fillDebtorAndAdvance(page, SIMPLE_SINGLE.debtor);
  await passDebtorFinal(page);

  const { clickContinue } = await import('./helpers');

  // Advance to the nonpriority page using masked clicks + safe-defaults.
  for (let i = 0; i < 60; i++) {
    const h = await getHeading(page);
    if (/tell the court about a nonpriority unsecured claim/i.test(h)) break;
    // No-button page?
    const hasContinue = (await page.locator('#da-continue-button').count()) > 0;
    if (!hasContinue) {
      await page.locator('button:has-text("No"):visible').first().click().catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
      continue;
    }
    await page.evaluate(() => {
      // Same label-click radio logic as walker
      const seen = new Set<string>();
      document.querySelectorAll('input[type="radio"]').forEach((r) => {
        const radio = r as HTMLInputElement;
        const name = radio.name;
        if (!name || seen.has(name)) return;
        seen.add(name);
        const group = Array.from(
          document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)
        ) as HTMLInputElement[];
        if (group.some((g) => g.checked)) return;
        const visibleByLabel = group.filter((g) => {
          if (!g.id) return false;
          const lab = document.querySelector(`label[for="${CSS.escape(g.id)}"]`) as HTMLElement | null;
          return !!lab && lab.offsetParent !== null;
        });
        if (visibleByLabel.length === 0) return;
        const noOne = visibleByLabel.find((g) => {
          const v = g.value;
          return v === 'False' || v === 'No' || v === 'false' || v === '0';
        });
        const t = noOne || visibleByLabel[0];
        const lab = document.querySelector(`label[for="${CSS.escape(t.id)}"]`) as HTMLElement;
        lab.click();
      });
      // selects
      document.querySelectorAll('select').forEach((sel) => {
        const s = sel as HTMLSelectElement;
        if (s.offsetParent === null || (s.value && s.value !== '')) return;
        for (const opt of Array.from(s.options)) {
          if (opt.value && opt.value !== '') { s.value = opt.value; s.dispatchEvent(new Event('change', { bubbles: true })); break; }
        }
      });
      // text/number/currency inputs
      document.querySelectorAll('input').forEach((el) => {
        const i = el as HTMLInputElement;
        if (i.offsetParent === null || i.value) return;
        const t = (i.type || '').toLowerCase();
        if (['hidden','submit','button','reset','file','radio','checkbox'].includes(t)) return;
        const label = i.id ? document.querySelector(`label[for="${i.id}"]`) : null;
        const labelText = (label?.textContent || '').toLowerCase();
        let v = 'N/A';
        if (t === 'number' || t === 'tel') v = '0';
        else if (labelText.includes('zip')) v = '68508';
        else if (labelText.includes('amount') || labelText.includes('income') || labelText.includes('value') || labelText.includes('pay') || labelText.includes('expense') || labelText.includes('count') || labelText.includes('claim')) v = '0';
        else if (t === 'date') v = '2024-01-01';
        else if (labelText.includes('year')) v = '2020';
        else if (labelText.includes('name')) v = 'Test Person';
        else if (labelText.includes('street') || labelText.includes('address')) v = '123 Test St';
        else if (labelText.includes('city')) v = 'Lincoln';
        i.value = v;
        i.dispatchEvent(new Event('input', { bubbles: true }));
        i.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    await clickContinue(page);
    await waitForDaPageLoad(page);
  }

  const heading = await getHeading(page);
  console.log(`[probe] reached: "${heading}"`);
  expect(heading.toLowerCase()).toContain('nonpriority unsecured claim');
  await page.waitForTimeout(800);

  // Now: fill every visible required field, then STRICT click.
  await page.evaluate(() => {
    // Same fill logic — used to make sure every required is set.
    const seen = new Set<string>();
    document.querySelectorAll('input[type="radio"]').forEach((r) => {
      const radio = r as HTMLInputElement;
      const name = radio.name;
      if (!name || seen.has(name)) return;
      seen.add(name);
      const group = Array.from(
        document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)
      ) as HTMLInputElement[];
      if (group.some((g) => g.checked)) return;
      const visibleByLabel = group.filter((g) => {
        if (!g.id) return false;
        const lab = document.querySelector(`label[for="${CSS.escape(g.id)}"]`) as HTMLElement | null;
        return !!lab && lab.offsetParent !== null;
      });
      if (visibleByLabel.length === 0) return;
      const noOne = visibleByLabel.find((g) => {
        const v = g.value;
        return v === 'False' || v === 'No' || v === 'false';
      });
      const t = noOne || visibleByLabel[0];
      const lab = document.querySelector(`label[for="${CSS.escape(t.id)}"]`) as HTMLElement;
      lab.click();
    });
    document.querySelectorAll('select').forEach((sel) => {
      const s = sel as HTMLSelectElement;
      if (s.offsetParent === null || (s.value && s.value !== '')) return;
      for (const opt of Array.from(s.options)) {
        if (opt.value && opt.value !== '') { s.value = opt.value; s.dispatchEvent(new Event('change', { bubbles: true })); break; }
      }
    });
    document.querySelectorAll('input').forEach((el) => {
      const i = el as HTMLInputElement;
      if (i.offsetParent === null || i.value) return;
      const t = (i.type || '').toLowerCase();
      if (['hidden','submit','button','reset','file','radio','checkbox'].includes(t)) return;
      const label = i.id ? document.querySelector(`label[for="${i.id}"]`) : null;
      const labelText = (label?.textContent || '').toLowerCase();
      let v = 'N/A';
      if (labelText.includes('zip')) v = '68508';
      else if (labelText.includes('amount') || labelText.includes('claim') || labelText.includes('value')) v = '0';
      else if (t === 'date') v = '2024-01-01';
      else if (labelText.includes("creditor's name") || labelText.includes("name")) v = 'Test Creditor';
      else if (labelText.includes('street') || labelText.includes('address')) v = '123 Test St';
      else if (labelText.includes('city')) v = 'Lincoln';
      i.value = v;
      i.dispatchEvent(new Event('input', { bubbles: true }));
      i.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  await page.waitForTimeout(800);

  await page.screenshot({ path: 'test-results/probe-nonpriority-pre.png', fullPage: true });

  // STRICT click
  await page.locator('#da-continue-button').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  const after = await getHeading(page);
  await page.screenshot({ path: 'test-results/probe-nonpriority-post.png', fullPage: true });
  console.log(`[probe] after strict Continue: "${after}"`);
  expect(after.toLowerCase()).not.toContain('nonpriority unsecured claim');
});
