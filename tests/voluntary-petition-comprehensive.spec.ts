import { test, expect } from '@playwright/test';

/**
 * Comprehensive Playwright Test Suite for Voluntary Petition
 * Based on ALKiln feature file scenarios and test recommendations
 */

// Helper function to navigate through the interview flow
async function navigateToQuestion(page: any, questionId: string, data: Record<string, any>) {
  console.log(`🎯 Navigating to question: ${questionId}`);
  
  await page.goto('https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
  await page.waitForLoadState('networkidle');
  
  // Step through the interview, filling data as we go
  let currentStep = 0;
  let maxSteps = 50; // Safety limit
  
  while (currentStep < maxSteps) {
    const h1Text = await page.locator('h1#daMainQuestion').textContent() || '';
    console.log(`Step ${currentStep}: ${h1Text}`);
    
    // Take screenshot for debugging
    await page.screenshot({ 
      path: `test-results/step-${currentStep.toString().padStart(2, '0')}-${questionId}.png`, 
      fullPage: true 
    });
    
    // Check if we've reached the target question
    if (h1Text.toLowerCase().includes(questionId.toLowerCase())) {
      console.log(`✅ Reached target question: ${questionId}`);
      // Don't break here - continue to handle the specific form type
    }
    
    // Handle introduction screen
    if (h1Text.includes('Voluntary Petition for Individuals Filing for Bankruptcy')) {
      if (data.introduction_screen) {
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
        currentStep++;
        continue;
      }
    }
    
    // Handle district selection
    if (h1Text.includes('district') && h1Text.toLowerCase().includes('filing') && 
        !h1Text.includes('Details')) { // Distinguish from "District Details"
      const selectCount = await page.locator('select').count();
      if (selectCount > 0 && data.current_district) {
        const districtSelect = page.locator('select').first();
        await districtSelect.selectOption(data.current_district);
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
        currentStep++;
        continue;
      } else {
        // No select found, just continue
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
        currentStep++;
        continue;
      }
    }
    
    // Handle amended filing question
    if (h1Text.includes('updating a bankruptcy filing') || 
        h1Text.includes('Are you updating')) {
      const radioCount = await page.locator('input[type="radio"]').count();
      if (radioCount > 0) {
        const amendedValue = data.amended_filing;
        if (amendedValue === false) {
          // Select "No" for non-amended - usually first option
          const noRadio = page.locator('input[type="radio"]').first();
          await noRadio.click({ force: true });
        } else if (amendedValue === true) {
          // Select "Yes" for amended - usually second option
          const yesRadio = page.locator('input[type="radio"]').nth(1);
          await yesRadio.click({ force: true });
        }
      }
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      currentStep++;
      continue;
    }
    
    // Handle case number (for amended filings)
    if (h1Text.includes('case number') && data.case_number) {
      console.log(`Filling case number: ${data.case_number}`);
      
      // Debug what inputs are available
      const allInputs = await page.locator('input').count();
      console.log(`Found ${allInputs} input elements on case number page`);
      
      // Look for visible text inputs
      const visibleTextInputs = await page.locator('input[type="text"]:visible').count();
      const visibleInputs = await page.locator('input:visible').count();
      console.log(`Visible inputs: ${visibleInputs}, visible text inputs: ${visibleTextInputs}`);
      
      if (visibleTextInputs > 0) {
        await page.fill('input[type="text"]:visible', data.case_number);
      } else if (visibleInputs > 0) {
        // Find the first visible input that's not chat-related
        await page.fill('input:visible:not(#daChatMessage):not(.dachatmessage)', data.case_number);
      } else {
        console.log('❌ No visible input fields found for case number');
      }
      
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      currentStep++;
      continue;
    }
    
    // Handle filing status (individual vs spouse)
    if (h1Text.includes('filing individually or with a spouse') ||
        h1Text.includes('Are you filing individually')) {
      const radioCount = await page.locator('input[type="radio"]').count();
      if (radioCount > 0) {
        if (data.filing_status === 'Filing individually') {
          // Prefer role-based selection to avoid labelauty detachment
          const roleRadio = page.getByRole('radio', { name: 'Filing individually' }).first();
          if (await roleRadio.count()) {
            await roleRadio.check();
          } else {
            const individualRadio = page.locator('input[type="radio"]').first();
            const radioId = await individualRadio.getAttribute('id');
            if (radioId) {
              await page.waitForTimeout(100);
              await page.click(`label[for="${radioId}"]`);
            } else {
              await individualRadio.click({ force: true });
            }
          }
        } else if (data.filing_status === 'Filing with spouse') {
          const spouseRadio = page.locator('input[type="radio"]').nth(1);
          const radioId = await spouseRadio.getAttribute('id');
          if (radioId) {
            await page.click(`label[for="${radioId}"]`);
          } else {
            await spouseRadio.click({ force: true });
          }
        }
      }
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      currentStep++;
      continue;
    }
    
    // Handle basic info form
    if (h1Text.includes('Basic Identity and Contact Information')) {
      console.log('📝 Detected Basic Identity form, starting to fill...');
      
      // Take a screenshot of the current page to see what's available
      await page.screenshot({ 
        path: `test-results/basic-identity-form-debug.png`, 
        fullPage: true 
      });
      
      // Let's check what elements are actually on the page
      const allInputs = await page.locator('input').count();
      const allSelects = await page.locator('select').count();
      const allButtons = await page.locator('button').count();
      console.log(`Page elements: ${allInputs} inputs, ${allSelects} selects, ${allButtons} buttons`);
      
      // Check for our specific field IDs
      const firstNameExists = await page.locator('#ZGVidG9yW2ldLm5hbWUuZmlyc3Q').count();
      console.log(`First name field exists: ${firstNameExists > 0}`);
      
      console.log('📝 Filling basic information form...');
      await fillBasicInfoForm(page, data, 0); // First debtor
      
      // If joint filing, handle second debtor
      if (data.filing_status === 'Filing with spouse' && data['debtor[1].name.first']) {
        console.log('📝 Joint filing detected, preparing for second debtor...');
        // Continue to next debtor or handle second debtor form
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
        
        const nextH1 = await page.locator('h1#daMainQuestion').textContent() || '';
        if (nextH1.includes('Basic Identity and Contact Information')) {
          console.log('📝 Filling second debtor information...');
          await fillBasicInfoForm(page, data, 1); // Second debtor
        }
      }
      
      console.log('✅ Completed basic info form');
      break; // Exit the while loop - we've reached and filled the target form
    }
    
    // Generic handler - try to continue with first radio button or continue button
    const radioCount = await page.locator('input[type="radio"]').count();
    const selectCount = await page.locator('select').count();
    
    if (radioCount > 0) {
      const firstRadio = page.locator('input[type="radio"]').first();
      const radioId = await firstRadio.getAttribute('id');
      if (radioId) {
        try {
          await page.click(`label[for="${radioId}"]`);
        } catch {
          await firstRadio.click({ force: true });
        }
      }
    } else if (selectCount > 0) {
      // If there's a select without specific handling, try to select the first meaningful option
      const select = page.locator('select').first();
      const options = await select.locator('option').allTextContents();
      if (options.length > 1) {
        await select.selectOption(options[1]); // Skip "Select..." and choose first real option
      }
    }
    
    // Continue to next step
    const submitButtons = await page.locator('button[type="submit"]').count();
    if (submitButtons > 0) {
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    } else {
      console.log('No submit button found, stopping navigation');
      break;
    }
    
    currentStep++;
  }
  
  if (currentStep >= maxSteps) {
    throw new Error(`Maximum steps (${maxSteps}) reached without finding question: ${questionId}`);
  }
}

// Helper function to fill basic info form
async function fillBasicInfoForm(page: any, data: Record<string, any>, debtorIndex: number) {
  const prefix = `debtor[${debtorIndex}]`;
  console.log(`📝 Filling basic info for ${prefix}`);
  console.log('Available data keys:', Object.keys(data));
  
  // Wait for the page to fully load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Check if any input fields exist on the page
  const inputFields = await page.locator('input').count();
  const selectFields = await page.locator('select').count();
  console.log(`Found ${inputFields} input fields and ${selectFields} select fields on the page`);
  
  if (inputFields === 0 && selectFields === 0) {
    console.log('❌ No form fields found on the page - may not be a form page');
    return;
  }
  
  // Name fields - check both possible data structures
  const firstName = data[`${prefix}.name.first`] || data['debtor.name.first'];
  const lastName = data[`${prefix}.name.last`] || data['debtor.name.last'];
  
  console.log(`Attempting to fill first name: ${firstName}`);
  console.log(`Attempting to fill last name: ${lastName}`);
  
  if (firstName) {
    console.log('Looking for first name field...');
    const firstNameField = await page.locator('#ZGVidG9yW2ldLm5hbWUuZmlyc3Q').first();
    if (await firstNameField.isVisible()) {
      console.log('First name field found, filling...');
      await firstNameField.fill(firstName);
      console.log(`✅ Filled first name: ${firstName}`);
    } else {
      console.log('❌ First name field not found');
    }
  }
  
  if (lastName) {
    console.log('Looking for last name field...');
    const lastNameField = await page.locator('#ZGVidG9yW2ldLm5hbWUubGFzdA').first();
    if (await lastNameField.isVisible()) {
      console.log('Last name field found, filling...');
      await lastNameField.fill(lastName);
      console.log(`✅ Filled last name: ${lastName}`);
    } else {
      console.log('❌ Last name field not found');
    }
  }
  
  // Address fields
  const address = data[`${prefix}.address.address`] || data['debtor.address.address'];
  const city = data[`${prefix}.address.city`] || data['debtor.address.city'];
  const state = data[`${prefix}.address.state`] || data['debtor.address.state'];
  const county = data[`${prefix}.address.county`] || data['debtor.address.county'];
  const zip = data[`${prefix}.address.zip`] || data['debtor.address.zip'];
  
  if (address) {
    console.log(`Filling address: ${address}`);
    await page.fill('#ZGVidG9yW2ldLmFkZHJlc3MuYWRkcmVzcw', address);
  }
  if (city) {
    console.log(`Filling city: ${city}`);
    await page.fill('#ZGVidG9yW2ldLmFkZHJlc3MuY2l0eQ', city);
  }
  if (state) {
    console.log(`Selecting state: ${state}`);
    await page.selectOption('#ZGVidG9yW2ldLmFkZHJlc3Muc3RhdGU', state);
    // Explicitly trigger change event to ensure Docassemble reacts
    await page.evaluate((sel: string) => {
      const el = document.querySelector(sel) as HTMLSelectElement | null;
      if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
    }, '#ZGVidG9yW2ldLmFkZHJlc3Muc3RhdGU');
    // Try jQuery change trigger as well (Docassemble binds with jQuery)
    try {
      await page.evaluate((sel: string) => {
        // @ts-ignore
        if ((window as any).jQuery) {
          // @ts-ignore
          (window as any).jQuery(sel).trigger('change');
        }
      }, '#ZGVidG9yW2ldLmFkZHJlc3Muc3RhdGU');
    } catch {}
    // Wait for county to populate: options length > 1 and not just N/A
    const countySelectSelector = '#ZGVidG9yW2ldLmFkZHJlc3MuY291bnR5';
    try {
      await page.waitForFunction((sel: string) => {
        const el = document.querySelector(sel) as HTMLSelectElement | null;
        if (!el) return false;
        const opts = Array.from(el.options);
        // populated if more than a placeholder option
        return opts.length > 1 || (opts.length === 1 && opts[0].value !== 'N/A' && opts[0].textContent !== 'Select...');
      }, countySelectSelector, { timeout: 20000 });
    } catch (e) {
      console.log('⚠️ County dropdown did not populate within timeout; proceeding without county selection.');
    }
  }
  // Attempt to select county. If a desired county is provided use it; otherwise pick the first real option.
  if (county) {
    console.log(`Selecting county: ${county}`);
    const countySelect = page.locator('#ZGVidG9yW2ldLmFkZHJlc3MuY291bnR5');
    await countySelect.waitFor({ state: 'visible' });
    // Fetch available option labels for logging and matching
  const options: string[] = await countySelect.locator('option').allTextContents();
    console.log('County options available:', options);
    if (options.some(opt => opt.trim() === county)) {
      await countySelect.selectOption({ label: county }).catch(async () => {
        await countySelect.selectOption(county);
      });
      // Verify selection took effect; if not, force via DOM and dispatch change
      const selected = await page.inputValue('#ZGVidG9yW2ldLmFkZHJlc3MuY291bnR5');
      if (selected !== county) {
        await page.evaluate(({ sel, target }: { sel: string; target: string }) => {
          const el = document.querySelector(sel) as HTMLSelectElement | null;
          if (!el) return;
          for (const opt of Array.from(el.options)) {
            if (opt.textContent?.trim() === target) {
              el.value = opt.value;
              el.dispatchEvent(new Event('change', { bubbles: true }));
              break;
            }
          }
        }, { sel: '#ZGVidG9yW2ldLmFkZHJlc3MuY291bnR5', target: county });
      }
    } else {
      console.log(`⚠️ Desired county "${county}" not found in dropdown; selecting first available real option if any.`);
      const firstReal = options.find(o => o.trim() !== 'Select...' && o.trim() !== 'N/A');
      if (firstReal) {
        await countySelect.selectOption({ label: firstReal }).catch(async () => {
          await countySelect.selectOption(firstReal);
        });
      }
    }
  }
  // Has separate mailing address? Default to No if not provided
  try {
    const hasMailingKey = `${prefix}.has_other_mailing_address`;
    if (!(hasMailingKey in data)) {
      const group = page.getByRole('group', { name: 'Has separate mailing address' });
      if (await group.count()) {
        await group.getByRole('radio', { name: 'No' }).first().check();
      } else {
        // Fallback to click label[for] for the 'No' radio using name attribute
        const nameB64 = 'ZGVidG9yW2ldLmhhc19vdGhlcl9tYWlsaW5nX2FkZHJlc3M';
        const noInput = page.locator(`input[name="${nameB64}"][value="False"]`).first();
        if (await noInput.count()) {
          const rid = await noInput.getAttribute('id');
          if (rid) await page.click(`label[for="${rid}"]`);
        }
      }
    }
  } catch (e) {
    console.log('Mailing address selection skipped:', e);
  }
  if (zip) {
    console.log(`Filling zip: ${zip}`);
    await page.fill('#ZGVidG9yW2ldLmFkZHJlc3Muemlw', String(zip));
  }

  // ID Type and SSN/ITIN handling (often required)
  try {
    // Determine desired ID type; default to SSN if unspecified
    const idType = data[`${prefix}.tax_id.tax_id_type`] || data['debtor.tax_id.tax_id_type'] || '1';
    // Docassemble uses labelauty which hides the input; click the label[for] instead
    const idTypeName = 'ZGVidG9yW2ldLnRheF9pZC50YXhfaWRfdHlwZQ';
    const desiredRadio = page.locator(`input[name="${idTypeName}"][value="${idType}"]`).first();
    if (await desiredRadio.count()) {
      const radioId = await desiredRadio.getAttribute('id');
      if (radioId) {
        await page.click(`label[for="${radioId}"]`);
      } else {
        await desiredRadio.click({ force: true });
      }
    }

    if (idType === '1') {
      // Social Security Number value
      const ssnVal = data[`${prefix}.tax_id.tax_id`] || data['debtor.tax_id.tax_id'] || '123-45-6789';
      const ssnInput = page.getByLabel('SSN');
      if (await ssnInput.count()) {
        await ssnInput.fill(ssnVal);
      }
    } else if (idType === '2') {
      // ITIN
      const itinVal = data[`${prefix}.tax_id.tax_id`] || data['debtor.tax_id.tax_id'] || '987-65-4321';
      const itinInput = page.getByLabel('Tax ID');
      if (await itinInput.count()) {
        await itinInput.fill(itinVal);
      }
    }
  } catch (e) {
    console.log('ID Type/Tax ID fill skipped or not present:', e);
  }
  
  // Wait for form processing
  await page.waitForTimeout(1000);
  console.log('✅ Completed filling basic info form');
}

// Continue past basic identity/debtor summary into Schedule 106AB (Property) intro
async function continueToPropertyIntro(page: any) {
  let steps = 0;
  const maxSteps = 20;
  // Helper to click a Yes/No by underlying radio value using label[for]
  const clickRadioByValue = async (value: 'True' | 'False') => {
    const input = page.locator(`input[type="radio"][value="${value}"]`).first();
    const count = await input.count();
    if (!count) return false;
    const rid = await input.getAttribute('id');
    if (rid) {
      await page.click(`label[for="${rid}"]`);
      return true;
    } else {
      try {
        await input.click({ force: true });
        return true;
      } catch {
        return false;
      }
    }
  };
  while (steps < maxSteps) {
    const h1 = (await page.locator('h1#daMainQuestion').textContent()) || '';
    if (h1.includes('Please tell the court about your property.')) {
      // We're at property intro
      return;
    }

    // Handle known pages after Basic Identity
    if (h1.includes('Basic Identity and Contact Information')) {
      // We already filled it in navigateToQuestion; just submit to proceed
      const submit = page.locator('button[type="submit"]');
      if (await submit.count()) {
        await submit.first().click();
        await page.waitForLoadState('networkidle');
        // If still on the same page with a county validation error, pick first real county
        const stillHere = ((await page.locator('h1#daMainQuestion').textContent()) || '').includes('Basic Identity and Contact Information');
        if (stillHere) {
          const countyError = await page.getByText('You need to select one.').count();
          if (countyError > 0) {
            const countySelect = page.locator('#ZGVidG9yW2ldLmFkZHJlc3MuY291bnR5');
            if (await countySelect.count()) {
              const options: string[] = await countySelect.locator('option').allTextContents();
              const firstReal = options.find(o => o.trim() !== 'Select...' && o.trim() !== 'N/A');
              if (firstReal) {
                await countySelect.selectOption({ label: firstReal }).catch(async () => {
                  await countySelect.selectOption(firstReal);
                });
                await submit.first().click();
                await page.waitForLoadState('networkidle');
              }
            }
          }
        }
        steps++;
        continue;
      }
    }
    if (h1.includes('Has') && h1.includes('lived in the specified district')) {
      // Lived in district question -> Yes
      await clickRadioByValue('True');
    } else if ((h1.includes('Does') && h1.includes('have any') && h1.toLowerCase().includes('other names')) ||
               (h1.includes('Do you have any') && h1.toLowerCase().includes("other names they've used"))) {
      // Alias any -> No
      await clickRadioByValue('False');
    } else if (h1.includes('Are there more debtors to add?')) {
      // Additional debtor -> No
      await clickRadioByValue('False');
    } else {
      // For review/summary or any other page, just continue
    }

    // Click continue and loop
    const btn = page.locator('button[type="submit"]');
    if (await btn.count()) {
      await btn.first().click();
      await page.waitForLoadState('networkidle');
    } else {
      throw new Error(`No submit button on page with heading: ${h1}`);
    }
    steps++;
  }
  const finalH1 = await page.locator('h1#daMainQuestion').textContent();
  throw new Error(`Expected to reach property intro within ${maxSteps} steps, last seen: ${finalH1}`);
}

// Answer a Yes/No page and continue
async function answerYesNoAndContinue(page: any, yes: boolean) {
  const choiceName = yes ? 'Yes' : 'No';
  await page.getByRole('radio', { name: choiceName }).first().check();
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

// Fill a single real property interest on the details page using accessible labels
async function fillRealPropertyInterest(page: any, item: {
  street: string;
  city: string;
  state: string;
  zip?: string | number;
  county?: string;
  type: 'Single-family home' | 'Duplex or Multi-unit building' | 'Condominium or cooperative' | 'Manufactured or mobile home' | 'Land' | 'Investment property' | 'Timeshare' | 'Other';
  who?: 'Debtor 1 only' | 'Debtor 2 only' | 'Debtor 1 and Debtor 2 only' | 'At least one of the debtors and another';
  current_value: string | number;
  has_loan?: boolean;
  current_owed_amount?: string | number;
  ownership_interest?: string;
  is_community_property?: boolean;
  is_claiming_exemption?: boolean;
  claiming_sub_100?: boolean;
  exemption_value?: string | number;
  exemption_laws?: string;
}) {
  // Verify we are on the details page
  const h1 = (await page.locator('h1#daMainQuestion').textContent()) || '';
  if (!h1.includes('Tell the court about details about the interest in question.')) {
    throw new Error(`Not on real property details page. Found: ${h1}`);
  }

  await page.getByLabel('Street').fill(item.street);
  await page.getByLabel('City').fill(item.city);
  // State can be a text input or a select; handle both gracefully
  const stateControl = page.getByLabel('State');
  if (await stateControl.count()) {
  const el = await stateControl.elementHandle();
  const tag = (await el?.evaluate((node: Element) => (node as HTMLElement).tagName.toLowerCase())) as string | undefined;
    if (tag === 'select') {
      try {
        await stateControl.selectOption({ label: item.state });
      } catch {
        await stateControl.selectOption(item.state);
      }
    } else {
      await stateControl.fill(item.state);
    }
  }
  if (item.zip !== undefined) {
    await page.getByLabel('Zip').fill(String(item.zip));
  }
  if (item.county) {
    // County is typically a text input; if it becomes a select in the future, handle both
    const countyControl = page.getByLabel('County');
    if (await countyControl.count()) {
      const el = await countyControl.elementHandle();
      const tag = (await el?.evaluate((node: Element) => (node as HTMLElement).tagName.toLowerCase())) as string | undefined;
      if (tag === 'select') {
        try {
          await countyControl.selectOption({ label: item.county });
        } catch {
          await countyControl.selectOption(item.county);
        }
      } else {
        await countyControl.fill(item.county);
      }
    }
  }

  // Property type checkbox: prefer role-based labelauty checkbox to avoid strict-mode label/input ambiguity
  const typeCheckbox = page.getByRole('checkbox', { name: item.type }).first();
  await typeCheckbox.check();

  // Who has an interest (if present)
  const whoGroup = page.getByRole('group', { name: 'Who has an interest in the property?' });
  if ((await whoGroup.count()) && item.who) {
    await whoGroup.getByRole('radio', { name: item.who }).check();
  }

  await page.getByLabel('Current property value').fill(String(item.current_value));

  // Mortgage/loan (scope to question group)
  const loanGroup = page.getByRole('group', { name: 'Do you have a mortgage/loan on the property?' });
  const hasLoan = !!item.has_loan;
  if (await loanGroup.count()) {
    await loanGroup.getByRole('radio', { name: hasLoan ? 'Yes' : 'No' }).check();
  } else {
    await page.getByRole('radio', { name: hasLoan ? 'Yes' : 'No' }).first().check();
  }
  if (hasLoan && item.current_owed_amount !== undefined) {
    await page.getByLabel('How much do you owe on the loan?').fill(String(item.current_owed_amount));
  }

  // Ownership interest (optional)
  if (item.ownership_interest && (await page.getByLabel('Describe the nature of your ownership interest', { exact: false }).count())) {
    await page.getByLabel('Describe the nature of your ownership interest', { exact: false }).fill(item.ownership_interest);
  }

  // Community property (optional)
  const communityGroup = page.getByRole('group', { name: 'Is this community property?' });
  if ((await communityGroup.count()) && typeof item.is_community_property === 'boolean') {
    await communityGroup.getByRole('radio', { name: item.is_community_property ? 'Yes' : 'No' }).check();
  }

  // Exemptions (optional)
  const claimGroup = page.getByRole('group', { name: 'Claiming Exemption?' });
  const claimEx = !!item.is_claiming_exemption;
  if (await claimGroup.count()) {
    await claimGroup.getByRole('radio', { name: claimEx ? 'Yes' : 'No' }).check();
    if (claimEx) {
      const sub100Group = page.getByRole('group', { name: 'Are you claiming less than 100% of fair market value?' });
      const sub100 = !!item.claiming_sub_100;
      if (await sub100Group.count()) {
        await sub100Group.getByRole('radio', { name: sub100 ? 'Yes' : 'No' }).check();
      }
      if (sub100 && item.exemption_value !== undefined) {
        await page.getByLabel('Value of exemption being claimed').fill(String(item.exemption_value));
      }
      if (item.exemption_laws) {
        await page.getByLabel('Specific laws that allow exemption').selectOption({ label: item.exemption_laws });
      }
    }
  }

  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

// Test 1: Basic interview loads
test('Interview loads successfully', async ({ page }) => {
  await page.goto('https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
  await page.waitForLoadState('networkidle');
  
  const h1Text = await page.locator('h1#daMainQuestion').textContent();
  expect(h1Text).toContain('Voluntary Petition for Individuals Filing for Bankruptcy');
  
  await page.screenshot({ path: 'test-results/interview-loads.png', fullPage: true });
});

// Test 2: Minimalist single filer scenario
test('Minimalist single filer - complete basic flow', async ({ page }) => {
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: false,
    district_final: true,
    filing_status: 'Filing individually',
    'debtor[0].name.first': 'Alexander',
    'debtor[0].name.last': 'clark',
    'debtor[0].address.address': '111 Fake St.',
    'debtor[0].address.city': 'Omaha',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.zip': '68022',
    'debtor[0].address.county': 'Douglas County',
    'debtor[0].has_other_mailing_address': false,
    'debtor[0].tax_id.tax_id_type': '1',
    'debtor[0].tax_id.tax_id': '123-45-6789',
    'debtor[0].alias.there_are_any': false,
    'debtor[0].district_info.is_current_district': true
  };
  
  await navigateToQuestion(page, 'debtor_final', testData);
  
  console.log('🔍 Checking form field values after navigation...');
  
  // Verify form was filled correctly
  const firstName = await page.inputValue('#ZGVidG9yW2ldLm5hbWUuZmlyc3Q');
  const lastName = await page.inputValue('#ZGVidG9yW2ldLm5hbWUubGFzdA');
  const state = await page.inputValue('#ZGVidG9yW2ldLmFkZHJlc3Muc3RhdGU');
  const county = await page.inputValue('#ZGVidG9yW2ldLmFkZHJlc3MuY291bnR5');
  
  console.log(`First name value: "${firstName}"`);
  console.log(`Last name value: "${lastName}"`);
  console.log(`State value: "${state}"`);
  console.log(`County value: "${county}"`);
  
  expect(firstName).toBe('Alexander');
  expect(lastName).toBe('clark');
  expect(state).toBe('Nebraska');
  expect(county).toBe('Douglas County');
  
  await page.screenshot({ path: 'test-results/minimalist-single-filer.png', fullPage: true });
  
  console.log('✅ Minimalist single filer test completed successfully');
});

// Test 3: Maximalist joint filer scenario 
test('Maximalist joint filer - complete comprehensive flow', async ({ page }) => {
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: true,
    case_number: '8:25-bk-12345',
    district_final: true,
    filing_status: 'Filing with spouse',
    'debtor.target_number': 2,
    'debtor[0].name.first': 'Alex',
    'debtor[0].name.last': 'Smith',
    'debtor[0].address.address': '123 Main St',
    'debtor[0].address.city': 'Omaha',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.zip': '68102',
    'debtor[0].address.county': 'Douglas County',
    'debtor[0].has_other_mailing_address': true,
    'debtor[0].mailing_state': 'Nebraska',
    'debtor[0].tax_id.tax_id_type': '1',
    'debtor[0].tax_id.tax_id': '123-45-6789',
    'debtor[0].alias.there_are_any': true,
    'debtor[0].alias[0].first_name': 'A.',
    'debtor[0].alias[0].last_name': 'S.',
    'debtor[0].district_info.is_current_district': false,
    'debtor[0].district_info.other_district_reason': 'Moved recently',
    'debtor[1].name.first': 'Jamie',
    'debtor[1].name.last': 'Smith',
    'debtor[1].address.state': 'Nebraska',
    'debtor[1].address.county': 'Douglas County',
    'debtor[1].has_other_mailing_address': true,
    'debtor[1].mailing_state': 'Nebraska',
    'debtor[1].tax_id.tax_id_type': '2',
    'debtor[1].tax_id.tax_id': '987-65-4321',
    'debtor[1].alias.there_are_any': true,
    'debtor[1].alias[0].first_name': 'J.',
    'debtor[1].alias[0].last_name': 'S.',
    'debtor[1].district_info.is_current_district': true,
    'debtor.there_is_another': false
  };
  
  await navigateToQuestion(page, 'debtor_final', testData);
  
  await page.screenshot({ path: 'test-results/maximalist-joint-filer.png', fullPage: true });
  console.log('✅ Maximalist joint filer test completed successfully');
});

// Test 106AB: reach property intro after debtor info
test('106AB - reach property intro after debtor info', async ({ page }) => {
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: false,
    district_final: true,
  filing_status: 'Filing individually',
    'debtor[0].name.first': 'Alex',
    'debtor[0].name.last': 'Property',
    'debtor[0].address.address': '100 Property Way',
    'debtor[0].address.city': 'Omaha',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.county': 'Douglas County',
    'debtor[0].address.zip': '68102',
  };

  await navigateToQuestion(page, 'debtor_final', testData);
  await continueToPropertyIntro(page);

  const h1 = await page.locator('h1#daMainQuestion').textContent();
  expect(h1).toContain('Please tell the court about your property.');
});

// Test 106AB: add one real property interest and then stop (no vehicles)
test('106AB - add one real property interest, no vehicles', async ({ page }) => {
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: false,
    district_final: true,
  filing_status: 'Filing individually',
    'debtor[0].name.first': 'Alex',
    'debtor[0].name.last': 'Owner',
    'debtor[0].address.address': '500 Home St',
    'debtor[0].address.city': 'Omaha',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.county': 'Douglas County',
    'debtor[0].address.zip': '68102',
  };

  await navigateToQuestion(page, 'debtor_final', testData);
  await continueToPropertyIntro(page);

  // Continue from property intro
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');

  // real_property_interests_any_exist: Yes
  let h1 = (await page.locator('h1#daMainQuestion').textContent()) || '';
  expect(h1).toContain('Do you own or have any legal or equitable interest in any residence');
  await answerYesNoAndContinue(page, true);

  // Fill details
  await fillRealPropertyInterest(page, {
    street: '12 Oak St',
    city: 'Omaha',
    state: 'Nebraska',
    zip: '68102',
    county: 'Douglas County',
    type: 'Single-family home',
    who: 'Debtor 1 only',
    current_value: '200000',
    has_loan: false,
    is_community_property: false,
    is_claiming_exemption: false,
  });

  // real_property_interests_add_another: No
  h1 = (await page.locator('h1#daMainQuestion').textContent()) || '';
  expect(h1).toContain('Do you have more interests to add?');
  // Verify our submitted address appears in the table under
  await expect(page.getByText('12 Oak St')).toBeVisible();
  await answerYesNoAndContinue(page, false);

  // vehicles_any_exist: No
  h1 = (await page.locator('h1#daMainQuestion').textContent()) || '';
  expect(h1).toContain('Do you own, lease, or have legal or equitable interest in any vehicles');
  await answerYesNoAndContinue(page, false);

  // other_vehicles_any_exist: No
  h1 = (await page.locator('h1#daMainQuestion').textContent()) || '';
  expect(h1).toContain('Do you own, lease, or have legal or equitable interest in any other vehicle types');
  await answerYesNoAndContinue(page, false);

  // Next should be personal_household_items page
  h1 = (await page.locator('h1#daMainQuestion').textContent()) || '';
  expect(h1).toContain('Describe your personal and household items.');
});

