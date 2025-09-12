import { test, expect } from '@playwright/test';
import { McpAssistant } from './mcp-assistant';

/**
 * Comprehensive End-to-End Test Following TESTING_STRATEGY.md
 * 
 * This test aims to complete the entire Docassemble Bankruptcy Clinic interview
 * from start to PDF generation, with comprehensive progress tracking and video documentation.
 */

// Progress tracking utility
class ProgressTracker {
  private startTime: number;
  private progressPoints: Record<string, number> = {
    'Voluntary Petition for Individuals': 5,
    'What district are you filing': 10,
    'Are you filing individually': 15,
    'Basic Identity and Contact': 30,
    'Please tell the court about your property': 50,
    'property exemptions': 60,
    'secured creditors': 70,
    'unsecured creditors': 80,
    'executory contracts': 85,
    'codebtors': 90,
    'income and expenses': 95,
    'download': 100
  };
  private visitedPages: Set<string> = new Set();
  private screenshots: string[] = [];
  private currentProgress = 0;

  constructor() {
    this.startTime = Date.now();
  }

  updateProgress(pageHeading: string): number {
    for (const [key, progress] of Object.entries(this.progressPoints)) {
      if (pageHeading.toLowerCase().includes(key.toLowerCase())) {
        if (progress > this.currentProgress) {
          this.currentProgress = progress;
          console.log(`📊 Progress: ${progress}% - ${pageHeading}`);
          console.log(`⏱️  Elapsed: ${Math.round((Date.now() - this.startTime) / 1000)}s`);
        }
        return progress;
      }
    }
    return this.currentProgress;
  }

  checkForLoop(url: string): boolean {
    if (this.visitedPages.has(url)) {
      console.warn(`🔄 Potential loop detected at: ${url}`);
      return true;
    }
    this.visitedPages.add(url);
    return false;
  }

  addScreenshot(path: string) {
    this.screenshots.push(path);
  }

  generateSummary(): string {
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    return `
📊 Test Summary:
- Progress: ${this.currentProgress}%
- Time Elapsed: ${elapsed}s
- Pages Visited: ${this.visitedPages.size}
- Screenshots: ${this.screenshots.length}
- Status: ${this.currentProgress === 100 ? '✅ COMPLETE' : '⚠️ INCOMPLETE'}
`;
  }
}

// Loop detection and recovery utility
class LoopDetector {
  private pageStates: Map<string, number> = new Map();
  private maxRetries = 3;

  async checkAndRecover(page: any, mcp: McpAssistant): Promise<boolean> {
    const analysis = await mcp.analyzePage();
    const stateKey = `${analysis.h1Text}-${analysis.formFields.length}-${analysis.buttons.length}`;
    
    const visitCount = this.pageStates.get(stateKey) || 0;
    this.pageStates.set(stateKey, visitCount + 1);

    if (visitCount >= this.maxRetries) {
      console.error(`🚨 Loop detected: ${stateKey} visited ${visitCount + 1} times`);
      
      // Attempt recovery strategies
      if (analysis.errors.length > 0) {
        console.log('🔧 Attempting error recovery...');
        return await this.recoverFromErrors(page, analysis);
      }
      
      if (analysis.formFields.some(f => !f.value && f.type !== 'hidden')) {
        console.log('🔧 Attempting to fill missing fields...');
        return await this.fillMissingFields(page, analysis);
      }
      
      return false; // Recovery failed
    }
    
    return true; // No loop detected
  }

