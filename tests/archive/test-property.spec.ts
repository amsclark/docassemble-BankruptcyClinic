import { test, expect, Page } from '@playwright/test';

const b64 = (s: string) => Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

test('Debug property section', async ({ page }) => {
  test.setTimeout(120_000);
  
  // Start fresh session
  await page.goto('http://localhost:8080/interview?i=docassemble.playground1:voluntary-petition.yml&new_session=1');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Step through quickly to get to property section
  // 1. Introduction
  await page.locator('#da-continue-button').click();
  await page.waitForLoadState('networkidle');
  
  // 2. District selection
  await page.locator('select').first().selectOption({ index: 1 });
  await page.locator('#da-continue-button').click();
  await page.waitForLoadState('networkidle');
  
  // 3. Amended filing → No
  const amendedBtn = page.locator(`button[name="${b64('amended_filing')}"]`).nth(1);
  await amendedBtn.click();
  await page.waitForLoadState('networkidle');
  
  // 4. District confirmation → Continue
  await page.locator('#da-continue-button').click();
  await page.waitForLoadState('networkidle');
  
  // 5. Filing status → Individual
  const filingBtn = page.locator(`button[name="${b64('filing_status')}"]`).nth(0);
  await filingBtn.click();
  await page.waitForLoadState('networkidle');
  
  // Log where we are
  let h = await page.locator('h1, h2, h3').first().textContent().catch(() => 'none');
  console.log('After filing_status:', h);
  
  // 6. Debtor identity
  const firstId = b64('debtor[0].name.first');
  await page.locator(`#${firstId}`).fill('John');
  await page.locator(`#${b64('debtor[0].name.last')}`).fill('Public');
  await page.locator(`#${b64('debtor[0].address.address')}`).fill('123 Main St');
  await page.locator(`#${b64('debtor[0].address.city')}`).fill('Omaha');
  await page.selectOption(`#${b64('debtor[0].address.state')}`, 'Nebraska');
  await page.locator(`#${b64('debtor[0].address.zip')}`).fill('68102');
  await page.selectOption(`#${b64('debtor[0].address.county')}`, { index: 3 });
  // Tax ID - need to click radio for SSN
  await page.locator(`label[for="${b64('debtor[0].tax_id_type')}_0"]`).click();
  await page.locator(`#${b64('debtor[0].ssn')}`).fill('111-22-3333');
  await page.locator('#da-continue-button').click();
  await page.waitForLoadState('networkidle');
  
  // 7. Alias → No
  h = await page.locator('h1, h2, h3').first().textContent().catch(() => 'none');
  console.log('Before alias:', h);
  await page.locator(`button[name="${b64('debtor[i].alias.there_are_any')}"]`).nth(1).click();
  await page.waitForLoadState('networkidle');
  
  // 8. District → Yes, current
  h = await page.locator('h1, h2, h3').first().textContent().catch(() => 'none');
  console.log('Before district_info:', h);
  await page.locator(`label[for="${b64('debtor[i].district_info.is_current_district')}_0"]`).click();
  await page.locator('#da-continue-button').click();
  await page.waitForLoadState('networkidle');
  
  // 9. Debtor final → Continue
  h = await page.locator('h1, h2, h3').first().textContent().catch(() => 'none');
  console.log('debtor_final:', h);
  if (h?.includes('Summary') || h?.includes('Debtor')) {
    await page.locator('#da-continue-button').click();
    await page.waitForLoadState('networkidle');
  }
  
  // 10. Property intro → Continue
  h = await page.locator('h1, h2, h3').first().textContent().catch(() => 'none');
  console.log('property_intro:', h);
  await page.locator('#da-continue-button').click();
  await page.waitForLoadState('networkidle');
  
  // 11. Interests → No
  h = await page.locator('h1, h2, h3').first().textContent().catch(() => 'none');
  console.log('interests:', h);
  await page.locator(`button[name="${b64('prop.interests.there_are_any')}"]`).nth(1).click();
  await page.waitForLoadState('networkidle');
  
  // 12. Vehicles → No
  h = await page.locator('h1, h2, h3').first().textContent().catch(() => 'none');
  console.log('vehicles:', h);
  await page.locator(`button[name="${b64('prop.ab_vehicles.there_are_any')}"]`).nth(1).click();
  await page.waitForLoadState('networkidle');
  
  // 13. Other vehicles → No
  h = await page.locator('h1, h2, h3').first().textContent().catch(() => 'none');
  console.log('other_vehicles:', h);
  await page.locator(`button[name="${b64('prop.ab_other_vehicles.there_are_any')}"]`).nth(1).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000); // Wait extra for the next page to fully load
  
  // NOW - what page are we on?
  h = await page.locator('h1, h2, h3').first().textContent().catch(() => 'none');
  console.log('=== NEXT PAGE ===');
  console.log('Heading:', h);
  console.log('URL:', page.url());
  
  const qid = await page.evaluate(() => {
    const el = document.querySelector('[name="_question_name"]') as HTMLInputElement;
    return el?.value || 'unknown';
  });
  console.log('Question ID:', qid);
  
  // List all visible elements
  const visibleElements = await page.evaluate(() => {
    const els = document.querySelectorAll('button, input:not([type="hidden"]), select, textarea, label.labelauty');
    return Array.from(els).slice(0, 20).map(el => {
      const tag = el.tagName;
      const name = el.getAttribute('name') || '';
      const id = el.getAttribute('id') || '';
      const text = el.textContent?.trim().substring(0, 50) || '';
      const type = el.getAttribute('type') || '';
      return `${tag}[name=${name}][id=${id}][type=${type}] = "${text}"`;
    }).join('\n');
  });
  console.log('Visible elements:\n', visibleElements);
  
  // Check for any server-side errors
  const bodyText = await page.locator('body').textContent().catch(() => '');
  if (bodyText?.includes('error') || bodyText?.includes('Error') || bodyText?.includes('Exception')) {
    console.log('ERROR DETECTED in body text!');
    console.log(bodyText?.substring(0, 500));
  }
  
  // Take a screenshot
  await page.screenshot({ path: '/tmp/property-debug.png', fullPage: true });
  console.log('Screenshot saved to /tmp/property-debug.png');
});
