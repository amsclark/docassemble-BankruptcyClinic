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
      const element = page.locator(`.${className}`).nth(index);
      await element.click();
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
    });
});