import { Page } from '@playwright/test';

/**
 * MCP Assistant for Playwright Tests
 * Enhanced to follow prompt.md guidelines
 * 
 * This module provides AI-assisted test development capabilities
 * by analyzing page structure and generating selectors dynamically.
 * Follows best practices from prompt.md:
 * - Prefer getByRole, getByLabel, and getByText selectors
 * - No manual sleep() calls - rely on auto-waits
 * - Fill fields by labels
 * - Use Continue buttons properly
 */
export class McpAssistant {
  private page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * Analyze the current page structure following prompt.md patterns
   * Returns information optimized for label-based selectors
   */
  async analyzePage() {
    const analysis = await this.page.evaluate(() => {
      const result = {
        title: document.title,
        h1Text: document.querySelector('h1#daMainQuestion')?.textContent?.trim() || 'No H1 found',
        formFields: [] as Array<{
          type: string;
          name: string;
          id: string;
          label: string;
          value: string;
          role?: string;
          ariaLabel?: string;
        }>,
        buttons: [] as Array<{
          text: string;
          type: string;
          name: string;
          id: string;
          role?: string;
        }>,
        selects: [] as Array<{
          name: string;
          id: string;
          label: string;
          options: string[];
          role?: string;
        }>,
        radioGroups: [] as Array<{
          groupName: string;
          options: Array<{ value: string; label: string; id: string }>;
        }>,
        errors: [] as string[],
        url: window.location.href,
        hasDebugToggle: !!document.getElementById('dasourcetoggle'),
        hasVarsButton: !!document.querySelector('a[href*="/vars"]')
      };
      
      // Enhanced form field analysis with better label detection
      const inputs = document.querySelectorAll('input, textarea');
      inputs.forEach(input => {
        const element = input as HTMLInputElement | HTMLTextAreaElement;
        
        // Multiple label detection strategies
        let label = '';
        
        // Strategy 1: label[for] attribute
        if (element.id) {
          const labelEl = document.querySelector(`label[for="${element.id}"]`);
          if (labelEl) label = labelEl.textContent?.trim() || '';
        }
        
        // Strategy 2: aria-label
        if (!label) {
          label = element.getAttribute('aria-label') || '';
        }
        
        // Strategy 3: closest label parent
        if (!label) {
          const closestLabel = element.closest('label');
          if (closestLabel) label = closestLabel.textContent?.trim() || '';
        }
        
        // Strategy 4: fieldset legend
        if (!label) {
          const fieldset = element.closest('fieldset');
          if (fieldset) {
            const legend = fieldset.querySelector('legend');
            if (legend) label = legend.textContent?.trim() || '';
          }
        }
        
        // Strategy 5: previous sibling text
        if (!label) {
          const prev = element.previousElementSibling;
          if (prev && prev.textContent) {
            label = prev.textContent.trim();
          }
        }
        
        result.formFields.push({
          type: element.type || 'textarea',
          name: element.name || '',
          id: element.id || '',
          label: label || 'No label found',
          value: element.value || '',
          role: element.getAttribute('role') || undefined,
          ariaLabel: element.getAttribute('aria-label') || undefined
        });
      });
      
      // Enhanced button analysis with role detection
      const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
      buttons.forEach(button => {
        const element = button as HTMLButtonElement | HTMLInputElement;
        result.buttons.push({
          text: element.textContent?.trim() || element.value || 'No text',
          type: element.type || 'button',
          name: element.name || '',
          id: element.id || '',
          role: element.getAttribute('role') || undefined
        });
      });
      
      // Enhanced select analysis
      const selects = document.querySelectorAll('select');
      selects.forEach(select => {
        let label = '';
        
        // Multiple label detection for selects
        if (select.id) {
          const labelEl = document.querySelector(`label[for="${select.id}"]`);
          if (labelEl) label = labelEl.textContent?.trim() || '';
        }
        
        if (!label) {
          label = select.getAttribute('aria-label') || '';
        }
        
        if (!label) {
          const closestLabel = select.closest('label');
          if (closestLabel) label = closestLabel.textContent?.trim() || '';
        }
        
        const options = Array.from(select.options).map(option => option.text);
        
        result.selects.push({
          name: select.name || '',
          id: select.id || '',
          label: label || 'No label found',
          options: options,
          role: select.getAttribute('role') || undefined
        });
      });
      
      // Radio group analysis for better getByRole usage
      const radios = document.querySelectorAll('input[type="radio"]');
      const groupMap = new Map<string, Array<{ value: string; label: string; id: string }>>();
      
      radios.forEach(radio => {
        const element = radio as HTMLInputElement;
        const groupName = element.name || 'unnamed-group';
        
        if (!groupMap.has(groupName)) {
          groupMap.set(groupName, []);
        }
        
        let label = '';
        if (element.id) {
          const labelEl = document.querySelector(`label[for="${element.id}"]`);
          if (labelEl) label = labelEl.textContent?.trim() || '';
        }
        
        groupMap.get(groupName)!.push({
          value: element.value || '',
          label: label || element.value || 'No label',
          id: element.id || ''
        });
      });
      
      groupMap.forEach((options, groupName) => {
        result.radioGroups.push({ groupName, options });
      });
      
      // Error detection
      const errorElements = document.querySelectorAll('.alert-danger, .error, [class*="error"], .is-invalid');
      errorElements.forEach(error => {
        if (error.textContent?.trim()) {
          result.errors.push(error.textContent.trim());
        }
      });
      
      return result;
    });
    
    return analysis;
  }
  
