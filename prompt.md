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
```
## Specific Page Information
* The introduction screen can be advanced by:
```js
document.getElementsByName(btoa('introduction_screen').replace(/=/g,""))[0].click()
```

* The screen with heading 'What district are you filing your bankruptcy case in?' can be advanced by selecting a district in either of these two ways:
```js
document.getElementsByName(btoa('current_district').replace(/=/g,""))[0].value = 'District of South Dakota';
document.getElementsByName(btoa('current_district').replace(/=/g,""))[0].value = 'District of Nebraska';
```
and then:
```js
document.getElementById('da-continue-button').click();
```
* The page with heading 'Are you updating a bankruptcy filing that has already been submitted to the court?' can be advanced in one of these two ways:
```js
document.getElementsByName(btoa('amended_filing').replace(/=/g,""))[0].click(); // click yes button
document.getElementsByName(btoa('amended_filing').replace(/=/g,""))[1].click(); // click no button
```
If they click the yes option, the next screen will ask about the case number for the already-submitted case. If no, it will skip that screen.

* The screen with the heading 'Please provide the case number for your previously submitted bankruptcy claim.' can be advanced in one of two ways.

First, the field can be left blank and the continue button clicked:
```js
document.getElementById('da-continue-button').click();
```

or by filling the field in with a valid case number first:
```js
document.getElementsByName(btoa('case_number').replace(/=/g,""))[0].value = "8:23-bk-12345";
document.getElementById('da-continue-button').click();
```

* The page with heading 'District Details' can be advanced with:

```js
document.getElementsByName(btoa('district_final').replace(/=/g,""))[0].click();
```

* The page 'Are you filing individually or with a spouse?' can be advanced by selecting a radio button option in either of these two ways
```js
document.getElementById(btoa('filing_status').replace(/=/g,"") + "_0").click(); // Filing individually
```
or
```js
document.getElementById(btoa('filing_status').replace(/=/g,"") + "_1").click(); // Filing with spouse
```
and then clicking the continue button:
```js
document.getElementById('da-continue-button').click();
```
If Filing with spouse, there will be two sets of debtor questions asked. If individual, just one set of questions.

* On the page with heading 'Basic Identity and Contact Information', the following fields can be filled out as follows:
```js
document.getElementById(btoa('debtor[i].name.first').replace(/=/g,"")).value = 'John'; // required
document.getElementById(btoa('debtor[i].name.middle').replace(/=/g,"")).value = 'Quincy'; // optional 
document.getElementById(btoa('debtor[i].name.last').replace(/=/g,"")).value = 'Adams'; // required
document.getElementById(btoa('debtor[i].name.suffix').replace(/=/g,"")).value = 'Jr.'; // optional
document.getElementById(btoa('debtor[i].address.address').replace(/=/g,"")).value = '123 Fake Street'; // required
document.getElementById(btoa('debtor[i].address.city').replace(/=/g,"")).value = 'Omaha'; // required

// Must select either Nebraska or South Dakota from the dropdown.
const el = document.getElementById(
  btoa('debtor[i].address.state').replace(/=/g,"")
);
el.value = "Nebraska"; // required
// el.value = "South Dakota"; // alternate value
// trigger the change event so that the County dropdown is populated
el.dispatchEvent(new Event("change", { bubbles: true }));

document.getElementById(btoa('debtor[i].address.zip').replace(/=/g,"")).value = '12345';
document.getElementById(btoa('debtor[i].address.county').replace(/=/g,"")).selectedIndex = 4;

// clicking the 'has seperate mailing address will make a set of required mailing address fields to appear. They are required if shown, otherwise if not visible they should not be filled in.
document.getElementById(btoa('debtor[i].has_other_mailing_address').replace(/=/g,"")).click(); // optional
document.getElementById(btoa('_field_13').replace(/=/g,"")).value = '123 Mail Street'; // required if visible
document.getElementById(btoa('_field_14').replace(/=/g,"")).value = 'Omaha'; // required if visible
document.getElementById(btoa('_field_15').replace(/=/g,"")).value = 'Nebraska'; // required if visible
document.getElementById(btoa('_field_16').replace(/=/g,"")).value = '54321'; // required if visible

// It is required to select a tax id type with one of the following:
document.getElementById(btoa('debtor[i].tax_id.tax_id_type').replace(/=/g,"") + "_0").click(); // ssn
document.getElementById(btoa('debtor[i].tax_id.tax_id_type').replace(/=/g,"") + "_1").click(); // itin

// if the ssn option is selected, then _field_19 should be filled in 
document.getElementById(btoa('_field_19').replace(/=/g,"")).value = '111-11-1111'; // required if visible

// Otherwise the individual taxpayer id number should be filled in
document.getElementById(btoa('_field_18').replace(/=/g,"")).value = '222-22-2222'; // required if visible

// Finally the page is advanced with:
document.getElementsByName(btoa('debtor_basic_info').replace(/=/g,""))[0].click(); 
```

* On the page with a title that contains the substring 'have any other names they’ve used in the last 8 years?' there are two ways to advance, buttons labeled yes or no. If they click 'yes' they will be asked about aliases. If they click 'no' they will not.

```js
document.getElementsByName(btoa('debtor[i].alias.there_are_any').replace(/=/g,""))[0].click(); // click yes
document.getElementsByName(btoa('debtor[i].alias.there_are_any').replace(/=/g,""))[1].click(); // click no
```

* On the 'Add an alias for ... used in the last 8 years.' alias page, can fill in one set of aliases like this:
```js
document.getElementsByName(btoa('debtor[i].alias[0].first_name').replace(/=/g,""))[0].value = 'Johnny';
document.getElementsByName(btoa('debtor[i].alias[0].middle_name').replace(/=/g,""))[0].value = 'Quincy';
document.getElementsByName(btoa('debtor[i].alias[0].last_name').replace(/=/g,""))[0].value = 'Adams';
document.getElementsByName(btoa('debtor[i].alias[0].business').replace(/=/g,""))[0].value = 'Boston Teas';

// and then the add another button can be clicked like this:
document.getElementsByClassName('dacollectadd')[0].click();


// and another alias like this, just incrementing the alias number index:
document.getElementsByName(btoa('debtor[i].alias[1].first_name').replace(/=/g,""))[0].value = 'Jack';
document.getElementsByName(btoa('debtor[i].alias[1].middle_name').replace(/=/g,""))[0].value = 'Qolquist';
document.getElementsByName(btoa('debtor[i].alias[1].last_name').replace(/=/g,""))[0].value = 'Adams';
document.getElementsByName(btoa('debtor[i].alias[1].business').replace(/=/g,""))[0].value = 'Boston Tea Too';

// the add another button index for class members also needs to be incremented if adding another after that
document.getElementsByClassName('dacollectadd')[1].click();
```