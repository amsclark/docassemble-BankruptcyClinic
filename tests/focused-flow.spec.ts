import { test, expect } from '@playwright/test';

test('Complete voluntary petition flow - Nebraska Chapter 7 Individual', async ({ page }) => {
  console.log('🚀 Starting focused voluntary petition test');
  
  // Step 1: Start at introduction
  await page.goto('https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
  await page.waitForLoadState('networkidle');
  
  const introH1 = await page.locator('h1#daMainQuestion').textContent();
  console.log(`✓ Introduction page: ${introH1}`);
  expect(introH1).toContain('Voluntary Petition for Individuals Filing for Bankruptcy');
  
  await page.screenshot({ path: 'test-results/focused-01-intro.png', fullPage: true });
  
  // Step 2: Continue from introduction
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  const districtH1 = await page.locator('h1#daMainQuestion').textContent();
  console.log(`✓ District page: ${districtH1}`);
  await page.screenshot({ path: 'test-results/focused-02-district.png', fullPage: true });
  
  // Step 3: Select District of Nebraska
  const districtSelect = page.locator('select').first();
  await districtSelect.selectOption('District of Nebraska');
  console.log('✓ Selected District of Nebraska');
  
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  // Step 4: Handle next page after district selection
  const nextPageH1 = await page.locator('h1#daMainQuestion').textContent();
  console.log(`✓ After district selection: ${nextPageH1}`);
  await page.screenshot({ path: 'test-results/focused-03-after-district.png', fullPage: true });
  
  // Check what elements are available on this page
  const radioCount = await page.locator('input[type="radio"]').count();
  const selectCount = await page.locator('select').count();
  const buttonCount = await page.locator('button[type="submit"]').count();
  
  console.log(`Page has: ${radioCount} radios, ${selectCount} selects, ${buttonCount} buttons`);
  
  // If there are radio buttons, handle them
  if (radioCount > 0) {
    const radioButtons = await page.locator('input[type="radio"]').all();
    console.log(`Found ${radioButtons.length} radio buttons`);
    
    for (let i = 0; i < radioButtons.length; i++) {
      const value = await radioButtons[i].getAttribute('value');
      const name = await radioButtons[i].getAttribute('name');
      console.log(`Radio ${i}: name="${name}" value="${value}"`);
    }
    
    // Click the first radio button (usually the default/recommended choice)
    await radioButtons[0].click();
    console.log('✓ Selected first radio option');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  } else if (selectCount > 0) {
    // If there are more selects, handle them
    console.log('Additional select found, continuing...');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  } else if (buttonCount > 0) {
    // Just continue if there's only a button
    console.log('Only button found, continuing...');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  }
  
  // Continue through any additional pages until we reach basic info
  let stepCounter = 4;
  let maxSteps = 10; // Prevent infinite loops
  
  while (stepCounter < maxSteps) {
    const currentH1 = await page.locator('h1#daMainQuestion').textContent();
    console.log(`Step ${stepCounter}: ${currentH1}`);
    
    // Check if we've reached the basic info page
    if (currentH1?.includes('Basic Identity') || currentH1?.includes('Contact Information')) {
      console.log('✅ Reached basic info page!');
      break;
    }
    
    await page.screenshot({ path: `test-results/focused-${stepCounter.toString().padStart(2, '0')}-step.png`, fullPage: true });
    
    // Handle different page types
    const radios = await page.locator('input[type="radio"]').count();
    const selects = await page.locator('select').count();
    
    console.log(`Step ${stepCounter} has: ${radios} radios, ${selects} selects`);
    
    if (radios > 0) {
      // Click first radio and continue - handle custom radio styling
      const radioButtons = await page.locator('input[type="radio"]').all();
      
      // Try to click the first radio button or its label
      const firstRadio = radioButtons[0];
      const radioId = await firstRadio.getAttribute('id');
      const radioValue = await firstRadio.getAttribute('value');
      console.log(`Attempting to click radio: id="${radioId}" value="${radioValue}"`);
      
      // Try multiple approaches for custom-styled radios
      try {
        // Method 1: Click the label associated with the radio
        if (radioId) {
          const label = page.locator(`label[for="${radioId}"]`);
          if (await label.count() > 0) {
            await label.click();
            console.log(`✓ Step ${stepCounter}: Clicked label for radio`);
          } else {
            throw new Error('No label found');
          }
        } else {
          throw new Error('No radio ID found');
        }
      } catch (e) {
        try {
          // Method 2: Force click the radio even if hidden
          await firstRadio.click({ force: true });
          console.log(`✓ Step ${stepCounter}: Force clicked radio`);
        } catch (e2) {
          // Method 3: Click parent container
          const radioContainer = page.locator('input[type="radio"]').first().locator('..');
          await radioContainer.click();
          console.log(`✓ Step ${stepCounter}: Clicked radio container`);
        }
      }
    }
    
    // Always try to continue
    const submitButtons = await page.locator('button[type="submit"]').count();
    if (submitButtons > 0) {
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    } else {
      console.log(`Step ${stepCounter}: No submit button found, stopping`);
      break;
    }
    
    stepCounter++;
  }
  
  // Now we should be at the basic info page
  const basicInfoH1 = await page.locator('h1#daMainQuestion').textContent();
  console.log(`✓ Final page: ${basicInfoH1}`);
  await page.screenshot({ path: 'test-results/focused-07-basic-info.png', fullPage: true });
  
  expect(basicInfoH1).toContain('Basic Identity and Contact Information');
  
  // Fill out the basic information form using exact field names from debug
  console.log('📝 Filling out basic information...');
  
  // First name - use the exact ID from debug
  await page.fill('#ZGVidG9yW2ldLm5hbWUuZmlyc3Q', 'John');
  console.log('✓ Filled first name');
  
  // Last name  
  await page.fill('#ZGVidG9yW2ldLm5hbWUubGFzdA', 'Doe');
  console.log('✓ Filled last name');
  
  // Address
  await page.fill('#ZGVidG9yW2ldLmFkZHJlc3MuYWRkcmVzcw', '123 Main Street');
  console.log('✓ Filled address');
  
  // City
  await page.fill('#ZGVidG9yW2ldLmFkZHJlc3MuY2l0eQ', 'Omaha');
  console.log('✓ Filled city');
  
  // State - this should trigger county population
  await page.selectOption('#ZGVidG9yW2ldLmFkZHJlc3Muc3RhdGU', 'Nebraska');
  console.log('✓ Selected Nebraska state');
  
  // Wait for county dropdown to populate
  console.log('⏳ Waiting for county dropdown to populate...');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'test-results/focused-08-state-selected.png', fullPage: true });
  
  // Check county dropdown
  const countySelect = page.locator('#ZGVidG9yW2ldLmFkZHJlc3MuY291bnR5');
  const countyOptions = await countySelect.locator('option').allTextContents();
  console.log(`County options: ${countyOptions.join(', ')}`);
  
  expect(countyOptions.length).toBeGreaterThan(1); // Should have more than just N/A
  expect(countyOptions).toContain('Douglas County');
  
  // Select Douglas County (where Omaha is located)
  await page.selectOption('#ZGVidG9yW2ldLmFkZHJlc3MuY291bnR5', 'Douglas County');
  console.log('✓ Selected Douglas County');
  
  // Zip code
  await page.fill('#ZGVidG9yW2ldLmFkZHJlc3Muemlw', '68102');
  console.log('✓ Filled zip code');
  
  // Handle the Tax ID type radio button (SSN)
  const ssnRadioId = 'ZGVidG9yW2ldLnRheF9pZC50YXhfaWRfdHlwZQ_0'; // SSN option
  const ssnLabel = page.locator(`label[for="${ssnRadioId}"]`);
  await ssnLabel.click();
  console.log('✓ Selected Social Security Number option');
  
  await page.screenshot({ path: 'test-results/focused-09-form-complete.png', fullPage: true });
  
  // Verify form is filled correctly
  const firstNameValue = await page.inputValue('#ZGVidG9yW2ldLm5hbWUuZmlyc3Q');
  const lastNameValue = await page.inputValue('#ZGVidG9yW2ldLm5hbWUubGFzdA');
  const stateValue = await page.inputValue('#ZGVidG9yW2ldLmFkZHJlc3Muc3RhdGU');
  const countyValue = await page.inputValue('#ZGVidG9yW2ldLmFkZHJlc3MuY291bnR5');
  
  expect(firstNameValue).toBe('John');
  expect(lastNameValue).toBe('Doe');
  expect(stateValue).toBe('Nebraska');
  expect(countyValue).toBe('Douglas County');
  
  console.log('🎉 Test completed successfully!');
  console.log('✅ Verified county dropdown populated correctly when state was selected');
  
  // Continue to next page to confirm form submission works
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  const finalPageH1 = await page.locator('h1#daMainQuestion').textContent();
  console.log(`✓ Successfully advanced to: ${finalPageH1}`);
  await page.screenshot({ path: 'test-results/focused-10-next-page.png', fullPage: true });
  
  // The test should not be on the same page (form should have been accepted)
  expect(finalPageH1).not.toContain('Basic Identity and Contact Information');
});
