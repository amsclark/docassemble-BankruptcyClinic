/**
 * Debug: Fill vehicle form and click Continue with ZERO workaround.
 * This simulates what a real browser user would experience.
 */
import { test } from '@playwright/test';
import { HOMEOWNER_CARLOAN } from './fixtures';
import {
  INTERVIEW_URL, b64, waitForDaPageLoad, clickNthByName,
  clickYesNoButton, fillDebtorIdentity, setCheckbox, fillYesNoRadio
} from './helpers';
import { navigateToDebtorPage, fillDebtorAndAdvance, passDebtorFinal } from './navigation-helpers';

test('native submit on vehicle form', async ({ page }) => {
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

  // Verify we're on the vehicle form
  const heading = await page.locator('h1').first().textContent().catch(() => '(no h1)');
  console.log(`Page heading: "${heading?.trim()}"`);

  // Fill vehicle fields using Playwright locators (not via evaluate)
  const v = scenario.property.vehicle!;
  await page.locator(`#${b64('prop.ab_vehicles[0].make')}`).fill(v.make);
  await page.locator(`#${b64('prop.ab_vehicles[0].model')}`).fill(v.model);
  await page.locator(`#${b64('prop.ab_vehicles[0].year')}`).fill(v.year);
  await page.locator(`#${b64('prop.ab_vehicles[0].milage')}`).fill(v.mileage);
  await page.locator(`#${b64('prop.ab_vehicles[0].current_value')}`).fill(v.value);
  await page.locator(`#${b64('prop.ab_vehicles[0].state')}`).fill(v.state);

  // Check the "has_loan" checkbox
  await setCheckbox(page, 'prop.ab_vehicles[0].has_loan', true);
  await page.waitForTimeout(2000);

  // Fill loan amount
  const loanField = page.getByLabel(/How much do you owe on the loan/i).first();
  await loanField.waitFor({ state: 'visible', timeout: 10000 });
  await loanField.click();
  await loanField.fill(v.loanAmount || '0');

  // Fill is_community_property = No
  await fillYesNoRadio(page, 'prop.ab_vehicles[0].is_community_property', false);

  // Fill other_info
  const otherInfoField = page.locator(`#${b64('prop.ab_vehicles[0].other_info')}`);
  if (await otherInfoField.count() > 0) await otherInfoField.fill(v.otherInfo || 'N/A');

  // Fill is_claiming_exemption = No
  await fillYesNoRadio(page, 'prop.ab_vehicles[0].is_claiming_exemption', false);

  // Check who field - try to click it via label
  const whoLabel0 = page.locator(`label[for="${b64('prop.ab_vehicles[0].who')}_0"]`);
  if (await whoLabel0.count() > 0) {
    console.log(`Who label found, visible: ${await whoLabel0.isVisible()}`);
    if (await whoLabel0.isVisible()) {
      await whoLabel0.click();
    } else {
      // Force click via JS
      await page.evaluate(() => {
        const labels = document.querySelectorAll('label');
        labels.forEach(label => {
          const forAttr = label.getAttribute('for') || '';
          if (forAttr.includes('who')) {
            (label as HTMLElement).click();
          }
        });
      });
    }
  } else {
    console.log('Who label NOT found');
  }

  // Screenshot before clicking Continue
  await page.screenshot({ path: 'test-results/debug-vehicle-before-submit.png', fullPage: true });

  // Now just click Continue - NO workaround at all
  // Just a plain button click
  console.log('Clicking Continue button...');
  await page.locator('#da-continue-button').click();

  // Wait for whatever happens
  await page.waitForTimeout(5000);
  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  } catch {}

  const newHeading = await page.locator('h1').first().textContent().catch(() => '(no h1)');
  console.log(`After native submit, heading: "${newHeading?.trim()}"`);
  await page.screenshot({ path: 'test-results/debug-vehicle-after-submit.png', fullPage: true });

  // Check URL to see if we navigated
  console.log(`URL after submit: ${page.url()}`);
});
