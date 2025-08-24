#!/usr/bin/env node

/**
 * MCP Server for Playwright Test Development
 * 
 * This server provides AI assistance for developing and debugging
 * Playwright tests for the docassemble bankruptcy interview.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

class PlaywrightTestMcpServer {
  private server: Server;
  
  constructor() {
    this.server = new Server(
      {
        name: 'playwright-bankruptcy-tester',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupToolHandlers();
  }
  
  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'run_test',
          description: 'Run a specific Playwright test with detailed output',
          inputSchema: {
            type: 'object',
            properties: {
              testFile: {
                type: 'string',
                description: 'The test file to run (e.g., smoke.spec.ts)',
              },
              testName: {
                type: 'string',
                description: 'Specific test name to run (optional)',
              },
              headed: {
                type: 'boolean',
                description: 'Run test in headed mode (visible browser)',
                default: false,
              },
            },
            required: ['testFile'],
          },
        },
        {
          name: 'analyze_test_results',
          description: 'Analyze test results and screenshots to identify issues',
          inputSchema: {
            type: 'object',
            properties: {
              resultsDir: {
                type: 'string',
                description: 'Path to test results directory',
                default: 'test-results',
              },
            },
          },
        },
        {
          name: 'generate_selector',
          description: 'Generate CSS selectors for form elements based on description',
          inputSchema: {
            type: 'object',
            properties: {
              elementType: {
                type: 'string',
                enum: ['input', 'select', 'button', 'radio', 'checkbox'],
                description: 'Type of element to select',
              },
              label: {
                type: 'string',
                description: 'Label text or description of the element',
              },
              context: {
                type: 'string',
                description: 'Additional context about the element location',
              },
            },
            required: ['elementType', 'label'],
          },
        },
        {
          name: 'debug_page',
          description: 'Run debug test to analyze current page structure',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Specific URL to debug (optional)',
              },
            },
          },
        },
      ],
    }));
    
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case 'run_test':
            return await this.runTest(args);
          case 'analyze_test_results':
            return await this.analyzeTestResults(args);
          case 'generate_selector':
            return await this.generateSelector(args);
          case 'debug_page':
            return await this.debugPage(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }
  
  private async runTest(args: any) {
    const { testFile, testName, headed = false } = args;
    
    let command = `npx playwright test ${testFile}`;
    
    if (testName) {
      command += ` -g "${testName}"`;
    }
    
    if (headed) {
      command += ' --headed';
    }
    
    command += ' --reporter=line,html';
    
    console.error(`Running command: ${command}`);
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: '/home/alex/docassemble-BankruptcyClinic',
        timeout: 60000, // 1 minute timeout
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `Test execution completed!\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Test execution failed!\n\nError: ${error.message}\n\nSTDOUT:\n${error.stdout || 'None'}\n\nSTDERR:\n${error.stderr || 'None'}`,
          },
        ],
      };
    }
  }
  
  private async analyzeTestResults(args: any) {
    const { resultsDir = 'test-results' } = args;
    const resultsPath = path.join('/home/alex/docassemble-BankruptcyClinic', resultsDir);
    
    try {
      const files = await fs.readdir(resultsPath);
      
      const analysis = {
        screenshots: files.filter(f => f.endsWith('.png')),
        analyses: files.filter(f => f.endsWith('-analysis.json')),
        videos: files.filter(f => f.endsWith('.webm')),
        traces: files.filter(f => f.endsWith('.zip')),
      };
      
      let report = 'Test Results Analysis:\n\n';
      
      if (analysis.screenshots.length > 0) {
        report += `Screenshots (${analysis.screenshots.length}):\n`;
        analysis.screenshots.forEach(screenshot => {
          report += `  - ${screenshot}\n`;
        });
        report += '\n';
      }
      
      // Read analysis files if available
      if (analysis.analyses.length > 0) {
        report += 'Detailed Analysis:\n';
        for (const analysisFile of analysis.analyses.slice(0, 3)) { // Limit to 3 files
          try {
            const analysisPath = path.join(resultsPath, analysisFile);
            const content = await fs.readFile(analysisPath, 'utf-8');
            const data = JSON.parse(content);
            
            report += `\n=== ${analysisFile} ===\n`;
            report += `Page: ${data.h1Text || 'Unknown'}\n`;
            report += `URL: ${data.url || 'Unknown'}\n`;
            
            if (data.errors && data.errors.length > 0) {
              report += `Errors: ${data.errors.join(', ')}\n`;
            }
            
            if (data.formFields && data.formFields.length > 0) {
              report += `Form fields: ${data.formFields.length}\n`;
            }
            
            if (data.selects && data.selects.length > 0) {
              report += `Dropdowns: ${data.selects.length}\n`;
            }
          } catch (e) {
            report += `\n=== ${analysisFile} (Error reading) ===\n`;
          }
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: report,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing results: ${error.message}`,
          },
        ],
      };
    }
  }
  
  private async generateSelector(args: any) {
    const { elementType, label, context = '' } = args;
    
    let selectors = [];
    
    switch (elementType) {
      case 'input':
        selectors = [
          `input[name*="${label.toLowerCase().replace(/\s+/g, '')}"]`,
          `input[id*="${label.toLowerCase().replace(/\s+/g, '')}"]`,
          `label:has-text("${label}") + input`,
          `label:has-text("${label}") input`,
          `[data-label*="${label}"] input`,
        ];
        break;
        
      case 'select':
        selectors = [
          `select[name*="${label.toLowerCase().replace(/\s+/g, '')}"]`,
          `select[id*="${label.toLowerCase().replace(/\s+/g, '')}"]`,
          `label:has-text("${label}") + select`,
          `label:has-text("${label}") select`,
        ];
        break;
        
      case 'button':
        selectors = [
          `button:has-text("${label}")`,
          `input[type="submit"][value*="${label}"]`,
          `button[type="submit"]`,
          `[role="button"]:has-text("${label}")`,
        ];
        break;
        
      case 'radio':
        selectors = [
          `input[type="radio"][value="${label}"]`,
          `input[type="radio"][value*="${label.toLowerCase()}"]`,
          `label:has-text("${label}") input[type="radio"]`,
        ];
        break;
        
      case 'checkbox':
        selectors = [
          `input[type="checkbox"][name*="${label.toLowerCase().replace(/\s+/g, '')}"]`,
          `label:has-text("${label}") input[type="checkbox"]`,
        ];
        break;
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `Suggested selectors for ${elementType} "${label}":\n\n` +
                selectors.map((sel, i) => `${i + 1}. ${sel}`).join('\n') +
                `\n\nContext: ${context}\n\n` +
                `Recommended approach:\n` +
                `1. Try the first selector\n` +
                `2. If not found, use page.locator() with waitFor() to handle dynamic content\n` +
                `3. Consider using text-based selectors for better stability`,
        },
      ],
    };
  }
  
  private async debugPage(args: any) {
    const { url = '' } = args;
    
    const command = `npx playwright test tests/debug.spec.ts --headed`;
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: '/home/alex/docassemble-BankruptcyClinic',
        timeout: 30000,
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `Debug test completed!\n\nCheck test-results/ for screenshots and analysis files.\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Debug test failed: ${error.message}`,
          },
        ],
      };
    }
  }
  
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Playwright Test MCP Server running on stdio');
  }
}

const server = new PlaywrightTestMcpServer();
server.run().catch(console.error);