  /**
   * Generate a test step suggestion based on current page state
   * Enhanced to follow prompt.md guidelines
   */
  async suggestNextStep() {
    const analysis = await this.analyzePage();
    
    console.log('=== MCP Page Analysis (Enhanced) ===');
    console.log(`Page: ${analysis.h1Text}`);
    console.log(`URL: ${analysis.url}`);
    console.log(`Debug toggle available: ${analysis.hasDebugToggle}`);
    console.log(`Vars button available: ${analysis.hasVarsButton}`);
    
    if (analysis.errors.length > 0) {
      console.log('🚨 Errors found:');
      analysis.errors.forEach(error => console.log(`  - ${error}`));
      return 'fix_errors';
    }
    
    if (analysis.formFields.length > 0) {
      console.log('📝 Form fields found (with better labels):');
      analysis.formFields.forEach(field => {
        console.log(`  - ${field.label}: ${field.type} (${field.name || field.id})`);
      });
      
      // Check for empty required or visible fields
      const emptyFields = analysis.formFields.filter(field => 
        !field.value && field.type !== 'hidden' && field.type !== 'submit'
      );
      
      if (emptyFields.length > 0) {
        console.log('✏️  Suggested action: Fill form fields using getByLabel');
        return 'fill_form';
      }
    }
    
    if (analysis.selects.length > 0) {
      console.log('🔽 Select dropdowns found:');
      analysis.selects.forEach(select => {
        console.log(`  - ${select.label}: [${select.options.join(', ')}]`);
      });
    }
    
    if (analysis.radioGroups.length > 0) {
      console.log('🔘 Radio groups found:');
      analysis.radioGroups.forEach(group => {
        console.log(`  - ${group.groupName}: ${group.options.map(o => o.label).join(', ')}`);
      });
    }
    
    if (analysis.buttons.length > 0) {
      console.log('🔘 Buttons found:');
      analysis.buttons.forEach(button => {
        console.log(`  - ${button.text} (type: ${button.type})`);
      });
      
      const continueButton = analysis.buttons.find(btn => 
        btn.text.toLowerCase().includes('continue') ||
        btn.text.toLowerCase().includes('submit') ||
        btn.text.toLowerCase().includes('next')
      );
      
      if (continueButton) {
        console.log('➡️  Suggested action: Click continue button using getByRole');
        return 'click_continue';
      }
    }
    
    console.log('🤔 No clear next step identified - use debug features');
    return 'analyze_further';
  }
  
  /**
   * Fill a form field using getByLabel (prompt.md preferred approach)
   */
  async fillFieldByLabel(labelText: string, value: string, options?: { exact?: boolean }) {
    console.log(`📝 Filling field by label "${labelText}" with "${value}"`);
    
    try {
      const field = this.page.getByLabel(labelText, { exact: options?.exact ?? false });
      await field.fill(value);
      
      // Verify the field was filled
      const filledValue = await field.inputValue();
      if (filledValue === value) {
        console.log(`✅ Successfully filled "${labelText}"`);
      } else {
        console.log(`⚠️ Field value mismatch: expected "${value}", got "${filledValue}"`);
      }
    } catch (error) {
      console.log(`❌ Failed to fill field "${labelText}": ${error}`);
      throw error;
    }
  }
  
  /**
   * Select an option using getByLabel (prompt.md preferred approach)
   */
  async selectOptionByLabel(labelText: string, optionText: string, options?: { exact?: boolean }) {
    console.log(`🔽 Selecting "${optionText}" from "${labelText}"`);
    
    try {
      const select = this.page.getByLabel(labelText, { exact: options?.exact ?? false });
      await select.selectOption(optionText);
      
      // Verify the selection
      const selectedValue = await select.inputValue();
      console.log(`✅ Selected value: ${selectedValue}`);
    } catch (error) {
      console.log(`❌ Failed to select option "${optionText}" from "${labelText}": ${error}`);
      throw error;
    }
  }
  
  /**
   * Click a radio button using getByRole (prompt.md preferred approach)
   */
  async selectRadioByRole(name: string, groupName?: string) {
    console.log(`🔘 Selecting radio "${name}"${groupName ? ` from group "${groupName}"` : ''}`);
    
    try {
      let radio;
      if (groupName) {
        const group = this.page.getByRole('group', { name: groupName });
        radio = group.getByRole('radio', { name });
      } else {
        radio = this.page.getByRole('radio', { name });
      }
      
      await radio.click();
      console.log(`✅ Selected radio "${name}"`);
    } catch (error) {
      console.log(`❌ Failed to select radio "${name}": ${error}`);
      throw error;
    }
  }
  
