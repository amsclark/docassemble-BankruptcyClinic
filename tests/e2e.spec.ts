import { test, expect, Page } from '@playwright/test';
import {
    INTERVIEW_URL,
    b64,
    waitForDaPageLoad,
    clickContinue,
    clickById,
    clickNthByName,
    selectByName,
    fillByName,
    fillById,
    fillDebtorIdentity,
    screenshot,
} from './helpers';

async function goToDebtorIdentityPage(page: Page) {
    await page.goto(INTERVIEW_URL);
    await waitForDaPageLoad(page);

    // Intro
    await clickNthByName(page, b64('introduction_screen'), 0);

    // District
    await waitForDaPageLoad(page);
    await selectByName(page, b64('current_district'), 'District of Nebraska');
    await clickContinue(page);

    // Amended filing = Yes (ensures case number + district_final path)
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('amended_filing'), 0);

    // Case number
    await waitForDaPageLoad(page);
    await fillByName(page, b64('case_number'), '8:26-bk-00077');
    await clickContinue(page);

    // District final
    await waitForDaPageLoad(page);
    await clickNthByName(page, b64('district_final'), 0);

    // Filing status = individual
    await waitForDaPageLoad(page);
    await clickById(page, `${b64('filing_status')}_0`);
    await clickContinue(page);

    // Should now be debtor identity screen
    await waitForDaPageLoad(page);
    await expect(page.locator(`#${b64('debtor[i].name.first')}`)).toBeVisible();
}

test.describe('End-to-End + Edge Cases', () => {
    test('E2E: individual filing reaches property section', async ({ page }) => {
        await goToDebtorIdentityPage(page);

        await fillDebtorIdentity(page, {
            first: 'Ellen',
            middle: 'M',
            last: 'Ripley',
            street: '100 Main St',
            city: 'Omaha',
            state: 'Nebraska',
            zip: '68102',
            countyIndex: 3,
            hasMailing: true,
            mailStreet: 'PO Box 99',
            mailCity: 'Omaha',
            mailState: 'Nebraska',
            mailZip: '68103',
            taxIdType: 'ssn',
            taxId: '444-55-6666',
        });

        // Alias question
        await waitForDaPageLoad(page);
        await clickNthByName(page, b64('debtor[i].alias.there_are_any'), 1); // No aliases

        // District residency question
        await waitForDaPageLoad(page);
        await clickNthByName(page, b64('debtor[i].district_info.is_current_district'), 0); // Yes
        await clickById(page, 'da-continue-button');

        // Should progress beyond debtor setup
        await waitForDaPageLoad(page);
        await screenshot(page, 'e2e-individual-after-district');

        const bodyText = (await page.locator('body').innerText()).toLowerCase();
        expect(bodyText).toContain('property');
    });

    test('Edge: amended filing requires case number', async ({ page }) => {
        await page.goto(INTERVIEW_URL);
        await waitForDaPageLoad(page);

        await clickNthByName(page, b64('introduction_screen'), 0);
        await waitForDaPageLoad(page);
        await selectByName(page, b64('current_district'), 'District of Nebraska');
        await clickContinue(page);

        // Choose amended filing yes, then try to continue without case number
        await waitForDaPageLoad(page);
        await clickNthByName(page, b64('amended_filing'), 0);
        await waitForDaPageLoad(page);

        const caseNumberSelector = `[name="${b64('case_number')}"]`;
        await expect(page.locator(caseNumberSelector)).toBeVisible();
        await clickById(page, 'da-continue-button');

        // Must still be on case number page (validation should block progression)
        await expect(page.locator(caseNumberSelector)).toBeVisible();
    });

    test('Edge: debtor first name is required', async ({ page }) => {
        await goToDebtorIdentityPage(page);

        // Intentionally leave first name blank and fill the rest
        await fillById(page, b64('debtor[i].name.middle'), 'L');
        await fillById(page, b64('debtor[i].name.last'), 'Scully');
        await fillById(page, b64('debtor[i].address.address'), '11 Example Ave');
        await fillById(page, b64('debtor[i].address.city'), 'Lincoln');
        await page.selectOption(`#${b64('debtor[i].address.state')}`, { label: 'Nebraska' });
        await fillById(page, b64('debtor[i].address.zip'), '68508');

        await clickNthByName(page, b64('debtor_basic_info'), 0);

        // Validation should keep us on the same screen
        await expect(page.locator(`#${b64('debtor[i].name.first')}`)).toBeVisible();

        const firstNameMissing = await page.$eval(
            `#${b64('debtor[i].name.first')}`,
            (el) => (el as HTMLInputElement).validity.valueMissing,
        );
        expect(firstNameMissing).toBeTruthy();
    });
});
