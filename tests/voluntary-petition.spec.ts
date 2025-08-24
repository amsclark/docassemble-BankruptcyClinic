import { test, expect, Page } from '@playwright/test';

// Page object model for the docassemble interview
class VoluntaryPetitionInterview {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
    await this.page.waitForLoadState('networkidle');
  }

  async fillIntroductionScreen() {
    await expect(this.page.locator('h1')).toContainText('Voluntary Petition for Individuals Filing for Bankruptcy');
    await this.page.click('button[type="submit"]');
    await this.page.waitForLoadState('networkidle');
  }

  async fillDistrictInfo(district: string = 'District of Nebraska') {
    await expect(this.page.locator('h1')).toContainText('What district are you filing');
    await this.page.selectOption('select[name="current_district"]', district);
    await this.page.click('button[type="submit"]');
    await this.page.waitForLoadState('networkidle');
  }

  async fillAmendedFiling(isAmended: boolean = false) {
    await expect(this.page.locator('h1')).toContainText('updating a bankruptcy filing');
    if (isAmended) {
      await this.page.click('input[value="True"]');
    } else {
      await this.page.click('input[value="False"]');
    }
    await this.page.click('button[type="submit"]');
    await this.page.waitForLoadState('networkidle');
  }

  async confirmDistrictFinal() {
    await expect(this.page.locator('h1')).toContainText('District Details');
    await this.page.click('button[type="submit"]');
    await this.page.waitForLoadState('networkidle');
  }

  async selectFilingStatus(status: 'Filing individually' | 'Filing with spouse' = 'Filing individually') {
    await expect(this.page.locator('h1')).toContainText('filing individually or with a spouse');
    await this.page.click(`input[value="${status}"]`);
    await this.page.click('button[type="submit"]');
    await this.page.waitForLoadState('networkidle');
  }

  async fillDebtorBasicInfo(debtorInfo: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    county: string;
    hasOtherMailing: boolean;
    taxIdType: '1' | '2';
    taxId: string;
    aliasAny: boolean;
    isCurrentDistrict: boolean;
  }) {
    await expect(this.page.locator('h1')).toContainText('Basic Identity and Contact Information');
    
    // Fill basic info
    await this.page.fill('input[name="debtor[0].name.first"]', debtorInfo.firstName);
    await this.page.fill('input[name="debtor[0].name.last"]', debtorInfo.lastName);
    
    // Fill address
    await this.page.fill('input[name="debtor[0].address.address"]', debtorInfo.address);
    await this.page.fill('input[name="debtor[0].address.city"]', debtorInfo.city);
    await this.page.selectOption('select[name="debtor[0].address.state"]', debtorInfo.state);
    await this.page.fill('input[name="debtor[0].address.zip"]', debtorInfo.zip);
    
    // Wait for county to populate and select
    await this.page.waitForTimeout(1000); // Allow county to populate
    await this.page.selectOption('select[name="debtor[0].address.county"]', debtorInfo.county);
    
    // Mailing address
    if (debtorInfo.hasOtherMailing) {
      await this.page.click('input[name="debtor[0].has_other_mailing_address"][value="True"]');
    } else {
      await this.page.click('input[name="debtor[0].has_other_mailing_address"][value="False"]');
    }
    
    // Tax ID
    await this.page.click(`input[name="debtor[0].tax_id.tax_id_type"][value="${debtorInfo.taxIdType}"]`);
    
    if (debtorInfo.taxIdType === '1') {
      await this.page.fill('input[name="debtor[0].tax_id.tax_id"]', debtorInfo.taxId);
    } else {
      await this.page.fill('input[name="debtor[0].tax_id.tax_id"]', debtorInfo.taxId);
    }
    
    await this.page.click('button[type="submit"]');
    await this.page.waitForLoadState('networkidle');
  }

  async fillDistrictResidency(isCurrentDistrict: boolean = true) {
    await expect(this.page.locator('h1')).toContainText('lived in the specified district');
    if (isCurrentDistrict) {
      await this.page.click('input[value="True"]');
    } else {
      await this.page.click('input[value="False"]');
    }
    await this.page.click('button[type="submit"]');
    await this.page.waitForLoadState('networkidle');
  }

  async fillAliases(hasAliases: boolean = false) {
    await expect(this.page.locator('h1')).toContainText('other names');
    if (hasAliases) {
      await this.page.click('input[value="True"]');
    } else {
      await this.page.click('input[value="False"]');
    }
    await this.page.click('button[type="submit"]');
    await this.page.waitForLoadState('networkidle');
  }

  async expectDebtorFinalPage() {
    await expect(this.page.locator('h1')).toContainText('Debtor Summary');
  }
}

test.describe('Voluntary Petition Interview', () => {
  test('should load the interview successfully', async ({ page }) => {
    const interview = new VoluntaryPetitionInterview(page);
    await interview.goto();
    
    // Should see the introduction screen
    await expect(page.locator('h1')).toContainText('Voluntary Petition for Individuals Filing for Bankruptcy');
    await expect(page.locator('text=Read These Important Warnings')).toBeVisible();
  });

  test('should complete minimalist single filer flow', async ({ page }) => {
    const interview = new VoluntaryPetitionInterview(page);
    
    // Start interview
    await interview.goto();
    
    // Fill introduction screen
    await interview.fillIntroductionScreen();
    
    // District selection
    await interview.fillDistrictInfo('District of Nebraska');
    
    // Amended filing
    await interview.fillAmendedFiling(false);
    
    // District confirmation
    await interview.confirmDistrictFinal();
    
    // Filing status
    await interview.selectFilingStatus('Filing individually');
    
    // Debtor basic info
    await interview.fillDebtorBasicInfo({
      firstName: 'Alexander',
      lastName: 'clark',
      address: '111 Fake St.',
      city: 'Omaha',
      state: 'Nebraska',
      zip: '68022',
      county: 'Douglas County',
      hasOtherMailing: false,
      taxIdType: '1',
      taxId: '123-45-6789',
      aliasAny: false,
      isCurrentDistrict: true
    });
    
    // District residency
    await interview.fillDistrictResidency(true);
    
    // Aliases
    await interview.fillAliases(false);
    
    // Should reach debtor final page
    await interview.expectDebtorFinalPage();
  });

  test('should handle county dropdown population correctly', async ({ page }) => {
    const interview = new VoluntaryPetitionInterview(page);
    
    // Navigate to debtor basic info
    await interview.goto();
    await interview.fillIntroductionScreen();
    await interview.fillDistrictInfo('District of Nebraska');
    await interview.fillAmendedFiling(false);
    await interview.confirmDistrictFinal();
    await interview.selectFilingStatus('Filing individually');
    
    // Should be on debtor basic info page
    await expect(page.locator('h1')).toContainText('Basic Identity and Contact Information');
    
    // Fill state first
    await page.selectOption('select[name="debtor[0].address.state"]', 'Nebraska');
    
    // Wait for county dropdown to populate
    await page.waitForTimeout(1000);
    
    // Check that county dropdown has Nebraska counties
    const countySelect = page.locator('select[name="debtor[0].address.county"]');
    await expect(countySelect.locator('option[value="Douglas County"]')).toBeVisible();
    await expect(countySelect.locator('option[value="Lancaster County"]')).toBeVisible();
    
    // Should be able to select Douglas County
    await countySelect.selectOption('Douglas County');
    
    // Verify selection
    await expect(countySelect).toHaveValue('Douglas County');
  });
});
