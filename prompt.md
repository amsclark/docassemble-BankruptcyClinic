# Playwright MCP Prompt for Docassemble Bankruptcy Clinic

## Context
We are testing a **Docassemble Bankruptcy Clinic** app.  
The app runs on a local or deployed Docassemble server, serving dynamic interview pages.

- Base URL: https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1
- Interviews are launched via `interview?i=docassemble.playground1:voluntary-petition.yml#page1` URLs.
- Pages typically include:
  - Input fields (`<input>`, `<textarea>`, `<select>`)
  - "Continue" buttons (`<button type="submit">Continue</button>`)
  - Conditional branching based on answers.
- Fields typically have a name and id attribute that is the underlying docassemble variable name base64-encoded, but with any = padding stripped because an = cannot appear within these attribute values in html. 
- Each page has button with id 'dasourcetoggle' and clicking it shows how that page came to be asked and also a button with like this <a class="float-end btn btn-info" target="_blank" href="/vars?i=docassemble.playground1:voluntary-petition.yml">Show variables and values</a> that will show current interview variable value in json format. These buttons can be useful when it seems that the interview is stuck in a loop and cant proceed to the next page.

## Goals
Generate **end-to-end Playwright tests** in TypeScript using `@playwright/test`, saved into either `e2e/` or `tests/`.

- Prefer `getByRole`, `getByLabel`, and `getByText` selectors.
- Auto-waits should handle page loads (no `sleep`).
- Organize with `test.describe` and `test.step`.
- Tests should:
  - Start at a known interview URL.
  - Fill fields by their **labels**.
  - Use `Continue` to advance.
  - Assert presence of **expected text** or questions at each step.


## Example
```ts
import { test, expect } from '@playwright/test';

test.describe('Bankruptcy Clinic Interview', () => {
  test('collects debtor name', async ({ page }) => {
    await page.goto('/interview?i=voluntary-petition.yml');
    await page.getByLabel('First name').fill('Alex');
    await page.getByLabel('Last name').fill('Clark');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('What is your street address?')).toBeVisible();
  });
});