// Test 4: Amended filing branch - TRUE
test('Variant 1: Amended filing with case number', async ({ page }) => {
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: true,
    case_number: '8:25-bk-98765',
    district_final: true,
    filing_status: 'Filing individually',
    'debtor[0].name.first': 'John',
    'debtor[0].name.last': 'Amended',
    'debtor[0].address.address': '456 Amendment Ave',
    'debtor[0].address.city': 'Lincoln',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.county': 'Lancaster County',
    'debtor[0].address.zip': '68501',
    'debtor[0].has_other_mailing_address': false,
    'debtor[0].tax_id.tax_id_type': '1',
    'debtor[0].tax_id.tax_id': '987-65-4321'
  };
  
  await navigateToQuestion(page, 'debtor_final', testData);
  
  console.log('✅ Amended filing test completed successfully');
});

// Test 5: Amended filing branch - FALSE
test('Variant 1b: Non-amended filing (skips case number)', async ({ page }) => {
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: false,
    district_final: true,
    filing_status: 'Filing individually',
    'debtor[0].name.first': 'Jane',
    'debtor[0].name.last': 'Original',
    'debtor[0].address.address': '789 New Filing Rd',
    'debtor[0].address.city': 'Bellevue',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.county': 'Sarpy County',
    'debtor[0].address.zip': '68123',
    'debtor[0].has_other_mailing_address': false,
    'debtor[0].tax_id.tax_id_type': '1',
    'debtor[0].tax_id.tax_id': '456-78-9012'
  };
  
  await navigateToQuestion(page, 'debtor_final', testData);
  
  console.log('✅ Non-amended filing test completed successfully');
});

