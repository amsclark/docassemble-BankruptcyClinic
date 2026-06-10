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
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import { clickContinue } from './helpers';
import { navigateToDebtorPage, fillDebtorAndAdvance } from './navigation-helpers';
// Page-driving primitives shared with fuzz-walker.spec.ts. Without an
// rngValue they behave exactly as the original deterministic walker
// (No on yes/no, 0 on currency, first option on dropdowns).
import {
  getHeading, fillVisibleRequiredFields, clickContinueStrict,
  pageHasContinueButton, clickYesNoButtonPage,
} from './walker-helpers';

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

      // If this is a button-only yesno page (no Continue button), click No.
      // This is NOT a Continue submission — it's docassemble's native yesno
      // gate, which has no validator interaction. Always works.
      if (!(await pageHasContinueButton(page))) {
        const advanced = await clickYesNoButtonPage(page, false);
        if (advanced) {
          sameHeadingStreak = 0;
          lastHeading = h;
          continue;
        }
        // No Continue + no Yes/No buttons — unknown page type. Skip.
        console.log(`[walker] step ${step}: no Continue and no Yes/No buttons on "${h}" — skipping`);
        break;
      }

      // Normal page with Continue button: fill required fields, click STRICT.
      // Read the page's `_tracker` hidden field BEFORE submitting; if the
      // tracker advances, the server accepted the form even if the heading
      // is the same (e.g. generic-index gather pages repeat the heading).
      const trackerBefore = await page.locator('input[name="_tracker"]').first().getAttribute('value').catch(() => null);
      const handled = await fillVisibleRequiredFields(page);
      if (handled) await page.waitForTimeout(400);

      await clickContinueStrict(page);
      await page.waitForTimeout(800);

      const h2 = (await getHeading(page)).toLowerCase();
      const trackerAfter = await page.locator('input[name="_tracker"]').first().getAttribute('value').catch(() => null);
      const headingSame = (h2 === hLow);
      const trackerAdvanced = (trackerBefore !== null && trackerAfter !== null && trackerBefore !== trackerAfter);
      if (headingSame && !trackerAdvanced) {
        sameHeadingStreak += 1;
        if (sameHeadingStreak === 1) {
          // Try once more with a longer settle — show-if JS or server-side
          // rendering can take a beat. Don't immediately report a block.
          await page.waitForTimeout(800);
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
        // Heading changed OR tracker advanced (gather loop, same heading
        // for next item). Either way, real progress was made.
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
