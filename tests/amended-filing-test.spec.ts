import { test, expect } from '@playwright/test';

test.describe('Bankruptcy Clinic - Amended Filing Path Test', () => {
  
  const baseUrl = 'https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1';

  test('should handle amended filing path with case number', async ({ page }) => {
    
    await test.step('Navigate to interview start', async () => {
      await page.goto(baseUrl);
      await expect(page.getByRole('heading', { name: 'Voluntary Petition for Individuals Filing for Bankruptcy' })).toBeVisible();
    });

    await test.step('Handle introduction screen', async () => {
      await page.evaluate(() => {
        const element = document.getElementsByName(btoa('introduction_screen').replace(/=/g,""))[0] as HTMLElement;
        element?.click();
      });
      await page.waitForLoadState('networkidle');
    });

    await test.step('Select district - Nebraska', async () => {
      await expect(page.getByRole('heading', { name: 'What district are you filing your bankruptcy case in?' })).toBeVisible();
      
      await page.evaluate(() => {
        const districtElement = document.getElementsByName(btoa('current_district').replace(/=/g,""))[0] as HTMLSelectElement;
        districtElement.value = 'District of Nebraska';
      });
      await page.locator('#da-continue-button').click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Handle amended filing - YES (triggers case number)', async () => {
      await expect(page.getByRole('heading', { name: 'Are you updating a bankruptcy filing that has already been submitted to the court?' })).toBeVisible();
      
      // Choose YES to trigger case number input
      await page.evaluate(() => {
        const amendedElements = document.getElementsByName(btoa('amended_filing').replace(/=/g,""));
        (amendedElements[0] as HTMLElement)?.click(); // click YES button
      });
      await page.waitForTimeout(500);
      await page.locator('#da-continue-button').click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Fill case number page', async () => {
      await expect(page.getByRole('heading', { name: 'Please provide the case number for your previously submitted bankruptcy claim.' })).toBeVisible();
      
      // Fill in a valid case number as per golden instructions
      await page.evaluate(() => {
        (document.getElementsByName(btoa('case_number').replace(/=/g,""))[0] as HTMLInputElement).value = "8:23-bk-12345";
      });
      await page.locator('#da-continue-button').click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Handle district details', async () => {
      await expect(page.getByRole('heading', { name: 'District Details' })).toBeVisible();
      
      await page.evaluate(() => {
        const districtFinalElement = document.getElementsByName(btoa('district_final').replace(/=/g,""))[0] as HTMLElement;
        districtFinalElement?.click();
      });
      await page.waitForTimeout(500);
      await page.locator('#da-continue-button').click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify we reach filing status page', async () => {
      // We should now be on the filing status page
      await page.waitForSelector('h1, h2, h3', { timeout: 10000 });
      const filingHeading = await page.locator('h1, h2, h3').first().textContent();
      console.log('Filing status page heading:', filingHeading);
      
      expect(filingHeading).toContain('filing individually or with a spouse');
      console.log('✅ Successfully navigated through amended filing path with case number');
    });
  });
});