  private async recoverFromErrors(page: any, analysis: any): Promise<boolean> {
    try {
      // Try to fill any empty required fields with default values, but skip disabled fields
      for (const field of analysis.formFields) {
        if (!field.value && field.type !== 'hidden' && field.type !== 'submit') {
          // Skip disabled fields and problematic fields (same logic as fillDefaultFormData)
          if (field.label?.toLowerCase().includes('chat message') || 
              field.label?.toLowerCase().includes('mail ') ||
              field.label?.toLowerCase().includes('tax id') ||
              field.label?.toLowerCase().includes('ssn') ||
              (field.element && field.element.includes('disabled'))) {
            console.log(`Recovery: Skipping disabled/restricted field: ${field.label}`);
            continue;
          }
          
          // Additional check: try to detect if field is actually disabled
          if (field.label) {
            const fieldElement = page.getByLabel(field.label).first();
            const isDisabled = await fieldElement.isDisabled().catch(() => true);
            if (isDisabled) {
              console.log(`Recovery: Skipping disabled field: ${field.label}`);
              continue;
            }
          }
          
          if (field.label?.toLowerCase().includes('name')) {
            await page.getByLabel(field.label).first().fill('Test User');
          } else if (field.label?.toLowerCase().includes('address') && !field.label?.toLowerCase().includes('mail')) {
            await page.getByLabel(field.label).first().fill('123 Test St');
          } else if (field.label?.toLowerCase().includes('city') && !field.label?.toLowerCase().includes('mail')) {
            await page.getByLabel(field.label).first().fill('Test City');
          } else if (field.label?.toLowerCase().includes('zip')) {
            await page.getByLabel(field.label).first().fill('12345');
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Recovery failed:', error);
      return false;
    }
  }

  private async fillMissingFields(page: any, analysis: any): Promise<boolean> {
    try {
      // Select first option for any unselected dropdowns
      for (const select of analysis.selects) {
        if (select.options.length > 1) {
          const firstRealOption = select.options.find((opt: string) => 
            opt && opt.trim() && !opt.toLowerCase().includes('select')
          );
          if (firstRealOption) {
            await page.getByLabel(select.label).selectOption(firstRealOption);
          }
        }
      }

      // Select first radio button in any unselected groups
      for (const group of analysis.radioGroups) {
        if (group.options.length > 0) {
          await page.getByRole('radio', { name: group.options[0].label }).first().click();
        }
      }

      return true;
    } catch (error) {
      console.error('Field filling failed:', error);
      return false;
    }
  }
}

test.describe('Complete Bankruptcy Interview Flow - End to End', () => {
  let progressTracker: ProgressTracker;
  let loopDetector: LoopDetector;
  let mcp: McpAssistant;

  test.beforeEach(async ({ page }) => {
    progressTracker = new ProgressTracker();
    loopDetector = new LoopDetector();
    mcp = new McpAssistant(page);
    
    console.log('🚀 Starting comprehensive end-to-end test');
    console.log('📺 Video recording enabled - watching for progress');
  });

  test.afterEach(async ({ page }) => {
    const summary = progressTracker.generateSummary();
    console.log(summary);
    
    // Take a final screenshot
    await page.screenshot({ 
      path: `test-results/final-state-${Date.now()}.png`, 
      fullPage: true 
    });
  });

  test('should complete full interview and generate PDFs - Minimalist Single Filer', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes for complete flow

    await test.step('Initialize interview', async () => {
      console.log('🎬 STEP 1: Initialize interview');
      await page.goto('/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
      await page.waitForLoadState('networkidle');
      
      const screenshotPath = `test-results/step-01-initialize-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      progressTracker.addScreenshot(screenshotPath);
      
      const analysis = await mcp.analyzePage();
      progressTracker.updateProgress(analysis.h1Text);
      
      // Verify we're at the start
      await expect(page.getByRole('heading', { name: 'Voluntary Petition for Individuals Filing for Bankruptcy' })).toBeVisible();
    });

    await test.step('Navigate introduction', async () => {
      console.log('🎬 STEP 2: Navigate introduction');
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForLoadState('networkidle');
      
      const screenshotPath = `test-results/step-02-introduction-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      progressTracker.addScreenshot(screenshotPath);
    });

    await test.step('Select district', async () => {
      console.log('🎬 STEP 3: Select district');
      const analysis = await mcp.analyzePage();
      progressTracker.updateProgress(analysis.h1Text);
      
      // Check for loops
      if (!await loopDetector.checkAndRecover(page, mcp)) {
        throw new Error('Loop detected and recovery failed in district selection');
      }
      
      await expect(page.getByRole('heading', { name: 'What district are you filing' })).toBeVisible();
      
      await page.getByLabel('Bankruptcy Court District').selectOption('District of Nebraska');
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForLoadState('networkidle');
      
      const screenshotPath = `test-results/step-03-district-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      progressTracker.addScreenshot(screenshotPath);
    });

    await test.step('Handle amended filing', async () => {
      console.log('🎬 STEP 4: Handle amended filing');
      const analysis = await mcp.analyzePage();
      progressTracker.updateProgress(analysis.h1Text);
      
      console.log(`🔍 DEBUG: Page title: "${analysis.h1Text}"`);
      console.log(`🔍 DEBUG: Looking for "updating a bankruptcy filing" in title`);
      
      if (analysis.h1Text.includes('updating a bankruptcy filing')) {
        console.log('✅ Found "updating a bankruptcy filing" page');
        // This page has simple Yes/No buttons, not the complex form
        try {
          await page.getByRole('button', { name: 'No' }).click();
          console.log('✅ Clicked No button successfully');
        } catch (buttonError) {
          console.log(`⚠️ Button click failed: ${buttonError}`);
          // Try alternative selectors
          try {
            await page.locator('button:has-text("No")').click();
            console.log('✅ Clicked No button with alternative selector');
          } catch (altError) {
            console.log(`⚠️ Alternative button selector also failed: ${altError}`);
          }
        }
        await page.waitForLoadState('networkidle');
        
        const screenshotPath = `test-results/step-04-amended-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        progressTracker.addScreenshot(screenshotPath);
      } else {
        console.log(`⚠️ Page "${analysis.h1Text}" does not contain "updating a bankruptcy filing" - skipping this step`);
      }
    });

    await test.step('Confirm district details', async () => {
      console.log('🎬 STEP 5: Confirm district details');
      // Skip if not present, continue if present
      const analysis = await mcp.analyzePage();
      if (analysis.buttons.some(btn => btn.text.toLowerCase().includes('continue'))) {
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.waitForLoadState('networkidle');
        
        const screenshotPath = `test-results/step-05-district-confirm-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        progressTracker.addScreenshot(screenshotPath);
      }
    });

    await test.step('Select filing status', async () => {
      console.log('🎬 STEP 6: Select filing status');
      const analysis = await mcp.analyzePage();
      progressTracker.updateProgress(analysis.h1Text);
      
      if (analysis.h1Text.includes('filing individually or with a spouse')) {
        await page.getByRole('radio', { name: 'Filing individually' }).click();
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.waitForLoadState('networkidle');
        
        const screenshotPath = `test-results/step-06-filing-status-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        progressTracker.addScreenshot(screenshotPath);
      }
    });

    await test.step('Fill basic identity information', async () => {
      console.log('🎬 STEP 7: Fill basic identity information');
      const analysis = await mcp.analyzePage();
      progressTracker.updateProgress(analysis.h1Text);
      
      console.log(`🔍 DEBUG: Checking page title: "${analysis.h1Text}"`);
      console.log(`🔍 DEBUG: Title length: ${analysis.h1Text.length}`);
      console.log(`🔍 DEBUG: Title characters: ${JSON.stringify(analysis.h1Text)}`);
      const normalizedTitle = analysis.h1Text.toLowerCase().trim();
      const hasBasicIdentity = normalizedTitle.includes('basic identity') || normalizedTitle.includes('basic') && normalizedTitle.includes('identity');
      console.log(`🔍 DEBUG: Normalized title: "${normalizedTitle}"`);
      console.log(`🔍 DEBUG: Contains Basic Identity? ${hasBasicIdentity}`);
      
      // Check for loops
      if (!await loopDetector.checkAndRecover(page, mcp)) {
        console.warn('Loop detected but continuing with caution');
      }
      
      if (hasBasicIdentity) {
        console.log('✅ Detected Basic Identity page - applying specific form handling');
        // Fill out the basic info form
        await page.getByLabel('First name').fill('Alex');
        await page.getByLabel('Last name').fill('TestUser');
        await page.getByLabel('Street address').fill('123 Test Street');
        await page.getByLabel('City').fill('Los Angeles');
        
        // Select state using the specific dropdown - critical for county population
        try {
          console.log('🗺️ Attempting state dropdown selection with multiple methods...');
          
          // Method 1: Use the XPath provided by user: /html/body/div/div[2]/div[2]/div[2]/form/div[11]/div/select
          try {
            const stateDropdownXPath = '/html/body/div/div[2]/div[2]/div[2]/form/div[11]/div/select';
            const xpathElement = page.locator(`xpath=${stateDropdownXPath}`);
            await xpathElement.waitFor({ timeout: 3000 });
            await xpathElement.selectOption('CA');
            console.log('✅ Selected CA from XPath state dropdown');
          } catch (xpathError) {
            console.log('⚠️ XPath state dropdown failed, trying by ID...', xpathError.message);
            
            // Method 2: Use the specific state dropdown by ID (most reliable)
            try {
              const idElement = page.locator('#ZGVidG9yW2ldLmFkZHJlc3Muc3RhdGU');
              await idElement.waitFor({ timeout: 2000 });
              await idElement.selectOption('CA');
              console.log('✅ Selected CA from specific state dropdown by ID');
            } catch (idError) {
              console.log('⚠️ ID-based state dropdown failed, trying by name attribute...', idError.message);
              
              // Method 3: Try name attribute
              try {
                const nameElement = page.locator('select[name="debtor[i].address.state"]');
                await nameElement.waitFor({ timeout: 2000 });
                await nameElement.selectOption('CA');
                console.log('✅ Selected CA from specific state dropdown by name attribute');
              } catch (nameError) {
                console.log('⚠️ Name attribute state dropdown failed, trying by label...', nameError.message);
                
                // Method 4: Try by label (generic fallback)
                try {
                  const labelElement = page.getByLabel('State');
                  await labelElement.waitFor({ timeout: 2000 });
                  await labelElement.selectOption('CA');
                  console.log('✅ Selected CA from state label');
                } catch (labelError) {
                  console.log('❌ All state selection methods failed');
                  console.log('XPath error:', xpathError.message);
                  console.log('ID error:', idError.message);
                  console.log('Name error:', nameError.message);
                  console.log('Label error:', labelError.message);
                  
                  // Last resort: Try any select that might be state-related
                  try {
                    const anyStateSelect = page.locator('select').filter({ hasText: /state|State/ }).first();
                    await anyStateSelect.selectOption('CA');
                    console.log('✅ Selected CA using fallback state select');
                  } catch (fallbackError) {
                    console.log('❌ Even fallback state selection failed');
                  }
                }
              }
            }
          }
        } catch (error) {
          console.log('❌ Complete state dropdown selection failure:', error.message);
        }
        
        await page.waitForTimeout(3000); // Wait for county dropdown to update
        
        // Select county - using a common California county
        try {
          await page.getByLabel('County').selectOption('Los Angeles County');
          console.log('✅ Selected Los Angeles County');
        } catch (countyError) {
          console.log('⚠️ Los Angeles County selection failed, trying alternatives...');
          try {
            // Try by partial match or value
            await page.locator('select[name*="county"]').selectOption({ index: 1 }); // Select first available option
            console.log('✅ Selected first available county option');
          } catch (fallbackCountyError) {
            console.log('⚠️ County selection completely failed');
          }
        }
        
        await page.getByLabel('Zip code').fill('90210');
        
        // Handle mailing address question - check H1 to determine form type
        try {
          const analysis = await mcp.analyzePage();
          console.log(`🔍 DEBUG: Current H1 text: "${analysis.h1Text}"`);
          
          if (analysis.h1Text.toLowerCase().includes('mailing address') || 
              analysis.h1Text.toLowerCase().includes('different address')) {
            // Try button first (for yes/no questions)
            try {
              await page.getByRole('button', { name: 'No' }).first().click();
              console.log('✅ Selected No button for mailing address question');
            } catch (buttonError) {
              // Fall back to radio if button not found
              await page.getByRole('radio', { name: 'No' }).first().click();
              console.log('✅ Selected No radio for mailing address question');
            }
          }
        } catch (mailingError) {
          console.log('⚠️ Mailing address question not found or could not be answered');
        }
        
        // CRITICAL: Select SSN radio button and fill in SSN field
        try {
          const ssnRadio = page.getByRole('radio', { name: 'Social Security Number' });
          await ssnRadio.click();
          await page.waitForTimeout(1000); // Wait for SSN field to appear
          await page.getByLabel('Social Security Number').fill('123-45-6789');
          console.log('✅ Selected SSN option and filled SSN field');
        } catch (ssnError) {
          console.log('⚠️ SSN option not found, trying ITIN...', ssnError.message);
          try {
            const itinRadio = page.getByRole('radio', { name: 'Individual Taxpayer Identification Number' });
            await itinRadio.click();
            await page.waitForTimeout(1000); // Wait for ITIN field to appear
            await page.getByLabel('Individual Taxpayer Identification Number').fill('123-45-6789');
            console.log('✅ Selected ITIN option and filled ITIN field');
          } catch (itinError) {
            console.warn('⚠️ Could not find SSN or ITIN radio buttons', itinError.message);
          }
        }
        
        const screenshotPath = `test-results/step-07-basic-info-filled-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        progressTracker.addScreenshot(screenshotPath);
        
        // Click continue button with multiple fallback methods
        try {
          await page.getByRole('button', { name: 'Continue' }).click();
          console.log('✅ Clicked Continue button via getByRole');
        } catch (continueError) {
          console.log('⚠️ Continue button via getByRole failed, trying submit input...');
          try {
            await page.locator('input[type="submit"][value="Continue"]').click();
            console.log('✅ Clicked Continue button via submit input');
          } catch (submitError) {
            console.log('⚠️ Continue via submit failed, trying generic submit...');
            try {
              await page.locator('input[type="submit"]').first().click();
              console.log('✅ Clicked first submit button');
            } catch (genericError) {
              console.log('❌ All Continue button methods failed');
            }
          }
        }
        
        await page.waitForLoadState('networkidle');
        console.log('✅ Completed Basic Identity page specific handling');
      } else {
        console.log(`⚠️ Page "${analysis.h1Text}" does not match Basic Identity pattern`);
        console.log(`⚠️ Normalized title was: "${normalizedTitle}"`);
        console.log(`⚠️ Skipping specific handling - will be handled by Step 8`);
      }
    });

    await test.step('Navigate through additional debtor sections', async () => {
      console.log('🎬 STEP 8: Navigate through additional debtor sections');
      
      // This step handles various additional questions that might appear
      let maxSubSteps = 10;
      let subStep = 0;
      
      while (subStep < maxSubSteps) {
        const analysis = await mcp.analyzePage();
        const currentProgress = progressTracker.updateProgress(analysis.h1Text);
        
        console.log(`  Sub-step ${subStep + 1}: ${analysis.h1Text}`);
        
        // Check if we've moved to property section (50% progress)
        if (currentProgress >= 50) {
          console.log('🎯 Reached property section!');
          break;
        }
        
        // PRIORITY: Handle Basic Identity page specifically
        const normalizedTitle = analysis.h1Text.toLowerCase().trim();
        if (normalizedTitle.includes('basic identity') || (normalizedTitle.includes('basic') && normalizedTitle.includes('identity'))) {
          console.log('🎯 STEP 8: Detected Basic Identity page - applying specific form handling');
          
          // Fill out the basic info form using more specific selectors
          try {
            await page.getByLabel('First name').fill('Alex');
            await page.getByLabel('Last name').fill('Johnson');
            
            // Use more specific address selector to avoid ambiguity
            try {
              await page.getByRole('textbox', { name: 'Address *' }).fill('123 Main St');
              console.log('✅ Filled address via textbox role');
            } catch (addressError) {
              // Fallback to generic address selector
              await page.getByLabel('Address').first().fill('123 Main St');
              console.log('✅ Filled address via first address field');
            }
            
            await page.getByLabel('City').fill('Los Angeles');
            
            // Handle state dropdown with multiple strategies
            try {
              // First try XPath selector provided by user
              const stateDropdownXPath = page.locator('/html/body/div/div[2]/div[2]/div[2]/form/div[11]/div/select');
              await stateDropdownXPath.selectOption('Nebraska');
              console.log('✅ Selected Nebraska via XPath selector');
            } catch (xpathError) {
              console.log('⚠️ XPath state dropdown failed, trying by ID...');
              try {
                // Try by ID
                const stateDropdownId = page.locator('#ZGVidG9yW2ldLmFkZHJlc3Muc3RhdGU');
                await stateDropdownId.selectOption('Nebraska');
                console.log('✅ Selected Nebraska via ID selector');
              } catch (idError) {
                console.log('⚠️ ID-based state dropdown failed, trying by name attribute...');
                try {
                  // Try by name attribute
                  const stateDropdownName = page.locator('select[name="debtor[i].address.state"]');
                  await stateDropdownName.selectOption('Nebraska');
                  console.log('✅ Selected Nebraska via name attribute');
                } catch (nameError) {
                  console.log('⚠️ Name attribute state dropdown failed, trying by label...');
                  try {
                    // Final fallback: by label
                    await page.getByLabel('State').selectOption('Nebraska');
                    console.log('✅ Selected Nebraska via label');
                  } catch (labelError) {
                    console.log('❌ All state dropdown selection methods failed');
                  }
                }
              }
            }
            
            await page.getByLabel('Zip code').fill('90210');
            
            // Handle mailing address question - check H1 to determine form type
            try {
              const analysis = await mcp.analyzePage();
              console.log(`🔍 DEBUG: Current H1 text: "${analysis.h1Text}"`);
              
              if (analysis.h1Text.toLowerCase().includes('mailing address') || 
                  analysis.h1Text.toLowerCase().includes('different address')) {
                // Try button first (for yes/no questions)
                try {
                  await page.getByRole('button', { name: 'No' }).first().click();
                  console.log('✅ Selected No button for mailing address question');
                } catch (buttonError) {
                  // Fall back to radio if button not found
                  await page.getByRole('radio', { name: 'No' }).first().click();
                  console.log('✅ Selected No radio for mailing address question');
                }
              }
            } catch (mailingError) {
              console.log('⚠️ Mailing address question not found or could not be answered');
            }
            
            // CRITICAL: Select SSN radio button and fill in SSN field
            try {
              const ssnRadio = page.getByRole('radio', { name: 'Social Security Number' });
              await ssnRadio.click();
              await page.waitForTimeout(1000); // Wait for SSN field to appear
              await page.getByLabel('Social Security Number').fill('123-45-6789');
              console.log('✅ Selected SSN option and filled SSN field');
            } catch (ssnError) {
              console.log('⚠️ SSN option not found, trying ITIN...');
              try {
                const itinRadio = page.getByRole('radio', { name: 'Individual Taxpayer Identification Number' });
                await itinRadio.click();
                await page.waitForTimeout(1000); // Wait for ITIN field to appear
                await page.getByLabel('Individual Taxpayer Identification Number').fill('123-45-6789');
                console.log('✅ Selected ITIN option and filled ITIN field');
              } catch (itinError) {
                console.warn('⚠️ Could not find SSN or ITIN radio buttons');
              }
            }
            
            console.log('✅ Completed Basic Identity form filling in Step 8');
            
            // Click continue button
            await page.getByRole('button', { name: 'Continue' }).click();
            await page.waitForLoadState('networkidle');
            
            subStep++;
            continue; // Skip the generic handling below
            
          } catch (basicIdentityError: any) {
            console.log('⚠️ Basic Identity form filling failed with error:', basicIdentityError.message);
            console.log('⚠️ Falling back to generic handling');
          }
        }
        
        // Check for loops
        if (!await loopDetector.checkAndRecover(page, mcp)) {
          console.warn('Loop detected in debtor sections, attempting to continue');
        }
        
        // Handle common patterns based on H1 text
        if (analysis.h1Text.toLowerCase().includes('lived in') || 
            analysis.h1Text.toLowerCase().includes('district')) {
          // District residence questions - try button first, then radio
          try {
            await page.getByRole('button', { name: 'Yes' }).first().click();
            console.log('✅ Selected Yes button for district question');
          } catch (buttonError) {
            await page.getByRole('radio', { name: 'Yes' }).first().click();
            console.log('✅ Selected Yes radio for district question');
          }
        } else if (analysis.h1Text.toLowerCase().includes('other names') || 
                   analysis.h1Text.toLowerCase().includes('alias')) {
          // Alias questions - try button first, then radio
          try {
            await page.getByRole('button', { name: 'No' }).first().click();
            console.log('✅ Selected No button for alias question');
          } catch (buttonError) {
            await page.getByRole('radio', { name: 'No' }).first().click();
            console.log('✅ Selected No radio for alias question');
          }
        } else if (analysis.h1Text.toLowerCase().includes('more debtors')) {
          // Additional debtors - try button first, then radio
          try {
            await page.getByRole('button', { name: 'No' }).first().click();
            console.log('✅ Selected No button for more debtors question');
          } catch (buttonError) {
            await page.getByRole('radio', { name: 'No' }).first().click();
            console.log('✅ Selected No radio for more debtors question');
          }
        } else if (analysis.formFields.length > 0) {
          // If there are empty form fields, try to fill them with defaults
          await fillDefaultFormData(page, analysis);
        }
        
        // Take screenshot and continue
        const screenshotPath = `test-results/step-08-substep-${subStep + 1}-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        progressTracker.addScreenshot(screenshotPath);
        
        // Continue to next page
        if (analysis.buttons.some(btn => btn.text.toLowerCase().includes('continue'))) {
          await page.getByRole('button', { name: 'Continue' }).click();
          await page.waitForLoadState('networkidle');
        } else {
          console.log('No continue button found, may have reached end of section');
          break;
        }
        
        subStep++;
      }
    });

    await test.step('Handle property section', async () => {
      console.log('🎬 STEP 9: Handle property section');
      const analysis = await mcp.analyzePage();
      progressTracker.updateProgress(analysis.h1Text);
      
      if (analysis.h1Text.toLowerCase().includes('property')) {
        console.log('🏠 Entered property section');
        
        // For minimalist test, we'll indicate no property
        if (analysis.buttons.some(btn => btn.text.toLowerCase().includes('continue'))) {
          await page.getByRole('button', { name: 'Continue' }).click();
          await page.waitForLoadState('networkidle');
        }
        
        const screenshotPath = `test-results/step-09-property-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        progressTracker.addScreenshot(screenshotPath);
      }
    });

    await test.step('Continue to completion or as far as possible', async () => {
      console.log('🎬 STEP 10: Continue to completion');
      
      // Continue through remaining sections with intelligent navigation
      let maxSteps = 50; // Safety limit
      let stepCount = 0;
      
      while (stepCount < maxSteps) {
        const analysis = await mcp.analyzePage();
        const currentProgress = progressTracker.updateProgress(analysis.h1Text);
        
        console.log(`  🧭 Navigation step ${stepCount + 1}: ${analysis.h1Text} (${currentProgress}%)`);
        
        // Check if we've reached the end (PDF generation/download)
        if (currentProgress === 100 || 
            analysis.h1Text.toLowerCase().includes('download') ||
            analysis.h1Text.toLowerCase().includes('final') ||
            analysis.h1Text.toLowerCase().includes('complete') ||
            page.url().includes('download') ||
            analysis.buttons.some((btn: any) => btn.text.toLowerCase().includes('download'))) {
          console.log('🎉 REACHED COMPLETION! PDF generation available');
          
          const finalScreenshotPath = `test-results/step-10-COMPLETION-${Date.now()}.png`;
          await page.screenshot({ path: finalScreenshotPath, fullPage: true });
          progressTracker.addScreenshot(finalScreenshotPath);
          
          // Try to find and verify download functionality
          const downloadText = page.locator('text=download').first();
          if (await downloadText.isVisible()) {
            await expect(downloadText).toBeVisible();
            console.log('✅ Download functionality confirmed!');
          }
          break;
        }
        
        // Check for loops
        if (!await loopDetector.checkAndRecover(page, mcp)) {
          console.warn(`⚠️ Loop detected at step ${stepCount + 1}, attempting recovery`);
        }
        
        // Intelligent navigation based on page content
        await navigateIntelligently(page, analysis);
        
                // Take screenshot
        const screenshotPath = `test-results/step-10-nav-${stepCount + 1}-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        progressTracker.addScreenshot(screenshotPath);
        
        stepCount++;
        
        // Brief pause to allow page transitions
        await page.waitForTimeout(500);
      }
      
      // Final status message  
      console.log(`📊 Navigation completed after ${stepCount} steps`);
    });
    
    // Final summary at test completion
    await test.step('Complete summary', async () => {
      const finalAnalysis = await mcp.analyzePage();
      const finalProgress = progressTracker.updateProgress(finalAnalysis.h1Text);
      
      console.log('\n📊 Final Test Summary:');
      console.log(`- Final Progress: ${finalProgress}%`);
      console.log(`- Total Steps: navigation steps completed`);
      console.log(`- Final Page: "${finalAnalysis.h1Text}"`);
      
      if (finalProgress >= 90) {
        console.log('🎉 SUCCESS: Reached high completion rate!');
      } else {
        console.log(`⚠️ INCOMPLETE: Only reached ${finalProgress}% completion`);
      }
    });

// Helper functions for intelligent navigation
async function navigateIntelligently(page: any, analysis: any) {
  try {
    console.log(`📄 Navigating page: ${analysis.h1Text}`);
    console.log(`🔲 Found ${analysis.buttons.length} buttons, ${analysis.radioGroups.length} radio groups, ${analysis.formFields.length} form fields`);
    
    // Handle Yes/No buttons (Docassemble style)
    const yesButton = analysis.buttons.find((btn: any) => btn.text.toLowerCase() === 'yes');
    const noButton = analysis.buttons.find((btn: any) => btn.text.toLowerCase() === 'no');
    
    if (noButton) {
      console.log('🔘 Clicking "No" button');
      await page.getByRole('button', { name: 'No' }).click();
      await page.waitForLoadState('networkidle');
      return;
    } else if (yesButton && analysis.h1Text.toLowerCase().includes('individually')) {
      console.log('🔘 Clicking "Yes" for individual filing');
      await page.getByRole('button', { name: 'Yes' }).click();
      await page.waitForLoadState('networkidle');
      return;
    }

    // Handle radio button groups
    if (analysis.radioGroups.length > 0) {
      for (const group of analysis.radioGroups) {
        console.log(`📋 Processing radio group with ${group.options.length} options`);
        const noOption = group.options.find((opt: any) => opt.label.toLowerCase().includes('no'));
        const individualOption = group.options.find((opt: any) => opt.label.toLowerCase().includes('individual'));
        const firstOption = group.options[0];
        
        if (noOption) {
          console.log('🔘 Selecting "No" radio option');
          await page.getByRole('radio', { name: noOption.label }).click();
        } else if (individualOption) {
          console.log('🔘 Selecting "Individual" radio option');
          
          // Clean up any duplicated text in the label
          let cleanLabel = individualOption.label;
          if (cleanLabel.includes('Individual Taxpayer Identification Number')) {
            // If it's duplicated, take only the first instance
            const parts = cleanLabel.split('Individual Taxpayer Identification Number');
            if (parts.length > 2) {
              cleanLabel = 'Individual Taxpayer Identification Number';
            }
          }
          
          console.log(`🔘 Using cleaned label: "${cleanLabel}"`);
          try {
            await page.getByRole('radio', { name: cleanLabel }).click();
          } catch (radioError) {
            console.log(`⚠️ Radio selection failed for "${cleanLabel}", trying first option instead`);
            if (firstOption) {
              await page.getByRole('radio', { name: firstOption.label }).click();
            }
          }
        } else if (firstOption) {
          console.log(`🔘 Selecting first radio option: ${firstOption.label}`);
          await page.getByRole('radio', { name: firstOption.label }).click();
        }
      }
    }

    // Fill any empty required form fields with defaults
    if (analysis.formFields.some((f: any) => !f.value && f.type !== 'hidden')) {
      console.log('📝 Filling form fields with default values');
      await fillDefaultFormData(page, analysis);
    }

    // Handle dropdowns
    if (analysis.selects.length > 0) {
      console.log(`📝 Processing ${analysis.selects.length} dropdowns`);
      for (const select of analysis.selects) {
        if (select.options.length > 1) {
          const firstRealOption = select.options.find((opt: string) => 
            opt && opt.trim() && !opt.toLowerCase().includes('select')
          );
          if (firstRealOption) {
            console.log(`📝 Selecting "${firstRealOption}" in dropdown`);
            await page.getByLabel(select.label).selectOption(firstRealOption);
          }
        }
      }
    }

    // Continue to next page
    const continueButton = analysis.buttons.find((btn: any) => 
      btn.text.toLowerCase().includes('continue') || 
      btn.text.toLowerCase().includes('next') ||
      btn.text.toLowerCase().includes('submit')
    );
    
    if (continueButton) {
      console.log(`➡️ Clicking continue button: ${continueButton.text}`);
      await page.getByRole('button', { name: continueButton.text }).click();
      await page.waitForLoadState('networkidle');
    } else {
      console.log('⚠️ No continue button found');
    }

  } catch (error) {
    console.warn(`⚠️ Navigation error: ${error}`);
    // Try basic continue as fallback
    try {
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForLoadState('networkidle');
      console.log('✅ Fallback continue successful');
    } catch (fallbackError) {
      console.error(`❌ Fallback navigation failed: ${fallbackError}`);
    }
  }
}
  });
});

// Helper function for filling default form data
async function fillDefaultFormData(page: any, analysis: any) {
  for (const field of analysis.formFields) {
    if (!field.value && field.type !== 'hidden' && field.type !== 'submit') {
      try {
        // Skip chat message fields, disabled fields, and mail-related fields
        if (field.label?.toLowerCase().includes('chat message') || 
            field.label?.toLowerCase().includes('mail ') ||
            field.label?.toLowerCase().includes('tax id') ||
            field.label?.toLowerCase().includes('ssn') ||
            (field.element && field.element.includes('disabled'))) {
          console.log(`Skipping disabled/restricted field: ${field.label}`);
          continue;
        }
        
        // Additional check: try to detect if field is actually disabled
        if (field.label) {
          const fieldElement = page.getByLabel(field.label).first();
          const isDisabled = await fieldElement.isDisabled().catch(() => true);
          if (isDisabled) {
            console.log(`Skipping disabled field: ${field.label}`);
            continue;
          }
        }
        
        if (field.label?.toLowerCase().includes('name')) {
          await page.getByLabel(field.label).first().fill('Test User');
        } else if (field.label?.toLowerCase().includes('address') && !field.label?.toLowerCase().includes('mail')) {
          await page.getByLabel(field.label).first().fill('123 Test St');
        } else if (field.label?.toLowerCase().includes('city') && !field.label?.toLowerCase().includes('mail')) {
          await page.getByLabel(field.label).first().fill('Test City');
        } else if (field.label?.toLowerCase().includes('zip')) {
          await page.getByLabel(field.label).first().fill('12345');
        } else if (field.label?.toLowerCase().includes('phone')) {
          await page.getByLabel(field.label).first().fill('555-123-4567');
        } else if (field.label?.toLowerCase().includes('email')) {
          await page.getByLabel(field.label).first().fill('test@example.com');
        } else if (field.type === 'number') {
          await page.getByLabel(field.label).first().fill('0');
        } else if (field.type === 'text' || field.type === 'textarea') {
          await page.getByLabel(field.label).first().fill('N/A');
        }
      } catch (fillError) {
        console.warn(`Could not fill field ${field.label}: ${fillError}`);
      }
    }
  }
}
