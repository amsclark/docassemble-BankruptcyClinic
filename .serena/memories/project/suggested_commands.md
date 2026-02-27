# Suggested Commands

## System Commands
- `git` - Version control
- `ls`, `cd`, `grep`, `find` - Standard Linux file operations

## Python / Docassemble
- `pip install -e .` - Install the package in development mode
- `python setup.py develop` - Alternative dev install
- There is no local docassemble dev server; testing is on https://docassemble2.metatheria.solutions

## Testing (Playwright)
- `npm test` - Run all Playwright tests
- `npm run test:headed` - Run tests with visible browser
- `npm run test:debug` - Debug tests
- `npm run test:ui` - Interactive Playwright UI mode
- `npm run test:report` - Show HTML test report
- `npm run test:comprehensive` - Run comprehensive test
- `npx playwright install` - Install browser binaries

## Linting/Formatting
- No linters configured for YAML or Python
- TypeScript has tsconfig.json configured

## Docker
- Docker is available for running a local docassemble instance
- `docker pull jhpyle/docassemble` - Pull docassemble image
