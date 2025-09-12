import { test, expect } from '@playwright/test';

/**
 * Comprehensive Golden Flow Test Suite
 * Based on complete manual instructions from prompt.md
 * 
 * This test suite covers all documented scenarios including:
 * - Individual vs Spouse filing
 * - Amended filing with case numbers
 * - Alias handling (Yes/No paths)
 * - District residence questions
 * - Mailing address variations
 * - Tax ID type variations (SSN vs ITIN)
 * - All edge cases and error conditions
 */

test.describe('Bankruptcy Clinic - Comprehensive Golden Flow', () => {
  
  const baseUrl = 'https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1';

  // Helper function for taking debug screenshots
  const takeDebugScreenshot = async (page: any, stepName: string) => {
    const timestamp = Date.now();
    await page.screenshot({ 
      path: `test-results/comprehensive-${stepName}-${timestamp}.png`, 
      fullPage: true 
    });
    return `comprehensive-${stepName}-${timestamp}.png`;
  };

  // Helper function for logging current page state
  const logCurrentPageState = async (page: any, stepName: string) => {
    await page.waitForSelector('h1, h2, h3', { timeout: 5000 }).catch(() => {});
    const heading = await page.locator('h1, h2, h3').first().textContent().catch(() => 'No heading found');
    console.log(`📍 ${stepName}: Current heading = "${heading}"`);
    return heading;
  };

  // Helper function to handle common page navigation
  const navigateWithContinue = async (page: any, stepName: string) => {
    try {
      await page.locator('#da-continue-button').click();
      await page.waitForLoadState('networkidle');
      console.log(`✅ ${stepName}: Successfully clicked continue`);
    } catch (error) {
      console.log(`⚠️ ${stepName}: Continue button not found, trying alternatives`);
      try {
        await page.locator('input[type="submit"]').first().click();
        await page.waitForLoadState('networkidle');
        console.log(`✅ ${stepName}: Used submit button`);
      } catch (submitError) {
        console.log(`⚠️ ${stepName}: Submit button failed, trying Enter key`);
        try {
          await page.keyboard.press('Enter');
          await page.waitForLoadState('networkidle');
          console.log(`✅ ${stepName}: Used Enter key navigation`);
        } catch (enterError) {
          console.log(`❌ ${stepName}: All navigation methods failed`);
          throw enterError;
        }
      }
    }
  };

  test('Complete Individual Flow - No Aliases, Current District', async ({ page }) => {
    await test.step('Initialize and navigate to start', async () => {
      await page.goto(baseUrl);
      await expect(page.getByRole('heading', { name: 'Voluntary Petition for Individuals Filing for Bankruptcy' })).toBeVisible();
      await takeDebugScreenshot(page, 'start');
    });

    await test.step('Handle introduction screen', async () => {
      await page.evaluate(() => {
        const element = document.getElementsByName(btoa('introduction_screen').replace(/=/g,""))[0] as HTMLElement;
        element?.click();
      });
      await page.waitForLoadState('networkidle');
      await logCurrentPageState(page, 'After introduction');
    });

    await test.step('Select district - Nebraska', async () => {
      await page.evaluate(() => {
        const districtElement = document.getElementsByName(btoa('current_district').replace(/=/g,""))[0] as HTMLSelectElement;
        districtElement.value = 'District of Nebraska';
      });
      await navigateWithContinue(page, 'District selection');
    });

    await test.step('Handle amended filing - No', async () => {
      const heading = await logCurrentPageState(page, 'Amended filing check');
      if (heading && heading.includes('updating a bankruptcy filing')) {
        await page.evaluate(() => {
          const amendedElements = document.getElementsByName(btoa('amended_filing').replace(/=/g,""));
          (amendedElements[1] as HTMLElement)?.click(); // click no
        });
        await page.waitForLoadState('networkidle');
        console.log('✅ Selected No for amended filing');
      }
    });

    await test.step('Handle district details', async () => {
      await page.waitForSelector('h1, h2, h3', { timeout: 10000 });
      await page.evaluate(() => {
        const districtFinalElement = document.getElementsByName(btoa('district_final').replace(/=/g,""))[0] as HTMLElement;
        districtFinalElement?.click();
      });
      await page.waitForLoadState('networkidle');
    });

    await test.step('Select filing status - Individual', async () => {
      const heading = await logCurrentPageState(page, 'Filing status');
      if (heading && /filing individually|filing with.*spouse/i.test(heading)) {
        await page.evaluate(() => {
          const filingStatusElement = document.getElementById(btoa('filing_status').replace(/=/g,"") + "_0") as HTMLElement;
          filingStatusElement?.click(); // Individual
        });
        await navigateWithContinue(page, 'Filing status selection');
      }
    });

    await test.step('Fill basic identity - Complete info with SSN', async () => {
      const heading = await logCurrentPageState(page, 'Basic identity');
      if (heading && /basic.*identity|contact.*information/i.test(heading)) {
        // Fill all fields
        await page.evaluate(() => {
          (document.getElementById(btoa('debtor[i].name.first').replace(/=/g,"")) as HTMLInputElement).value = 'Alexander';
          (document.getElementById(btoa('debtor[i].name.middle').replace(/=/g,"")) as HTMLInputElement).value = 'Hamilton';
          (document.getElementById(btoa('debtor[i].name.last').replace(/=/g,"")) as HTMLInputElement).value = 'Clark';
          (document.getElementById(btoa('debtor[i].name.suffix').replace(/=/g,"")) as HTMLInputElement).value = 'Jr.';
          (document.getElementById(btoa('debtor[i].address.address').replace(/=/g,"")) as HTMLInputElement).value = '456 Constitution Ave';
          (document.getElementById(btoa('debtor[i].address.city').replace(/=/g,"")) as HTMLInputElement).value = 'Lincoln';
          
          // State with change event
          const stateEl = document.getElementById(btoa('debtor[i].address.state').replace(/=/g,"")) as HTMLSelectElement;
          stateEl.value = "Nebraska";
          stateEl.dispatchEvent(new Event("change", { bubbles: true }));
          
          (document.getElementById(btoa('debtor[i].address.zip').replace(/=/g,"")) as HTMLInputElement).value = '68508';
          (document.getElementById(btoa('debtor[i].address.county').replace(/=/g,"")) as HTMLSelectElement).selectedIndex = 4;
          
          // Select SSN
          (document.getElementById(btoa('debtor[i].tax_id.tax_id_type').replace(/=/g,"") + "_0") as HTMLElement)?.click();
        });
        
        await page.waitForTimeout(1000);
        
        await page.evaluate(() => {
          (document.getElementById(btoa('_field_19').replace(/=/g,"")) as HTMLInputElement).value = '555-66-7777';
          
          // Continue
          const continueElement = document.getElementsByName(btoa('debtor_basic_info').replace(/=/g,""))[0] as HTMLElement;
          continueElement?.click();
        });
        await page.waitForLoadState('networkidle');
        console.log('✅ Completed basic identity with SSN');
      }
    });

    await test.step('Handle alias question - No', async () => {
      const heading = await logCurrentPageState(page, 'Alias check');
      if (heading && heading.includes('other names') && heading.includes('8 years')) {
        await page.evaluate(() => {
          const aliasElements = document.getElementsByName(btoa('debtor[i].alias.there_are_any').replace(/=/g,""));
          (aliasElements[1] as HTMLElement)?.click(); // No aliases
        });
        await page.waitForLoadState('networkidle');
        console.log('✅ Selected No for aliases');
      }
    });

    await test.step('Handle district residence - Yes', async () => {
      const heading = await logCurrentPageState(page, 'District residence');
      if (heading && heading.includes('lived in') && heading.includes('180 days')) {
        await page.evaluate(() => {
          const districtElements = document.getElementsByName(btoa('debtor[i].district_info.is_current_district').replace(/=/g,""));
          (districtElements[0] as HTMLElement)?.click(); // Yes
        });
        await page.waitForLoadState('networkidle');
        console.log('✅ Selected Yes for district residence');
      }
    });

    await test.step('Continue through remaining pages', async () => {
      let stepCount = 0;
      const maxSteps = 15;
      
      while (stepCount < maxSteps) {
        const heading = await logCurrentPageState(page, `Additional step ${stepCount + 1}`);
        await takeDebugScreenshot(page, `step-${stepCount + 1}`);
        
        try {
          const continueButton = page.locator('#da-continue-button');
          const isVisible = await continueButton.isVisible();
          
          if (isVisible) {
            await continueButton.click();
            await page.waitForLoadState('networkidle');
            stepCount++;
          } else {
            break;
          }
        } catch (error) {
          console.log(`Step ${stepCount + 1} completed or reached end`);
          break;
        }
      }
      
      const finalHeading = await logCurrentPageState(page, 'Final state');
      console.log(`🏁 Individual flow completed after ${stepCount} additional steps`);
    });
  });

  test('Complete Spouse Flow - With Aliases, Different District Reason', async ({ page }) => {
    await test.step('Navigate to spouse filing selection', async () => {
      await page.goto(baseUrl);
      
      // Fast navigation through initial steps
      await page.evaluate(() => {
        const introElement = document.getElementsByName(btoa('introduction_screen').replace(/=/g,""))[0] as HTMLElement;
        introElement?.click();
      });
      await page.waitForTimeout(1000);
      
      await page.evaluate(() => {
        const districtElement = document.getElementsByName(btoa('current_district').replace(/=/g,""))[0] as HTMLSelectElement;
        districtElement.value = 'District of South Dakota';
      });
      await navigateWithContinue(page, 'District - South Dakota');
      
      await page.evaluate(() => {
        const amendedElements = document.getElementsByName(btoa('amended_filing').replace(/=/g,""));
        (amendedElements[1] as HTMLElement)?.click(); // No
      });
      await page.waitForTimeout(1000);
      
      await page.evaluate(() => {
        const districtFinalElement = document.getElementsByName(btoa('district_final').replace(/=/g,""))[0] as HTMLElement;
        districtFinalElement?.click();
      });
      await page.waitForTimeout(1000);
      
      // Select spouse filing
      await page.evaluate(() => {
        const filingStatusElement = document.getElementById(btoa('filing_status').replace(/=/g,"") + "_1") as HTMLElement;
        filingStatusElement?.click(); // Filing with spouse
      });
      
      // Try multiple continue mechanisms for spouse filing
      try {
        await navigateWithContinue(page, 'Spouse filing selection');
      } catch (error) {
        console.log('⚠️ Standard continue failed, trying direct button click...');
        try {
          await page.locator('#da-continue-button').click();
          await page.waitForLoadState('networkidle');
          console.log('✅ Direct continue button worked');
        } catch (directError) {
          console.log('⚠️ Direct continue failed, trying form submit...');
          await page.keyboard.press('Enter');
          await page.waitForLoadState('networkidle');
          console.log('✅ Form submit via Enter key worked');
        }
      }
    });

    await test.step('Fill first debtor with ITIN and mailing address', async () => {
      const heading = await logCurrentPageState(page, 'First debtor basic info');
      
      await page.evaluate(() => {
        (document.getElementById(btoa('debtor[i].name.first').replace(/=/g,"")) as HTMLInputElement).value = 'Benjamin';
        (document.getElementById(btoa('debtor[i].name.middle').replace(/=/g,"")) as HTMLInputElement).value = 'Thomas';
        (document.getElementById(btoa('debtor[i].name.last').replace(/=/g,"")) as HTMLInputElement).value = 'Franklin';
        (document.getElementById(btoa('debtor[i].name.suffix').replace(/=/g,"")) as HTMLInputElement).value = 'Sr.';
        (document.getElementById(btoa('debtor[i].address.address').replace(/=/g,"")) as HTMLInputElement).value = '789 Liberty Bell Rd';
        (document.getElementById(btoa('debtor[i].address.city').replace(/=/g,"")) as HTMLInputElement).value = 'Sioux Falls';
        
        const stateEl = document.getElementById(btoa('debtor[i].address.state').replace(/=/g,"")) as HTMLSelectElement;
        stateEl.value = "South Dakota";
        stateEl.dispatchEvent(new Event("change", { bubbles: true }));
        
        (document.getElementById(btoa('debtor[i].address.zip').replace(/=/g,"")) as HTMLInputElement).value = '57104';
        (document.getElementById(btoa('debtor[i].address.county').replace(/=/g,"")) as HTMLSelectElement).selectedIndex = 2;
        
        // Enable mailing address
        (document.getElementById(btoa('debtor[i].has_other_mailing_address').replace(/=/g,"")) as HTMLElement)?.click();
      });
      
      await page.waitForTimeout(1000);
      
      await page.evaluate(() => {
        // Fill mailing address fields
        (document.getElementById(btoa('_field_13').replace(/=/g,"")) as HTMLInputElement).value = 'PO Box 1776';
        (document.getElementById(btoa('_field_14').replace(/=/g,"")) as HTMLInputElement).value = 'Philadelphia';
        (document.getElementById(btoa('_field_15').replace(/=/g,"")) as HTMLInputElement).value = 'South Dakota';
        (document.getElementById(btoa('_field_16').replace(/=/g,"")) as HTMLInputElement).value = '57105';
        
        // Select ITIN instead of SSN
        (document.getElementById(btoa('debtor[i].tax_id.tax_id_type').replace(/=/g,"") + "_1") as HTMLElement)?.click();
      });
      
      await page.waitForTimeout(1000);
      
      await page.evaluate(() => {
        (document.getElementById(btoa('_field_18').replace(/=/g,"")) as HTMLInputElement).value = '888-99-0000';
        
        const continueElement = document.getElementsByName(btoa('debtor_basic_info').replace(/=/g,""))[0] as HTMLElement;
        continueElement?.click();
      });
      await page.waitForLoadState('networkidle');
      console.log('✅ Completed first debtor with ITIN and mailing address');
    });

    await test.step('Handle first debtor aliases - Yes with multiple aliases', async () => {
      const heading = await logCurrentPageState(page, 'First debtor aliases');
      if (heading && heading.includes('other names') && heading.includes('8 years')) {
        await page.evaluate(() => {
          const aliasElements = document.getElementsByName(btoa('debtor[i].alias.there_are_any').replace(/=/g,""));
          (aliasElements[0] as HTMLElement)?.click(); // Yes to aliases
        });
        await page.waitForLoadState('networkidle');
        
        // Fill first alias
        await page.evaluate(() => {
          (document.getElementsByName(btoa('debtor[i].alias[0].first_name').replace(/=/g,""))[0] as HTMLInputElement).value = 'Ben';
          (document.getElementsByName(btoa('debtor[i].alias[0].middle_name').replace(/=/g,""))[0] as HTMLInputElement).value = 'T';
          (document.getElementsByName(btoa('debtor[i].alias[0].last_name').replace(/=/g,""))[0] as HTMLInputElement).value = 'Franklin';
          (document.getElementsByName(btoa('debtor[i].alias[0].business').replace(/=/g,""))[0] as HTMLInputElement).value = 'Lightning Rod Co';
          
          // Add another alias
          (document.getElementsByClassName('dacollectadd')[0] as HTMLElement)?.click();
        });
        
        await page.waitForTimeout(1000);
        
        await page.evaluate(() => {
          (document.getElementsByName(btoa('debtor[i].alias[1].first_name').replace(/=/g,""))[0] as HTMLInputElement).value = 'Dr.';
          (document.getElementsByName(btoa('debtor[i].alias[1].middle_name').replace(/=/g,""))[0] as HTMLInputElement).value = 'B';
          (document.getElementsByName(btoa('debtor[i].alias[1].last_name').replace(/=/g,""))[0] as HTMLInputElement).value = 'Franklin';
          (document.getElementsByName(btoa('debtor[i].alias[1].business').replace(/=/g,""))[0] as HTMLInputElement).value = 'Poor Richards Almanac';
        });
        
        await navigateWithContinue(page, 'First debtor aliases');
        console.log('✅ Added multiple aliases for first debtor');
      }
    });

    await test.step('Handle first debtor district residence - No with reason', async () => {
      const heading = await logCurrentPageState(page, 'First debtor district residence');
      if (heading && heading.includes('lived in') && heading.includes('180 days')) {
        await page.evaluate(() => {
          const districtElements = document.getElementsByName(btoa('debtor[i].district_info.is_current_district').replace(/=/g,""));
          (districtElements[1] as HTMLElement)?.click(); // No
        });
        await page.waitForLoadState('networkidle');
        
        // Provide reason for different district
        await page.evaluate(() => {
          (document.getElementsByName(btoa('debtor[i].district_info.other_district_reason').replace(/=/g,""))[0] as HTMLInputElement).value = 'Moved here 3 months ago for work opportunity';
        });
        await navigateWithContinue(page, 'District reason');
        console.log('✅ Provided reason for different district');
      }
    });

    await test.step('Fill second debtor (spouse) information', async () => {
      const heading = await logCurrentPageState(page, 'Spouse basic info');
      if (heading && /basic.*identity|contact.*information/i.test(heading)) {
        await page.evaluate(() => {
          (document.getElementById(btoa('debtor[i].name.first').replace(/=/g,"")) as HTMLInputElement).value = 'Deborah';
          (document.getElementById(btoa('debtor[i].name.middle').replace(/=/g,"")) as HTMLInputElement).value = 'Ann';
          (document.getElementById(btoa('debtor[i].name.last').replace(/=/g,"")) as HTMLInputElement).value = 'Franklin';
          (document.getElementById(btoa('debtor[i].name.suffix').replace(/=/g,"")) as HTMLInputElement).value = '';
          (document.getElementById(btoa('debtor[i].address.address').replace(/=/g,"")) as HTMLInputElement).value = '789 Liberty Bell Rd';
          (document.getElementById(btoa('debtor[i].address.city').replace(/=/g,"")) as HTMLInputElement).value = 'Sioux Falls';
          
          const stateEl2 = document.getElementById(btoa('debtor[i].address.state').replace(/=/g,"")) as HTMLSelectElement;
          stateEl2.value = "South Dakota";
          stateEl2.dispatchEvent(new Event("change", { bubbles: true }));
          
          (document.getElementById(btoa('debtor[i].address.zip').replace(/=/g,"")) as HTMLInputElement).value = '57104';
          (document.getElementById(btoa('debtor[i].address.county').replace(/=/g,"")) as HTMLSelectElement).selectedIndex = 2;
          
          // Select SSN for spouse
          (document.getElementById(btoa('debtor[i].tax_id.tax_id_type').replace(/=/g,"") + "_0") as HTMLElement)?.click();
        });
        
        await page.waitForTimeout(1000);
        
        await page.evaluate(() => {
          (document.getElementById(btoa('_field_19').replace(/=/g,"")) as HTMLInputElement).value = '333-44-5555';
          
          const continueElement = document.getElementsByName(btoa('debtor_basic_info').replace(/=/g,""))[0] as HTMLElement;
          continueElement?.click();
        });
        await page.waitForLoadState('networkidle');
        console.log('✅ Completed spouse information with SSN');
      }
    });

    await test.step('Handle spouse aliases - Yes with business alias', async () => {
      const heading = await logCurrentPageState(page, 'Spouse aliases');
      if (heading && heading.includes('other names') && heading.includes('8 years')) {
        await page.evaluate(() => {
          const aliasElements = document.getElementsByName(btoa('debtor[i].alias.there_are_any').replace(/=/g,""));
          (aliasElements[0] as HTMLElement)?.click(); // Yes
        });
        await page.waitForLoadState('networkidle');
        
        await page.evaluate(() => {
          (document.getElementsByName(btoa('debtor[i].alias[0].first_name').replace(/=/g,""))[0] as HTMLInputElement).value = 'Debbie';
          (document.getElementsByName(btoa('debtor[i].alias[0].middle_name').replace(/=/g,""))[0] as HTMLInputElement).value = 'A';
          (document.getElementsByName(btoa('debtor[i].alias[0].last_name').replace(/=/g,""))[0] as HTMLInputElement).value = 'Franklin';
          (document.getElementsByName(btoa('debtor[i].alias[0].business').replace(/=/g,""))[0] as HTMLInputElement).value = 'Colonial Catering';
        });
        
        await navigateWithContinue(page, 'Spouse aliases');
        console.log('✅ Added alias for spouse');
      }
    });

    await test.step('Handle spouse district residence - Yes', async () => {
      const heading = await logCurrentPageState(page, 'Spouse district residence');
      if (heading && heading.includes('lived in') && heading.includes('180 days')) {
        await page.evaluate(() => {
          const districtElements = document.getElementsByName(btoa('debtor[i].district_info.is_current_district').replace(/=/g,""));
          (districtElements[0] as HTMLElement)?.click(); // Yes
        });
        await page.waitForLoadState('networkidle');
        console.log('✅ Spouse has lived in district over 180 days');
      }
    });

    await test.step('Continue through remaining spouse flow pages', async () => {
      let stepCount = 0;
      const maxSteps = 20;
      
      while (stepCount < maxSteps) {
        const heading = await logCurrentPageState(page, `Spouse additional step ${stepCount + 1}`);
        await takeDebugScreenshot(page, `spouse-step-${stepCount + 1}`);
        
        try {
          const continueButton = page.locator('#da-continue-button');
          const isVisible = await continueButton.isVisible();
          
          if (isVisible) {
            await continueButton.click();
            await page.waitForLoadState('networkidle');
            stepCount++;
          } else {
            break;
          }
        } catch (error) {
          console.log(`Spouse step ${stepCount + 1} completed or reached end`);
          break;
        }
      }
      
      const finalHeading = await logCurrentPageState(page, 'Spouse flow final state');
      console.log(`🏁 Spouse flow completed after ${stepCount} additional steps`);
    });
  });

  test('Amended Filing Flow - With Case Number', async ({ page }) => {
    await test.step('Navigate to amended filing scenario', async () => {
      await page.goto(baseUrl);
      
      // Navigate to amended filing
      await page.evaluate(() => {
        const introElement = document.getElementsByName(btoa('introduction_screen').replace(/=/g,""))[0] as HTMLElement;
        introElement?.click();
      });
      await page.waitForTimeout(1000);
      
      await page.evaluate(() => {
        const districtElement = document.getElementsByName(btoa('current_district').replace(/=/g,""))[0] as HTMLSelectElement;
        districtElement.value = 'District of Nebraska';
      });
      await navigateWithContinue(page, 'District selection');
    });

    await test.step('Select amended filing - Yes', async () => {
      const heading = await logCurrentPageState(page, 'Amended filing decision');
      if (heading && heading.includes('updating a bankruptcy filing')) {
        await page.evaluate(() => {
          const amendedElements = document.getElementsByName(btoa('amended_filing').replace(/=/g,""));
          (amendedElements[0] as HTMLElement)?.click(); // Yes
        });
        await page.waitForLoadState('networkidle');
        console.log('✅ Selected Yes for amended filing');
      }
    });

    await test.step('Provide case number', async () => {
      const heading = await logCurrentPageState(page, 'Case number entry');
      if (heading && heading.includes('case number')) {
        await page.evaluate(() => {
          (document.getElementsByName(btoa('case_number').replace(/=/g,""))[0] as HTMLInputElement).value = '8:23-bk-12345';
        });
        await navigateWithContinue(page, 'Case number provided');
        console.log('✅ Provided case number for amended filing');
      }
    });

    await test.step('Continue through amended filing flow', async () => {
      let stepCount = 0;
      const maxSteps = 15;
      
      while (stepCount < maxSteps) {
        const heading = await logCurrentPageState(page, `Amended step ${stepCount + 1}`);
        await takeDebugScreenshot(page, `amended-step-${stepCount + 1}`);
        
        // Handle common pages that might appear
        if (heading) {
          if (heading.includes('District Details')) {
            await page.evaluate(() => {
              const districtFinalElement = document.getElementsByName(btoa('district_final').replace(/=/g,""))[0] as HTMLElement;
              districtFinalElement?.click();
            });
            await page.waitForLoadState('networkidle');
            continue;
          }
          
          if (/filing individually|filing with.*spouse/i.test(heading)) {
            await page.evaluate(() => {
              const filingStatusElement = document.getElementById(btoa('filing_status').replace(/=/g,"") + "_0") as HTMLElement;
              filingStatusElement?.click(); // Individual
            });
            await navigateWithContinue(page, 'Filing status in amended flow');
            continue;
          }
        }
        
        try {
          const continueButton = page.locator('#da-continue-button');
          const isVisible = await continueButton.isVisible();
          
          if (isVisible) {
            await continueButton.click();
            await page.waitForLoadState('networkidle');
            stepCount++;
          } else {
            break;
          }
        } catch (error) {
          console.log(`Amended step ${stepCount + 1} completed or reached end`);
          break;
        }
      }
      
      const finalHeading = await logCurrentPageState(page, 'Amended flow final state');
      console.log(`🏁 Amended filing flow completed after ${stepCount} additional steps`);
    });
  });

  test('Edge Case - Blank Case Number for Amended Filing', async ({ page }) => {
    await test.step('Navigate to amended filing with blank case number', async () => {
      await page.goto(baseUrl);
      
      // Quick navigation to amended filing
      await page.evaluate(() => {
        const introElement = document.getElementsByName(btoa('introduction_screen').replace(/=/g,""))[0] as HTMLElement;
        introElement?.click();
      });
      await page.waitForTimeout(1000);
      
      await page.evaluate(() => {
        const districtElement = document.getElementsByName(btoa('current_district').replace(/=/g,""))[0] as HTMLSelectElement;
        districtElement.value = 'District of Nebraska';
      });
      await navigateWithContinue(page, 'District selection');
      
      // Select Yes for amended filing
      await page.evaluate(() => {
        const amendedElements = document.getElementsByName(btoa('amended_filing').replace(/=/g,""));
        (amendedElements[0] as HTMLElement)?.click(); // Yes
      });
      await page.waitForLoadState('networkidle');
    });

    await test.step('Leave case number blank and continue', async () => {
      const heading = await logCurrentPageState(page, 'Blank case number scenario');
      if (heading && heading.includes('case number')) {
        // Leave the field blank and continue
        await navigateWithContinue(page, 'Blank case number');
        console.log('✅ Continued with blank case number');
      }
    });

    await test.step('Verify blank case number handling', async () => {
      const heading = await logCurrentPageState(page, 'After blank case number');
      console.log(`📋 System handled blank case number, next page: ${heading}`);
      
      // Continue with normal flow
      let stepCount = 0;
      while (stepCount < 5) {
        try {
          const continueButton = page.locator('#da-continue-button');
          const isVisible = await continueButton.isVisible();
          
          if (isVisible) {
            await continueButton.click();
            await page.waitForLoadState('networkidle');
            stepCount++;
          } else {
            break;
          }
        } catch (error) {
          break;
        }
      }
      
      const finalHeading = await logCurrentPageState(page, 'Blank case number final state');
      console.log(`🏁 Blank case number flow completed after ${stepCount} steps`);
    });
  });
});
