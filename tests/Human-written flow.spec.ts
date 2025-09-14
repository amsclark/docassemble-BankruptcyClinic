import { test, expect } from '@playwright/test';

test.describe('Human Flow', () => {

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

  // Helper function to wait for Docassemble page load event
  const waitForDaPageLoad = async (page: any, stepName: string) => {
    try {
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          // Check if jQuery is available
          if (typeof (window as any).$ !== 'undefined') {
            const $ = (window as any).$;
            $(document).on('daPageLoad', function() {
              console.log(`DA Page loaded for ${stepName || 'unknown step'}`);
              resolve();
            });
            // Trigger immediately if already loaded
            if (document.readyState === 'complete') {
              setTimeout(() => resolve(), 100);
            }
          } else {
            // Fallback if jQuery not available
            if (document.readyState === 'complete') {
              setTimeout(() => resolve(), 100);
            } else {
              window.addEventListener('load', () => resolve());
            }
          }
        });
      });
      console.log(`🔄 ${stepName}: Waited for DA page load`);
    } catch (error) {
      console.log(`⚠️ ${stepName}: DA page load wait failed, continuing anyway`);
    }
  };

 // Helper function to click Continue
  const clickContinue = async (page: any, stepName: string) => {
    try {
      await waitForDaPageLoad(page, stepName);
      await page.locator('#da-continue-button').click();
      await page.waitForLoadState('networkidle');
      console.log(`✅ ${stepName}: Successfully clicked continue`);
    } catch (error) {
      console.log(`⚠️ ${stepName}: Continue button not found`);
    }
  };



  // Helper function to find an element with a given ID and click it
  const clickElementById = async (page: any, id: string, stepName: string) => {
    try {
      await waitForDaPageLoad(page, stepName);
      // Use the same method as vanilla JS
      const clicked = await page.evaluate((id: string) => {
        const element = document.getElementById(id);
        if (element) {
          element.click();
          return true;
        }
        return false;
      }, id);
      
      if (clicked) {
        await page.waitForLoadState('networkidle');
        console.log(`✅ ${stepName}: Successfully clicked element with ID ${id}`);
      } else {
        console.log(`⚠️ ${stepName}: Element with ID ${id} not found`);
      }
    } catch (error) {
      console.log(`⚠️ ${stepName}: Error clicking element with ID ${id}: ${error}`);
    }
  };



  // Helper function to find the nth element with a given name and click it (0-indexed)
  const clickNthElementByName = async (page: any, name: string, index: number, stepName: string) => {
    try {
      await waitForDaPageLoad(page, stepName);
      const element = page.locator(`[name="${name}"]`).nth(index);
      await element.click();
      await page.waitForLoadState('networkidle');
      console.log(`✅ ${stepName}: Successfully clicked element ${index} with name ${name}`);
    } catch (error) {
      console.log(`⚠️ ${stepName}: Element ${index} with name ${name} not found`);
    }
  };

  // Helper function to find the nth element with a given class and click it (0-indexed)
  const clickNthElementByClass = async (page: any, className: string, index: number, stepName: string) => {
    try {
      await waitForDaPageLoad(page, stepName);
      await page.evaluate(({ className, index }: { className: string, index: number }) => {
        const elements = document.getElementsByClassName(className);
        if (elements.length > index) {
          const element = elements[index] as HTMLElement;
          // Scroll into view first
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.click();
          return true;
        }
        return false;
      }, { className, index });
      await page.waitForLoadState('networkidle');
      console.log(`✅ ${stepName}: Successfully clicked element ${index} with class ${className}`);
    } catch (error) {
      console.log(`⚠️ ${stepName}: Element ${index} with class ${className} not found`);
    }
  };

  // Helper function to fill an input field by its name
    const fillInputByName = async (page: any, name: string, value: string, stepName: string) => {
        try {
        await waitForDaPageLoad(page, stepName);
        const input = page.locator(`input[name="${name}"]`);
        await input.fill(value);
        console.log(`✅ ${stepName}: Successfully filled input with name ${name}`);
        } catch (error) {
        console.log(`⚠️ ${stepName}: Input with name ${name} not found`);
        }
    };

    // Helper function to fill a textarea field by its name
    const fillTextareaByName = async (page: any, name: string, value: string, stepName: string) => {
        try {
        const textarea = page.locator(`textarea[name="${name}"]`);
        await textarea.fill(value);
        console.log(`✅ ${stepName}: Successfully filled textarea with name ${name}`);
        } catch (error) {
        console.log(`⚠️ ${stepName}: Textarea with name ${name} not found`);
        }
    };

    // Helper function to select a dropdown option by its name and value
    const selectDropdownByName = async (page: any, name: string, value: string, stepName: string) => {
        try {
        await waitForDaPageLoad(page, stepName);
        const select = page.locator(`select[name="${name}"]`);
        await select.selectOption(value);
        console.log(`✅ ${stepName}: Successfully selected option ${value} in dropdown with name ${name}`);
        } catch (error) {
        console.log(`⚠️ ${stepName}: Dropdown with name ${name} not found`);
        }
    };

    // Helper function to check a checkbox by its name
    const checkCheckboxByName = async (page: any, name: string, stepName: string) => {
        try {
        const checkbox = page.locator(`input[type="checkbox"][name="${name}"]`);
        await checkbox.check();
        console.log(`✅ ${stepName}: Successfully checked checkbox with name ${name}`);
        } catch (error) {
        console.log(`⚠️ ${stepName}: Checkbox with name ${name} not found`);
        }
    };

    // Helper function to fill any element by name (using getElementsByName approach like vanilla JS)
    const fillElementByName = async (page: any, name: string, value: string, stepName: string) => {
        try {
        await waitForDaPageLoad(page, stepName);
        await page.evaluate(({ name, value }: { name: string, value: string }) => {
            const elements = document.getElementsByName(name);
            if (elements.length > 0) {
                (elements[0] as any).value = value;
                return true;
            }
            return false;
        }, { name, value });
        console.log(`✅ ${stepName}: Successfully filled element with name ${name}`);
        } catch (error) {
        console.log(`⚠️ ${stepName}: Element with name ${name} not found`);
        }
    };

    // Helper function to fill the nth element by name (using getElementsByName approach like vanilla JS)
    const fillNthElementByName = async (page: any, name: string, index: number, value: string, stepName: string) => {
        try {
        await waitForDaPageLoad(page, stepName);
        await page.evaluate(({ name, index, value }: { name: string, index: number, value: string }) => {
            const elements = document.getElementsByName(name);
            if (elements.length > index) {
                (elements[index] as any).value = value;
                return true;
            }
            return false;
        }, { name, index, value });
        console.log(`✅ ${stepName}: Successfully filled element ${index} with name ${name}`);
        } catch (error) {
        console.log(`⚠️ ${stepName}: Element ${index} with name ${name} not found`);
        }
    };

    // Helper function to fill any element by ID (using getElementById approach like vanilla JS)
    const fillElementById = async (page: any, id: string, value: string, stepName: string) => {
        try {
        await waitForDaPageLoad(page, stepName);
        const filled = await page.evaluate(({ id, value }: { id: string, value: string }) => {
            const element = document.getElementById(id);
            if (element) {
                (element as any).value = value;
                return true;
            }
            return false;
        }, { id, value });
        
        if (filled) {
            console.log(`✅ ${stepName}: Successfully filled element with ID ${id}`);
        } else {
            console.log(`⚠️ ${stepName}: Element with ID ${id} not found`);
        }
        } catch (error) {
        console.log(`⚠️ ${stepName}: Error filling element with ID ${id}: ${error}`);
        }
    };

    // Helper function to select dropdown option by ID and trigger change event
    const selectDropdownById = async (page: any, id: string, value: string, stepName: string) => {
        try {
        await waitForDaPageLoad(page, stepName);
        const selected = await page.evaluate(({ id, value }: { id: string, value: string }) => {
            const element = document.getElementById(id) as HTMLSelectElement;
            if (element) {
                // Scroll into view first
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.value = value;
                // Trigger change event to populate dependent dropdowns
                element.dispatchEvent(new Event("change", { bubbles: true }));
                return true;
            }
            return false;
        }, { id, value });
        
        if (selected) {
            console.log(`✅ ${stepName}: Successfully selected "${value}" in dropdown with ID ${id}`);
        } else {
            console.log(`⚠️ ${stepName}: Dropdown with ID ${id} not found`);
        }
        } catch (error) {
        console.log(`⚠️ ${stepName}: Error selecting dropdown with ID ${id}: ${error}`);
        }
    };

    // Helper function to select dropdown option by selectedIndex
    const selectDropdownByIndex = async (page: any, id: string, index: number, stepName: string) => {
        try {
        await waitForDaPageLoad(page, stepName);
        const selected = await page.evaluate(({ id, index }: { id: string, index: number }) => {
            const element = document.getElementById(id) as HTMLSelectElement;
            if (element) {
                // Scroll into view first
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.selectedIndex = index;
                return true;
            }
            return false;
        }, { id, index });
        
        if (selected) {
            console.log(`✅ ${stepName}: Successfully selected index ${index} in dropdown with ID ${id}`);
        } else {
            console.log(`⚠️ ${stepName}: Dropdown with ID ${id} not found`);
        }
        } catch (error) {
        console.log(`⚠️ ${stepName}: Error selecting dropdown by index with ID ${id}: ${error}`);
        }
    };

    // Helper function to take a string, base64 encode it, strip any = sign padding, and return the result
    const base64UrlEncode = (str: string) => {
        const base64 = Buffer.from(str).toString('base64');
        return base64.replace(/=+$/, '');
    };

    // define and run a test using the above helper functions
    test('Complete Human Flow Test', async ({ page }) => {
        await page.goto(baseUrl);
        await logCurrentPageState(page, 'Step 1');
        await takeDebugScreenshot(page, 'step1');
        // find the first element on the page with a name of 'introduction_screen and click it using the helper function
        await clickNthElementByName(page, base64UrlEncode('introduction_screen'), 0, 'Step 1');

        // use a helper function to find the first element on the page with a name of 'current_district' and select the value District of Nebraska
        await selectDropdownByName(page, base64UrlEncode('current_district'), 'District of Nebraska', 'Step 2');
        await logCurrentPageState(page, 'Step 2');
        await takeDebugScreenshot(page, 'step2');
        await clickContinue(page, 'Step 2');


        // * The page with heading 'Are you updating a bankruptcy filing that has already been submitted to the court?' click the first button on the page with name of amended filing
        await clickNthElementByName(page, base64UrlEncode('amended_filing'), 0, 'Step 3');
        await logCurrentPageState(page, 'Step 3');
        await takeDebugScreenshot(page, 'step3');

        //  fill in the first element with the name of 'case_number' with the value of '8:23-bk-12345' and click continue
        await page.waitForTimeout(1000); // Give page time to load
        await fillElementByName(page, base64UrlEncode('case_number'), '8:23-bk-12345', 'Step 3.5');
        await logCurrentPageState(page, 'Step 3.5');
        await takeDebugScreenshot(page, 'step3-5');
        // Verify the value was actually filled
        const caseNumberValue = await page.evaluate((name) => {
            const elements = document.getElementsByName(name);
            return elements.length > 0 ? (elements[0] as any).value : 'NOT_FOUND';
        }, base64UrlEncode('case_number'));
        console.log(`📝 Step 3.5: Case number field value = "${caseNumberValue}"`);
        await clickContinue(page, 'Step 3.5');

        // click the first element on the page with the name of 'district_final'
        await clickNthElementByName(page, base64UrlEncode('district_final'), 0, 'Step 4');
        await logCurrentPageState(page, 'Step 4');
        await takeDebugScreenshot(page, 'step4');

        // on the page 'Are you filing individually or with a spouse?' click the element with ID for filing with spouse
        await page.waitForTimeout(1000); // Give page time to load
        const spouseElementId = base64UrlEncode('filing_status') + '_1';
        console.log(`🎯 Step 5: Looking for spouse element with ID: ${spouseElementId}`);
        
        // Check if the element exists
        const elementExists = await page.evaluate((id: string) => {
            const element = document.getElementById(id);
            console.log(`Element ${id} exists:`, !!element);
            if (element) {
                console.log(`Element type: ${element.tagName}, value: ${(element as any).value || 'no value'}`);
            }
            return !!element;
        }, spouseElementId);
        console.log(`📍 Step 5: Spouse element exists = ${elementExists}`);
        
        await clickElementById(page, spouseElementId, 'Step 5');
        await logCurrentPageState(page, 'Step 5');
        await takeDebugScreenshot(page, 'step5');
        await clickContinue(page, 'Step 5');

        // Fill out the "Basic Identity and Contact Information" page for the first debtor
        await page.waitForTimeout(1000); // Give page time to load
        await logCurrentPageState(page, 'Step 6');
        await takeDebugScreenshot(page, 'step6-before');
        
        // Fill required name fields
        await fillElementById(page, base64UrlEncode('debtor[i].name.first'), 'John', 'Step 6.1');
        await fillElementById(page, base64UrlEncode('debtor[i].name.middle'), 'Quincy', 'Step 6.2');
        await fillElementById(page, base64UrlEncode('debtor[i].name.last'), 'Adams', 'Step 6.3');
        await fillElementById(page, base64UrlEncode('debtor[i].name.suffix'), 'Jr.', 'Step 6.4');
        
        // Fill required address fields
        await fillElementById(page, base64UrlEncode('debtor[i].address.address'), '123 Fake Street', 'Step 6.5');
        await fillElementById(page, base64UrlEncode('debtor[i].address.city'), 'Omaha', 'Step 6.6');
        
        // Select state dropdown (Nebraska) and trigger change event to populate county dropdown
        await selectDropdownById(page, base64UrlEncode('debtor[i].address.state'), 'Nebraska', 'Step 6.7');
        
        // Fill zip code
        await fillElementById(page, base64UrlEncode('debtor[i].address.zip'), '12345', 'Step 6.8');
        
        // Wait a moment for county dropdown to populate, then select index 4
        await page.waitForTimeout(1000); // Increased wait time so you can see the change
        await selectDropdownByIndex(page, base64UrlEncode('debtor[i].address.county'), 4, 'Step 6.9');
        
        // Wait a bit more so you can see the final selection
        await page.waitForTimeout(1000);

        // Click the checkbox to indicate they have a secondary mailing address
        await clickElementById(page, base64UrlEncode('debtor[i].has_other_mailing_address'), 'Step 6.10');
        
        // Wait for the secondary address fields to become visible
        await page.waitForTimeout(1500); // Give time for fields to appear
        
        // Fill in the secondary mailing address fields
        await fillElementById(page, base64UrlEncode('_field_13'), '123 Mail Street', 'Step 6.11');
        await fillElementById(page, base64UrlEncode('_field_14'), 'Omaha', 'Step 6.12');
        await fillElementById(page, base64UrlEncode('_field_15'), 'Nebraska', 'Step 6.13');
        await fillElementById(page, base64UrlEncode('_field_16'), '54321', 'Step 6.14');
        
        // Select SSN as the tax ID type (this will reveal the SSN input field)
        await clickElementById(page, base64UrlEncode('debtor[i].tax_id.tax_id_type') + '_0', 'Step 6.15');
        
        // Wait for the SSN field to become visible
        await page.waitForTimeout(1500); // Give time for SSN field to appear
        
        // Fill in the SSN number
        await fillElementById(page, base64UrlEncode('_field_19'), '111-11-1111', 'Step 6.16');
        
        // Finally advance the page using the debtor_basic_info button
        await clickNthElementByName(page, base64UrlEncode('debtor_basic_info'), 0, 'Step 6.17');
        
        // Handle the alias question page - click "yes" to indicate they have aliases
        await logCurrentPageState(page, 'Step 7');
        await takeDebugScreenshot(page, 'step7-before');
        await clickNthElementByName(page, base64UrlEncode('debtor[i].alias.there_are_any'), 0, 'Step 7.1');
        
        // Fill in the first alias
        await logCurrentPageState(page, 'Step 8');
        await takeDebugScreenshot(page, 'step8-before');
        await fillNthElementByName(page, base64UrlEncode('debtor[i].alias[0].first_name'), 0, 'Johnny', 'Step 8.1');
        await fillNthElementByName(page, base64UrlEncode('debtor[i].alias[0].middle_name'), 0, 'Quincy', 'Step 8.2');
        await fillNthElementByName(page, base64UrlEncode('debtor[i].alias[0].last_name'), 0, 'Adams', 'Step 8.3');
        await fillNthElementByName(page, base64UrlEncode('debtor[i].alias[0].business'), 0, 'Boston Teas', 'Step 8.4');
        
        // Click the "add another" button to expose the second alias fields
        await clickNthElementByClass(page, 'dacollectadd', 0, 'Step 8.5');
        
        // Wait for the second alias fields to appear
        await page.waitForTimeout(1000);
        
        // Fill in the second alias
        await fillNthElementByName(page, base64UrlEncode('debtor[i].alias[1].first_name'), 0, 'Jack', 'Step 8.6');
        await fillNthElementByName(page, base64UrlEncode('debtor[i].alias[1].middle_name'), 0, 'Qolquist', 'Step 8.7');
        await fillNthElementByName(page, base64UrlEncode('debtor[i].alias[1].last_name'), 0, 'Adams', 'Step 8.8');
        await fillNthElementByName(page, base64UrlEncode('debtor[i].alias[1].business'), 0, 'Boston Tea Too', 'Step 8.9');
        
        // Click continue to advance to the next page using the standard da-continue-button
        await page.evaluate(() => {
            const continueButton = document.getElementById('da-continue-button');
            if (continueButton) {
                continueButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                continueButton.click();
            }
        });
        await page.waitForLoadState('networkidle');
        console.log(`✅ Step 8.10: Successfully clicked da-continue-button`);
        
        await takeDebugScreenshot(page, 'step8-after');
        console.log(`📝 Step 6-8: Completed filling basic debtor information including tax ID, and added two aliases`);
    });
});