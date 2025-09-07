import { test, expect } from '@playwright/test';
import { McpAssistant } from './mcp-assistant';

/**
 * Enhanced MCP-Assisted Tests Following prompt.md Guidelines
 * 
 * These tests demonstrate the integration of prompt.md guidelines with MCP assistance:
 * - Use getByRole, getByLabel, and getByText selectors
 * - Organized with test.describe and test.step
 * - Start at known interview URLs
 * - Fill fields by labels
 * - Use Continue to advance
 * - Assert expected text/questions at each step
 */

test.describe('Bankruptcy Clinic Interview - MCP Enhanced', () => {
  test('follows prompt.md example pattern with MCP assistance', async ({ page }) => {
    const mcp = new McpAssistant(page);
    
    await test.step('Start interview at known URL', async () => {
      await page.goto('/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
      await page.waitForLoadState('networkidle');
      
      // Verify we're at the start using the h1 heading
      await expect(page.getByRole('heading', { name: 'Voluntary Petition for Individuals Filing for Bankruptcy' })).toBeVisible();
    });
    
    await test.step('Navigate introduction with MCP analysis', async () => {
      await mcp.captureState('01-introduction.png');
      const analysis = await mcp.analyzePage();
      console.log('MCP Analysis - Introduction page:', analysis.h1Text);
      
      // Use getByRole for Continue button as per prompt.md
      const continueBtn = page.getByRole('button', { name: 'Continue' });
      await expect(continueBtn).toBeVisible();
      await continueBtn.click();
      await page.waitForLoadState('networkidle');
    });
    
    await test.step('Select district using getByLabel', async () => {
      await mcp.captureState('02-district-selection.png');
      
      // Expect district selection question
      await expect(page.getByText('What judicial district are you filing in?')).toBeVisible();
      
      // Use getByLabel as preferred in prompt.md
      const districtSelect = page.getByLabel('District', { exact: false });
      await districtSelect.selectOption('District of Nebraska');
      
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForLoadState('networkidle');
    });
    
    await test.step('Handle amended filing question with MCP guidance', async () => {
      await mcp.captureState('03-amended-filing.png');
      const analysis = await mcp.analyzePage();
      
      // Expect amended filing question
      await expect(page.getByText('Are you updating a bankruptcy filing')).toBeVisible();
      
      // Use getByRole for radio selection
      await page.getByRole('radio', { name: 'No' }).click();
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForLoadState('networkidle');
    });
    
    await test.step('Confirm district details', async () => {
      await mcp.captureState('04-confirm-district.png');
      
      // Continue through district confirmation
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForLoadState('networkidle');
    });
    
    await test.step('Select filing status using labels', async () => {
      await mcp.captureState('05-filing-status.png');
      
      // Expect filing status question
      await expect(page.getByText('Are you filing individually or with a spouse')).toBeVisible();
      
      // Use getByRole for radio selection as per prompt.md
      await page.getByRole('radio', { name: 'Filing individually' }).click();
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForLoadState('networkidle');
    });
    
    await test.step('Fill basic identity form using getByLabel', async () => {
      await mcp.captureState('06-basic-identity.png');
      
      // Expect basic identity form
      await expect(page.getByText('Basic Identity and Contact Information')).toBeVisible();
      
      // Fill fields by their labels as recommended in prompt.md
      await page.getByLabel('First name').fill('Alex');
      await page.getByLabel('Last name').fill('Clark');
      await page.getByLabel('Street address').fill('123 Main Street');
      await page.getByLabel('City').fill('Omaha');
      
      // Select state and wait for county to populate
      await page.getByLabel('State').selectOption('Nebraska');
      
      // Wait for county dropdown to update (MCP can help detect this)
      await page.waitForTimeout(2000);
      
      // Use MCP to verify county options populated
      const updatedAnalysis = await mcp.analyzePage();
      const countySelect = updatedAnalysis.selects.find(s => 
        s.label.toLowerCase().includes('county')
      );
      
      if (countySelect && countySelect.options.length > 1) {
        console.log('MCP detected county options:', countySelect.options);
        await page.getByLabel('County').selectOption('Douglas County');
      }
      
      await page.getByLabel('Zip code').fill('68102');
      
      // Handle mailing address question using getByRole
      await page.getByRole('radio', { name: 'No' }).first().click();
      
      await mcp.captureState('06-form-filled.png');
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForLoadState('networkidle');
    });
    
    await test.step('Verify progress to next section', async () => {
      await mcp.captureState('07-next-section.png');
      const finalAnalysis = await mcp.analyzePage();
      
      console.log('Final MCP Analysis:', finalAnalysis.h1Text);
      
      // Assert we've moved beyond basic info
      expect(finalAnalysis.h1Text).not.toContain('Basic Identity and Contact Information');
      console.log('✅ Successfully progressed through interview with MCP assistance');
    });
  });
  
  test('debug form fields using MCP dasourcetoggle', async ({ page }) => {
    const mcp = new McpAssistant(page);
    
    await test.step('Navigate to a form page', async () => {
      await page.goto('/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
      await page.waitForLoadState('networkidle');
      
      // Quick navigation to a form page
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForLoadState('networkidle');
      
      const districtSelect = page.getByLabel('District', { exact: false });
      await districtSelect.selectOption('District of Nebraska');
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForLoadState('networkidle');
      
      await page.getByRole('radio', { name: 'No' }).click();
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForLoadState('networkidle');
      
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForLoadState('networkidle');
      
      await page.getByRole('radio', { name: 'Filing individually' }).click();
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForLoadState('networkidle');
    });
    
    await test.step('Use MCP to analyze form structure', async () => {
      await mcp.captureState('debug-form-structure.png');
      const analysis = await mcp.analyzePage();
      
      console.log('Form Analysis:', {
        title: analysis.h1Text,
        formFields: analysis.formFields.length,
        selects: analysis.selects.length,
        buttons: analysis.buttons.length
      });
      
      // Test the debug features mentioned in prompt.md
      const dasourceToggle = page.locator('#dasourcetoggle');
      if (await dasourceToggle.count() > 0) {
        await dasourceToggle.click();
        await page.waitForTimeout(1000);
        
        console.log('✅ dasourcetoggle button found and clicked');
      }
      
      // Check for variables button
      const varsButton = page.locator('a[href*="/vars"]');
      if (await varsButton.count() > 0) {
        console.log('✅ Variables button found - can show interview state');
      }
    });
    
    await test.step('Handle base64 encoded field names', async () => {
      // Demonstrate understanding of base64 field encoding from prompt.md
      const currentAnalysis = await mcp.analyzePage();
      const base64Fields = currentAnalysis.formFields.filter((field: any) => 
        field.name && field.name.length > 10 && !/[^A-Za-z0-9+/]/.test(field.name)
      );
      
      console.log('Detected base64 encoded fields:', base64Fields.length);
      
      if (base64Fields.length > 0) {
        console.log('Sample base64 field:', {
          name: base64Fields[0].name,
          id: base64Fields[0].id,
          label: base64Fields[0].label
        });
      }
    });
  });
  
  test('handle conditional branching with MCP intelligence', async ({ page }) => {
    const mcp = new McpAssistant(page);
    
    await test.step('Navigate through conditional flow', async () => {
      await page.goto('/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
      await page.waitForLoadState('networkidle');
      
      // Use MCP to suggest next steps at each branch
      let currentStep = 0;
      const maxSteps = 10;
      
      while (currentStep < maxSteps) {
        await mcp.captureState(`conditional-step-${currentStep}.png`);
        const suggestion = await mcp.suggestNextStep();
        
        console.log(`Step ${currentStep}: MCP suggests "${suggestion}"`);
        
        if (suggestion === 'click_continue') {
          await page.getByRole('button', { name: 'Continue' }).click();
          await page.waitForLoadState('networkidle');
        } else if (suggestion === 'fill_form') {
          // Use MCP to intelligently fill forms
          const analysis = await mcp.analyzePage();
          
          if (analysis.formFields.length > 0) {
            console.log('MCP detected form fields to fill');
            
            // Example of intelligent form filling based on field labels
            for (const field of analysis.formFields.slice(0, 3)) {
              if (field.label.toLowerCase().includes('first') && field.label.toLowerCase().includes('name')) {
                await page.getByLabel(field.label).fill('Test');
              } else if (field.label.toLowerCase().includes('last') && field.label.toLowerCase().includes('name')) {
                await page.getByLabel(field.label).fill('User');
              }
            }
            
            await page.getByRole('button', { name: 'Continue' }).click();
            await page.waitForLoadState('networkidle');
          }
        } else {
          // Break if MCP can't suggest next step
          break;
        }
        
        currentStep++;
      }
      
      console.log(`✅ Completed ${currentStep} conditional navigation steps with MCP`);
    });
  });
});

/**
 * MCP-Enhanced Helper Functions Following prompt.md Guidelines
 */

test.describe('MCP Helper Function Examples', () => {
  test('demonstrate preferred selector patterns', async ({ page }) => {
    await page.goto('/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
    await page.waitForLoadState('networkidle');
    
    // Examples of prompt.md preferred selectors
    await test.step('Use getByRole for buttons', async () => {
      const continueButton = page.getByRole('button', { name: 'Continue' });
      await expect(continueButton).toBeVisible();
      // Don't click yet, just demonstrate the selector
    });
    
    await test.step('Use getByLabel for form fields', async () => {
      // Navigate to a form first
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForLoadState('networkidle');
      
      // Example of getByLabel usage
      const districtField = page.getByLabel('District', { exact: false });
      if (await districtField.count() > 0) {
        console.log('✅ getByLabel found district field');
      }
    });
    
    await test.step('Use getByText for content verification', async () => {
      // Example of getByText for assertions
      await expect(page.getByText('What judicial district')).toBeVisible();
      console.log('✅ getByText found expected question text');
    });
  });
  
  test('auto-wait demonstration', async ({ page }) => {
    await test.step('Demonstrate auto-waits without sleep', async () => {
      await page.goto('/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
      
      // Playwright auto-waits - no need for sleep() as mentioned in prompt.md
      await page.getByRole('button', { name: 'Continue' }).click();
      
      // Auto-wait for next page content
      await expect(page.getByText('What judicial district')).toBeVisible();
      
      console.log('✅ Auto-waits handled page transition without manual sleep');
    });
  });
});
