# MCP Server Integration for Playwright Tests

This guide explains how to integrate the Playwright MCP server with your BankruptcyClinic tests.

## Overview

The MCP (Model Context Protocol) server provides AI-powered assistance for writing, debugging, and maintaining Playwright tests.

## Setup

1. Ensure you have the MCP server installed and configured
2. Configure the server to work with this project's test structure
3. Point the server to the test files in the `tests/` directory

## Available Test Helpers

The MCP server can assist with:

### Test Generation
- Creating new test scenarios based on docassemble interview flows
- Generating page object methods for new screens
- Creating data-driven test cases

### Test Maintenance  
- Updating selectors when the UI changes
- Refactoring test code for better maintainability
- Adding assertions and validations

### Debugging Support
- Analyzing test failures
- Suggesting fixes for flaky tests
- Optimizing wait strategies

## Example MCP Prompts

Here are some example prompts you can use with the MCP server:

```
"Generate a test for the business property section of the interview"
"Create a helper method to fill out the credit counseling form"  
"Debug this failing assertion in the debtor basic info test"
"Add data validation tests for the county dropdown"
"Create a test that covers the joint filing scenario"
```

## Integration with Existing Tests

The MCP server works with the existing Page Object Model structure:
- `VoluntaryPetitionInterview` class provides the main navigation methods
- Individual test methods focus on specific flows
- Helper methods can be generated for complex form interactions

## Best Practices

When using the MCP server:
1. Provide clear context about which part of the interview you're testing
2. Include relevant selectors and page structure information  
3. Specify expected behaviors and validation requirements
4. Ask for both positive and negative test cases
5. Request tests that cover edge cases and error conditions

## Configuration

Make sure your MCP server is configured with:
- Access to the test files in this project
- Understanding of Playwright test structure
- Knowledge of docassemble form patterns
- The target interview URL: https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1
