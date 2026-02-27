# docassemble.BankruptcyClinic2

A docassemble extension.

## Automated testing

This project includes Playwright tests under [tests](tests):

- [tests/smoke.spec.ts](tests/smoke.spec.ts): fast navigation and page-load checks
- [tests/individual-filing.spec.ts](tests/individual-filing.spec.ts): individual filing flow coverage
- [tests/e2e.spec.ts](tests/e2e.spec.ts): end-to-end and edge-case coverage
- [tests/helpers.ts](tests/helpers.ts): shared docassemble helper utilities

### Run tests

- `npm run test:smoke`
- `npm run test:individual`
- `npx playwright test tests/e2e.spec.ts`
- `npx playwright test tests/smoke.spec.ts tests/individual-filing.spec.ts tests/e2e.spec.ts`

### Execution environment

Tests are currently run directly from this repository with Playwright and target the configured live URL in [playwright.config.ts](playwright.config.ts):

- `baseURL: https://docassemble2.metatheria.solutions`

No Docker container is required for the current test runs.

## Author

Alex Clark, alex@metatheria.solutions

