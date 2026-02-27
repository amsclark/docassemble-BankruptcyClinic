# Project Overview: docassemble-BankruptcyClinic

## Purpose
A docassemble extension for Chapter 7 Bankruptcy filings in Nebraska and South Dakota. 
It implements a guided interview that collects debtor information and generates official 
bankruptcy court forms (PDFs) including:

- **Form B101** - Voluntary Petition
- **Form B101A/B** - Eviction judgment statements
- **Form B103A** - Installment payment application
- **Form B103B** - Fee waiver application
- **Form B106AB** - Schedules A/B (Property)
- **Form B106C** - Schedule C (Exemptions)
- **Form B106D** - Schedule D (Secured Creditors)
- **Form B106EF** - Schedules E/F (Unsecured Claims)
- **Form B106G** - Schedule G (Contracts/Leases)
- **Form B106H** - Schedule H (Codebtors)
- **Form B106I** - Schedule I (Income)
- **Form B106J** - Schedule J (Expenses)
- **Form B107** - Statement of Financial Affairs
- **Form B108** - Statement of Intention
- **Form B121** - Social Security Number Statement
- **Form B122A** - Means Test / Monthly Income

## Tech Stack
- **Backend:** docassemble (Python-based guided interview platform)
- **Interview Language:** YAML (docassemble interview format)
- **Python modules:** objects.py, courts_list.py, county_list.py, get_bk_states_list.py
- **Frontend:** Bootstrap CSS, custom CSS, JavaScript (exemptions.js)
- **PDF generation:** docassemble PDF fill-in via attachment blocks
- **Testing:** Playwright (TypeScript) for E2E tests
- **Package management:** setuptools (Python), npm (for Playwright tests)

## Project Structure
```
docassemble/BankruptcyClinic/
  __init__.py
  objects.py           - Custom classes (Debtor, DebtorAlias, DebtorTaxId, DebtorDistrictInfo)
  courts_list.py       - List of bankruptcy courts (NE, SD)
  county_list.py       - County lists by state
  get_bk_states_list.py - Returns ["Nebraska", "South Dakota"]
  data/
    questions/
      voluntary-petition.yml    - MAIN INTERVIEW (2226 lines, mandatory block + object defs)
      mandatory-initial-code.yml - Just review menu setup
      101-question-blocks.yml   - Core question blocks (debtors, case, business, etc.)
      101A-question-blocks.yml  - Eviction judgment
      103A-question-blocks.yml  - Installment payments
      103B-question-blocks.yml  - Fee waiver
      106AB-question-blocks.yml - Property schedules (7327 lines!)
      106C-question-blocks.yml  - Exemptions
      106D-question-blocks.yml  - Secured creditors
      106EF-question-blocks.yml - Unsecured claims
      106G-question-blocks.yml  - Contracts/Leases + codebtors
      106H-question-blocks.yml  - Codebtors
      106I-question-blocks.yml  - Income
      106J-question-blocks.yml  - Expenses
      107-question-blocks.yml   - Financial affairs (2893 lines!)
      108-question-blocks.yml   - Statement of intention
      121-question-blocks.yml   - SSN statement
      122A-question-blocks.yml  - Means test
    templates/                   - PDF form templates
    static/                      - CSS + JS files
    sources/                     - ALKiln test features (disabled)
tests/
  Human-written flow.spec.ts    - Playwright test (663 lines)
```

## Server
- Live at: https://docassemble2.metatheria.solutions
- Interview URL: /interview?i=docassemble.playground1:voluntary-petition.yml#page1
