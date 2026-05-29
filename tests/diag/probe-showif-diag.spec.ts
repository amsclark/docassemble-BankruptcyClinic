/**
 * Diagnostic: dump the household-goods page DOM around the is_claiming_exemption
 * field so we know what we're actually clicking and why the snapshot probe
 * couldn't find the child input by ID.
 */
import { test } from '@playwright/test';
import { LEGACY_NE_MINIMAL } from './fixtures';
import { b64, waitForDaPageLoad, clickNthByName, clickYesNoButton } from './helpers';
import { navigateToDebtorPage, fillDebtorAndAdvance, passDebtorFinal } from './navigation-helpers';

test.setTimeout(300_000);

test('diag: dump household-goods DOM around is_claiming_exemption', async ({ page }) => {
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

  const dump = await page.evaluate(({ parentB64, childB64 }) => {
    const result: any = {
      parentB64,
      childB64,
      parentInputs: [],
      childInputs: [],
      childByName: [],
      allRadiosWithBothBs64: [],
      pageHasClaimingExemptionText: false,
    };
    // What's the parent input look like?
    const parentInputs = document.querySelectorAll(`input[name="${parentB64}"]`);
    parentInputs.forEach((inp) => {
      const i = inp as HTMLInputElement;
      result.parentInputs.push({
        id: i.id,
        value: i.value,
        checked: i.checked,
        offsetParentNull: i.offsetParent === null,
        labelFor: i.id ? document.querySelector(`label[for="${i.id}"]`)?.textContent?.trim() : null,
      });
    });
    // What's the child input look like (find by name)?
    const childInputsByName = document.querySelectorAll(`input[name="${childB64}"]`);
    childInputsByName.forEach((inp) => {
      const i = inp as HTMLInputElement;
      result.childByName.push({
        id: i.id,
        value: i.value,
        checked: i.checked,
        offsetParentNull: i.offsetParent === null,
        labelFor: i.id ? document.querySelector(`label[for="${i.id}"]`)?.textContent?.trim() : null,
      });
    });
    // What's by ID?
    const childYes = document.getElementById(`${childB64}_0`);
    const childNo  = document.getElementById(`${childB64}_1`);
    result.childInputs = [
      { lookup: '_0', found: !!childYes, id: childYes?.id ?? null },
      { lookup: '_1', found: !!childNo, id: childNo?.id ?? null },
    ];
    // List ALL radios whose name contains the keyword 'claiming' or 'exemption'
    document.querySelectorAll('input[type="radio"]').forEach((inp) => {
      const i = inp as HTMLInputElement;
      const decoded = (() => { try { return atob(i.name); } catch { return ''; } })();
      if (decoded.includes('claiming') || decoded.includes('claim')) {
        result.allRadiosWithBothBs64.push({
          name: i.name,
          id: i.id,
          decoded,
          checked: i.checked,
          offsetParentNull: i.offsetParent === null,
        });
      }
    });
    result.pageHasClaimingExemptionText = !!document
      .querySelector('body')?.textContent?.includes('Claiming Exemption');
    // Dump ALL radio inputs and their decoded names
    result.allRadios = [];
    document.querySelectorAll('input[type="radio"]').forEach((inp) => {
      const i = inp as HTMLInputElement;
      let decoded = '';
      try { decoded = atob(i.name); } catch {}
      result.allRadios.push({
        name: i.name,
        decoded,
        id: i.id,
        value: i.value,
      });
    });
    // Find anything resembling the "Claiming Exemption?" question rendering
    result.claimingExemptionRender = [];
    const allLabels = Array.from(document.querySelectorAll('label')) as HTMLLabelElement[];
    const claimingLabels = allLabels.filter(l => (l.textContent ?? '').includes('Claiming Exemption'));
    claimingLabels.forEach((l) => {
      const radioContainer = l.parentElement?.querySelector('.da-field-radio') ||
                              l.closest('.da-form-group')?.querySelector('.da-field-radio') ||
                              l.parentElement?.parentElement?.querySelector('.da-field-radio');
      const radiosInside = radioContainer ? Array.from(radioContainer.querySelectorAll('input[type="radio"]')) : [];
      result.claimingExemptionRender.push({
        labelText: (l.textContent ?? '').trim().slice(0, 60),
        labelTagName: l.tagName,
        labelHtmlFor: l.getAttribute('for'),
        labelClassName: l.className,
        radioContainerFound: !!radioContainer,
        radiosInside: radiosInside.map(r => {
          const i = r as HTMLInputElement;
          return { id: i.id, name: i.name, value: i.value, checked: i.checked };
        }),
        // Also dump the closest parent containing yesnoradio
        nearestYesNoradio: l.closest('.da-field-container-inputtype-yesnoradio')?.outerHTML?.slice(0, 200),
      });
    });
    // Dump all elements with class dashowif or dajsshowif (show-if containers)
    result.showIfContainers = Array.from(document.querySelectorAll('.dashowif, .dajsshowif')).map((el) => {
      const e = el as HTMLElement;
      // Find what variable controls this container
      const dataShowifVar = e.getAttribute('data-showif-var');
      let decoded = '';
      if (dataShowifVar) {
        try { decoded = atob(dataShowifVar); } catch {}
      }
      const dataJsshowif = e.getAttribute('data-jsshowif');
      return {
        className: e.className.split(' ').filter(c => c.startsWith('da')).join(' '),
        dataShowifVar: dataShowifVar ? decoded : null,
        dataJsshowifPresent: !!dataJsshowif,
        dataIsVisible: e.getAttribute('data-is-visible'),
        display: window.getComputedStyle(e).display,
        // First 60 chars of textContent for context
        text: e.textContent?.trim().slice(0, 80) || null,
      };
    });
    return result;
  }, { parentB64: b64('prop.has_household_goods'), childB64: b64('prop.household_goods_is_claiming_exemption') });

  console.log('\n──────────── DOM DUMP ────────────');
  console.log(JSON.stringify(dump, null, 2));

  // Now click parent Yes via Playwright label.click({force}) to make sure
  // the click itself happens.
  await page.locator(`label[for="${b64('prop.has_household_goods')}_0"]`).click({ force: true });
  await page.waitForTimeout(2000);

  const after = await page.evaluate(({ parentB64, childB64 }) => {
    const parentYes = document.getElementById(`${parentB64}_0`) as HTMLInputElement | null;
    const childYes  = document.getElementById(`${childB64}_0`) as HTMLInputElement | null;
    const childByName = Array.from(document.querySelectorAll(`input[name="${childB64}"]`))
      .map((inp) => ({
        id: (inp as HTMLInputElement).id,
        value: (inp as HTMLInputElement).value,
        checked: (inp as HTMLInputElement).checked,
        offsetParentNull: (inp as HTMLInputElement).offsetParent === null,
      }));
    return {
      parentChecked: parentYes?.checked ?? null,
      parentVisible: parentYes ? parentYes.offsetParent !== null : null,
      childByNameAfter: childByName,
      childByIdAfter: { yes: !!childYes, yesChecked: childYes?.checked ?? null },
    };
  }, { parentB64: b64('prop.has_household_goods'), childB64: b64('prop.household_goods_is_claiming_exemption') });

  console.log('\n──────────── AFTER PARENT LABEL CLICK ────────────');
  console.log(JSON.stringify(after, null, 2));
});
