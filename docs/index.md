---
title: "BankruptcyClinic — Open-Source Chapter 7 Petition Generator"
layout: default
---

# Stop typing the same client data into seventeen separate court forms.

**BankruptcyClinic** is an open-source guided interview that turns one plain-English conversation with your client into a complete, filing-ready Chapter 7 bankruptcy petition packet — every Official Form, properly cross-referenced, with the legally-correct exemptions for your state.

[**Contact me to set it up for your clinic →**](#get-started)

<video src="videos/04-complete-petition.mp4" controls width="900" muted></video>

*The system in motion: a real petition assembled in a single sitting.*

---

## Built for the people doing the actual filing

- **Bankruptcy clinics** serving low-income clients pro bono — get your students or volunteers productive on day one instead of week three.
- **Solo and small-firm attorneys** — spend your billable hours on counseling and strategy, not on retyping the same address into fifteen PDFs.
- **Law-school clinics** training the next generation — students learn the legal logic, not the data-entry mechanics.
- **Legal-aid organizations** scaling pro-bono Chapter 7 work without scaling staff.

---

## What it does

You answer questions. It produces the official US Bankruptcy Court forms. **All of them.**

| Form | What it is |
|---|---|
| **B 101** | Voluntary Petition for Individuals Filing for Bankruptcy |
| **B 106A/B** | Schedule A/B — Property |
| **B 106C** | Schedule C — Property You Claim as Exempt |
| **B 106D** | Schedule D — Secured Creditors |
| **B 106E/F** | Schedule E/F — Unsecured Creditors |
| **B 106G** | Schedule G — Executory Contracts and Unexpired Leases |
| **B 106H** | Schedule H — Your Codebtors |
| **B 106I** | Schedule I — Your Income |
| **B 106J** | Schedule J — Your Expenses |
| **B 106 Sum** | Summary of Your Assets and Liabilities |
| **B 106 Dec** | Declaration About an Individual Debtor's Schedules |
| **B 107** | Statement of Financial Affairs |
| **B 108** | Statement of Intention for Individuals |
| **B 121** | Your Statement About Your Social Security Numbers |
| **B 122A-1** | Means Test (Statement of Current Monthly Income) |
| **B 2030** | Disclosure of Compensation of Attorney for Debtor |

Filled, downloadable, ready to file. The same answer flows into every form that needs it — names, addresses, debts, exemptions, income — without you re-entering anything.

---

## Why use this

### One interview → every form
Enter the property once. It shows up on Schedule A/B, the exemption claim on Schedule C, the secured-debt entry on Schedule D, the intention on Form 108, and the values on the means test. **No duplicate data entry, ever.**

### State-specific exemptions built in
- **Nebraska** — full NE Rev. Stat. exemption table with statutory caps
- **South Dakota** — full SDCL exemption table with statutory caps
- The exemption summary screen tracks running totals by statute and **flags any claim that exceeds its cap before you file**.

### Means test from current DOJ tables
No more stale "150% of poverty" calculations. The 122A page uses the actual US Trustee Program median-income thresholds for the debtor's state.

### Cross-section consistency
The system catches inconsistencies between sections before they become court rejections:
- Schedule I income vs fee-waiver application
- Schedule A/B property values vs fee-waiver real-estate page (10% tolerance)
- Codebtors community-property answer vs SOFA answer
- ZIP-format consistency on every address

### Real validation, where it matters
Case numbers must match court format. Cities must contain letters. ZIP codes must be digits. SSN/ITIN format enforced. State fields are verified dropdowns, not free-text boxes.

### No vendor lock-in
- **Open source** (MIT license) — fork it, audit it, modify it.
- **Self-hosted** — your client data never leaves your infrastructure.
- **Standard PDFs out** — filled AcroForm PDFs that any clerk can re-edit.

---

## Adopt it

The system is in production use at a Nebraska bankruptcy clinic right now. If you want it running at yours, I do this professionally — let's talk.

### Services I offer

**Setup & deployment** — Get the docassemble server stood up, the package deployed, integrated with your auth (LDAP / Google / SSO), and behind your domain. Typical timeline: **2–3 weeks** from kickoff.

**Adding your state** — Don't see your jurisdiction in the supported list above? The exemption table is a per-state dictionary in plain Python. I'll research your state's exemption statutes (with attorney verification), build the table, wire it into the dropdowns, and add it to the means-test data. Fixed-fee per state.

**Custom forms & workflows** — Chapter 11, Chapter 13, business filings, state-specific local forms, jurisdiction-specific cover sheets, intake forms, fee-waiver workflows tailored to your clinic. The architecture is designed to extend.

**Ongoing maintenance** — DOJ refreshes median-income tables roughly every 6 months. Court forms get revised. Federal exemption caps change. I track those changes and roll them out on a maintenance contract so you don't have to.

**Training** — Walk-throughs for your attorneys, paralegals, and students. Recorded for ongoing onboarding.

---

## What it's built on

[**docassemble**](https://docassemble.org/) — the open-source guided-interview platform — drives the question flow. Python handles the business logic (means-test math, exemption tracking, cross-validation). PDF AcroForm filling produces the court forms. A Playwright + TypeScript test suite (~80 end-to-end tests, plus regression tests covering every customer-reported bug) keeps the petition flow trustworthy through every change. ([See the QA detail here.](RESOLVED.html))

---

## Get started

<a id="get-started"></a>

**Alex Clark** &nbsp;·&nbsp; [`alex@metatheria.solutions`](mailto:alex@metatheria.solutions) &nbsp;·&nbsp; [github.com/amsclark](https://github.com/amsclark)

Reach out and tell me about your jurisdiction, your caseload, and what state-specific things you need. I'll get back with a scoping note.

If you'd rather kick the tires first, the [GitHub repo](https://github.com/amsclark/docassemble-BankruptcyClinic) has the full quickstart for spinning up a local copy on Docker.
