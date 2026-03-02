/**
 * Debug test: Navigate to the vehicle form and dump its hidden fields.
 */
import { test, expect } from '@playwright/test';
import { HOMEOWNER_CARLOAN } from './fixtures';
import {
  INTERVIEW_URL, b64, waitForDaPageLoad, clickContinue, clickNthByName,
  selectByName, fillByName, fillById, selectById, selectByIndex,
  clickYesNoButton, fillAllVisibleRadiosAsNo, handleCaseNumberIfPresent,
  fillDebtorIdentity
} from './helpers';
import { navigateToDebtorPage, fillDebtorAndAdvance, passDebtorFinal } from './navigation-helpers';

test('dump vehicle form hidden fields', async ({ page }) => {
  test.setTimeout(120_000);
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

  // Vehicles → Yes — intercept the AJAX response
  await waitForDaPageLoad(page);
  const ajaxResponsePromise = page.waitForResponse(resp =>
    resp.request().method() === 'POST' && resp.url().includes('/interview'), { timeout: 30000 }
  );
  await clickYesNoButton(page, 'prop.ab_vehicles.there_are_any', true);
  const ajaxResp = await ajaxResponsePromise;
  const respText = await ajaxResp.text();
  // Check if _list_collect_list is in the response body
  const hasLclInResponse = respText.includes('_list_collect_list');
  console.log(`AJAX response includes _list_collect_list: ${hasLclInResponse}`);
  if (!hasLclInResponse && respText.startsWith('{')) {
    try {
      const data = JSON.parse(respText);
      const bodyHtml = data.body || '';
      console.log(`Response action: ${data.action}`);
      console.log(`Body has _list_collect_list: ${bodyHtml.includes('_list_collect_list')}`);
      // Extract all hidden inputs from the body
      const hiddenRegex = /<input[^>]*type=["']hidden["'][^>]*>/gi;
      const hiddenInputs = bodyHtml.match(hiddenRegex) || [];
      console.log(`Hidden inputs in response body: ${hiddenInputs.length}`);
      for (const h of hiddenInputs) {
        const nameMatch = h.match(/name=["']([^"']+)["']/);
        if (nameMatch) console.log(`  hidden: ${nameMatch[1]}`);
      }
    } catch {}
  }

  await waitForDaPageLoad(page);
  await page.waitForTimeout(3000);
  await waitForDaPageLoad(page);

  // Verify we're on the vehicle form
  const heading = await page.locator('h1').first().textContent().catch(() => '(no h1)');
  console.log(`Page heading: "${heading?.trim()}"`);

  // Now we should be on the vehicle form - dump all hidden inputs
  const hiddenFields = await page.evaluate(() => {
    const form = document.getElementById('daform');
    if (!form) return { error: 'no form' };
    const hiddens: Record<string, string> = {};
    const inputs = form.querySelectorAll('input[type="hidden"]');
    inputs.forEach((input: any) => {
      const name = input.getAttribute('name') || '(unnamed)';
      const val = input.value || '';
      hiddens[name] = val.substring(0, 100);
    });

    // Also check if _list_collect_list exists
    const lcl = form.querySelector('input[name="_list_collect_list"]');

    // Check the button
    const continueBtn = document.getElementById('da-continue-button');
    const btnInfo = continueBtn ? {
      tag: continueBtn.tagName,
      name: continueBtn.getAttribute('name') || '(none)',
      value: continueBtn.getAttribute('value') || '(none)',
      type: continueBtn.getAttribute('type') || '(none)',
    } : null;

    // Check for "Add another" button
    const addAnotherBtn = form.querySelector('#da-extra-collect');
    const addAnotherInfo = addAnotherBtn ? {
      tag: addAnotherBtn.tagName,
      name: addAnotherBtn.getAttribute('name') || '(none)',
      value: addAnotherBtn.getAttribute('value') || '(none)',
    } : null;

    return {
      hiddenCount: inputs.length,
      hiddens,
      hasListCollect: !!lcl,
      continueBtn: btnInfo,
      addAnotherBtn: addAnotherInfo,
    };
  });

  console.log('=== VEHICLE FORM HIDDEN FIELDS ===');
  console.log(`Hidden field count: ${hiddenFields.hiddenCount}`);
  console.log(`Has _list_collect_list: ${hiddenFields.hasListCollect}`);
  console.log(`Continue button: ${JSON.stringify(hiddenFields.continueBtn)}`);
  console.log(`Add another button: ${JSON.stringify(hiddenFields.addAnotherBtn)}`);
  console.log('Hidden fields:');
  if ('hiddens' in hiddenFields) {
    for (const [name, val] of Object.entries(hiddenFields.hiddens as Record<string, string>)) {
      console.log(`  ${name} = ${val}`);
    }
  }
});
