/**
 * Strict-validator interview walker.
 *
 * Walks the interview start-to-finish using the REAL-user click pattern —
 * a plain Continue click that does NOT override the jQuery validator's
 * `ignore` setting. Any page where Continue silently fails to advance
 * (after the walker has filled every visible required field) is reported
 * as a candidate silent-block bug of the same class as Lea's #98 fix.
 *
 * Logic per iteration:
 *   1. Read the current page heading.
 *   2. Find and answer all visible required fields with safe defaults
 *      (No on yes/no, 0 on currency/number, first option on dropdowns,
 *      "N/A" on text inputs).
 *   3. Click `#da-continue-button` STRICTLY (no validator hack).
 *   4. Wait briefly; check heading.
 *      - If heading changed ⇒ advance.
 *      - If heading unchanged after 2 attempts ⇒ record as silent block,
 *        ESCAPE using the masked `clickContinue` (the hack-y one), and
 *        continue so we surface every blocker in one run.
 *
 * Stop at the conclusion / Form-101-output page, or after maxSteps.
 *
 * Output: prints a list of every silently-blocked page heading; the test
 * passes if the list is empty.
 */
import { test, expect, Page } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import {
  b64, waitForDaPageLoad, clickContinue,
} from './helpers';
import { navigateToDebtorPage, fillDebtorAndAdvance } from './navigation-helpers';

async function getHeading(p: Page) {
  return ((await p.locator('h1').first().textContent({ timeout: 5000 }).catch(() => '')) || '').trim();
}

