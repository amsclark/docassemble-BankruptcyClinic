/**
 * Seeded-random fuzz walker.
 *
 * The strict-validator walker takes ONE deterministic path (always "No").
 * But this project's worst bugs lived on the OTHER paths — the branches no
 * fixture drives (gross_wages2 crashed only unmarried consumer-debt filers;
 * Schedule G crashed only filers who said Yes to contracts). This walker
 * explores those: every yes/no, dropdown, and dollar amount is drawn from a
 * seeded PRNG, so each seed is a different — but exactly reproducible —
 * path through the interview.
 *
 * Per page it uses the REAL-user click pattern (strict Continue, no
 * validator hack) and applies the same silent-block detection as the strict
 * walker. Every run must end at the conclusion with all PDFs assembled —
 * any docassemble Error page, seek loop (heading repeating beyond the
 * escape budget), or assembly failure fails the test WITH THE SEED in the
 * message, so the exact path can be replayed:
 *
 *   FUZZ_SEEDS=12345 npx playwright test tests/fuzz-walker.spec.ts
 *
 * Default: 2 fixed seeds (deterministic in CI). Nightly/exploratory runs
 * can pass more: FUZZ_SEEDS=1,2,3,4,5,6,7,8.
 *
 * Termination safety: a per-heading visit budget damps the Yes bias to 0
 * on repeats, so "add another?" list gates always exit; maxSteps backstops.
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import { clickContinue } from './helpers';
import { navigateToDebtorPage, fillDebtorAndAdvance } from './navigation-helpers';
import { finishAndAssertAllPdfs } from './assert-helpers';
import {
  getHeading, fillVisibleRequiredFields, clickContinueStrict,
  pageHasContinueButton, clickYesNoButtonPage, mulberry32,
} from './walker-helpers';

const SEEDS = (process.env.FUZZ_SEEDS || '20260609,71077345')
  .split(',').map(s => parseInt(s.trim(), 10)).filter(n => Number.isFinite(n));

test.describe('Seeded-random fuzz walker', () => {
  test.setTimeout(1_200_000);

  for (const seed of SEEDS) {
    test(`seed ${seed}: random path reaches conclusion + PDFs, no silent blocks`, async ({ page }) => {
      const rng = mulberry32(seed);
      const tag = `[fuzz ${seed}]`;

      // Prologue — district/debtor entry has SSN/county/state coupling the
      // generic filler can't synthesize. Same fixed entry as the strict walker.
      await navigateToDebtorPage(page, SIMPLE_SINGLE);
      await fillDebtorAndAdvance(page, SIMPLE_SINGLE.debtor);

      const silentlyBlocked: string[] = [];
      const headingVisits = new Map<string, number>();
      let sameHeadingStreak = 0;
      let reachedEnd = false;
      const maxSteps = 800;
      let step = 0;

      for (; step < maxSteps; step++) {
        const h = await getHeading(page);
        const hLow = h.toLowerCase();

        if (
          hLow.includes('voluntary petition for individuals filing for bankruptcy conclusion') ||
          hLow.includes('form 101 output') ||
          hLow.includes('your documents are ready') ||
          hLow.includes('interview questions complete')
        ) {
          console.log(`${tag} reached terminal page after ${step} steps: "${h}"`);
          reachedEnd = true;
          break;
        }

        if (hLow === 'error') {
          // A docassemble Error on a random-but-valid path is exactly the
          // bug class this walker hunts. Hard fail, replay with this seed.
          const body = (await page.locator('body').innerText().catch(() => '')).slice(0, 600);
          expect(false, `${tag} docassemble ERROR page at step ${step}.\nReplay: FUZZ_SEEDS=${seed}\n${body}`).toBe(true);
        }

        const visits = (headingVisits.get(h) || 0) + 1;
        headingVisits.set(h, visits);
        // Yes-bias 35% on first sight of a page; 0 once we've seen it twice —
        // guarantees list-collect "add another" gates terminate.
        const yesBias = visits > 2 ? 0 : 0.35;

        // Button-only yesno page (no Continue): seeded random choice with the
        // same damping.
        if (!(await pageHasContinueButton(page))) {
          const sayYes = rng() < yesBias;
          const advanced = await clickYesNoButtonPage(page, sayYes);
          if (advanced) {
            sameHeadingStreak = 0;
            continue;
          }
          console.log(`${tag} step ${step}: no Continue and no Yes/No buttons on "${h}" — stopping`);
          break;
        }

        // Normal Continue page: fill with seeded-random values, strict click.
        const trackerBefore = await page.locator('input[name="_tracker"]').first().getAttribute('value').catch(() => null);
        const handled = await fillVisibleRequiredFields(page, { rngValue: rng(), yesBias });
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
            await page.waitForTimeout(800);
            continue;
          }
          if (!silentlyBlocked.includes(h)) {
            silentlyBlocked.push(h);
            console.log(`${tag} SILENT BLOCK at step ${step}: "${h}"`);
          }
          // Escape with the masked Continue so one blocker doesn't hide the
          // rest of the path; the block itself is already recorded above.
          await clickContinue(page).catch(() => {});
          await page.waitForLoadState('networkidle').catch(() => {});
          sameHeadingStreak = 0;
        } else {
          sameHeadingStreak = 0;
        }
      }

      console.log(`\n${tag} === SUMMARY (${step} steps) ===`);
      console.log(`${tag} silently-blocked pages (count=${silentlyBlocked.length}):`);
      for (const b of silentlyBlocked) console.log(`${tag}   - ${b}`);

      expect(silentlyBlocked,
        `${tag} pages silently blocking real-user Continue (replay: FUZZ_SEEDS=${seed}):\n` +
        silentlyBlocked.map(s => '  - ' + s).join('\n')).toEqual([]);
      expect(reachedEnd,
        `${tag} never reached the conclusion within ${maxSteps} steps (replay: FUZZ_SEEDS=${seed}) — ` +
        `likely a seek loop or unreachable-path dead end on this branch combination`).toBe(true);

      // The deliverable is the PDFs — a random path must STILL assemble all
      // forms (this is where branch-sensitive gaps crash).
      await finishAndAssertAllPdfs(page);
    });
  }
});
