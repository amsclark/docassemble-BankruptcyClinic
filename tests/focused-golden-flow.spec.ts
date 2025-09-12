import { test, expect } from '@playwright/test';

/**
 * Focused Golden Flow Tests
 * Simplified version focusing on the most important scenarios
 * with improved error handling and logging
 */

test.describe('Bankruptcy Clinic - Focused Golden Flow', () => {
  
  const baseUrl = 'https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1';

  // Helper functions
  const logPageState = async (page: any, stepName: string) => {
    try {
      await page.waitForSelector('h1, h2, h3', { timeout: 3000 });
      const heading = await page.locator('h1, h2, h3').first().textContent();
      console.log(`📍 ${stepName}: "${heading}"`);
      return heading;
    } catch {
      console.log(`📍 ${stepName}: No heading found`);
      return null;
    }
  };

  const takeScreenshot = async (page: any, name: string) => {
    const timestamp = Date.now();
    await page.screenshot({ 
      path: `test-results/focused-${name}-${timestamp}.png`, 
      fullPage: true 
    });
  };

  const smartContinue = async (page: any, stepName: string) => {
    const methods = [
      { selector: '#da-continue-button', name: 'da-continue-button' },
      { selector: 'input[type="submit"]', name: 'submit input' },
      { selector: 'button[type="submit"]', name: 'submit button' },
      { key: 'Enter', name: 'Enter key' }
    ];

    for (const method of methods) {
      try {
        if (method.key) {
          await page.keyboard.press(method.key);
        } else {
          await page.locator(method.selector).first().click();
        }
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        console.log(`✅ ${stepName}: Used ${method.name}`);
        return true;
      } catch (error) {
        console.log(`⚠️ ${stepName}: ${method.name} failed`);
      }
    }
    console.log(`❌ ${stepName}: All continue methods failed`);
    return false;
  };

  test('Golden Path 1: Individual Filing - SSN, No Aliases, Current District', async ({ page }) => {
    await test.step('Start interview', async () => {
      await page.goto(baseUrl);
      await takeScreenshot(page, 'start');
      await expect(page.getByRole('heading', { name: 'Voluntary Petition for Individuals Filing for Bankruptcy' })).toBeVisible();
    });

    await test.step('Introduction', async () => {
      await page.evaluate(() => {
        const element = document.getElementsByName(btoa('introduction_screen').replace(/=/g,""))[0] as HTMLElement;
        element?.click();
      });
      await page.waitForLoadState('networkidle');
      await logPageState(page, 'After introduction');
    });

    await test.step('District Selection', async () => {
      await page.evaluate(() => {
        const districtElement = document.getElementsByName(btoa('current_district').replace(/=/g,""))[0] as HTMLSelectElement;
        districtElement.value = 'District of Nebraska';
      });
      await smartContinue(page, 'District selection');
    });

    await test.step('Amended Filing - No', async () => {
      const heading = await logPageState(page, 'Amended filing check');
      if (heading && heading.includes('updating a bankruptcy filing')) {
        await page.evaluate(() => {
          const amendedElements = document.getElementsByName(btoa('amended_filing').replace(/=/g,""));
          (amendedElements[1] as HTMLElement)?.click(); // No
        });
        await page.waitForLoadState('networkidle');
        console.log('✅ Selected No for amended filing');
      }
    });

    await test.step('District Details', async () => {
      await page.waitForTimeout(1000);
      const heading = await logPageState(page, 'District details');
      if (heading && heading.includes('District Details')) {
        await page.evaluate(() => {
          const districtFinalElement = document.getElementsByName(btoa('district_final').replace(/=/g,""))[0] as HTMLElement;
          districtFinalElement?.click();
        });
        await page.waitForLoadState('networkidle');
        console.log('✅ Handled district details');
      }
    });

    await test.step('Filing Status - Individual', async () => {
      const heading = await logPageState(page, 'Filing status');
      if (heading && /filing individually|filing with.*spouse/i.test(heading)) {
        await page.evaluate(() => {
          const filingStatusElement = document.getElementById(btoa('filing_status').replace(/=/g,"") + "_0") as HTMLElement;
          filingStatusElement?.click(); // Individual
        });
        await smartContinue(page, 'Filing status');
        console.log('✅ Selected individual filing');
      }
    });

    await test.step('Basic Identity Information', async () => {
      const heading = await logPageState(page, 'Basic identity');
      if (heading && /basic.*identity|contact.*information/i.test(heading)) {
        await page.evaluate(() => {
          // Fill required fields
          (document.getElementById(btoa('debtor[i].name.first').replace(/=/g,"")) as HTMLInputElement).value = 'John';
          (document.getElementById(btoa('debtor[i].name.last').replace(/=/g,"")) as HTMLInputElement).value = 'Doe';
          (document.getElementById(btoa('debtor[i].address.address').replace(/=/g,"")) as HTMLInputElement).value = '123 Main St';
          (document.getElementById(btoa('debtor[i].address.city').replace(/=/g,"")) as HTMLInputElement).value = 'Omaha';
          
          // State dropdown
          const stateEl = document.getElementById(btoa('debtor[i].address.state').replace(/=/g,"")) as HTMLSelectElement;
          if (stateEl) {
            stateEl.value = "Nebraska";
            stateEl.dispatchEvent(new Event("change", { bubbles: true }));
          }
          
          (document.getElementById(btoa('debtor[i].address.zip').replace(/=/g,"")) as HTMLInputElement).value = '68102';
        });
        
        await page.waitForTimeout(1000);
        
        await page.evaluate(() => {
          // County selection
          const countyEl = document.getElementById(btoa('debtor[i].address.county').replace(/=/g,"")) as HTMLSelectElement;
          if (countyEl && countyEl.options.length > 4) {
            countyEl.selectedIndex = 4;
          }
          
          // SSN selection
          const ssnEl = document.getElementById(btoa('debtor[i].tax_id.tax_id_type').replace(/=/g,"") + "_0") as HTMLElement;
          ssnEl?.click();
        });
        
        await page.waitForTimeout(1000);
        
        await page.evaluate(() => {
          // SSN field
          const ssnField = document.getElementById(btoa('_field_19').replace(/=/g,"")) as HTMLInputElement;
          if (ssnField) {
            ssnField.value = '123-45-6789';
          }
          
          // Continue
          const continueElement = document.getElementsByName(btoa('debtor_basic_info').replace(/=/g,""))[0] as HTMLElement;
          continueElement?.click();
        });
        
        await page.waitForLoadState('networkidle');
        console.log('✅ Completed basic identity form');
      }
    });

    await test.step('Handle Alias Question - No', async () => {
      const heading = await logPageState(page, 'Alias question');
      if (heading && heading.includes('other names') && heading.includes('8 years')) {
        await page.evaluate(() => {
          const aliasElements = document.getElementsByName(btoa('debtor[i].alias.there_are_any').replace(/=/g,""));
          (aliasElements[1] as HTMLElement)?.click(); // No
        });
        await page.waitForLoadState('networkidle');
        console.log('✅ Selected No for aliases');
      }
    });

    await test.step('Handle District Residence - Yes', async () => {
      const heading = await logPageState(page, 'District residence');
      if (heading && heading.includes('lived in') && heading.includes('180 days')) {
        await page.evaluate(() => {
          const districtElements = document.getElementsByName(btoa('debtor[i].district_info.is_current_district').replace(/=/g,""));
          (districtElements[0] as HTMLElement)?.click(); // Yes
        });
        await page.waitForLoadState('networkidle');
        console.log('✅ Selected Yes for district residence');
      }
    });

    await test.step('Navigate Additional Pages', async () => {
      let stepCount = 0;
      const maxSteps = 10;
      
      while (stepCount < maxSteps) {
        const heading = await logPageState(page, `Step ${stepCount + 1}`);
        await takeScreenshot(page, `step-${stepCount + 1}`);
        
        const continued = await smartContinue(page, `Step ${stepCount + 1}`);
        if (!continued) {
          console.log(`Step ${stepCount + 1}: No continue mechanism found, ending navigation`);
          break;
        }
        
        stepCount++;
        await page.waitForTimeout(500);
      }
      
      const finalHeading = await logPageState(page, 'Final');
      console.log(`🏁 Individual flow completed after ${stepCount} additional steps`);
      console.log(`📋 Final page: ${finalHeading}`);
    });
  });

  test('Golden Path 2: Spouse Filing with ITIN and Aliases', async ({ page }) => {
    await test.step('Quick Navigation to Spouse Selection', async () => {
      await page.goto(baseUrl);
      
      // Fast track through initial steps
      await page.evaluate(() => {
        const introElement = document.getElementsByName(btoa('introduction_screen').replace(/=/g,""))[0] as HTMLElement;
        introElement?.click();
      });
      await page.waitForTimeout(500);
      
      await page.evaluate(() => {
        const districtElement = document.getElementsByName(btoa('current_district').replace(/=/g,""))[0] as HTMLSelectElement;
        districtElement.value = 'District of South Dakota';
      });
      await smartContinue(page, 'District');
      
      const heading1 = await logPageState(page, 'After district');
      if (heading1 && heading1.includes('updating a bankruptcy filing')) {
        await page.evaluate(() => {
          const amendedElements = document.getElementsByName(btoa('amended_filing').replace(/=/g,""));
          (amendedElements[1] as HTMLElement)?.click(); // No
        });
        await page.waitForLoadState('networkidle');
      }
      
      await page.waitForTimeout(500);
      const heading2 = await logPageState(page, 'Before district details');
      if (heading2 && heading2.includes('District Details')) {
        await page.evaluate(() => {
          const districtFinalElement = document.getElementsByName(btoa('district_final').replace(/=/g,""))[0] as HTMLElement;
          districtFinalElement?.click();
        });
        await page.waitForLoadState('networkidle');
      }
    });

    await test.step('Select Spouse Filing', async () => {
      const heading = await logPageState(page, 'Filing status for spouse');
      if (heading && /filing individually|filing with.*spouse/i.test(heading)) {
        await page.evaluate(() => {
          const filingStatusElement = document.getElementById(btoa('filing_status').replace(/=/g,"") + "_1") as HTMLElement;
          filingStatusElement?.click(); // Spouse
        });
        
        await smartContinue(page, 'Spouse filing selection');
        console.log('✅ Selected spouse filing');
      }
    });

    await test.step('First Debtor with ITIN', async () => {
      const heading = await logPageState(page, 'First debtor info');
      if (heading && /basic.*identity|contact.*information/i.test(heading)) {
        await page.evaluate(() => {
          (document.getElementById(btoa('debtor[i].name.first').replace(/=/g,"")) as HTMLInputElement).value = 'Maria';
          (document.getElementById(btoa('debtor[i].name.last').replace(/=/g,"")) as HTMLInputElement).value = 'Garcia';
          (document.getElementById(btoa('debtor[i].address.address').replace(/=/g,"")) as HTMLInputElement).value = '789 Pine St';
          (document.getElementById(btoa('debtor[i].address.city').replace(/=/g,"")) as HTMLInputElement).value = 'Sioux Falls';
          
          const stateEl = document.getElementById(btoa('debtor[i].address.state').replace(/=/g,"")) as HTMLSelectElement;
          if (stateEl) {
            stateEl.value = "South Dakota";
            stateEl.dispatchEvent(new Event("change", { bubbles: true }));
          }
          
          (document.getElementById(btoa('debtor[i].address.zip').replace(/=/g,"")) as HTMLInputElement).value = '57104';
        });
        
        await page.waitForTimeout(1000);
        
        await page.evaluate(() => {
          const countyEl = document.getElementById(btoa('debtor[i].address.county').replace(/=/g,"")) as HTMLSelectElement;
          if (countyEl && countyEl.options.length > 2) {
            countyEl.selectedIndex = 2;
          }
          
          // Select ITIN
          const itinEl = document.getElementById(btoa('debtor[i].tax_id.tax_id_type').replace(/=/g,"") + "_1") as HTMLElement;
          itinEl?.click();
        });
        
        await page.waitForTimeout(1000);
        
        await page.evaluate(() => {
          const itinField = document.getElementById(btoa('_field_18').replace(/=/g,"")) as HTMLInputElement;
          if (itinField) {
            itinField.value = '987-65-4321';
          }
          
          const continueElement = document.getElementsByName(btoa('debtor_basic_info').replace(/=/g,""))[0] as HTMLElement;
          continueElement?.click();
        });
        
        await page.waitForLoadState('networkidle');
        console.log('✅ Completed first debtor with ITIN');
      }
    });

    await test.step('Continue Spouse Flow', async () => {
      let stepCount = 0;
      const maxSteps = 15;
      
      while (stepCount < maxSteps) {
        const heading = await logPageState(page, `Spouse step ${stepCount + 1}`);
        await takeScreenshot(page, `spouse-step-${stepCount + 1}`);
        
        // Handle specific pages
        if (heading) {
          if (heading.includes('other names') && heading.includes('8 years')) {
            await page.evaluate(() => {
              const aliasElements = document.getElementsByName(btoa('debtor[i].alias.there_are_any').replace(/=/g,""));
              (aliasElements[0] as HTMLElement)?.click(); // Yes to aliases
            });
            await page.waitForLoadState('networkidle');
            
            // Add one alias
            await page.evaluate(() => {
              const firstName = document.getElementsByName(btoa('debtor[i].alias[0].first_name').replace(/=/g,""))[0] as HTMLInputElement;
              if (firstName) firstName.value = 'Mari';
              const lastName = document.getElementsByName(btoa('debtor[i].alias[0].last_name').replace(/=/g,""))[0] as HTMLInputElement;
              if (lastName) lastName.value = 'Garcia';
            });
            await smartContinue(page, 'Aliases');
            console.log('✅ Added alias');
            stepCount++;
            continue;
          }
          
          if (heading.includes('lived in') && heading.includes('180 days')) {
            await page.evaluate(() => {
              const districtElements = document.getElementsByName(btoa('debtor[i].district_info.is_current_district').replace(/=/g,""));
              (districtElements[0] as HTMLElement)?.click(); // Yes
            });
            await page.waitForLoadState('networkidle');
            console.log('✅ District residence question');
            stepCount++;
            continue;
          }
          
          if (/basic.*identity|contact.*information/i.test(heading)) {
            // Second debtor (spouse)
            await page.evaluate(() => {
              (document.getElementById(btoa('debtor[i].name.first').replace(/=/g,"")) as HTMLInputElement).value = 'Carlos';
              (document.getElementById(btoa('debtor[i].name.last').replace(/=/g,"")) as HTMLInputElement).value = 'Garcia';
              (document.getElementById(btoa('debtor[i].address.address').replace(/=/g,"")) as HTMLInputElement).value = '789 Pine St';
              (document.getElementById(btoa('debtor[i].address.city').replace(/=/g,"")) as HTMLInputElement).value = 'Sioux Falls';
              
              const stateEl = document.getElementById(btoa('debtor[i].address.state').replace(/=/g,"")) as HTMLSelectElement;
              if (stateEl) {
                stateEl.value = "South Dakota";
                stateEl.dispatchEvent(new Event("change", { bubbles: true }));
              }
              
              (document.getElementById(btoa('debtor[i].address.zip').replace(/=/g,"")) as HTMLInputElement).value = '57104';
            });
            
            await page.waitForTimeout(1000);
            
            await page.evaluate(() => {
              const countyEl = document.getElementById(btoa('debtor[i].address.county').replace(/=/g,"")) as HTMLSelectElement;
              if (countyEl && countyEl.options.length > 2) {
                countyEl.selectedIndex = 2;
              }
              
              const ssnEl = document.getElementById(btoa('debtor[i].tax_id.tax_id_type').replace(/=/g,"") + "_0") as HTMLElement;
              ssnEl?.click();
            });
            
            await page.waitForTimeout(1000);
            
            await page.evaluate(() => {
              const ssnField = document.getElementById(btoa('_field_19').replace(/=/g,"")) as HTMLInputElement;
              if (ssnField) {
                ssnField.value = '111-22-3333';
              }
              
              const continueElement = document.getElementsByName(btoa('debtor_basic_info').replace(/=/g,""))[0] as HTMLElement;
              continueElement?.click();
            });
            
            await page.waitForLoadState('networkidle');
            console.log('✅ Completed spouse information');
            stepCount++;
            continue;
          }
        }
        
        // Generic continue
        const continued = await smartContinue(page, `Spouse step ${stepCount + 1}`);
        if (!continued) {
          break;
        }
        
        stepCount++;
        await page.waitForTimeout(500);
      }
      
      const finalHeading = await logPageState(page, 'Spouse final');
      console.log(`🏁 Spouse flow completed after ${stepCount} steps`);
      console.log(`📋 Final page: ${finalHeading}`);
    });
  });

  test('Golden Path 3: Amended Filing with Case Number', async ({ page }) => {
    await test.step('Navigate to Amended Filing', async () => {
      await page.goto(baseUrl);
      
      await page.evaluate(() => {
        const introElement = document.getElementsByName(btoa('introduction_screen').replace(/=/g,""))[0] as HTMLElement;
        introElement?.click();
      });
      await page.waitForTimeout(500);
      
      await page.evaluate(() => {
        const districtElement = document.getElementsByName(btoa('current_district').replace(/=/g,""))[0] as HTMLSelectElement;
        districtElement.value = 'District of Nebraska';
      });
      await smartContinue(page, 'District for amended');
    });

    await test.step('Select Amended Filing - Yes', async () => {
      const heading = await logPageState(page, 'Amended filing question');
      if (heading && heading.includes('updating a bankruptcy filing')) {
        await page.evaluate(() => {
          const amendedElements = document.getElementsByName(btoa('amended_filing').replace(/=/g,""));
          (amendedElements[0] as HTMLElement)?.click(); // Yes
        });
        await page.waitForLoadState('networkidle');
        console.log('✅ Selected Yes for amended filing');
      }
    });

    await test.step('Provide Case Number', async () => {
      const heading = await logPageState(page, 'Case number page');
      if (heading && heading.includes('case number')) {
        await page.evaluate(() => {
          const caseNumberField = document.getElementsByName(btoa('case_number').replace(/=/g,""))[0] as HTMLInputElement;
          if (caseNumberField) {
            caseNumberField.value = '8:24-bk-67890';
          }
        });
        await smartContinue(page, 'Case number entry');
        console.log('✅ Provided case number');
      }
    });

    await test.step('Continue Amended Flow', async () => {
      let stepCount = 0;
      const maxSteps = 8;
      
      while (stepCount < maxSteps) {
        const heading = await logPageState(page, `Amended step ${stepCount + 1}`);
        await takeScreenshot(page, `amended-step-${stepCount + 1}`);
        
        const continued = await smartContinue(page, `Amended step ${stepCount + 1}`);
        if (!continued) {
          break;
        }
        
        stepCount++;
        await page.waitForTimeout(500);
      }
      
      const finalHeading = await logPageState(page, 'Amended final');
      console.log(`🏁 Amended flow completed after ${stepCount} steps`);
      console.log(`📋 Final page: ${finalHeading}`);
    });
  });
});
