# Playwright Tests for BankruptcyClinic Interview

This directory contains Playwright end-to-end tests for the docassemble BankruptcyClinic interview.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

## Running Tests

- Run all tests: `npm test`
- Run tests with UI: `npm run test:ui`
- Run tests in headed mode: `npm run test:headed`
- Debug tests: `npm run test:debug`
- View test report: `npm run test:report`

## Test Files

- `voluntary-petition.spec.ts` - Main test suite for the voluntary petition interview flow
- Additional test files can be added as needed

## Configuration

Tests are configured to run against:
- Base URL: https://docassemble2.metatheria.solutions
- Target interview: docassemble.playground1:voluntary-petition.yml

The tests include:
- Cross-browser testing (Chrome, Firefox, Safari)
- Screenshot capture on failure
- Video recording on failure
- Test trace collection for debugging

## Page Object Model

The tests use a Page Object Model pattern with the `VoluntaryPetitionInterview` class that provides methods for:
- Navigation through interview screens
- Form filling helpers
- Assertions for page content

## MCP Server Integration

To use with Playwright MCP server, ensure the server is configured to work with this test setup.
