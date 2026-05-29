/**
 * Probe v2: which click strategy actually fires docassemble's show-if reveal
 * on a Bootstrap btn-check radio?
 *
 * docassemble binds reveal handlers via jQuery .change() on
 * input[type='radio'][name='<b64>'] (per app.js around line 5604) and also
 * supports a custom 'daManualTrigger' event. We test six strategies on the
 * household-goods page and report which one(s) actually mutate the show-if
 * container.
 *
 * To avoid the per-strategy navigation cost (and to avoid the session-reuse
 * crash from probe v1), we navigate ONCE, then for each strategy: reset the
 * is_claiming_exemption input to unchecked + flush any prior show-if state,
 * apply the strategy, snapshot, repeat.
 */
import { test } from '@playwright/test';
import { LEGACY_NE_MINIMAL } from './fixtures';
import {
  b64, waitForDaPageLoad, clickNthByName, clickYesNoButton,
} from './helpers';
import { navigateToDebtorPage, fillDebtorAndAdvance, passDebtorFinal } from './navigation-helpers';

test.setTimeout(420_000);

async function reachHouseholdGoodsPage(page: import('@playwright/test').Page) {
  await navigateToDebtorPage(page, LEGACY_NE_MINIMAL);
  await fillDebtorAndAdvance(page, LEGACY_NE_MINIMAL.debtor);
  await passDebtorFinal(page);
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('property_intro'), 0);
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.interests.there_are_any', false);
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.ab_vehicles.there_are_any', false);
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.ab_other_vehicles.there_are_any', false);
  await waitForDaPageLoad(page);
  await page.waitForLoadState('networkidle');
}

const PARENT_VAR = 'prop.has_household_goods';
const CHILD_VAR = 'prop.household_goods_is_claiming_exemption';

interface Snapshot {
  parentInputCheckedYes: boolean | null;
  childInputCheckedYes: boolean | null;
  childContainerVisible: string | null;       // data-is-visible attribute
  childContainerDisplay: string | null;        // computed style
  exemptionLawsSelectFound: boolean;
  exemptionLawsDisabled: boolean | null;
  exemptionLawsContainerDisplay: string | null;
}

async function snapshot(page: import('@playwright/test').Page): Promise<Snapshot> {
  return await page.evaluate(({ parentB64, childB64 }) => {
    const parentInput = document.getElementById(`${parentB64}_0`) as HTMLInputElement | null;
    const childInput = document.getElementById(`${childB64}_0`) as HTMLInputElement | null;
    const childContainer = childInput
      ? (childInput.closest('.dashowif, .dajsshowif, .da-form-group') as HTMLElement | null)
      : null;
    const allSelects = Array.from(document.querySelectorAll('select')) as HTMLSelectElement[];
    const exemptionLawsSelect = allSelects.find(s =>
      Array.from(s.options).some(o => o.textContent && o.textContent.includes('Household goods (Neb. Rev. Stat.'))
    );
    const lawsContainer = exemptionLawsSelect
      ? (exemptionLawsSelect.closest('.dashowif, .dajsshowif, .da-form-group') as HTMLElement | null)
      : null;
    return {
      parentInputCheckedYes: parentInput?.checked ?? null,
      childInputCheckedYes: childInput?.checked ?? null,
      childContainerVisible: childContainer?.getAttribute('data-is-visible') ?? null,
      childContainerDisplay: childContainer
        ? window.getComputedStyle(childContainer).display
        : null,
      exemptionLawsSelectFound: !!exemptionLawsSelect,
      exemptionLawsDisabled: exemptionLawsSelect?.disabled ?? null,
      exemptionLawsContainerDisplay: lawsContainer
        ? window.getComputedStyle(lawsContainer).display
        : null,
    };
  }, { parentB64: b64(PARENT_VAR), childB64: b64(CHILD_VAR) });
}

const strategies: Array<{
  name: string;
  apply: (page: import('@playwright/test').Page, inputId: string) => Promise<void>;
}> = [
  {
    name: 'A. Playwright label.click({force})',
    apply: async (page, inputId) => {
      await page.locator(`label[for="${inputId}"]`).click({ force: true, timeout: 5000 });
    },
  },
  {
    name: 'B. JS-eval label.click()',
    apply: async (page, inputId) => {
      await page.evaluate((id) => {
        (document.querySelector(`label[for="${id}"]`) as HTMLElement | null)?.click();
      }, inputId);
    },
  },
  {
    name: 'C. JS-eval input.click()',
    apply: async (page, inputId) => {
      await page.evaluate((id) => {
        (document.getElementById(id) as HTMLInputElement | null)?.click();
      }, inputId);
    },
  },
  {
    name: 'D. input.checked=true + native change event',
    apply: async (page, inputId) => {
      await page.evaluate((id) => {
        const inp = document.getElementById(id) as HTMLInputElement | null;
        if (!inp) return;
        inp.checked = true;
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }, inputId);
    },
  },
  {
    name: 'E. input.checked=true + jQuery .change()',
    apply: async (page, inputId) => {
      await page.evaluate((id) => {
        const inp = document.getElementById(id) as HTMLInputElement | null;
        if (!inp) return;
        inp.checked = true;
        const $ = (window as any).jQuery;
        if ($) $(inp).change();
      }, inputId);
    },
  },
  {
    name: 'F. input.checked=true + daManualTrigger',
    apply: async (page, inputId) => {
      await page.evaluate((id) => {
        const inp = document.getElementById(id) as HTMLInputElement | null;
        if (!inp) return;
        inp.checked = true;
        const $ = (window as any).jQuery;
        if ($) $(inp).trigger('daManualTrigger');
      }, inputId);
    },
  },
];