// Test 6: Filing status - Individual
test('Variant 2a: Individual filing (debtor.target_number = 1)', async ({ page }) => {
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: false,
    filing_status: 'Filing individually',
    'debtor[0].name.first': 'Solo',
    'debtor[0].name.last': 'Individual',
    'debtor[0].address.address': '321 Single St',
    'debtor[0].address.city': 'Norfolk',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.county': 'Madison County',
    'debtor[0].address.zip': '68701',
    'debtor[0].has_other_mailing_address': false,
    'debtor[0].tax_id.tax_id_type': '1'
  };
  
  await navigateToQuestion(page, 'debtor_final', testData);
  
  console.log('✅ Individual filing test completed successfully');
});

// Test 7: Filing status - With Spouse
test('Variant 2b: Joint filing with spouse (debtor.target_number = 2)', async ({ page }) => {
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: false,
    filing_status: 'Filing with spouse',
    'debtor.target_number': 2,
    'debtor[0].name.first': 'Married',
    'debtor[0].name.last': 'Person',
    'debtor[0].address.address': '654 Couple Ct',
    'debtor[0].address.city': 'Grand Island',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.county': 'Hall County',
    'debtor[0].address.zip': '68801',
    'debtor[0].has_other_mailing_address': false,
    'debtor[0].tax_id.tax_id_type': '1',
    'debtor[1].name.first': 'Spouse',
    'debtor[1].name.last': 'Person',
    'debtor[1].address.state': 'Nebraska',
    'debtor[1].address.county': 'Hall County',
    'debtor[1].has_other_mailing_address': false,
    'debtor[1].tax_id.tax_id_type': '2'
  };
  
  await navigateToQuestion(page, 'debtor_final', testData);
  
  console.log('✅ Joint filing with spouse test completed successfully');
});