  /**
   * Click the most appropriate button using getByRole (prompt.md preferred)
   */
  async clickButtonByRole(buttonText?: string) {
    const targetText = buttonText || 'Continue';
    console.log(`🔘 Clicking button: ${targetText}`);
    
    try {
      const button = this.page.getByRole('button', { name: targetText });
      await button.click();
      console.log(`✅ Clicked button: ${targetText}`);
    } catch (error) {
      console.log(`❌ Failed to click button "${targetText}": ${error}`);
      throw error;
    }
  }
  
  /**
   * Use debug features mentioned in prompt.md
   */
  async useDebugFeatures() {
    const analysis = await this.analyzePage();
    
    if (analysis.hasDebugToggle) {
      console.log('🔍 Using dasourcetoggle debug feature');
      await this.page.locator('#dasourcetoggle').click();
      await this.page.waitForTimeout(1000);
    }
    
    if (analysis.hasVarsButton) {
      console.log('🔍 Variables button available - can show interview state');
      // Don't click it automatically as it opens in new tab
    }
    
    return {
      debugToggleUsed: analysis.hasDebugToggle,
      varsButtonAvailable: analysis.hasVarsButton
    };
  }
  
  /**
   * Legacy fill field method - updated to use getByLabel when possible
   */
  async fillField(labelText: string, value: string) {
    try {
      // Try the new getByLabel approach first
      await this.fillFieldByLabel(labelText, value);
    } catch {
      // Fallback to the original method
      const analysis = await this.analyzePage();
      const field = analysis.formFields.find(f => 
        f.label.toLowerCase().includes(labelText.toLowerCase())
      );
      
      if (!field) {
        throw new Error(`Field with label containing "${labelText}" not found`);
      }
      
      let selector = '';
      if (field.id) {
        selector = `#${field.id}`;
      } else if (field.name) {
        selector = `input[name="${field.name}"], textarea[name="${field.name}"]`;
      } else {
        throw new Error(`Could not determine selector for field: ${field.label}`);
      }
      
      console.log(`📝 Filling field "${field.label}" with "${value}" using selector: ${selector}`);
      await this.page.fill(selector, value);
    }
  }
  
  /**
   * Legacy select option method - updated to use getByLabel when possible
   */
  async selectOption(labelText: string, optionText: string) {
    try {
      // Try the new getByLabel approach first
      await this.selectOptionByLabel(labelText, optionText);
    } catch {
      // Fallback to the original method
      const analysis = await this.analyzePage();
      const select = analysis.selects.find(s => 
        s.label.toLowerCase().includes(labelText.toLowerCase())
      );
      
      if (!select) {
        throw new Error(`Select with label containing "${labelText}" not found`);
      }
      
      let selector = '';
      if (select.id) {
        selector = `#${select.id}`;
      } else if (select.name) {
        selector = `select[name="${select.name}"]`;
      } else {
        throw new Error(`Could not determine selector for select: ${select.label}`);
      }
      
      console.log(`🔽 Selecting "${optionText}" from "${select.label}" using selector: ${selector}`);
      await this.page.selectOption(selector, optionText);
    }
  }
  
  /**
   * Legacy click button method - updated to use getByRole when possible
   */
  async clickButton(buttonText?: string) {
    try {
      // Try the new getByRole approach first
      await this.clickButtonByRole(buttonText);
    } catch {
      // Fallback to the original method
      const analysis = await this.analyzePage();
      
      let targetButton;
      if (buttonText) {
        targetButton = analysis.buttons.find(btn => 
          btn.text.toLowerCase().includes(buttonText.toLowerCase())
        );
      } else {
        // Find the most likely "continue" button
        targetButton = analysis.buttons.find(btn => 
          btn.text.toLowerCase().includes('continue') ||
          btn.text.toLowerCase().includes('submit') ||
          btn.text.toLowerCase().includes('next')
        );
      }
      
      if (!targetButton) {
        throw new Error(`Button ${buttonText ? `"${buttonText}"` : '(continue/submit/next)'} not found`);
      }
      
      console.log(`🔘 Clicking button: ${targetButton.text}`);
      await this.page.click('button[type="submit"], input[type="submit"]');
    }
  }
  
  /**
   * Take a screenshot with analysis data
   */
  async captureState(filename: string) {
    const analysis = await this.analyzePage();
    
    // Save analysis to a file
    const fs = require('fs');
    const path = require('path');
    
    const analysisFile = filename.replace('.png', '-analysis.json');
    const fullPath = path.join('test-results', analysisFile);
    fs.writeFileSync(fullPath, JSON.stringify(analysis, null, 2));
    
    // Take screenshot
    const screenshotPath = path.join('test-results', filename);
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    
    console.log(`📸 Captured state: ${screenshotPath}`);
    console.log(`📄 Analysis saved: ${fullPath}`);
  }
}
