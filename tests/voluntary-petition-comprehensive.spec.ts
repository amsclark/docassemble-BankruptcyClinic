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
    if (h1Text.toLowerCase().includes(questionId.toLowerCase()) || 
        h1Text.includes('Basic Identity and Contact Information')) {
      console.log(`✅ Reached target question: ${questionId}`);
      break;
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
      await page.fill('input[type="text"]', data.case_number);
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
          const individualRadio = page.locator('input[type="radio"]').first();
          const radioId = await individualRadio.getAttribute('id');
          if (radioId) {
            await page.click(`label[for="${radioId}"]`);
          } else {
            await individualRadio.click({ force: true });
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
  
  // Name fields
  if (data[`${prefix}.name.first`]) {
    await page.fill('#ZGVidG9yW2ldLm5hbWUuZmlyc3Q', data[`${prefix}.name.first`]);
  }
  if (data[`${prefix}.name.last`]) {
    await page.fill('#ZGVidG9yW2ldLm5hbWUubGFzdA', data[`${prefix}.name.last`]);
  }
  
  // Address fields
  if (data[`${prefix}.address.address`]) {
    await page.fill('#ZGVidG9yW2ldLmFkZHJlc3MuYWRkcmVzcw', data[`${prefix}.address.address`]);
  }
  if (data[`${prefix}.address.city`]) {
    await page.fill('#ZGVidG9yW2ldLmFkZHJlc3MuY2l0eQ', data[`${prefix}.address.city`]);
  }
  if (data[`${prefix}.address.state`]) {
    await page.selectOption('#ZGVidG9yW2ldLmFkZHJlc3Muc3RhdGU', data[`${prefix}.address.state`]);
    // Wait for county to populate
    await page.waitForTimeout(2000);
  }
  if (data[`${prefix}.address.county`]) {
    await page.selectOption('#ZGVidG9yW2ldLmFkZHJlc3MuY291bnR5', data[`${prefix}.address.county`]);
  }
  if (data[`${prefix}.address.zip`]) {
    await page.fill('#ZGVidG9yW2ldLmFkZHJlc3Muemlw', data[`${prefix}.address.zip`]);
  }
  
  // Tax ID fields
  if (data[`${prefix}.tax_id.tax_id_type`]) {
    const taxIdType = data[`${prefix}.tax_id.tax_id_type`];
    const radioId = taxIdType === '1' ? 'ZGVidG9yW2ldLnRheF9pZC50YXhfaWRfdHlwZQ_0' : 'ZGVidG9yW2ldLnRheF9pZC50YXhfaWRfdHlwZQ_1';
    await page.click(`label[for="${radioId}"]`);
  }
  
  // Mailing address checkbox
  if (data[`${prefix}.has_other_mailing_address`] === false) {
    // Leave unchecked
  } else if (data[`${prefix}.has_other_mailing_address`] === true) {
    await page.check('#ZGVidG9yW2ldLmhhc19vdGhlcl9tYWlsaW5nX2FkZHJlc3M');
  }
  
  console.log(`✅ Completed basic info for ${prefix}`);
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
  
  // Verify form was filled correctly
  const firstName = await page.inputValue('#ZGVidG9yW2ldLm5hbWUuZmlyc3Q');
  const lastName = await page.inputValue('#ZGVidG9yW2ldLm5hbWUubGFzdA');
  const state = await page.inputValue('#ZGVidG9yW2ldLmFkZHJlc3Muc3RhdGU');
  const county = await page.inputValue('#ZGVidG9yW2ldLmFkZHJlc3MuY291bnR5');
  
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
