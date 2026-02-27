import { test, expect } from '@playwright/test';

// Comprehensive end-to-end tests for the Bankruptcy Clinic project.

test.describe('End-to-End Tests', () => {
    test('Complete individual filing process', async ({ page }) => {
        // Load the interview page
        await page.goto('/');
        // Fill in debtor information
        await fillDebtorIdentity({ name: 'John Doe', age: 30, income: 5000 }); // Complete object provided
        // Submit the form
        await page.click('button[type="submit"]');
        // Expect to see confirmation
        await expect(page).toHaveURL(/.*confirmation/);
    });

    test('Edge case: Missing required fields', async ({ page }) => {
        await page.goto('/');
        // Submit without filling required fields
        await page.click('button[type="submit"]');
        // Expect to see validation errors
        await expect(page.locator('.error')).toHaveText('This field is required.');
    });

    test('Edge case: Invalid input format', async ({ page }) => {
        await page.goto('/');
        // Fill in invalid data
        await page.fill('input[name="income"]', 'invalid');
        // Submit the form
        await page.click('button[type="submit"]');
        // Expect to see validation errors
        await expect(page.locator('.error')).toHaveText('Invalid input format.');
    });
});
