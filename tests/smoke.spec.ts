import { test, expect } from '@playwright/test';

// Simple smoke test to verify the interview loads
test('docassemble interview loads', async ({ page }) => {
  // Navigate to the interview
  await page.goto('https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Verify we're on the right page - use more specific selector
  await expect(page.locator('h1#daMainQuestion')).toContainText('Voluntary Petition for Individuals Filing for Bankruptcy');
  
  // Take a screenshot for reference
  await page.screenshot({ path: 'test-results/interview-loaded.png', fullPage: true });
});

test('can navigate to debtor basic info', async ({ page }) => {
  // Navigate to interview
  await page.goto('https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
  await page.waitForLoadState('networkidle');
  
  // Continue through introduction
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  // Wait for district selection page and take screenshot
  await page.waitForSelector('select', { timeout: 10000 });
  await page.screenshot({ path: 'test-results/district-selection.png', fullPage: true });
  
  // Find the district dropdown - might have different name
  const districtSelect = page.locator('select').first();
  await districtSelect.selectOption('District of Nebraska');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  // Amended filing - select No
  await page.click('input[value="False"]');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  // Confirm district
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  // Filing status - individual
  await page.click('input[value="Filing individually"]');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  // Should now be on debtor basic info
  await expect(page.locator('h1#daMainQuestion')).toContainText('Basic Identity and Contact Information');
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/debtor-basic-info.png', fullPage: true });
});
