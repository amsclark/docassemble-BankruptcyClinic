# Resolved Issues — Bug Fix Summary

This page summarizes every customer-reported bug that was investigated and addressed during the May 2026 fix sweep. Each section explains the issue in plain language and shows a video of the fix working in the live system.

If a video doesn't appear inline below, click the link underneath it to download and watch.

---

## ✅ End-to-end walkthroughs (covers most of the petition)

### Complete petition — start to finish

A non-amended single-filer petition runs cleanly from the intro screen through to the document-generation page, with no surprise blockers.

<video src="https://github.com/amsclark/docassemble-BankruptcyClinic/raw/main/docs/videos/04-complete-petition.mp4" controls width="720"></video>

[Download `04-complete-petition.mp4`](https://github.com/amsclark/docassemble-BankruptcyClinic/raw/main/docs/videos/04-complete-petition.mp4)

### Navigation past previously-blocking sections

Covers the sections you previously reported as "dead in the water" — vehicle exemptions, secured creditors, income deductions, codebtors community-property, etc.

<video src="https://github.com/amsclark/docassemble-BankruptcyClinic/raw/main/docs/videos/01-navigation-success.mp4" controls width="720"></video>

**Issues covered:** [#53](../../issues/53), [#54](../../issues/54), [#56](../../issues/56), [#57](../../issues/57), [#59](../../issues/59)

[Download `01-navigation-success.mp4`](https://github.com/amsclark/docassemble-BankruptcyClinic/raw/main/docs/videos/01-navigation-success.mp4)

### Validation actually enforces

Shows the system rejecting invalid input it used to accept (case-number format, address fields).

<video src="https://github.com/amsclark/docassemble-BankruptcyClinic/raw/main/docs/videos/02-validation-enforcement.mp4" controls width="720"></video>

**Issues covered:** [#63](../../issues/63), [#68](../../issues/68), [#74](../../issues/74), [#80](../../issues/80)

[Download `02-validation-enforcement.mp4`](https://github.com/amsclark/docassemble-BankruptcyClinic/raw/main/docs/videos/02-validation-enforcement.mp4)

### Cross-section consistency check

The final review page now warns you if data conflicts between sections (e.g. fee-waiver income doesn't match Schedule I).

<video src="https://github.com/amsclark/docassemble-BankruptcyClinic/raw/main/docs/videos/03-cross-validation.mp4" controls width="720"></video>

**Issues covered:** [#58](../../issues/58), [#76](../../issues/76), [#77](../../issues/77), [#78](../../issues/78)

[Download `03-cross-validation.mp4`](https://github.com/amsclark/docassemble-BankruptcyClinic/raw/main/docs/videos/03-cross-validation.mp4)

---

## 🎯 Issue-by-issue proof

### [#53](../../issues/53) Vehicle Motor-Vehicle exemption single-claim

**Bug:** Claiming the Motor Vehicle exemption on two vehicles crashed the form.

**Fix:** The system now blocks the second claim with a clear validation error pointing to the first vehicle. The hidden-but-required `exemption_value` field that was silently blocking Continue is also fixed.

Demonstrated in the **Navigation past previously-blocking sections** video above.

---

### [#54](../../issues/54) Secured creditors section

**Bug:** You couldn't get past the secured creditors page no matter what you filled in.

**Fix:** The `property_action_other` and codebtor fields (which appear conditionally) were marked required-but-hidden, so the form validator silently blocked Continue. Marked them `required: False` so they only become required when actually shown.

Demonstrated in the **Navigation past previously-blocking sections** video above.

---

### [#55](../../issues/55) Means Test thresholds

**Bug:** Means Test was using "150% of poverty level" thresholds (~$37k) instead of the actual U.S. Trustee Program median-income tables (~$103k for a NE family of 3).

**Fix:** Built a hard-coded table in `objects.py` with current DOJ median-income values for NE and SD, and the 122A abuse-presumption math now uses that table.

> ⚠️ The dollar values should be attorney-verified periodically against DOJ's published table (refreshes ~6 months apart).

---

### [#56](../../issues/56) Income deductions "No" no longer blocks

**Bug:** Answering "No" to "Do you have any deductions to claim?" silently blocked Continue.

**Fix:** Same class of bug as #54 — the per-deduction detail fields are required-but-hidden when you answer No. Marked them all `required: False`.

Demonstrated in the **Navigation past previously-blocking sections** video above.

---

### [#57](../../issues/57) Other monthly income "No" no longer blocks

**Bug:** Leaving the "Other monthly income" page unchanged silently blocked Continue.

**Fix:** Same root cause as #54 / #56. `specify_monthly_income` and `other_monthly_amount` are now `required: False` under their `show if`.

Demonstrated in the **Navigation past previously-blocking sections** video above.

---

### [#58](../../issues/58) Fee waiver reliability (umbrella for #76/#77)

**Bug:** Fee waiver re-collected property and income, accepted made-up numbers, and the cross-validation code that was supposed to catch this had been broken (referencing an undefined variable).

**Fix:**
1. Fixed the final-review page so cross-validation warnings actually display.
2. Added a hard-block on the fee-waiver real-estate value if it differs from Schedule A/B by more than 10%.
3. Pre-fills the fee-waiver real-estate fields from Schedule A/B so the user doesn't re-enter values.

Demonstrated in the **Cross-section consistency check** video above.

---

### [#59](../../issues/59) Codebtors community-property "No" no longer blocks

**Bug:** Answering "No" to the codebtors community-property question silently blocked Continue.

**Fix:** Marked the spouse-related detail fields `required: False` under their `show if`.

Demonstrated in the **Navigement past previously-blocking sections** video above.

---

### [#60](../../issues/60) Pre-filled data confusing for clients

**Bug:** Hardcoded pre-fills (zeros, default selections) confused users — they couldn't tell what was their own data versus a default.

**Fix:** Removed all hardcoded data defaults from Forms 2030 (attorney disclosure) and 122A (means test). The only pre-filling that remains is when a value pulls from earlier user-supplied data (e.g. Schedule I income → 122A income summary). Yes/No navigation defaults were kept because they're flow gates, not data.

---

### [#61](../../issues/61) Marital status — date fields hidden when "No"

**Bug:** Answering "No" to "have you lived elsewhere in the last 3 years?" still displayed five sets of empty date fields.

**Fix:** Every date and address field on that page is now properly gated behind `show if: financial_affairs.lived_elsewhere`.

<video src="https://github.com/amsclark/docassemble-BankruptcyClinic/raw/main/docs/videos/issue-61.mp4" controls width="720"></video>

[Download `issue-61.mp4`](https://github.com/amsclark/docassemble-BankruptcyClinic/raw/main/docs/videos/issue-61.mp4)

---

### [#62](../../issues/62) Debtor 2 questions hidden for individual filers

**Bug:** Filing as an individual still surfaced "Debtor 2" questions throughout the petition.

**Fix:** When the filing status is individual, the debtor list is now limited to one entry, and downstream blocks gate on `len(debtor) > 1`.

<video src="https://github.com/amsclark/docassemble-BankruptcyClinic/raw/main/docs/videos/issue-62.mp4" controls width="720"></video>

[Download `issue-62.mp4`](https://github.com/amsclark/docassemble-BankruptcyClinic/raw/main/docs/videos/issue-62.mp4)

---

### [#63](../../issues/63) Address validation actually validates

**Bug:** City fields accepted random text like "abc123xyz", state fields accepted things like "Denial", ZIP fields accepted 4-digit input.

**Fix:** Added centralized city and ZIP validators (`is_valid_city`, `is_valid_zip` in `objects.py`) wired into the lawsuits page, the levies page, the marital-residence page, the main debtor address page, the real-property page, and the secured-creditors page. State fields are now dropdowns of US states everywhere.

<video src="https://github.com/amsclark/docassemble-BankruptcyClinic/raw/main/docs/videos/issue-63.mp4" controls width="720"></video>

[Download `issue-63.mp4`](https://github.com/amsclark/docassemble-BankruptcyClinic/raw/main/docs/videos/issue-63.mp4)

---

### [#64](../../issues/64) Unsecured creditors — party fields hidden when "No"

**Bug:** Selecting "No" to "do others need to be notified?" still rendered three blank party-entry blocks.

**Fix:** All party fields are now gated behind `show if: ...has_notify` and marked `required: False`.

---

### [#65](../../issues/65) Schedule I/J — "at time of filing" wording

**Bug:** Payroll-deduction question asked for "the previous month" instead of the more legally appropriate "at the time of filing".

**Fix:** Rewrote the question titles to "List expected monthly payroll deductions at the time of filing" with sub-text explaining how to handle one-off months.

---

### [#66](../../issues/66) No case number when not filing amended

**Bug:** Even after answering "No" to "amended filing?", the form still asked for a case number.

**Fix:** The case-number question is now skipped entirely on the non-amended path.

<video src="https://github.com/amsclark/docassemble-BankruptcyClinic/raw/main/docs/videos/issue-66.mp4" controls width="720"></video>

[Download `issue-66.mp4`](https://github.com/amsclark/docassemble-BankruptcyClinic/raw/main/docs/videos/issue-66.mp4)

---

### [#67](../../issues/67) Duplicate contact information

⏸ **Awaiting your input.** The current question YAML has only one collection point for debtor name / contact. If you can share the screen URL or heading where the duplicate appeared, we can identify it and fix it.

---

### [#68](../../issues/68) Real-estate ZIP requires real ZIP format

**Bug:** Property ZIP accepted fewer than 5 digits.

**Fix:** The real-estate ZIP field now uses the centralized digit-only ZIP validator. Inputs like "1234" or "abcde" are rejected.

Demonstrated in the **Validation actually enforces** video above.

---

### [#69](../../issues/69) Updated exemption amounts

⏸ **Awaiting attorney input.** You've emailed them for the current NE/SD exemption dollar values; the structure is in place — the table is in `docassemble/BankruptcyClinic/objects.py` and feeds the new #70 summary screen and the cross-validation warnings. Drop the new values into that table whenever they arrive.

---

### [#70](../../issues/70) Exemption overview screen

**Bug:** When you went over the wildcard exemption limit, there was no easy way to review what you'd already claimed.

**Fix:** Added a new "Exemption summary" screen that appears right after Schedule C. It aggregates every claimed exemption by statute, shows running totals next to the statutory cap, and flags any row that exceeds the cap.

---

### [#71](../../issues/71) Money/Property exemption bifurcation

**Bug:** Tax refunds couldn't have two exemption amounts the way household goods could.

**Fix:** Added `*_exemption_value_2` and `*_exemption_laws_2` fields to the tax-refund and family-support entries in the "Money or Property Owed to You" section, matching the household-goods pattern. The PDF rendering emits a second row when populated.

---

### [#72](../../issues/72) Theft/Disaster — no description required on "No"

**Bug:** Selecting "No" to "did you experience theft or disaster losses?" still required a description.

**Fix:** The description and related fields are now gated behind `show if: financial_affairs.has_disaster` with `required: False`.

---

### [#73](../../issues/73) Financial Statements — no date required on "No"

**Bug:** Selecting "No" to "have you prepared financial statements?" still required a date.

**Fix:** Same fix pattern as #72.

---

### [#74](../../issues/74) Case number format validation

**Bug:** The case-number field accepted any random text.

**Fix:** Added a regex validation (`D:YY-bk-NNNNN`, e.g. `8:23-bk-12345`) that rejects malformed input and tells you the expected format.

<video src="https://github.com/amsclark/docassemble-BankruptcyClinic/raw/main/docs/videos/issue-74.mp4" controls width="720"></video>

[Download `issue-74.mp4`](https://github.com/amsclark/docassemble-BankruptcyClinic/raw/main/docs/videos/issue-74.mp4)

---

### [#76](../../issues/76) Fee-waiver income vs Schedule I

**Fix:** The cross-validation check (sum of Schedule I income vs `family.you_income`) now actually surfaces — see the **Cross-section consistency check** video above.

---

### [#77](../../issues/77) Fee-waiver property values vs Schedule A/B

**Fix:** Added a property-value cross-check, plus the fee-waiver real-estate page now pre-fills from Schedule A/B and hard-blocks save if the user enters a value that diverges by more than 10%.

Demonstrated in the **Cross-section consistency check** video above.

---

### [#78](../../issues/78) Codebtors community-property vs SOFA

**Fix:** Cross-validation now flags when the codebtors-section community-property answer disagrees with the SOFA answer.

Demonstrated in the **Cross-section consistency check** video above.

---

### [#79](../../issues/79) Statement of Intention — no re-entry of secured debts

**Bug:** Form 108 (Statement of Intention) made you re-enter creditor names and property descriptions you'd already entered on Schedule D.

**Fix:** Refactored Form 108 to read directly from the Schedule D creditor list (`prop.creditors`). The PDF is now populated from there. No re-entry.

---

### [#80](../../issues/80) Address consistency

**Fix:** Cross-validation checks ZIP format consistency on both the primary and mailing addresses; flags get surfaced on the final review page.

> Note: If by "different address" you meant a *different page* where this happened, please point me at the specific screen — I only found one debtor-address collection point in the question YAML.

---

## Still open (awaiting your input)

- [**#67**](../../issues/67) Duplicate contact info — couldn't locate a second collection point; need the screen URL where you saw it.
- [**#69**](../../issues/69) Exemption dollar amounts — needs the attorney's updated table.
