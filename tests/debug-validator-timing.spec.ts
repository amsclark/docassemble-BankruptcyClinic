/**
 * Debug: Trace validator setup timing on vehicle page.
 */
import { test } from '@playwright/test';
import { HOMEOWNER_CARLOAN } from './fixtures';
import {
  b64, waitForDaPageLoad, clickNthByName, clickYesNoButton
} from './helpers';
import { navigateToDebtorPage, fillDebtorAndAdvance, passDebtorFinal } from './navigation-helpers';

test('trace validator timing', async ({ page }) => {
  test.setTimeout(120_000);
  const scenario = HOMEOWNER_CARLOAN;

  await navigateToDebtorPage(page, scenario);
  await fillDebtorAndAdvance(page, scenario.debtor);
  await passDebtorFinal(page);
  await waitForDaPageLoad(page);
  await clickNthByName(page, b64('property_intro'), 0);
  await waitForDaPageLoad(page);
  await clickYesNoButton(page, 'prop.interests.there_are_any', false);
  await waitForDaPageLoad(page);

  // Before clicking "Yes" on vehicles, check if current page has validator
  const preInfo = await page.evaluate(() => {
    const $ = (window as any).jQuery;
    const form = document.getElementById('daform');
    return {
      hasValidator: $ && form ? !!$(form).data('validator') : 'no jquery/form',
      heading: document.querySelector('h1')?.textContent?.trim() || '(no h1)',
    };
  });
  console.log(`Before vehicles click: heading="${preInfo.heading}" validator=${preInfo.hasValidator}`);

  // Click "Yes" on vehicles — observe if this is AJAX or native navigation
  const navPromise = page.waitForNavigation({ timeout: 10000 }).catch(() => null);
  await clickYesNoButton(page, 'prop.ab_vehicles.there_are_any', true);
  const navResult = await navPromise;
  console.log(`Navigation occurred: ${navResult !== null}`);

  // Wait for everything to settle
  await page.waitForTimeout(5000);

  // Check if validator exists NOW
  const postInfo = await page.evaluate(() => {
    const $ = (window as any).jQuery;
    const form = document.getElementById('daform');
    if (!$ || !form) return { error: 'no jquery/form' };
    return {
      hasValidator: !!$(form).data('validator'),
      heading: document.querySelector('h1')?.textContent?.trim() || '(no h1)',
      url: window.location.href,
      daValidatorGlobal: typeof (window as any).daValidator !== 'undefined' && (window as any).daValidator !== null,
      daValidationRulesKeys: Object.keys((window as any).daValidationRules || {}),
    };
  });
  console.log(`After 5s wait: ${JSON.stringify(postInfo)}`);

  // Also check by directly calling validate()
  const directCheck = await page.evaluate(() => {
    const $ = (window as any).jQuery;
    const form = document.getElementById('daform');
    if (!$ || !form) return { error: 'no jquery/form' };
    try {
      // Just check if $.fn.validate exists
      const validateExists = typeof $.fn.validate === 'function';
      // Check if calling validate() returns an existing validator
      const validator = validateExists ? $(form).validate() : null;
      return {
        validateFnExists: validateExists,
        validatorFromCall: !!validator,
        validatorFromData: !!$(form).data('validator'),
        validatorSettings: validator ? Object.keys(validator.settings || {}) : [],
        hasSubmitHandler: validator ? typeof validator.settings?.submitHandler === 'function' : false,
      };
    } catch (err: any) {
      return { error: err.message };
    }
  });
  console.log(`Direct validator check: ${JSON.stringify(directCheck)}`);
});
