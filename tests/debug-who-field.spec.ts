/**
 * Debug test: Check state of the 'who' field on vehicle form.
 */
import { test } from '@playwright/test';
import { HOMEOWNER_CARLOAN } from './fixtures';
import {
  INTERVIEW_URL, b64, waitForDaPageLoad, clickNthByName,
  clickYesNoButton, fillDebtorIdentity
} from './helpers';
import { navigateToDebtorPage, fillDebtorAndAdvance, passDebtorFinal } from './navigation-helpers';

test('check who field state on vehicle form', async ({ page }) => {
  test.setTimeout(120_000);
  const scenario = HOMEOWNER_CARLOAN;

  await navigateToDebtorPage(page, scenario);
  await fillDebtorAndAdvance(page, scenario.debtor);
  await passDebtorFinal(page);

  // Property intro
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('property_intro'), 0);

  // Real property → No
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.interests.there_are_any', false);

  // Vehicles → Yes
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.ab_vehicles.there_are_any', true);
  await waitForDaPageLoad(page);
  await page.waitForTimeout(3000);

  // Dump ALL _varnames mappings and check which _field_0_* exist
  const info = await page.evaluate(() => {
    const $ = (window as any).jQuery;
    const form = document.getElementById('daform');
    if (!$ || !form) return { error: 'no form' };

    const decode = (window as any).atou || atob;
    const encode = (window as any).utoa || btoa;

    // Decode _varnames
    const varnamesInput = $(form).find('input[name="_varnames"]');
    const varnames: Record<string, string> = {};
    if (varnamesInput.length > 0) {
      try {
        const raw = JSON.parse(decode(varnamesInput.val()));
        for (const [k, v] of Object.entries(raw)) {
          varnames[decode(k as string)] = decode(v as string);
        }
      } catch {}
    }

    // For each _field_0_* mapping, find the actual form element
    const fieldStates: any[] = [];
    for (const [internalName, actualName] of Object.entries(varnames)) {
      if (!internalName.startsWith('_field_0_')) continue;
      const encodedName = encode(internalName).replace(/[\n=]/g, '');
      // Try both encoded and raw names
      const els = $(form).find(`[name="${encodedName}"]`);
      const rawEls = $(form).find(`[name="${internalName}"]`);

      const state: any = {
        internalName,
        actualName,
        encodedName,
        foundWithEncoded: els.length,
        foundWithRaw: rawEls.length,
      };

      if (els.length > 0) {
        const el = els.first();
        state.type = el.attr('type') || 'unknown';
        state.disabled = el.prop('disabled');
        state.visible = el.is(':visible');
        state.hasActiveInvisible = el.hasClass('da-active-invisible');
        state.parentVisible = el.parent().is(':visible');
        state.value = (el.val() || '').toString().substring(0, 50);

        // Check showif parent
        const showifParent = el.closest('.dajsshowif, .dashowif');
        if (showifParent.length > 0) {
          state.showifIsVisible = showifParent.data('isVisible');
          state.showifDisplay = window.getComputedStyle(showifParent[0]).display;
        }
      }

      fieldStates.push(state);
    }

    // Also check for any showif divs and their conditions
    const allShowifs: any[] = [];
    $(form).find('.dajsshowif').each(function(this: HTMLElement) {
      const showifVal = $(this).data('showif');
      const isVisible = $(this).data('isVisible');
      const display = window.getComputedStyle(this).display;
      allShowifs.push({
        showif: showifVal ? String(showifVal).substring(0, 300) : '(none)',
        isVisible,
        display,
        childFields: $(this).find('input:not(:disabled), select:not(:disabled), textarea:not(:disabled)').length,
      });
    });

    return { fieldStates, allShowifs };
  });

  console.log('=== FIELD STATE FOR VEHICLE[0] ===');
  for (const f of info.fieldStates || []) {
    const status = f.foundWithEncoded > 0
      ? `type=${f.type} disabled=${f.disabled} visible=${f.visible} activeInvisible=${f.hasActiveInvisible} parentVisible=${f.parentVisible} val=${f.value}`
      : `NOT FOUND (raw=${f.foundWithRaw})`;
    const showif = f.showifIsVisible !== undefined
      ? ` showif(isVisible=${f.showifIsVisible}, display=${f.showifDisplay})`
      : '';
    console.log(`  ${f.internalName} → ${f.actualName}: ${status}${showif}`);
  }

  console.log(`\n=== ALL SHOWIF DIVS (${info.allShowifs?.length || 0}) ===`);
  for (const s of info.allShowifs || []) {
    if (s.childFields > 0 || s.isVisible === '1') {
      console.log(`  showif="${s.showif}" isVisible=${s.isVisible} display=${s.display} childFields=${s.childFields}`);
    }
  }
});