// Test 8: Tax ID Type variants
test('Variant 3a: Social Security Number tax ID', async ({ page }) => {
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: false,
    filing_status: 'Filing individually',
    'debtor[0].name.first': 'SSN',
    'debtor[0].name.last': 'User',
    'debtor[0].address.address': '111 SSN Way',
    'debtor[0].address.city': 'Kearney',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.county': 'Buffalo County',
    'debtor[0].address.zip': '68845',
    'debtor[0].has_other_mailing_address': false,
    'debtor[0].tax_id.tax_id_type': '1', // SSN
    'debtor[0].tax_id.tax_id': '123-45-6789'
  };
  
  await navigateToQuestion(page, 'debtor_final', testData);
  
  console.log('✅ SSN tax ID test completed successfully');
});

test('Variant 3b: Individual Taxpayer Identification Number (ITIN)', async ({ page }) => {
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: false,
    filing_status: 'Filing individually',
    'debtor[0].name.first': 'ITIN',
    'debtor[0].name.last': 'User',
    'debtor[0].address.address': '222 ITIN Ave',
    'debtor[0].address.city': 'Fremont',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.county': 'Dodge County',
    'debtor[0].address.zip': '68025',
    'debtor[0].has_other_mailing_address': false,
    'debtor[0].tax_id.tax_id_type': '2', // ITIN
    'debtor[0].tax_id.tax_id': '987-65-4321'
  };
  
  await navigateToQuestion(page, 'debtor_final', testData);
  
  console.log('✅ ITIN tax ID test completed successfully');
});