async function resetChildAndParent(page: import('@playwright/test').Page) {
  // Uncheck both parent and child radios and re-process show-if from scratch,
  // so each strategy starts from the same "child is hidden" baseline.
  await page.evaluate(({ parentB64, childB64 }) => {
    // Uncheck parent (Yes and No)
    const parentYes = document.getElementById(`${parentB64}_0`) as HTMLInputElement | null;
    const parentNo  = document.getElementById(`${parentB64}_1`) as HTMLInputElement | null;
    const childYes  = document.getElementById(`${childB64}_0`) as HTMLInputElement | null;
    const childNo   = document.getElementById(`${childB64}_1`) as HTMLInputElement | null;
    [parentYes, parentNo, childYes, childNo].forEach(inp => {
      if (inp) inp.checked = false;
    });
    // Force show-if to re-evaluate
    const $ = (window as any).jQuery;
    if ($ && parentYes) $(parentYes).trigger('daManualTrigger');
  }, { parentB64: b64(PARENT_VAR), childB64: b64(CHILD_VAR) });
  await page.waitForTimeout(400);
}

async function ensureParentIsYes(page: import('@playwright/test').Page) {
  // Reliably click parent Yes via daManualTrigger (strategy F equivalent),
  // since this is what we'll prove works in this very probe. This makes the
  // child render — which is the precondition for testing strategies on it.
  await page.evaluate((parentB64) => {
    const inp = document.getElementById(`${parentB64}_0`) as HTMLInputElement | null;
    if (!inp) return;
    inp.checked = true;
    const $ = (window as any).jQuery;
    if ($) $(inp).trigger('daManualTrigger');
  }, b64(PARENT_VAR));
  await page.waitForTimeout(800);
}

test('probe: which click strategy fires the show-if reveal?', async ({ page }) => {
  await reachHouseholdGoodsPage(page);

  const results: any[] = [];
  for (const strat of strategies) {
    console.log(`\n──────────── ${strat.name} ────────────`);
    await resetChildAndParent(page);
    await ensureParentIsYes(page);

    const before = await snapshot(page);
    console.log(`  BEFORE strategy: parentChecked=${before.parentInputCheckedYes} childContainerDisplay=${before.childContainerDisplay} lawsDisabled=${before.exemptionLawsDisabled} lawsContainerDisplay=${before.exemptionLawsContainerDisplay}`);

    let strategyError: string | null = null;
    try {
      await strat.apply(page, `${b64(CHILD_VAR)}_0`);
    } catch (e: any) {
      strategyError = e.message || String(e);
      console.log(`  ⚠ strategy threw: ${strategyError}`);
    }
    await page.waitForTimeout(1200);

    const after = await snapshot(page);
    console.log(`  AFTER  strategy: parentChecked=${after.parentInputCheckedYes} childChecked=${after.childInputCheckedYes} lawsDisabled=${after.exemptionLawsDisabled} lawsContainerDisplay=${after.exemptionLawsContainerDisplay}`);

    const revealWorked =
      before.exemptionLawsDisabled === true &&
      after.exemptionLawsDisabled === false &&
      after.exemptionLawsContainerDisplay !== 'none';
    console.log(`  REVEAL ${revealWorked ? '✅ WORKED' : '❌ DID NOT WORK'}${strategyError ? ` (strategy errored)` : ''}`);

    results.push({
      strategy: strat.name,
      revealWorked,
      strategyError,
      parentBefore: before.parentInputCheckedYes,
      childCheckedBefore: before.childInputCheckedYes,
      childCheckedAfter: after.childInputCheckedYes,
      lawsDisabledBefore: before.exemptionLawsDisabled,
      lawsDisabledAfter: after.exemptionLawsDisabled,
      lawsContainerBefore: before.exemptionLawsContainerDisplay,
      lawsContainerAfter: after.exemptionLawsContainerDisplay,
    });
  }

  console.log('\n──────────── SUMMARY (markdown-ish) ────────────');
  console.log('| Strategy | Reveal worked? | Notes |');
  console.log('|----------|----------------|-------|');
  for (const r of results) {
    const notes = r.strategyError
      ? `errored: ${r.strategyError.slice(0, 80)}`
      : `lawsDisabled ${r.lawsDisabledBefore} → ${r.lawsDisabledAfter}`;
    console.log(`| ${r.strategy} | ${r.revealWorked ? '✅' : '❌'} | ${notes} |`);
  }
  console.log('');
});
