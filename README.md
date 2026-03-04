# docassemble.BankruptcyClinic

A docassemble extension for Chapter 7 bankruptcy petition preparation, generating official US Bankruptcy Court forms (101, 106A/B, 106C, 106D, 106E/F, 106G, 106H, 106I, 106J, 107, 108, 121, 122A, B2030, and Summary).

## Prerequisites

- Docker (for running the docassemble server)
- Node.js 18+ and npm (for running tests)

## Deployment

### Start the docassemble container

```bash
docker run -d --name docassemble -p 8080:80 --stop-timeout 600 \
  -e DA_ADMIN_EMAIL=admin@admin.com -e DA_ADMIN_PASSWORD=password \
  -e DA_ADMIN_API_KEY=testingkey123 -e DAHOSTNAME=localhost \
  jhpyle/docassemble
```

The container takes 3-5 minutes to initialize after starting.

### Deploy the package

```bash
bash deploy.sh
```

This builds a zip, copies it into the container, installs it with `--no-build-isolation` (required for air-gapped Docker), and restarts uwsgi.

## Testing

Tests use [Playwright](https://playwright.dev/) and target `http://localhost:8080` by default.

### Install test dependencies

```bash
npm install
npx playwright install chromium
```

### Test commands

| Command | Description |
|---------|-------------|
| `npm run test:smoke` | Quick server health checks |
| `npm run test:scenarios` | All 5 scenario tests (simple-single, homeowner-carloan, joint-couple, complex-case, stress-test) |
| `npm run test:pdfs` | PDF field verification suite |
| `npm run test:quick` | Smoke + data validation + edge cases |
| `npx playwright test tests/maximalist.spec.ts --workers=1` | Maximalist end-to-end test (joint filing, 3 of every list item, full PDF verification) |

### Test architecture

- `tests/helpers.ts` - Low-level utilities (page interaction, field filling, base64 encoding)
- `tests/navigation-helpers.ts` - Interview section navigation functions and `runFullInterview()` orchestrator
- `tests/fixtures.ts` - TypeScript type definitions and 5 scenario persona data sets
- `tests/pdf-helpers.ts` - PDF download and field extraction using pdf-lib
- `tests/scenario-*.spec.ts` - 5 scenario-driven end-to-end tests
- `tests/pdf-verification.spec.ts` - Exhaustive PDF field verification (11 sub-tests)
- `tests/maximalist.spec.ts` - Comprehensive test exercising every form field and list

## Author

Alex Clark, alex@metatheria.solutions
