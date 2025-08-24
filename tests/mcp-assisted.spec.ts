import { test, expect } from '@playwright/test';
import { McpAssistant } from './mcp-assistant';

/**
 * MCP-Assisted End-to-End Test
 * 
 * This test uses AI assistance to navigate through the bankruptcy interview
 * by analyzing page structure and making intelligent decisions about
 * form filling and navigation.
 */
test('MCP-assisted full interview flow', async ({ page }) => {
  const mcp = new McpAssistant(page);
  
  console.log('🚀 Starting MCP-assisted interview test');
  
  // Start the interview
  await page.goto('https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
  await page.waitForLoadState('networkidle');
  
  // Step 1: Introduction page
  await mcp.captureState('01-introduction.png');
  let suggestion = await mcp.suggestNextStep();
  expect(suggestion).toBe('click_continue');
  
  await mcp.clickButton();
  await page.waitForLoadState('networkidle');
  
  // Step 2: District selection
  await mcp.captureState('02-district-selection.png');
  await mcp.selectOption('district', 'District of Nebraska');
  await mcp.clickButton();
  await page.waitForLoadState('networkidle');
  
  // Step 3: Amended filing
  await mcp.captureState('03-amended-filing.png');
  
  // Handle radio button selection for amended filing
  const analysis = await mcp.analyzePage();
  console.log('Looking for amended filing radio buttons...');
  
  // Click "No" or "False" for amended filing
  const radioButtons = page.locator('input[type="radio"]');
  const noRadio = page.locator('input[type="radio"][value="False"]');
  
  if (await noRadio.count() > 0) {
    await noRadio.click();
    console.log('Selected "No" for amended filing');
  } else {
    // Fallback to first radio button
    await radioButtons.first().click();
    console.log('Selected first radio button option');
  }
  
  await mcp.clickButton();
  await page.waitForLoadState('networkidle');
  
  // Step 4: Confirm district
  await mcp.captureState('04-confirm-district.png');
  await mcp.clickButton();
  await page.waitForLoadState('networkidle');
  
  // Step 5: Filing status
  await mcp.captureState('05-filing-status.png');
  
  // Select individual filing
  const filingRadios = page.locator('input[type="radio"]');
  const individualRadio = page.locator('input[type="radio"][value="Filing individually"]');
  
  if (await individualRadio.count() > 0) {
    await individualRadio.click();
    console.log('Selected "Filing individually"');
  } else {
    await filingRadios.first().click();
    console.log('Selected first filing status option');
  }
  
  await mcp.clickButton();
  await page.waitForLoadState('networkidle');
  
  // Step 6: Basic Identity and Contact Information
  await mcp.captureState('06-debtor-basic-info.png');
  
  // Use MCP to intelligently fill the form
  await mcp.fillField('first', 'John');
  await mcp.fillField('last', 'Doe');
  await mcp.fillField('address', '123 Main Street');
  await mcp.fillField('city', 'Omaha');
  
  // Select state and wait for county to populate
  await mcp.selectOption('state', 'Nebraska');
  await page.waitForTimeout(2000); // Wait for county dropdown to update
  
  await mcp.captureState('06b-state-selected.png');
  
  // Select county
  await mcp.selectOption('county', 'Douglas County');
  
  await mcp.fillField('zip', '68102');
  
  await mcp.captureState('06c-form-filled.png');
  
  // Verify county dropdown populated correctly
  const countySelect = page.locator('select[name*="address.county"]');
  const selectedCounty = await countySelect.inputValue();
  expect(selectedCounty).toBe('Douglas County');
  
  console.log('✅ County dropdown test passed - Douglas County selected');
  
  await mcp.clickButton();
  await page.waitForLoadState('networkidle');
  
  // Step 7: Continue to next section and verify progress
  await mcp.captureState('07-next-section.png');
  const finalAnalysis = await mcp.analyzePage();
  
  console.log('🎉 MCP-assisted test completed successfully!');
  console.log(`Final page: ${finalAnalysis.h1Text}`);
  
  // The test should have progressed beyond the basic info section
  expect(finalAnalysis.h1Text).not.toContain('Basic Identity and Contact Information');
});

test('MCP county dropdown debugging', async ({ page }) => {
  const mcp = new McpAssistant(page);
  
  console.log('🔍 Testing county dropdown functionality with MCP assistance');
  
  // Navigate to debtor basic info page
  await page.goto('https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
  await page.waitForLoadState('networkidle');
  
  // Navigate through to debtor info (simplified)
  await page.click('button[type="submit"]'); // Continue
  await page.waitForLoadState('networkidle');
  
  const districtSelect = page.locator('select').first();
  await districtSelect.selectOption('District of Nebraska');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  // Skip amended (click first radio)
  const amendedRadio = page.locator('input[type="radio"]').first();
  await amendedRadio.click();
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  await page.click('button[type="submit"]'); // Confirm district
  await page.waitForLoadState('networkidle');
  
  // Filing status
  const filingRadio = page.locator('input[type="radio"]').first();
  await filingRadio.click();
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  // Now on debtor basic info
  await mcp.captureState('debug-01-before-state.png');
  
  // Check initial county dropdown state
  const initialAnalysis = await mcp.analyzePage();
  console.log('County dropdown before state selection:');
  const countyDropdown = initialAnalysis.selects.find(s => s.name.includes('county') || s.label.toLowerCase().includes('county'));
  if (countyDropdown) {
    console.log(`Options: [${countyDropdown.options.join(', ')}]`);
    expect(countyDropdown.options).toContain('N/A');
  }
  
  // Fill minimal required fields
  await mcp.fillField('first', 'Test');
  await mcp.fillField('last', 'User');
  await mcp.fillField('address', '123 Test St');
  await mcp.fillField('city', 'Omaha');
  
  // Select state
  console.log('🔄 Selecting Nebraska state...');
  await mcp.selectOption('state', 'Nebraska');
  
  // Wait for county update
  await page.waitForTimeout(3000);
  
  await mcp.captureState('debug-02-after-state.png');
  
  // Check county dropdown after state selection
  const updatedAnalysis = await mcp.analyzePage();
  const updatedCountyDropdown = updatedAnalysis.selects.find(s => s.name.includes('county') || s.label.toLowerCase().includes('county'));
  
  if (updatedCountyDropdown) {
    console.log('County dropdown after state selection:');
    console.log(`Options: [${updatedCountyDropdown.options.join(', ')}]`);
    
    // Should have Nebraska counties now
    expect(updatedCountyDropdown.options.length).toBeGreaterThan(1);
    expect(updatedCountyDropdown.options).toContain('Douglas County');
    
    // Select Douglas County
    await mcp.selectOption('county', 'Douglas County');
    await mcp.captureState('debug-03-county-selected.png');
    
    console.log('✅ County dropdown populated and selection successful!');
  } else {
    console.error('❌ County dropdown not found in updated analysis');
    throw new Error('County dropdown not found');
  }
});