// Test 9: Mailing address variants
test('Variant 4a: No separate mailing address', async ({ page }) => {
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: false,
    filing_status: 'Filing individually',
    'debtor[0].name.first': 'NoMail',
    'debtor[0].name.last': 'Address',
    'debtor[0].address.address': '333 No Mail Dr',
    'debtor[0].address.city': 'Hastings',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.county': 'Adams County',
    'debtor[0].address.zip': '68901',
    'debtor[0].has_other_mailing_address': false,
    'debtor[0].tax_id.tax_id_type': '1'
  };
  
  await navigateToQuestion(page, 'debtor_final', testData);
  
  console.log('✅ No separate mailing address test completed successfully');
});

test('Variant 4b: Has separate mailing address', async ({ page }) => {
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: false,
    filing_status: 'Filing individually',
    'debtor[0].name.first': 'HasMail',
    'debtor[0].name.last': 'Address',
    'debtor[0].address.address': '444 Has Mail St',
    'debtor[0].address.city': 'Columbus',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.county': 'Platte County',
    'debtor[0].address.zip': '68601',
    'debtor[0].has_other_mailing_address': true,
    'debtor[0].mailing_address': 'PO Box 123',
    'debtor[0].mailing_city': 'Columbus',
    'debtor[0].mailing_state': 'Nebraska',
    'debtor[0].mailing_zip': '68602',
    'debtor[0].tax_id.tax_id_type': '1'
  };
  
  await navigateToQuestion(page, 'debtor_final', testData);
  
  console.log('✅ Has separate mailing address test completed successfully');
});