async function fillVisibleRequiredFields(p: Page): Promise<boolean> {
  // Fill every visible empty required form input with a safe default. Returns
  // true if at least one field was touched.
  return await p.evaluate(() => {
    let touched = false;

    // 1) selects (dropdowns) — pick first non-empty option
    document.querySelectorAll('select').forEach((sel) => {
      const s = sel as HTMLSelectElement;
      if (s.offsetParent === null) return;
      if (s.value && s.value !== '') return;
      for (const opt of Array.from(s.options)) {
        if (opt.value && opt.value !== '') {
          s.value = opt.value;
          s.dispatchEvent(new Event('change', { bubbles: true }));
          touched = true;
          break;
        }
      }
    });

    // 2) yesno-radio groups — pick "No" if unselected
    document.querySelectorAll('input[type="radio"]').forEach((r) => {
      const radio = r as HTMLInputElement;
      if (radio.offsetParent === null) return;
      const name = radio.name;
      if (!name) return;
      const group = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`);
      const anyChecked = Array.from(group).some((g) => (g as HTMLInputElement).checked);
      if (anyChecked) return;
      const noOne = Array.from(group).find((g) => {
        const v = (g as HTMLInputElement).value;
        return v === 'False' || v === 'No' || v === 'false';
      });
      const target = (noOne || group[0]) as HTMLInputElement;
      if (target) {
        target.checked = true;
        target.dispatchEvent(new Event('change', { bubbles: true }));
        touched = true;
      }
    });

    // 3) text/number/currency/date inputs — fill safe defaults
    document.querySelectorAll('input').forEach((el) => {
      const i = el as HTMLInputElement;
      if (i.offsetParent === null) return;
      if (i.value) return;
      const t = (i.type || '').toLowerCase();
      if (['hidden', 'submit', 'button', 'reset', 'file', 'radio', 'checkbox'].includes(t)) return;
      const label = i.id ? document.querySelector(`label[for="${i.id}"]`) : null;
      const labelText = (label?.textContent || '').toLowerCase();
      let v = 'N/A';
      if (t === 'number' || t === 'tel') v = '0';
      else if (labelText.includes('zip')) v = '68508';
      else if (
        labelText.includes('amount') || labelText.includes('income') ||
        labelText.includes('value') || labelText.includes('pay') ||
        labelText.includes('expense') || labelText.includes('count') ||
        labelText.includes('mileage') || labelText.includes('milage')
      ) v = '0';
      else if (t === 'date') v = '2024-01-01';
      else if (t === 'email') v = 'test@example.com';
      else if (labelText.includes('year')) v = '2020';
      else if (labelText.includes('name')) v = 'Test Person';
      else if (labelText.includes('street') || labelText.includes('address')) v = '123 Test St';
      else if (labelText.includes('city')) v = 'Lincoln';
      i.value = v;
      i.dispatchEvent(new Event('input', { bubbles: true }));
      i.dispatchEvent(new Event('change', { bubbles: true }));
      touched = true;
    });

    return touched;
  }).catch(() => false);
}

async function clickContinueStrict(p: Page) {
  await waitForDaPageLoad(p);
  // Plain click — no validator override. Real-user click path.
  await p.locator('#da-continue-button').click({ timeout: 5000 }).catch(() => {});
  await p.waitForLoadState('networkidle').catch(() => {});
}

async function clickAnyYesNoButton(p: Page, yes = false) {
  // Pages whose ONLY field is a single yesno render Yes/No as docassemble
  // buttons that auto-submit; there's no Continue. Click "No" to advance.
  const btn = p.locator(`button.btn-da:has-text("${yes ? 'Yes' : 'No'}"):visible`).first();
  const n = await btn.count();
  if (n > 0) {
    await btn.click().catch(() => {});
    await p.waitForLoadState('networkidle').catch(() => {});
    return true;
  }
  return false;
}

test.describe('Strict-validator interview walker', () => {
  test.setTimeout(900_000);

  test('walks the petition; reports every silently-blocking page', async ({ page }) => {
    // Prologue — get past district/debtor entry, which the walker can't
    // synthesize because the SSN/county/state coupling is not generic.
    await navigateToDebtorPage(page, SIMPLE_SINGLE);
    await fillDebtorAndAdvance(page, SIMPLE_SINGLE.debtor);

    const silentlyBlocked: string[] = [];
    let lastHeading = '';
    let sameHeadingStreak = 0;
    const maxSteps = 600;

    for (let step = 0; step < maxSteps; step++) {
      const h = await getHeading(page);
      const hLow = h.toLowerCase();

      // Terminal states
      if (
        hLow.includes('voluntary petition for individuals filing for bankruptcy conclusion') ||
        hLow.includes('form 101 output') ||
        hLow.includes('your documents are ready') ||
        hLow.includes('interview questions complete')
      ) {
        console.log(`[walker] reached terminal page after ${step} steps: "${h}"`);
        break;
      }

      // Don't infinite-loop on docassemble Error
      if (hLow === 'error') {
        console.log(`[walker] hit Docassemble Error page at step ${step}`);
        silentlyBlocked.push(`<error-page step=${step}>`);
        break;
      }

      // Try strict Continue first
      const handled = await fillVisibleRequiredFields(page);
      if (handled) await page.waitForTimeout(250);

      // If this is a button-only yesno page, click No
      const advancedByButton = await clickAnyYesNoButton(page, false);
      if (advancedByButton) {
        sameHeadingStreak = 0;
        lastHeading = h;
        continue;
      }

      await clickContinueStrict(page);
      await page.waitForTimeout(300);

      const h2 = (await getHeading(page)).toLowerCase();
      if (h2 === hLow) {
        sameHeadingStreak += 1;
        if (sameHeadingStreak === 1) {
          // Try once more — sometimes the click was eaten by show-if JS
          continue;
        }
        // Silent block confirmed. Record + escape with masked Continue.
        if (!silentlyBlocked.includes(h)) {
          silentlyBlocked.push(h);
          console.log(`[walker] SILENT BLOCK at step ${step}: "${h}"`);
        }
        await clickContinue(page).catch(() => {});
        await page.waitForLoadState('networkidle').catch(() => {});
        sameHeadingStreak = 0;
      } else {
        sameHeadingStreak = 0;
      }
      lastHeading = h;
    }

    console.log(`\n=== STRICT-VALIDATOR WALKER SUMMARY ===`);
    console.log(`Silently-blocked pages (count=${silentlyBlocked.length}):`);
    for (const p of silentlyBlocked) console.log(`  - ${p}`);

    // The test asserts the list is empty. Any blocker == a real-user
    // hang of the same class as Lea's #98 fix.
    expect(silentlyBlocked, `Pages silently blocking real-user Continue:\n${silentlyBlocked.map(s => '  - ' + s).join('\n')}`).toEqual([]);
  });
});
