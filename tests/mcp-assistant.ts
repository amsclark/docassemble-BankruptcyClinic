import { Page } from '@playwright/test';

/**
 * MCP Assistant for Playwright Tests
 * 
 * This module provides AI-assisted test development capabilities
 * by analyzing page structure and generating selectors dynamically.
 */
export class McpAssistant {
  private page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * Analyze the current page structure and return useful information
   * for test development
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
        }>,
        buttons: [] as Array<{
          text: string;
          type: string;
          name: string;
          id: string;
        }>,
        selects: [] as Array<{
          name: string;
          id: string;
          label: string;
          options: string[];
        }>,
        errors: [] as string[],
        url: window.location.href
      };
      
      // Find all form fields
      const inputs = document.querySelectorAll('input, textarea');
      inputs.forEach(input => {
        const element = input as HTMLInputElement | HTMLTextAreaElement;
        const label = document.querySelector(`label[for="${element.id}"]`)?.textContent?.trim() || 
                     element.closest('div')?.querySelector('label')?.textContent?.trim() || 
                     'No label';
        
        result.formFields.push({
          type: element.type || 'textarea',
          name: element.name || '',
          id: element.id || '',
          label: label,
          value: element.value || ''
        });
      });
      
      // Find all buttons
      const buttons = document.querySelectorAll('button, input[type="submit"]');
      buttons.forEach(button => {
        const element = button as HTMLButtonElement | HTMLInputElement;
        result.buttons.push({
          text: element.textContent?.trim() || element.value || 'No text',
          type: element.type || 'button',
          name: element.name || '',
          id: element.id || ''
        });
      });
      
      // Find all select dropdowns
      const selects = document.querySelectorAll('select');
      selects.forEach(select => {
        const label = document.querySelector(`label[for="${select.id}"]`)?.textContent?.trim() || 
                     select.closest('div')?.querySelector('label')?.textContent?.trim() || 
                     'No label';
        
        const options = Array.from(select.options).map(option => option.text);
        
        result.selects.push({
          name: select.name || '',
          id: select.id || '',
          label: label,
          options: options
        });
      });
      
      // Check for error messages
      const errorElements = document.querySelectorAll('.alert-danger, .error, [class*="error"]');
      errorElements.forEach(error => {
        result.errors.push(error.textContent?.trim() || 'Unknown error');
      });
      
      return result;
    });
    
    return analysis;
  }
  
  /**
   * Generate a test step suggestion based on current page state
   */
  async suggestNextStep() {
    const analysis = await this.analyzePage();
    
    console.log('=== MCP Page Analysis ===');
    console.log(`Page: ${analysis.h1Text}`);
    console.log(`URL: ${analysis.url}`);
    
    if (analysis.errors.length > 0) {
      console.log('🚨 Errors found:');
      analysis.errors.forEach(error => console.log(`  - ${error}`));
      return 'fix_errors';
    }
    
    if (analysis.formFields.length > 0) {
      console.log('📝 Form fields found:');
      analysis.formFields.forEach(field => {
        console.log(`  - ${field.label}: ${field.type} (name: ${field.name})`);
      });
      
      // Find empty required fields
      const emptyFields = analysis.formFields.filter(field => 
        !field.value && field.type !== 'hidden' && field.type !== 'submit'
      );
      
      if (emptyFields.length > 0) {
        console.log('✏️  Suggested action: Fill form fields');
        return 'fill_form';
      }
    }
    
    if (analysis.selects.length > 0) {
      console.log('🔽 Select dropdowns found:');
      analysis.selects.forEach(select => {
        console.log(`  - ${select.label}: [${select.options.join(', ')}]`);
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
        console.log('➡️  Suggested action: Click continue button');
        return 'click_continue';
      }
    }
    
    console.log('🤔 No clear next step identified');
    return 'analyze_further';
  }
  
  /**
   * Fill a form field with intelligent selector detection
   */
  async fillField(labelText: string, value: string) {
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
  
  /**
   * Select an option from a dropdown with intelligent detection
   */
  async selectOption(labelText: string, optionText: string) {
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
  
  /**
   * Click the most appropriate button based on text
   */
  async clickButton(buttonText?: string) {
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