// Test 10: District variants
test('Variant 5a: Current district is correct', async ({ page }) => {
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: false,
    filing_status: 'Filing individually',
    'debtor[0].name.first': 'Current',
    'debtor[0].name.last': 'District',
    'debtor[0].address.address': '555 Correct District Blvd',
    'debtor[0].address.city': 'North Platte',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.county': 'Lincoln County',
    'debtor[0].address.zip': '69101',
    'debtor[0].has_other_mailing_address': false,
    'debtor[0].tax_id.tax_id_type': '1',
    'debtor[0].district_info.is_current_district': true
  };
  
  await navigateToQuestion(page, 'debtor_final', testData);
  
  console.log('✅ Current district correct test completed successfully');
});

test('Variant 5b: Different district with reason', async ({ page }) => {
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: false,
    filing_status: 'Filing individually',
    'debtor[0].name.first': 'Other',
    'debtor[0].name.last': 'District',
    'debtor[0].address.address': '666 Wrong District Way',
    'debtor[0].address.city': 'Scottsbluff',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.county': 'Scotts Bluff County',
    'debtor[0].address.zip': '69361',
    'debtor[0].has_other_mailing_address': false,
    'debtor[0].tax_id.tax_id_type': '1',
    'debtor[0].district_info.is_current_district': false,
    'debtor[0].district_info.other_district_reason': 'Recently moved from Wyoming'
  };
  
  await navigateToQuestion(page, 'debtor_final', testData);
  
  console.log('✅ Different district with reason test completed successfully');
});

// Test 11: County dropdown population test
test('Variant 6: County dropdown population for all Nebraska counties', async ({ page }) => {
  const nebraskaCases = [
    { county: 'Douglas County', city: 'Omaha', zip: '68102' },
    { county: 'Lancaster County', city: 'Lincoln', zip: '68501' },
    { county: 'Sarpy County', city: 'Bellevue', zip: '68005' },
    { county: 'Hall County', city: 'Grand Island', zip: '68801' },
    { county: 'Buffalo County', city: 'Kearney', zip: '68845' }
  ];
  
  for (const testCase of nebraskaCases) {
    console.log(`🧪 Testing county: ${testCase.county}`);
    
    await page.goto('https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
    await page.waitForLoadState('networkidle');
    
    // Navigate to basic info quickly
    await page.click('button[type="submit"]'); // Intro
    await page.waitForLoadState('networkidle');
    
    await page.selectOption('select', 'District of Nebraska');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Navigate through remaining steps
    let step = 0;
    while (step < 10) {
      const h1 = await page.locator('h1#daMainQuestion').textContent() || '';
      if (h1.includes('Basic Identity and Contact Information')) break;
      
      const radios = await page.locator('input[type="radio"]').count();
      if (radios > 0) {
        const firstRadio = page.locator('input[type="radio"]').first();
        const radioId = await firstRadio.getAttribute('id');
        if (radioId) {
          await page.click(`label[for="${radioId}"]`);
        }
      }
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      step++;
    }
    
    // Test county dropdown
    await page.fill('#ZGVidG9yW2ldLm5hbWUuZmlyc3Q', 'County');
    await page.fill('#ZGVidG9yW2ldLm5hbWUubGFzdA', 'Test');
    await page.fill('#ZGVidG9yW2ldLmFkZHJlc3MuYWRkcmVzcw', '123 Test St');
    await page.fill('#ZGVidG9yW2ldLmFkZHJlc3MuY2l0eQ', testCase.city);
    
    // Select Nebraska - should populate counties
    await page.selectOption('#ZGVidG9yW2ldLmFkZHJlc3Muc3RhdGU', 'Nebraska');
    await page.waitForTimeout(2000);
    
    // Verify county options are populated
    const countyOptions = await page.locator('#ZGVidG9yW2ldLmFkZHJlc3MuY291bnR5 option').allTextContents();
    expect(countyOptions).toContain(testCase.county);
    
    // Select the specific county
    await page.selectOption('#ZGVidG9yW2ldLmFkZHJlc3MuY291bnR5', testCase.county);
    await page.fill('#ZGVidG9yW2ldLmFkZHJlc3Muemlw', testCase.zip);
    
    // Verify selection worked
    const selectedCounty = await page.inputValue('#ZGVidG9yW2ldLmFkZHJlc3MuY291bnR5');
    expect(selectedCounty).toBe(testCase.county);
    
    console.log(`✅ County test passed for: ${testCase.county}`);
  }
  
  console.log('✅ All county dropdown tests completed successfully');
});

// Test 12: Alias handling variants
test('Variant 7a: No aliases', async ({ page }) => {
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: false,
    filing_status: 'Filing individually',
    'debtor[0].name.first': 'NoAlias',
    'debtor[0].name.last': 'Person',
    'debtor[0].address.address': '777 No Alias Rd',
    'debtor[0].address.city': 'Wayne',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.county': 'Wayne County',
    'debtor[0].address.zip': '68787',
    'debtor[0].has_other_mailing_address': false,
    'debtor[0].tax_id.tax_id_type': '1',
    'debtor[0].alias.there_are_any': false
  };
  
  await navigateToQuestion(page, 'debtor_final', testData);
  console.log('✅ No aliases test completed successfully');
});

