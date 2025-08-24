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
    if (h1Text.includes('district') && h1Text.toLowerCase().includes('filing')) {
      if (data.current_district) {
        const districtSelect = page.locator('select').first();
        await districtSelect.selectOption(data.current_district);
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
        currentStep++;
        continue;
      }
    }
    
    // Handle amended filing question
    if (h1Text.includes('updating a bankruptcy filing')) {
      const amendedValue = data.amended_filing;
      if (amendedValue === false) {
        // Select "No" for non-amended
        const noRadio = page.locator('input[type="radio"]').first();
        await noRadio.click({ force: true });
      } else if (amendedValue === true) {
        // Select "Yes" for amended
        const yesRadio = page.locator('input[type="radio"]').nth(1);
        await yesRadio.click({ force: true });
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
    if (h1Text.includes('filing individually or with a spouse')) {
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
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      currentStep++;
      continue;
    }
    
    // Handle basic info form
    if (h1Text.includes('Basic Identity and Contact Information')) {
      await fillBasicInfoForm(page, data, 0); // First debtor
      
      // If joint filing, handle second debtor
      if (data.filing_status === 'Filing with spouse' && data['debtor[1].name.first']) {
        // Continue to next debtor or handle second debtor form
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
        
        const nextH1 = await page.locator('h1#daMainQuestion').textContent() || '';
        if (nextH1.includes('Basic Identity and Contact Information')) {
          await fillBasicInfoForm(page, data, 1); // Second debtor
        }
      }
      
      console.log('✅ Completed basic info form');
      return;
    }
    
    // Generic handler - try to continue with first radio button or continue button
    const radioCount = await page.locator('input[type="radio"]').count();
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
