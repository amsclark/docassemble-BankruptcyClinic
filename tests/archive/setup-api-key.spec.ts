/**
 * One-time setup: Log into docassemble and create an API key.
 * Run with: npx playwright test tests/setup-api-key.spec.ts --workers=1
 */
import { test } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test('create API key', async ({ page }) => {
  test.setTimeout(60_000);

  // Login
  await page.goto(`${BASE_URL}/user/sign-in`);
  await page.fill('#email', 'admin@admin.com');
  await page.fill('#password', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/interviews**', { timeout: 15000 });
  console.log('Logged in successfully');

  // Navigate to API keys page
  await page.goto(`${BASE_URL}/manage_api`);
  await page.waitForLoadState('networkidle');

  // Check for existing keys
  const codeElements = page.locator('code');
  if (await codeElements.count() > 0) {
    const key = await codeElements.first().textContent();
    console.log(`\n=== EXISTING API KEY: ${key} ===\n`);
    return;
  }

  // Click "Add a New API Key"
  await page.locator('a, button').filter({ hasText: /Add a New API Key/i }).click();
  await page.waitForLoadState('networkidle');

  // Fill in the name field
  const nameField = page.locator('input[type="text"]').first();
  await nameField.fill('testing');

  // Click "Create"
  await page.locator('button, input[type="submit"]').filter({ hasText: /Create/i }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Screenshot and look for the key
  await page.screenshot({ path: 'test-results/api-key-result.png', fullPage: true });

  const newCode = page.locator('code');
  if (await newCode.count() > 0) {
    const key = await newCode.first().textContent();
    console.log(`\n=== API KEY: ${key} ===\n`);
  } else {
    // Maybe the key is shown differently
    const bodyText = await page.locator('body').innerText();
    console.log('Page after create:', bodyText.substring(0, 1000));
  }
});