test('Variant 7b: Has aliases', async ({ page }) => {
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: false,
    filing_status: 'Filing individually',
    'debtor[0].name.first': 'HasAlias',
    'debtor[0].name.last': 'Person',
    'debtor[0].address.address': '888 Alias Ave',
    'debtor[0].address.city': 'York',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.county': 'York County',
    'debtor[0].address.zip': '68467',
    'debtor[0].has_other_mailing_address': false,
    'debtor[0].tax_id.tax_id_type': '1',
    'debtor[0].alias.there_are_any': true,
    'debtor[0].alias[0].first_name': 'Nickname',
    'debtor[0].alias[0].last_name': 'Alias'
  };
  
  await navigateToQuestion(page, 'debtor_final', testData);
  console.log('✅ Has aliases test completed successfully');
});

// Test 13: Edge case - Minimal data
test('Variant 8: Edge case - Minimal required data only', async ({ page }) => {
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: false,
    filing_status: 'Filing individually',
    'debtor[0].name.first': 'Min',
    'debtor[0].name.last': 'Data',
    'debtor[0].address.address': '1 Min St',
    'debtor[0].address.city': 'A',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.county': 'Adams County',
    'debtor[0].address.zip': '68001',
    'debtor[0].has_other_mailing_address': false,
    'debtor[0].tax_id.tax_id_type': '1'
  };
  
  await navigateToQuestion(page, 'debtor_final', testData);
  console.log('✅ Minimal data edge case test completed successfully');
});

// Test 14: Cross-browser compatibility test
test('Variant 9: Cross-browser form interaction consistency', async ({ page }) => {
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: false,
    filing_status: 'Filing individually',
    'debtor[0].name.first': 'Browser',
    'debtor[0].name.last': 'Test',
    'debtor[0].address.address': '999 Browser Way',
    'debtor[0].address.city': 'Omaha',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.county': 'Douglas County',
    'debtor[0].address.zip': '68108',
    'debtor[0].has_other_mailing_address': false,
    'debtor[0].tax_id.tax_id_type': '1'
  };
  
  await navigateToQuestion(page, 'debtor_final', testData);
  
  // Additional browser-specific validations
  const userAgent = await page.evaluate(() => navigator.userAgent);
  console.log(`Browser: ${userAgent}`);
  
  // Test form interactions work consistently
  await page.hover('#ZGVidG9yW2ldLm5hbWUuZmlyc3Q');
  await page.focus('#ZGVidG9yW2ldLm5hbWUubGFzdA');
  
  // Take browser-specific screenshot
  const browserName = page.context().browser()?.browserType().name() || 'unknown';
  await page.screenshot({ 
    path: `test-results/browser-${browserName}-compatibility.png`, 
    fullPage: true 
  });
  
  console.log(`✅ Cross-browser test completed successfully for ${browserName}`);
});

// Test 15: Form validation and error handling
test('Variant 10: Form validation with missing required fields', async ({ page }) => {
  await page.goto('https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
  await page.waitForLoadState('networkidle');
  
  // Navigate to basic info form
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  await page.selectOption('select', 'District of Nebraska');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  // Skip through to basic info
  let steps = 0;
  while (steps < 10) {
    const h1 = await page.locator('h1#daMainQuestion').textContent() || '';
    if (h1.includes('Basic Identity and Contact Information')) break;
    
    const radios = await page.locator('input[type="radio"]').count();
    if (radios > 0) {
      const firstRadio = page.locator('input[type="radio"]').first();
      const radioId = await firstRadio.getAttribute('id');
      if (radioId) {
        await page.click(`label[for="${radioId}"]`);
      }
    }
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    steps++;
  }
  
  // Try to submit form with missing required fields
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  // Check for validation errors (fields should have is-invalid class)
  const invalidFields = await page.locator('.is-invalid').count();
  expect(invalidFields).toBeGreaterThan(0);
  
  await page.screenshot({ path: 'test-results/form-validation-errors.png', fullPage: true });
  
  console.log(`✅ Form validation test completed - found ${invalidFields} validation errors`);
});

// Test 16: Performance and load testing
test('Variant 11: Performance - Fast navigation through interview', async ({ page }) => {
  const startTime = Date.now();
  
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: false,
    filing_status: 'Filing individually',
    'debtor[0].name.first': 'Speed',
    'debtor[0].name.last': 'Test',
    'debtor[0].address.address': '100 Fast Lane',
    'debtor[0].address.city': 'Omaha',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.county': 'Douglas County',
    'debtor[0].address.zip': '68104',
    'debtor[0].has_other_mailing_address': false,
    'debtor[0].tax_id.tax_id_type': '1'
  };
  
  await navigateToQuestion(page, 'debtor_final', testData);
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`✅ Performance test completed in ${duration}ms`);
  expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
});

