/**
 * Exercises the EMAIL delivery path on the conclusion page.
 *
 * Every other spec downloads the assembled PDFs off the conclusion page. Phil
 * Martin's UAT report was about what arrived in his INBOX, and the fix for
 * "only Form 101 came through" is attachment ORDER in the email, which the
 * download path cannot prove. This spec drives docassemble's built-in
 * "e-mail these documents" form so a real message actually gets sent.
 *
 * Requires TEST_EMAIL_TO. Skips itself when unset so CI never mails anyone.
 */
import { test, expect } from '@playwright/test';
import { SIMPLE_SINGLE } from './fixtures';
import { runFullInterview } from './navigation-helpers';
import { PRODUCTION_INTERVIEW_URL, screenshot } from './helpers';

const TO = process.env.TEST_EMAIL_TO || '';

test.describe('Conclusion page emails the whole petition', () => {
  test.setTimeout(600_000);

  test('sends the assembled packet to a real address', async ({ page }) => {
    test.skip(!TO, 'set TEST_EMAIL_TO to run the live email delivery check');

    await runFullInterview(page, SIMPLE_SINGLE, PRODUCTION_INTERVIEW_URL);
    await screenshot(page, 'email-conclusion');

    // Dump the attachment-area controls so a changed docassemble template is a
    // readable failure rather than a mystery timeout.
    const controls = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll('a, button, input, select').forEach((el) => {
        const e = el as HTMLElement;
        const tag = e.tagName.toLowerCase();
        const type = (e as HTMLInputElement).type || '';
        const name = (e as HTMLInputElement).name || '';
        const id = e.id || '';
        const cls = e.className || '';
        const txt = (e.textContent || '').trim().slice(0, 40);
        if (/mail/i.test(`${type} ${name} ${id} ${cls} ${txt}`)) {
          out.push(`${tag}[type=${type}] name=${name} id=${id} class=${cls} text="${txt}"`);
        }
      });
      return out;
    });
    console.log('  email-related controls on conclusion page:');
    for (const c of controls) console.log(`    ${c}`);

    // docassemble renders the e-mail form behind a collapse toggle.
    const toggle = page
      .locator('a, button')
      .filter({ hasText: /e-?mail/i })
      .first();
    if (await toggle.count()) {
      await toggle.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'email-form-open');
    }

    const emailInput = page
      .locator('input[type="email"], input[name*="mail" i], input[id*="mail" i]')
      .first();
    await expect(emailInput, 'no e-mail address input on the conclusion page').toBeVisible({
      timeout: 15_000,
    });
    await emailInput.fill(TO);

    // Scope the send control to the email input's OWN form. Page-wide text
    // matching picks up docassemble's hidden chat widget (#daSend
    // .dachatbutton), which never becomes visible and just eats the timeout.
    const emailForm = emailInput.locator('xpath=ancestor::form[1]');
    console.log('  attachment-email form markup:');
    console.log((await emailForm.innerHTML()).replace(/\s+/g, ' ').slice(0, 1500));

    const sendBtn = emailForm
      .locator('button:not(.dachatbutton), input[type="submit"]')
      .filter({ hasText: /send|e-?mail/i })
      .first();

    if (await sendBtn.count()) {
      await sendBtn.click();
    } else {
      // Some docassemble builds render the control as a plain submit with no
      // matching text; fall back to the only visible submit in the form.
      const anySubmit = emailForm.locator('button[type="submit"], input[type="submit"]').first();
      if (await anySubmit.count()) {
        await anySubmit.click();
      } else {
        await emailInput.press('Enter');
      }
    }

    // docassemble flashes a confirmation banner after queueing the message.
    await page.waitForTimeout(6000);
    await screenshot(page, 'email-sent');
    const body = (await page.locator('body').innerText()).toLowerCase();
    console.log(`  post-send page text (excerpt): ${body.slice(0, 600).replace(/\s+/g, ' ')}`);
    // The page only proves docassemble QUEUED the message; delivery is checked
    // in the recipient's mailbox. Fail loudly on a traceback / error screen.
    expect(body, 'docassemble returned an error page after send').not.toMatch(
      /traceback|internal server error|something went wrong/,
    );
  });
});
