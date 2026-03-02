/**
 * Debug: Dump the actual HTML of the Continue and Add Another buttons,
 * check all extra_scripts, and test what _collect mechanism does.
 */
import { test } from '@playwright/test';
import { HOMEOWNER_CARLOAN } from './fixtures';
import {
  INTERVIEW_URL, b64, waitForDaPageLoad, clickNthByName,
  clickYesNoButton, fillDebtorIdentity, setCheckbox, fillYesNoRadio
} from './helpers';
import { navigateToDebtorPage, fillDebtorAndAdvance, passDebtorFinal } from './navigation-helpers';

test('dump vehicle form buttons and handlers', async ({ page }) => {
  test.setTimeout(120_000);
  const scenario = HOMEOWNER_CARLOAN;

  await navigateToDebtorPage(page, scenario);
  await fillDebtorAndAdvance(page, scenario.debtor);
  await passDebtorFinal(page);

  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('property_intro'), 0);
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.interests.there_are_any', false);

  // Intercept the AJAX response when clicking "Yes" for vehicles
  const ajaxPromise = page.waitForResponse(resp =>
    resp.request().method() === 'POST' && resp.url().includes('/interview'), { timeout: 30000 }
  );
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.ab_vehicles.there_are_any', true);
  const ajaxResp = await ajaxPromise;
  const respText = await ajaxResp.text();

  // Parse the AJAX response to see extra_scripts
  if (respText.startsWith('{')) {
    const data = JSON.parse(respText);
    console.log('=== AJAX RESPONSE ===');
    console.log(`action: ${data.action}`);
    console.log(`extra_scripts count: ${data.extra_scripts?.length || 0}`);
    for (let i = 0; i < (data.extra_scripts || []).length; i++) {
      const s = data.extra_scripts[i];
      console.log(`\n--- extra_script[${i}] ---`);
      console.log(`  type: ${s.type}`);
      if (s.type === 'validation') {
        console.log(`  Has validation rules!`);
        console.log(`  rules keys: ${Object.keys(s.rules?.rules || {}).join(', ')}`);
      } else if (s.type === 'custom') {
        console.log(`  script (first 300 chars): ${(s.script || '').substring(0, 300)}`);
      } else {
        console.log(`  content: ${JSON.stringify(s).substring(0, 200)}`);
      }
    }
  }

  await waitForDaPageLoad(page);
  await page.waitForTimeout(3000);

  // Dump button HTML
  const btnInfo = await page.evaluate(() => {
    const form = document.getElementById('daform');
    if (!form) return { error: 'no form' };

    // Get all submit buttons
    const buttons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
    const btnList: any[] = [];
    buttons.forEach(btn => {
      btnList.push({
        tag: btn.tagName,
        type: (btn as HTMLButtonElement).type,
        name: btn.getAttribute('name') || '(none)',
        value: btn.getAttribute('value') || '(none)',
        id: btn.getAttribute('id') || '(none)',
        class: btn.getAttribute('class') || '(none)',
        text: (btn as HTMLElement).innerText?.substring(0, 50) || '',
        disabled: (btn as HTMLButtonElement).disabled,
        visible: (btn as HTMLElement).offsetParent !== null,
        outerHTML: (btn as HTMLElement).outerHTML.substring(0, 300),
      });
    });

    // Check form's onsubmit
    const formOnsubmit = form.onsubmit ? form.onsubmit.toString().substring(0, 200) : '(none)';

    // Check jQuery event handlers on form
    const $ = (window as any).jQuery;
    let jqEvents: string[] = [];
    if ($) {
      const events = $._data(form, 'events') || {};
      for (const [evType, handlers] of Object.entries(events)) {
        jqEvents.push(`${evType}: ${(handlers as any[]).length} handlers`);
      }
    }

    // Check if validator exists
    const hasValidator = $ ? !!$(form).data('validator') : false;

    // Check #da-extra-collect button details
    const addBtn = form.querySelector('#da-extra-collect') as HTMLButtonElement;
    let addBtnInfo: any = null;
    if (addBtn) {
      addBtnInfo = {
        tag: addBtn.tagName,
        name: addBtn.getAttribute('name'),
        value: addBtn.getAttribute('value'),
        type: addBtn.getAttribute('type'),
        class: addBtn.getAttribute('class'),
        outerHTML: addBtn.outerHTML.substring(0, 300),
      };
    }

    // Check form action
    const formAction = form.getAttribute('action');

    return { buttons: btnList, formOnsubmit, jqEvents, hasValidator, addBtnInfo, formAction };
  });

  console.log('\n=== FORM STATE ===');
  console.log(`Form action: ${btnInfo.formAction}`);
  console.log(`Has validator: ${btnInfo.hasValidator}`);
  console.log(`Form onsubmit: ${btnInfo.formOnsubmit}`);
  console.log(`jQuery events: ${btnInfo.jqEvents?.join(', ') || 'none'}`);

  console.log(`\n--- Submit buttons (${btnInfo.buttons?.length || 0}) ---`);
  for (const b of btnInfo.buttons || []) {
    console.log(`  ${b.tag} name="${b.name}" value="${b.value}" id="${b.id}" disabled=${b.disabled} visible=${b.visible}`);
    console.log(`    text: "${b.text}"`);
    console.log(`    HTML: ${b.outerHTML}`);
  }

  console.log(`\n--- Add Another button ---`);
  if (btnInfo.addBtnInfo) {
    console.log(`  ${JSON.stringify(btnInfo.addBtnInfo, null, 2)}`);
  } else {
    console.log('  NOT FOUND');
  }
});