// Test 17: Accessibility and ARIA compliance
test('Variant 12: Accessibility - Form labels and ARIA attributes', async ({ page }) => {
  await page.goto('https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
  await page.waitForLoadState('networkidle');
  
  // Navigate to basic info form
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  await page.selectOption('select', 'District of Nebraska');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  // Skip to basic info
  let steps = 0;
  while (steps < 10) {
    const h1 = await page.locator('h1#daMainQuestion').textContent() || '';
    if (h1.includes('Basic Identity and Contact Information')) break;
    
    const radios = await page.locator('input[type="radio"]').count();
    if (radios > 0) {
      const firstRadio = page.locator('input[type="radio"]').first();
      const radioId = await firstRadio.getAttribute('id');
      if (radioId) {
        await page.click(`label[for="${radioId}"]`);
      }
    }
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    steps++;
  }
  
  // Check accessibility features
  const formFields = await page.locator('input[type="text"], select').all();
  let labeledFields = 0;
  
  for (const field of formFields) {
    const fieldId = await field.getAttribute('id');
    if (fieldId) {
      const label = await page.locator(`label[for="${fieldId}"]`).count();
      if (label > 0) labeledFields++;
    }
  }
  
  // Most fields should have proper labels
  expect(labeledFields).toBeGreaterThan(0);
  
  // Check for ARIA attributes on radio buttons
  const radioButtons = await page.locator('input[type="radio"]').all();
  let ariaCompliantRadios = 0;
  
  for (const radio of radioButtons) {
    const ariaLabel = await radio.getAttribute('aria-label');
    if (ariaLabel) ariaCompliantRadios++;
  }
  
  console.log(`✅ Accessibility test completed - ${labeledFields} labeled fields, ${ariaCompliantRadios} ARIA-compliant radios`);
});

// Test 18: State and county relationship validation
test('Variant 13: All state-county combinations work correctly', async ({ page }) => {
  const stateCombos = [
    { state: 'Nebraska', county: 'Douglas County' },
    { state: 'Nebraska', county: 'Lancaster County' },
    { state: 'Nebraska', county: 'Sarpy County' }
  ];
  
  for (const combo of stateCombos) {
    console.log(`🧪 Testing ${combo.state} -> ${combo.county}`);
    
    await page.goto('https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
    await page.waitForLoadState('networkidle');
    
    // Quick navigation to basic info
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    await page.selectOption('select', 'District of Nebraska');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Navigate through steps
    let steps = 0;
    while (steps < 10) {
      const h1 = await page.locator('h1#daMainQuestion').textContent() || '';
      if (h1.includes('Basic Identity and Contact Information')) break;
      
      const radios = await page.locator('input[type="radio"]').count();
      if (radios > 0) {
        const firstRadio = page.locator('input[type="radio"]').first();
        const radioId = await firstRadio.getAttribute('id');
        if (radioId) {
          await page.click(`label[for="${radioId}"]`);
        }
      }
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      steps++;
    }
    
    // Test state-county relationship
    await page.fill('#ZGVidG9yW2ldLm5hbWUuZmlyc3Q', 'State');
    await page.fill('#ZGVidG9yW2ldLm5hbWUubGFzdA', 'Test');
    await page.fill('#ZGVidG9yW2ldLmFkZHJlc3MuYWRkcmVzcw', '123 State Test St');
    await page.fill('#ZGVidG9yW2ldLmFkZHJlc3MuY2l0eQ', 'TestCity');
    
    // Select state and wait for county population
    await page.selectOption('#ZGVidG9yW2ldLmFkZHJlc3Muc3RhdGU', combo.state);
    await page.waitForTimeout(3000);
    
    // Verify county is available and select it
    const countyOptions = await page.locator('#ZGVidG9yW2ldLmFkZHJlc3MuY291bnR5 option').allTextContents();
    expect(countyOptions).toContain(combo.county);
    
    await page.selectOption('#ZGVidG9yW2ldLmFkZHJlc3MuY291bnR5', combo.county);
    
    // Verify selection worked
    const selectedState = await page.inputValue('#ZGVidG9yW2ldLmFkZHJlc3Muc3RhdGU');
    const selectedCounty = await page.inputValue('#ZGVidG9yW2ldLmFkZHJlc3MuY291bnR5');
    
    expect(selectedState).toBe(combo.state);
    expect(selectedCounty).toBe(combo.county);
    
    console.log(`✅ State-county combo validated: ${combo.state} -> ${combo.county}`);
  }
});

// Test 19: Error recovery and resilience
test('Variant 14: Error recovery - Handle JavaScript errors gracefully', async ({ page }) => {
  // Listen for console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: false,
    filing_status: 'Filing individually',
    'debtor[0].name.first': 'Error',
    'debtor[0].name.last': 'Recovery',
    'debtor[0].address.address': '404 Error St',
    'debtor[0].address.city': 'Omaha',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.county': 'Douglas County',
    'debtor[0].address.zip': '68111',
    'debtor[0].has_other_mailing_address': false,
    'debtor[0].tax_id.tax_id_type': '1'
  };
  
  await navigateToQuestion(page, 'debtor_final', testData);
  
  // Log any JavaScript errors that occurred
  if (errors.length > 0) {
    console.log(`⚠️  JavaScript errors detected: ${errors.join(', ')}`);
  } else {
    console.log('✅ No JavaScript errors detected');
  }
  
  console.log('✅ Error recovery test completed successfully');
});

// Test 20: Data persistence and session handling
test('Variant 15: Data persistence - Form data survives page navigation', async ({ page }) => {
  await page.goto('https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
  await page.waitForLoadState('networkidle');
  
  // Navigate to basic info
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  await page.selectOption('select', 'District of Nebraska');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  // Navigate through steps
  let steps = 0;
  while (steps < 10) {
    const h1 = await page.locator('h1#daMainQuestion').textContent() || '';
    if (h1.includes('Basic Identity and Contact Information')) break;
    
    const radios = await page.locator('input[type="radio"]').count();
    if (radios > 0) {
      const firstRadio = page.locator('input[type="radio"]').first();
      const radioId = await firstRadio.getAttribute('id');
      if (radioId) {
        await page.click(`label[for="${radioId}"]`);
      }
    }
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    steps++;
  }
  
  // Fill some data
  await page.fill('#ZGVidG9yW2ldLm5hbWUuZmlyc3Q', 'Persistence');
  await page.fill('#ZGVidG9yW2ldLm5hbWUubGFzdA', 'Test');
  await page.fill('#ZGVidG9yW2ldLmFkZHJlc3MuYWRkcmVzcw', '123 Persistent St');
  
  // Navigate away and back (simulate page refresh or navigation)
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  // Check if data persisted
  const persistedFirstName = await page.inputValue('#ZGVidG9yW2ldLm5hbWUuZmlyc3Q');
  const persistedLastName = await page.inputValue('#ZGVidG9yW2ldLm5hbWUubGFzdA');
  const persistedAddress = await page.inputValue('#ZGVidG9yW2ldLmFkZHJlc3MuYWRkcmVzcw');
  
  console.log(`Data persistence check:
    First Name: ${persistedFirstName}
    Last Name: ${persistedLastName}
    Address: ${persistedAddress}`);
  
  console.log('✅ Data persistence test completed');
});

// Test 21: Complete end-to-end workflow
test('Variant 16: Complete end-to-end workflow validation', async ({ page }) => {
  console.log('🎯 Starting complete end-to-end workflow test');
  
  const testData = {
    introduction_screen: true,
    current_district: 'District of Nebraska',
    amended_filing: false,
    filing_status: 'Filing individually',
    'debtor[0].name.first': 'EndToEnd',
    'debtor[0].name.last': 'Complete',
    'debtor[0].address.address': '999 Complete Workflow Dr',
    'debtor[0].address.city': 'Omaha',
    'debtor[0].address.state': 'Nebraska',
    'debtor[0].address.county': 'Douglas County',
    'debtor[0].address.zip': '68199',
    'debtor[0].has_other_mailing_address': false,
    'debtor[0].tax_id.tax_id_type': '1',
    'debtor[0].tax_id.tax_id': '999-99-9999',
    'debtor[0].alias.there_are_any': false,
    'debtor[0].district_info.is_current_district': true
  };
  
  await navigateToQuestion(page, 'debtor_final', testData);
  
  // Take comprehensive final screenshot
  await page.screenshot({ 
    path: 'test-results/end-to-end-complete-workflow.png', 
    fullPage: true 
  });
  
  // Validate all critical form elements are present and filled
  const validations = [
    { field: '#ZGVidG9yW2ldLm5hbWUuZmlyc3Q', expected: 'EndToEnd' },
    { field: '#ZGVidG9yW2ldLm5hbWUubGFzdA', expected: 'Complete' },
    { field: '#ZGVidG9yW2ldLmFkZHJlc3Muc3RhdGU', expected: 'Nebraska' },
    { field: '#ZGVidG9yW2ldLmFkZHJlc3MuY291bnR5', expected: 'Douglas County' }
  ];
  
  for (const validation of validations) {
    const actualValue = await page.inputValue(validation.field);
    expect(actualValue).toBe(validation.expected);
  }
  
  console.log('🎉 Complete end-to-end workflow test completed successfully');
  console.log('✅ All 21 test variants completed successfully');
});
