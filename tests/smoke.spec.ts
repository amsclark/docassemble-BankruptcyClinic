import { test, expect } from '@playwright/test';

// Helper function to navigate through common interview steps
async function navigateToPage(page: any, targetPage: string) {
  await page.goto('https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
  await page.waitForLoadState('networkidle');
  
  if (targetPage === 'introduction') return;
  
  // Continue through introduction
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  if (targetPage === 'district') return;
  
  // Select district
  await page.waitForSelector('select');
  const districtSelect = page.locator('select').first();
  await districtSelect.selectOption('District of Nebraska');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  if (targetPage === 'amended') return;
  
  // Handle amended filing page - look for radio buttons more flexibly
  const radioButtons = page.locator('input[type="radio"]');
  const radioCount = await radioButtons.count();
  
  if (radioCount > 0) {
    // Try to find "False" or "No" option, fallback to first radio
    let selectedRadio = radioButtons.filter({ hasValue: 'False' }).first();
    if (await selectedRadio.count() === 0) {
      selectedRadio = radioButtons.first();
    }
    await selectedRadio.click();
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  }
  
  if (targetPage === 'district-final') return;
  
  // Confirm district
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  if (targetPage === 'filing-status') return;
  
  // Filing status - individual
  const filingRadios = page.locator('input[type="radio"]');
  const individualRadio = filingRadios.filter({ hasValue: 'Filing individually' }).first();
  if (await individualRadio.count() > 0) {
    await individualRadio.click();
  } else {
    await filingRadios.first().click();
  }
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

test('docassemble interview loads', async ({ page }) => {
  await navigateToPage(page, 'introduction');
  
  // Verify we're on the right page
  await expect(page.locator('h1#daMainQuestion')).toContainText('Voluntary Petition for Individuals Filing for Bankruptcy');
  
  // Take a screenshot for reference
  await page.screenshot({ path: 'test-results/interview-loaded.png', fullPage: true });
});

test('can navigate to debtor basic info', async ({ page }) => {
  await navigateToPage(page, 'debtor-basic-info');
  
  // Should now be on debtor basic info
  await expect(page.locator('h1#daMainQuestion')).toContainText('Basic Identity and Contact Information');
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/debtor-basic-info.png', fullPage: true });
});

test('county dropdown populates when state is selected', async ({ page }) => {
  await navigateToPage(page, 'debtor-basic-info');
  
  // Fill in basic info first
  await page.fill('input[name*="name.first"]', 'Test');
  await page.fill('input[name*="name.last"]', 'User');
  await page.fill('input[name*="address.address"]', '123 Test St');
  await page.fill('input[name*="address.city"]', 'Omaha');
  
  // Select state
  const stateSelect = page.locator('select[name*="address.state"]');
  await stateSelect.selectOption('Nebraska');
  
  // Wait a moment for county to update
  await page.waitForTimeout(2000);
  
  // Check that county dropdown has options
  const countySelect = page.locator('select[name*="address.county"]');
  const options = await countySelect.locator('option').count();
  expect(options).toBeGreaterThan(1); // Should have more than just N/A
  
  // Should be able to select Douglas County
  await countySelect.selectOption('Douglas County');
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/county-populated.png', fullPage: true });
});
