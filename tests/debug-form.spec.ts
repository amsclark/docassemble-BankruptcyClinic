import { test, expect } from '@playwright/test';

test('Debug basic info form fields', async ({ page }) => {
  console.log('🔍 Debugging basic info form fields...');
  
  // Navigate through the flow quickly to reach basic info
  await page.goto('https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
  await page.waitForLoadState('networkidle');
  
  // Navigate through flow (simplified)
  await page.click('button[type="submit"]'); // Introduction
  await page.waitForLoadState('networkidle');
  
  await page.selectOption('select', 'District of Nebraska'); // District
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  // Keep clicking continue/first radio until we reach basic info
  for (let i = 0; i < 10; i++) {
    const h1Text = await page.locator('h1#daMainQuestion').textContent();
    console.log(`Step ${i}: ${h1Text}`);
    
    if (h1Text?.includes('Basic Identity') || h1Text?.includes('Contact Information')) {
      console.log('✅ Reached basic info page!');
      break;
    }
    
    // Handle radios
    const radios = await page.locator('input[type="radio"]').count();
    if (radios > 0) {
      const firstRadio = page.locator('input[type="radio"]').first();
      const radioId = await firstRadio.getAttribute('id');
      
      if (radioId) {
        const label = page.locator(`label[for="${radioId}"]`);
        if (await label.count() > 0) {
          await label.click();
        } else {
          await firstRadio.click({ force: true });
        }
      }
    }
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  }
  
  // Now analyze the basic info form
  await page.screenshot({ path: 'test-results/debug-basic-info-form.png', fullPage: true });
  
  // Get all form elements
  const formInfo = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
    return inputs.map(input => ({
      tagName: input.tagName,
      type: (input as HTMLInputElement).type || 'N/A',
      name: (input as HTMLInputElement).name || '',
      id: input.id || '',
      placeholder: (input as HTMLInputElement).placeholder || '',
      className: input.className || '',
      // Get associated label
      label: input.id ? document.querySelector(`label[for="${input.id}"]`)?.textContent?.trim() || 'No label' : 'No ID'
    }));
  });
  
  console.log('=== FORM FIELDS ANALYSIS ===');
  formInfo.forEach((field, index) => {
    console.log(`Field ${index}:`);
    console.log(`  Tag: ${field.tagName}`);
    console.log(`  Type: ${field.type}`);
    console.log(`  Name: ${field.name}`);
    console.log(`  ID: ${field.id}`);
    console.log(`  Placeholder: ${field.placeholder}`);
    console.log(`  Label: ${field.label}`);
    console.log(`  Class: ${field.className}`);
    console.log('---');
  });
  
  // Try to identify name fields specifically
  const nameFields = formInfo.filter(field => 
    field.label.toLowerCase().includes('name') ||
    field.placeholder.toLowerCase().includes('name') ||
    field.name.toLowerCase().includes('name') ||
    field.id.toLowerCase().includes('name')
  );
  
  console.log('=== NAME FIELDS IDENTIFIED ===');
  nameFields.forEach((field, index) => {
    console.log(`Name field ${index}: ${field.label} (name: ${field.name}, id: ${field.id})`);
  });
});
