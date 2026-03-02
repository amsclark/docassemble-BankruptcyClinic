/**
 * Debug test: Navigate to vehicle form, fill it, intercept the POST data.
 */
import { test, expect } from '@playwright/test';
import { HOMEOWNER_CARLOAN } from './fixtures';
import {
  INTERVIEW_URL, b64, waitForDaPageLoad, clickContinue, clickNthByName,
  selectByName, fillByName, fillById, selectById, selectByIndex,
  clickYesNoButton, fillAllVisibleRadiosAsNo, handleCaseNumberIfPresent,
  fillDebtorIdentity, setCheckbox, fillYesNoRadio
} from './helpers';
import { navigateToDebtorPage, fillDebtorAndAdvance, passDebtorFinal } from './navigation-helpers';

test('capture vehicle form POST data', async ({ page }) => {
  test.setTimeout(180_000);
  const scenario = HOMEOWNER_CARLOAN;

  // Navigate to debtor page and fill in debtor info
  await navigateToDebtorPage(page, scenario);
  await fillDebtorAndAdvance(page, scenario.debtor);
  await passDebtorFinal(page);

  // Property intro
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('property_intro'), 0);

  // Real property → No (skip for speed)
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.interests.there_are_any', false);

  // Vehicles → Yes
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.ab_vehicles.there_are_any', true);
  await waitForDaPageLoad(page);
  await page.waitForTimeout(3000);

  // Fill vehicle fields
  const v = scenario.property.vehicle!;
  await page.locator(`#${b64('prop.ab_vehicles[0].make')}`).fill(v.make);
  await page.locator(`#${b64('prop.ab_vehicles[0].model')}`).fill(v.model);
  await page.locator(`#${b64('prop.ab_vehicles[0].year')}`).fill(v.year);
  await page.locator(`#${b64('prop.ab_vehicles[0].milage')}`).fill(v.mileage);
  await page.locator(`#${b64('prop.ab_vehicles[0].current_value')}`).fill(v.value);
  await page.locator(`#${b64('prop.ab_vehicles[0].state')}`).fill(v.state);

  if (v.hasLoan) {
    await setCheckbox(page, 'prop.ab_vehicles[0].has_loan', true);
    await page.waitForTimeout(2000);
    const loanField = page.getByLabel(/How much do you owe on the loan/i).first();
    await loanField.waitFor({ state: 'visible', timeout: 10000 });
    await loanField.click();
    await loanField.fill(v.loanAmount || '0');
  }

  await fillYesNoRadio(page, 'prop.ab_vehicles[0].is_community_property', false);
  const otherInfoField = page.locator(`#${b64('prop.ab_vehicles[0].other_info')}`);
  if (await otherInfoField.count() > 0) {
    await otherInfoField.fill(v.otherInfo || 'N/A');
  }
  await fillYesNoRadio(page, 'prop.ab_vehicles[0].is_claiming_exemption', false);

  // Now capture all form state BEFORE submitting
  const formState = await page.evaluate(() => {
    const $ = (window as any).jQuery;
    const form = document.getElementById('daform') as HTMLFormElement;
    if (!$ || !form) return { error: 'no form or jquery' };

    // Decode helpers
    const decode = (window as any).atou || atob;

    // Get _varnames decoded
    const varnamesInput = $(form).find('input[name="_varnames"]');
    let decodedVarnames: Record<string, string> = {};
    if (varnamesInput.length > 0) {
      try {
        const raw = JSON.parse(decode(varnamesInput.val() as string));
        for (const [k, v] of Object.entries(raw)) {
          decodedVarnames[decode(k as string)] = decode(v as string);
        }
      } catch {}
    }

    // Get _checkboxes decoded
    const checkboxesInput = $(form).find('input[name="_checkboxes"]');
    let decodedCheckboxes: Record<string, string> = {};
    if (checkboxesInput.length > 0) {
      try {
        const raw = JSON.parse(decode(checkboxesInput.val() as string));
        for (const [k, v] of Object.entries(raw)) {
          decodedCheckboxes[decode(k as string)] = v as string;
        }
      } catch {}
    }

    // Get _visible decoded
    const visibleInput = $(form).find('input[name="_visible"]');
    let decodedVisible: string[] = [];
    if (visibleInput.length > 0 && visibleInput.val()) {
      try {
        decodedVisible = JSON.parse(decode(visibleInput.val() as string));
      } catch {}
    }

    // Get all enabled fields and their values
    const enabledFields: Record<string, string> = {};
    $(form).find('input, select, textarea').filter(':not(:disabled)').each(function(this: HTMLElement) {
      const name = $(this).attr('name') || '(unnamed)';
      const type = $(this).attr('type') || 'text';
      const val = $(this).val() as string;
      const visible = $(this).is(':visible');
      const isHidden = type === 'hidden';
      if (type === 'radio') {
        if ((this as HTMLInputElement).checked) {
          enabledFields[name] = `RADIO:${val} [visible=${visible}]`;
        }
      } else if (type === 'checkbox') {
        const checked = (this as HTMLInputElement).checked;
        enabledFields[name] = `CHECKBOX:${checked} val=${val} [visible=${visible}]`;
      } else {
        enabledFields[name] = `${isHidden ? 'HIDDEN' : type}:${(val || '').substring(0, 80)} [visible=${visible}]`;
      }
    });

    // Check what $(form).serialize() produces
    const serialized = $(form).serialize();
    const serializedParams = new URLSearchParams(serialized);
    const serializedKeys: string[] = [];
    serializedParams.forEach((_v: string, k: string) => serializedKeys.push(k));

    // Check for _list_collect_list
    const hasLcl = $(form).find('input[name="_list_collect_list"]').length > 0;

    // Check validator state
    const hasValidator = !!$(form).data('validator');

    return {
      decodedVarnames,
      decodedCheckboxes,
      decodedVisible,
      enabledFields,
      serializedKeys,
      hasLcl,
      hasValidator,
      serializedParamCount: serializedKeys.length,
    };
  });

  console.log('=== VEHICLE FORM STATE BEFORE SUBMIT ===');
  console.log(`Has validator: ${formState.hasValidator}`);
  console.log(`Has _list_collect_list: ${formState.hasLcl}`);
  console.log(`Serialized param count: ${formState.serializedParamCount}`);
  console.log('\n--- Decoded _varnames ---');
  for (const [k, v] of Object.entries(formState.decodedVarnames || {})) {
    console.log(`  ${k} → ${v}`);
  }
  console.log('\n--- Decoded _checkboxes ---');
  for (const [k, v] of Object.entries(formState.decodedCheckboxes || {})) {
    console.log(`  ${k} → ${v}`);
  }
  console.log('\n--- Current _visible ---');
  for (const v of formState.decodedVisible || []) {
    console.log(`  ${v}`);
  }
  console.log('\n--- Enabled fields ---');
  for (const [k, v] of Object.entries(formState.enabledFields || {})) {
    console.log(`  ${k} = ${v}`);
  }
  console.log('\n--- Serialized keys ---');
  for (const k of formState.serializedKeys || []) {
    console.log(`  ${k}`);
  }

  // Now intercept the POST request
  let postData = '';
  page.on('request', req => {
    if (req.method() === 'POST' && req.url().includes('/interview')) {
      postData = req.postData() || '';
    }
  });

  // Call clickContinue (which should inject _list_collect_list + set up validator)
  await clickContinue(page);

  // Log intercepted POST data
  if (postData) {
    const params = new URLSearchParams(postData);
    console.log('\n=== ACTUAL POST DATA ===');
    console.log(`Total params: ${[...params.keys()].length}`);
    params.forEach((v, k) => {
      const decodedVal = v.length > 100 ? v.substring(0, 100) + '...' : v;
      console.log(`  ${k} = ${decodedVal}`);
    });

    // Decode _visible from POST
    const visibleEncoded = params.get('_visible');
    if (visibleEncoded) {
      try {
        const decoded = atob(visibleEncoded);
        console.log(`\n--- POST _visible decoded ---`);
        console.log(`  ${decoded}`);
      } catch {}
    }
  } else {
    console.log('\n=== NO POST DATA CAPTURED ===');
  }
});
