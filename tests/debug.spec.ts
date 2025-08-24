import { test, expect } from '@playwright/test';

test('debug page structure', async ({ page }) => {
  // Navigate to interview
  await page.goto('https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
  await page.waitForLoadState('networkidle');
  
  // Continue through introduction
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot and inspect district page
  await page.screenshot({ path: 'test-results/debug-district-page.png', fullPage: true });
  
  // Log all form elements
  console.log('=== District Page Form Elements ===');
  const selects = await page.locator('select').all();
  for (let i = 0; i < selects.length; i++) {
    const select = selects[i];
    const name = await select.getAttribute('name');
    const id = await select.getAttribute('id');
    console.log(`Select ${i}: name="${name}" id="${id}"`);
    
    const options = await select.locator('option').all();
    for (let j = 0; j < options.length; j++) {
      const value = await options[j].getAttribute('value');
      const text = await options[j].textContent();
      console.log(`  Option ${j}: value="${value}" text="${text}"`);
    }
  }
  
  // Try to select district
  await page.selectOption('select', 'District of Nebraska');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot of next page
  await page.screenshot({ path: 'test-results/debug-amended-page.png', fullPage: true });
  
  // Log radio buttons
  console.log('=== Amended Page Radio Elements ===');
  const radios = await page.locator('input[type="radio"]').all();
  for (let i = 0; i < radios.length; i++) {
    const radio = radios[i];
    const name = await radio.getAttribute('name');
    const value = await radio.getAttribute('value');
    const id = await radio.getAttribute('id');
    console.log(`Radio ${i}: name="${name}" value="${value}" id="${id}"`);
  }
  
  // Try to continue
  const falseRadio = page.locator('input[type="radio"]').filter({ hasText: 'False' }).or(
    page.locator('input[type="radio"][value*="False"]')
  ).or(
    page.locator('input[type="radio"]').first()
  );
  
  if (await falseRadio.count() > 0) {
    await falseRadio.first().click();
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/debug-after-amended.png', fullPage: true });
  }
});
