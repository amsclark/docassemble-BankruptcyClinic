import { test, expect } from '@playwright/test';
import { McpAssistant } from './mcp-assistant';

test.describe('Debug Radio Buttons', () => {
  test.setTimeout(60000);

  test('analyze radio button structure on updating bankruptcy page', async ({ page }) => {
    console.log('🔍 Starting radio button analysis');
    
    const assistant = new McpAssistant(page);
    
    // Start the interview
    await page.goto('/interview?i=docassemble.BankruptcyClinic%3Adata%2Fquestions%2Fvoluntary-petition.yml');
    
    // Navigate through a few pages to get to the radio button question
    console.log('📄 Step 1: Initial page');
    await assistant.suggestNextStep();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForLoadState('networkidle');
    
    console.log('📄 Step 2: District selection');
    await assistant.suggestNextStep();
    // Fill in any required field to continue
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForLoadState('networkidle');
    
    console.log('📄 Step 3: Radio button page - ANALYZING IN DETAIL');
    
    // First, get the full page analysis
    const analysis = await assistant.analyzePage();
    console.log('\n=== FULL PAGE ANALYSIS ===');
    console.log('URL:', analysis.url);
    console.log('Title:', analysis.h1Text);
    console.log('Radio Groups:', JSON.stringify(analysis.radioGroups, null, 2));
    console.log('All Form Fields:', JSON.stringify(analysis.formFields, null, 2));
    console.log('All Buttons:', JSON.stringify(analysis.buttons, null, 2));
    
    // Now get the raw HTML structure for radio buttons
    const radioHtml = await page.evaluate(() => {
      const radios = document.querySelectorAll('input[type="radio"]');
      const radioData: any[] = [];
      
      radios.forEach((radio, index) => {
        const element = radio as HTMLInputElement;
        const parent = element.parentElement;
        const grandparent = parent?.parentElement;
        
        // Get surrounding context
        const surrounding = element.closest('div, fieldset, form, label');
        
        radioData.push({
          index,
          id: element.id,
          name: element.name,
          value: element.value,
          checked: element.checked,
          disabled: element.disabled,
          parentTag: parent?.tagName,
          parentClass: parent?.className,
          parentText: parent?.textContent?.trim().substring(0, 100),
          grandparentTag: grandparent?.tagName,
          grandparentClass: grandparent?.className,
          surroundingTag: surrounding?.tagName,
          surroundingClass: surrounding?.className,
          surroundingText: surrounding?.textContent?.trim().substring(0, 200),
          htmlContext: element.outerHTML
        });
      });
      
      return radioData;
    });
    
    console.log('\n=== RAW RADIO BUTTON HTML ANALYSIS ===');
    radioHtml.forEach((radio, i) => {
      console.log(`\nRadio ${i + 1}:`);
      console.log(`  ID: ${radio.id}`);
      console.log(`  Name: ${radio.name}`);
      console.log(`  Value: ${radio.value}`);
      console.log(`  Parent: ${radio.parentTag}.${radio.parentClass}`);
      console.log(`  Parent text: ${radio.parentText}`);
      console.log(`  HTML: ${radio.htmlContext}`);
    });
    
    // Try different selection strategies
    console.log('\n=== TESTING SELECTION STRATEGIES ===');
    
    try {
      console.log('Strategy 1: Looking for visible radio buttons');
      const visibleRadios = await page.locator('input[type="radio"]:visible').count();
      console.log(`Found ${visibleRadios} visible radio buttons`);
      
      if (visibleRadios > 0) {
        // Try to select each one
        for (let i = 0; i < visibleRadios; i++) {
          const radio = page.locator('input[type="radio"]:visible').nth(i);
          const radioData = await radio.evaluate((el: HTMLInputElement) => ({
            value: el.value,
            name: el.name,
            id: el.id,
            parentText: el.parentElement?.textContent?.trim()
          }));
          console.log(`  Radio ${i}: ${JSON.stringify(radioData)}`);
          
          // Try to click it
          try {
            await radio.click({ timeout: 5000 });
            console.log(`  ✅ Successfully clicked radio ${i}`);
            await page.waitForTimeout(1000);
          } catch (e) {
            console.log(`  ❌ Failed to click radio ${i}: ${e}`);
          }
        }
      }
    } catch (e) {
      console.log(`Strategy 1 failed: ${e}`);
    }
    
    try {
      console.log('\nStrategy 2: getByRole approach');
      const radiosByRole = await page.getByRole('radio').count();
      console.log(`Found ${radiosByRole} radios by role`);
      
      if (radiosByRole > 0) {
        for (let i = 0; i < radiosByRole; i++) {
          const radio = page.getByRole('radio').nth(i);
          try {
            const isVisible = await radio.isVisible();
            console.log(`  Radio ${i} visible: ${isVisible}`);
            if (isVisible) {
              await radio.click({ timeout: 5000 });
              console.log(`  ✅ Successfully clicked radio ${i} via role`);
              await page.waitForTimeout(1000);
            }
          } catch (e) {
            console.log(`  ❌ Failed to click radio ${i} via role: ${e}`);
          }
        }
      }
    } catch (e) {
      console.log(`Strategy 2 failed: ${e}`);
    }
    
    // Take a screenshot for visual debugging
    await page.screenshot({ path: 'test-results/radio-debug-analysis.png', fullPage: true });
    console.log('📸 Screenshot saved: test-results/radio-debug-analysis.png');
    
    // Save the page HTML for inspection
    const html = await page.content();
    require('fs').writeFileSync('test-results/radio-debug-page.html', html);
    console.log('💾 HTML saved: test-results/radio-debug-page.html');
    
    console.log('\n🔍 Radio button analysis complete');
  });
});
