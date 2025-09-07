import { test, expect } from '@playwright/test';
import { McpAssistant } from './mcp-assistant';

test.describe('Debug Property Page', () => {
  test.setTimeout(120000);

  test('debug the property description page that causes errors', async ({ page }) => {
    console.log('🔍 Starting property page debug');
    
    const assistant = new McpAssistant(page);
    
    // Use a session ID to isolate our test
    const sessionId = `debug-${Date.now()}-property`;
    
    // Start the interview with session isolation
    await page.goto(`/interview?i=docassemble.BankruptcyClinic%3Adata%2Fquestions%2Fvoluntary-petition.yml&session=${sessionId}`);
    
    // Navigate quickly to the property page by using the same strategy as working-flow
    console.log('🚀 Quick navigation to property page...');
    
    let stepCount = 0;
    const maxSteps = 50;
    
    while (stepCount < maxSteps) {
      stepCount++;
      const analysis = await assistant.analyzePage();
      
      console.log(`📍 Step ${stepCount}: ${analysis.h1Text.substring(0, 50)}...`);
      
      // Check if we've reached the problematic property page
      if (analysis.h1Text.toLowerCase().includes('describe all property') || 
          analysis.h1Text.toLowerCase().includes('property you haven')) {
        console.log('🎯 FOUND THE PROBLEMATIC PAGE!');
        console.log(`Full title: "${analysis.h1Text}"`);
        console.log(`URL: ${page.url()}`);
        
        // Take detailed analysis
        console.log('\n=== DETAILED PAGE ANALYSIS ===');
        console.log('Form Fields:', JSON.stringify(analysis.formFields, null, 2));
        console.log('Buttons:', JSON.stringify(analysis.buttons, null, 2));
        console.log('Radio Groups:', JSON.stringify(analysis.radioGroups, null, 2));
        console.log('Errors:', JSON.stringify(analysis.errors, null, 2));
        
        // Get the raw HTML structure for debugging
        const pageContent = await page.evaluate(() => {
          return {
            html: document.documentElement.outerHTML,
            forms: Array.from(document.forms).map(form => ({
              action: form.action,
              method: form.method,
              elements: Array.from(form.elements).map(el => ({
                name: el.getAttribute('name'),
                type: el.getAttribute('type'),
                value: (el as any).value,
                required: el.hasAttribute('required')
              }))
            }))
          };
        });
        
        // Save HTML for inspection
        require('fs').writeFileSync('test-results/property-page-debug.html', pageContent.html);
        console.log('💾 HTML saved: test-results/property-page-debug.html');
        
        console.log('\nForm structure:', JSON.stringify(pageContent.forms, null, 2));
        
        // Take a screenshot
        await page.screenshot({ path: 'test-results/property-page-debug.png', fullPage: true });
        console.log('📸 Screenshot saved: test-results/property-page-debug.png');
        
        // Now try different strategies to handle this page
        console.log('\n=== TESTING DIFFERENT HANDLING STRATEGIES ===');
        
        // Strategy 1: Just click Continue (current approach)
        console.log('Strategy 1: Direct Continue click');
        try {
          const continueBtn = page.getByRole('button', { name: 'Continue' });
          if (await continueBtn.isVisible()) {
            console.log('Continue button is visible, clicking...');
            await continueBtn.click();
            await page.waitForLoadState('networkidle', { timeout: 10000 });
            
            // Check what happens next
            const nextAnalysis = await assistant.analyzePage();
            console.log(`Next page: "${nextAnalysis.h1Text}"`);
            
            if (nextAnalysis.h1Text === 'No H1 found' || nextAnalysis.errors.length > 0) {
              console.log('❌ Strategy 1 failed - server error occurred');
              console.log('Errors:', nextAnalysis.errors);
            } else {
              console.log('✅ Strategy 1 worked!');
            }
          }
        } catch (e) {
          console.log(`❌ Strategy 1 failed: ${e}`);
        }
        
        break;
      }
      
      // Quick navigation logic (simplified)
      const continueButton = analysis.buttons.find((btn: any) => 
        btn.text.toLowerCase().includes('continue') ||
        btn.text.toLowerCase().includes('next') ||
        btn.text.toLowerCase().includes('submit')
      );
      
      if (continueButton) {
        try {
          await page.getByRole('button', { name: continueButton.text }).click();
          await page.waitForLoadState('networkidle', { timeout: 10000 });
        } catch (e) {
          console.log(`Navigation failed at step ${stepCount}: ${e}`);
          break;
        }
      } else {
        // Try any button as fallback
        const anyButton = page.locator('button').first();
        if (await anyButton.isVisible()) {
          await anyButton.click();
          await page.waitForLoadState('networkidle', { timeout: 10000 });
        }
      }
    }
    
    console.log('🔍 Property page debug complete');
  });
});
