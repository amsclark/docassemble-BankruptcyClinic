---
title: "BankruptcyClinic — Free, Open-Source Chapter 7 Petition Generator"
layout: default
---

# BankruptcyClinic

**An open-source guided interview that turns a plain-English Q&A into a complete, filing-ready Chapter 7 bankruptcy petition packet.**

[See it in action ▶](RESOLVED.html) &nbsp; [Browse the code](https://github.com/amsclark/docassemble-BankruptcyClinic)

<video src="videos/04-complete-petition.mp4" controls width="900" muted></video>

*Full single-filer petition, intro screen to document-generation page. Recorded May 2026.*

---

## Who it's for

- **Bankruptcy clinics** serving low-income clients pro bono
- **Solo attorneys** who want to spend billable hours on legal strategy, not data entry
- **Law-school clinics** training students on Chapter 7 petition prep
- **Self-represented filers** who need a structured walkthrough of the Official Forms

The system asks plain-English questions and assembles the answers into the **official US Bankruptcy Court forms** — no document-template wrestling required.

---

## What it generates

Every filing-ready form an individual Chapter 7 petition needs, completed from the same one-time interview:

| Form | What it is |
|---|---|
| **B 101** | Voluntary Petition for Individuals Filing for Bankruptcy |
| **B 106A/B** | Schedule A/B — Property |
| **B 106C** | Schedule C — The Property You Claim as Exempt |
| **B 106D** | Schedule D — Creditors Who Have Claims Secured by Property |
| **B 106E/F** | Schedule E/F — Creditors Who Have Unsecured Claims |
| **B 106G** | Schedule G — Executory Contracts and Unexpired Leases |
| **B 106H** | Schedule H — Your Codebtors |
| **B 106I** | Schedule I — Your Income |
| **B 106J** | Schedule J — Your Expenses |
| **B 106 Sum** | Summary of Your Assets and Liabilities |
| **B 106 Dec** | Declaration About an Individual Debtor's Schedules |
| **B 107** | Statement of Financial Affairs |
| **B 108** | Statement of Intention for Individuals |
| **B 121** | Your Statement About Your Social Security Numbers |
| **B 122A-1** | Chapter 7 Statement of Your Current Monthly Income (Means Test) |
| **B 2030** | Disclosure of Compensation of Attorney for Debtor |

All output as filled, downloadable PDFs at the end of the interview.

---

## Key features

### 🛡 Real validation, where it matters

<video src="videos/02-validation-enforcement.mp4" controls width="720" muted></video>

- Court-format **case-number validation** — rejects invalid formats before they reach a clerk
- **Address validation** — city must contain letters, ZIP must be 5 or 5+4 digits, state is a verified dropdown
- **SSN / ITIN format** enforcement (ITIN must start with 9)

### 📊 Means test from current DOJ tables, not stale poverty lines

- Hard-coded **US Trustee Program median income** thresholds for Nebraska and South Dakota
- Family of 3 in NE = **$103,358** (was a buggy **$37,290** that used 150% of the poverty line)
- Threshold values live in `objects.py` for easy refresh as DOJ publishes new tables

### 🔁 Cross-section data consistency

<video src="videos/03-cross-validation.mp4" controls width="720" muted></video>

- Schedule I income totals reconciled against the fee-waiver application
- Real-property values cross-checked between Schedule A/B and the fee-waiver page (10% tolerance)
- Codebtors community-property answer flagged when it disagrees with the SOFA answer
- ZIP-format consistency check on both primary and mailing addresses
- All warnings surfaced on the **final review page** before document generation

### 🏠 Exemption tracking and overview

- Running totals by statute across **real property, vehicles, household goods, and financial assets**
- Per-statute caps (NE / SD) loaded from a central table
- **Exemption summary screen** flags any claim that exceeds its statutory cap, with the dollar overage

### 📝 No duplicate data entry

- Statement of Intention (Form 108) reads from Schedule D — secured-creditor names, property descriptions, and intended actions are not re-collected
- Schedule C exempt property auto-populated from Schedule A/B selections
- Codebtors auto-populated from secured creditors with codebtors
- Fee waiver pre-fills addresses, income totals, and property values from earlier sections

### 🎯 Built for the 21st-century clerk's office

- Generated PDFs are AcroForm-filled — clerks can re-edit if needed
- State abbreviations on court forms (NE / SD) regardless of how the interview field captures them
- Each PDF is downloadable individually or as a bundle

### ⚖️ Two-state coverage

- **Nebraska** — District of Nebraska, NE Rev. Stat. exemption table
- **South Dakota** — District of South Dakota, SDCL exemption table
- Easy to add additional states via the `NEBRASKA_EXEMPTIONS` / `SOUTH_DAKOTA_EXEMPTIONS` dicts in `objects.py`

---

## What it's built on

- **[docassemble](https://docassemble.org/)** — the open-source guided-interview platform
- **YAML question blocks** for the interview flow (~18 000 lines, structured per form)
- **Python** for the business logic (means-test math, exemption tracking, cross-validation)
- **PDF AcroForm filling** for the court forms
- **Playwright + TypeScript** for ~80 end-to-end tests that exercise the full interview against a live docassemble container

---

## Quality assurance

The repository has a **three-tier test suite**:

1. **Regression suite** — 26+ tests pinning every customer-reported fix as either a focused E2E recording or a structural YAML assertion.
2. **Scenario suite** — 5 persona-driven end-to-end interviews (simple single filer, homeowner with car loan, joint couple, complex case, stress test) that drive every section and verify the resulting PDFs field-by-field.
3. **PDF verification** — 14 dedicated assertions across all forms checking that the user's answers land in the correct AcroForm fields.

[See the full resolved-issues status page with video evidence →](RESOLVED.html)

---

## Status

🟢 **Active development.** The system is in real use by a bankruptcy clinic in Nebraska. May 2026 saw a comprehensive fix sweep addressing 25 customer-reported issues across navigation, validation, conditional logic, and data-consistency — every fix has video evidence on the [resolved issues page](RESOLVED.html).

---

## Try it locally

The interview runs in any modern web browser against a self-hosted docassemble container:

```bash
docker run -d --name docassemble -p 8080:80 \
  -e DA_ADMIN_EMAIL=admin@admin.com \
  -e DA_ADMIN_PASSWORD=password \
  -e DA_ADMIN_API_KEY=testingkey123 \
  -e DAHOSTNAME=localhost \
  jhpyle/docassemble

git clone https://github.com/amsclark/docassemble-BankruptcyClinic
cd docassemble-BankruptcyClinic
bash deploy.sh
```

Open <http://localhost:8080> and start a new interview.

---

## Contact

Built by **Alex Clark** — [`alex@metatheria.solutions`](mailto:alex@metatheria.solutions)

Open source, MIT licensed. Issues and pull requests welcome on [GitHub](https://github.com/amsclark/docassemble-BankruptcyClinic).
