import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Login
  await page.goto('http://localhost:8080/user/sign-in');
  await page.fill('#email', 'testuser@example.com');
  await page.fill('#password', 'testpass123');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  // Start fresh interview
  await page.goto('http://localhost:8080/interview?i=docassemble.playground1:voluntary-petition.yml&new_session=1');
  await page.waitForLoadState('networkidle');
  
  for (let step = 0; step < 50; step++) {
    const url = page.url();
    const content = await page.content();
    
    // Check if we're on the property interests list collect page  
    if (content.includes('prop.interests[i].street') || content.includes('real_property_interest_details')) {
      console.log('=== FOUND PROPERTY INTERESTS PAGE ===');
      console.log('URL:', url);
      
      // Get ALL form elements
      const inputs = await page.evaluate(() => {
        const elems = document.querySelectorAll('input, select, textarea, button[type="submit"]');
        return Array.from(elems).map(e => ({
          tag: e.tagName,
          type: (e as HTMLInputElement).type || '',
          name: (e as HTMLInputElement).name || '',
          id: e.id || '',
          value: (e as HTMLInputElement).value?.substring(0, 30) || '',
        }));
      });
      console.log('\nForm elements with names:');
      inputs.filter(e => e.name).forEach(e => console.log(`  ${e.tag} name="${e.name}" type="${e.type}" value="${e.value}"`));
      
      // Check for hidden fields
      const hiddens = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input[type="hidden"]')).map(e => ({
          name: (e as HTMLInputElement).name,
          value: (e as HTMLInputElement).value,
        }));
      });
      console.log('\nHidden fields:');
      hiddens.forEach(h => console.log(`  ${h.name} = ${h.value}`));
      
      // Check for buttons
      const buttons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map(e => ({
          type: (e as HTMLButtonElement).type || '',
          name: (e as HTMLButtonElement).name || '',
          value: (e as HTMLButtonElement).value || '',
          text: e.textContent?.trim().substring(0, 50) || '',
          classes: e.className,
        }));
      });
      console.log('\nButtons:');
      buttons.forEach(b => console.log(`  <button type="${b.type}" name="${b.name}" value="${b.value}"> ${b.text} [${b.classes}]`));
      
      break;
    }
    
    // Check for the "there_are_any" question
    if (content.includes('prop.interests.there_are_any') || content.includes('Do you own any real property')) {
      // Click Yes
      const yesBtn = await page.$('button[name="_field_0"][value="True"]');
      if (yesBtn) {
        await yesBtn.click();
        console.log(`Step ${step}: Clicked Yes for property interests`);
        await page.waitForLoadState('networkidle');
        continue;
      }
    }
    
    // General continue: fill any required fields and click continue
    const continueBtn = await page.$('button.btn-primary[type="submit"]');
    if (continueBtn) {
      // Fill any required text/number inputs
      const fields = await page.$$('input[required]');
      for (const field of fields) {
        const type = await field.getAttribute('type');
        const val = await field.inputValue();
        if (!val) {
          if (type === 'number') await field.fill('12345');
          else await field.fill('Test');
        }
      }
      await continueBtn.click();
      console.log(`Step ${step}: Continue (${url.substring(0, 80)})`);
    } else {
      console.log(`Step ${step}: No continue button found`);
      break;
    }
    
    await page.waitForLoadState('networkidle');
  }
  
  await browser.close();
})();
