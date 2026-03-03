# GitHub Issues Resolution Plan

## Status Summary

| Status | Count | Issues |
|--------|-------|--------|
| Resolved (pre-existing) | 8 | #2, #3, #6, #7, #11, #14, #19, #23 |
| **Fixed in Sprint 1** | **6** | **#9, #10, #21, #28, #33 + typos** |
| **Fixed in Sprint 2** | **6** | **#8, #13, #16, #18, #26, #29 + bug fixes** |
| **Fixed in Sprint 3** | **4** | **#17, #20, #25, #30 + flow reorder** |
| Partially Resolved | 2 | #15, #27 |
| Unresolved | 4 | #4, #5, #12, #22, #24 |

---

## Resolved Issues (Can Be Closed)

### #2 — SSN Section Wording
**Status: RESOLVED**
Wording changed from "Debtor has no SSN" to "Debtor has a SSN" with yes/no.
File: `121-question-blocks.yml`

### #3 — Other Names Description
**Status: RESOLVED**
Description now includes "middle initial or name" text alongside married/maiden/assumed names.
File: `101-question-blocks.yml`

### #6 — Personal Property Typos
**Status: RESOLVED**
All typos fixed: "jewlery" → "jewelry", removed "of value" from collectibles/clothes/jewelry questions.
File: `106AB-question-blocks.yml`

### #7 — Secured Creditor Notices
**Status: RESOLVED**
Secured creditors use `there_is_another` loop — unlimited notice parties can be added.
File: `106D-question-blocks.yml`

### #11 — Community Property "No" Blocks Continue
**Status: RESOLVED** (verified by live Playwright test)
Answering "No" to community property question now allows advancing to next page.
File: `107-question-blocks.yml`

### #14 — Expenses "Join" Typo
**Status: RESOLVED**
No "join" typo found in expense section. Question correctly reads "joint."
File: `106J-question-blocks.yml`

### #19 — Statement of Financial Affairs Repossession
**Status: RESOLVED**
Question now says "Within 1 year" and provides a date field (not free text).
File: `107-question-blocks.yml`

### #23 — Priority Debts Wording
**Status: RESOLVED**
Rephrased to "Do you owe any taxes or owe anyone child support?" instead of generic "priority debts."
File: `106EF-question-blocks.yml`

---

## Fixed in Sprint 2

### #26 — Explanation Boxes Without Yes/No Gate
**Status: FIXED**
Changed PDF code to always include `change_explainer` text regardless of `change_in_expense` answer.
File: `106J-question-blocks.yml`

### #29 — Credit Counseling Options
**Status: FIXED**
Added all 4 counseling status options (was 2). Fixed typos: "recieved"→"received", "breifing"→"briefing". Date field now only shows for certificate option.
File: `101-question-blocks.yml`

### #13 — More Income Deductions
**Status: FIXED**
Increased from 6 to 10 deduction slots for both debtor 1 and debtor 2. Updated PDF code to use loop with `getattr` and semicolon-separated descriptions.
Files: `106I-question-blocks.yml`, `voluntary-petition.yml`

### #8 — Unsecured Creditor Notices (6 parties)
**Status: FIXED**
Increased from 3 to 6 hardcoded notify parties for both priority and nonpriority claims. Replaced repetitive PDF code with loop using `getattr`. Fixed typo "notifed"→"notified".
File: `106EF-question-blocks.yml`

### #16 — More Previous Address Slots
**Status: FIXED**
Added addresses 7-10 gated by `has_more_addresses` question after address 6. Fixed 5 bugs in existing PDF code for debtor 2 addresses (typos in variable names, wrong indices). PDF overflow addresses concatenated into `additional_addresses` field.
Files: `107-question-blocks.yml`, `voluntary-petition.yml`

### #18 — More Insider Payment Dates
**Status: FIXED**
Added payment dates 4-6 for insider benefit payments (was 3). Updated PDF code to use loop with `getattr` for dates 4-6.
File: `107-question-blocks.yml`

### Additional Bug Fixes in Sprint 2
- Fixed `finacial_affairs.address_same_dates2` → `financial_affairs.address_same_dates_2` (line 2470)
- Fixed `finacial_affairs.address_same_dates4` → `financial_affairs.address_same_dates_4` (line 2495)
- Fixed `financial_affairs.address_same_3` → `financial_affairs.address_same_5` (line 2506, wrong index)
- Fixed `financial_affairs.debtor2_address_street_3` → `financial_affairs.debtor2_address_street_5` (line 2513, wrong index)
- Fixed `finacial_affairs.address_same_dates6` → `financial_affairs.address_same_dates_6` (line 2520)
- Fixed redundant condition `has_second_address and has_second_address` → `has_second_address` (line 606)

---

## Fixed in Sprint 3

### #30 — Move reporting section + auto-populate estimates
**Fix**: Moved reporting section from after credit counseling to after unsecured claims. Added auto-calculation of `creditor_estimate`, `assets_estimate`, and `liabilities_estimate` from already-entered data. Used `getattr()` with defaults and `defined()` guards for optional financial assets.
**Files**: `voluntary-petition.yml`, `tests/navigation-helpers.ts`

### #20 — Auto-populate 122A means test from 106I income data
**Fix**: Added `default:` values to 122A question block fields that pull from Schedule I (106I) income data. Debtor 1: gross_wages from `income_amount_1 + overtime_pay_1`, alimony from `family_support`, interest from `interest_dividends`, etc. Debtor 2: same mappings with `len(debtor) > 1` guard.
**Files**: `122A-question-blocks.yml`

### #25 — Move income section earlier in flow
**Fix**: Moved income (106I) and expenses (106J) from after contracts/codebtors to after exemptions (106C). Changed debtor 2 income dependency from `financial_affairs.marital_status` to `len(debtor) > 1` for correctness.
**Files**: `voluntary-petition.yml`, `tests/navigation-helpers.ts`

### #17 — Separate 2-year income for married couples
**Fix**: Changed flow gates for debtor 2 income history (employed and other_income) from `financial_affairs.marital_status == False` to `len(debtor) > 1`. The question blocks already existed but were gated on marital status instead of joint filing.
**Files**: `voluntary-petition.yml`, `tests/navigation-helpers.ts`

### Additional Changes in Sprint 3
- Updated `navigateFinancialAffairs()` in tests to handle debtor 2 employment/income pages for joint filings
- Fixed `reporting.assets_estimate` calculation: used `getattr()` for optional property values and `defined()` guard for financial assets
- Updated `runFullInterview()` flow order to match new YAML sequence (income → expenses → financial affairs → creditors → reporting → contracts)

---

## Partially Resolved Issues

### #8 — Unsecured Creditor Notices (3 fixed parties)
**Problem**: Unsecured creditors limited to 3 hardcoded notice parties. Secured creditors already support unlimited via `there_is_another` loop.
**What works**: The 3-party limit handles most cases.
**What's missing**: IRS debts and similar may need 4+ notice addresses.
**Fix**: Convert unsecured notice fields to use same `there_is_another` loop pattern as secured creditors in `106D-question-blocks.yml`.
**Effort**: Medium — requires restructuring notice fields from `other_name`, `other_name_2`, `other_name_3` to a list-collect pattern.
**File**: `106EF-question-blocks.yml`

### #9 — Account Numbers and Date Incurred
**Problem**: Label says "Last 4 digits of account number" but attorneys enter full numbers. Field uses `datatype: number` which blocks letters (some account numbers have letters).
**What works**: Account number is optional (`required: False`). Date incurred is optional.
**What's missing**: (1) Label should say "Account number" not "Last 4 digits". (2) Datatype should be `text` not `number`.
**Fix**: Change label text and change `datatype: number` to `datatype: text` for account number fields.
**Effort**: Small — two-line changes in each of priority and nonpriority claim blocks.
**File**: `106EF-question-blocks.yml`

### #10 — Student Loans Label
**Problem**: Student loans appear under "Type of PRIORITY unsecured claim" dropdown, but they're nonpriority debts.
**What works**: Student loans are correctly placed in the nonpriority section.
**What's missing**: The field label says "Type of PRIORITY unsecured claim" even in the nonpriority context.
**Fix**: Change label to "Type of unsecured claim" or split labels for priority vs nonpriority sections.
**Effort**: Small — label text change.
**File**: `106EF-question-blocks.yml`

### #13 — Multiple Income Deductions
**Problem**: Only 6 "other deduction" slots for payroll deductions.
**What works**: 6 deductions covers most cases.
**What's missing**: Some clients have many deductions (garnishments, multiple insurance, etc.).
**Fix**: Convert to `there_is_another` loop pattern, or increase to 10 slots.
**Effort**: Medium — requires restructuring deduction fields or adding more hardcoded slots.
**File**: `106I-question-blocks.yml`

### #15 — Statement of Intention
**Problem**: Statement of Intention (B108) is a separate section, but could be collected alongside secured creditor entry.
**What works**: `property_action` is already collected during secured creditor entry.
**What's missing**: Full integration — the separate Statement of Intention section still exists.
**Fix**: Low priority — the current flow works, just has some redundancy. Could be addressed by auto-populating B108 from secured creditor data.
**Effort**: Large — architectural change to merge sections.
**File**: `voluntary-petition.yml`, `108-question-blocks.yml`

### #25 — Income / Paystub Entry
**Problem**: User preference to enter paystub data earlier in the flow.
**What works**: Paystub/income entry exists and collects the right data.
**What's missing**: It's placed late in the interview flow.
**Fix**: Move income section earlier in `voluntary-petition.yml` interview order, or allow section navigation.
**Effort**: Small — reorder sections in flow file. May affect variable dependencies.
**File**: `voluntary-petition.yml`

### #27 — Fee Waiver Poverty Calculation
**Problem**: User wants automatic poverty level comparison for fee waiver eligibility.
**What works**: Means test already calculates income vs. median.
**What's missing**: No explicit "eligible for fee waiver" indicator at 150% poverty level.
**Fix**: Add a computed field or note that displays whether income is above/below 150% FPL after income entry.
**Effort**: Medium — requires poverty level data table and comparison logic.
**File**: `122A-question-blocks.yml` or new question block

---

## Unresolved Issues — Resolution Plan

### Priority 1: Quick Fixes (< 1 hour each)

#### #9 — Account Number Field Type
**Change**: In `106EF-question-blocks.yml`:
1. Change `datatype: number` to `datatype: text` for `account_number` fields (priority and nonpriority)
2. Change label from "Last 4 digits of account number" to "Account number"

#### #10 — Student Loans Label
**Change**: In `106EF-question-blocks.yml`:
- Change "Type of PRIORITY unsecured claim" label in nonpriority section to "Type of unsecured claim"

#### #21 — Auto-Calculate Asset Estimates
**Change**: In `101-question-blocks.yml` or `voluntary-petition.yml`:
- `assets_estimate` is NOT auto-calculated (unlike `creditor_estimate` and `liabilities_estimate` which are)
- Add code block to sum property values into `assets_estimate` similar to existing `creditor_estimate` logic

#### #28 — Hazardous Material Simplification
**Change**: In hazardous property question block:
- Consolidate multiple yes/no questions into a single "Does any of your property contain hazardous materials?" question
- Only show follow-up details if answer is yes

#### #33 — "Debtor 1"/"Debtor 2" References in Individual Filing
**Change**: In `107-question-blocks.yml` and `122A-question-blocks.yml`:
- Wrap "Debtor 2" questions with `show if: filing_status == 'Filing with spouse'` or equivalent condition
- Change unconditional "Debtor 1 or Debtor 2" text to use Jinja conditionals:
  `{% if filing_status == 'Filing with spouse' %}Debtor 1 or Debtor 2{% else %}you{% endif %}`
- Affected locations in 107-question-blocks.yml: lines 772, 775, 938, 1048, 1053, 1132
- Affected locations in 122A-question-blocks.yml: lines 60, 119, 123

### Priority 2: Moderate Changes (1-4 hours each)

#### #8 — Unsecured Creditor Notices (Unlimited Parties)
**Change**: In `106EF-question-blocks.yml`:
- Replace hardcoded `other_name`, `other_name_2`, `other_name_3` with a list-collect pattern
- Use same `there_is_another` loop as secured creditors in `106D-question-blocks.yml`
- Migrate existing data if needed (backward compatibility)

#### #13 — More Income Deductions
**Change**: In `106I-question-blocks.yml`:
- Convert 6 hardcoded "other deduction" fields to a `there_is_another` list-collect loop
- Or increase to 10+ hardcoded slots (simpler but less flexible)

#### #16 — More Address Slots
**Change**: In `107-question-blocks.yml`:
- Currently limited to 6 previous addresses
- Convert to `there_is_another` loop pattern, or increase to 10+ slots
- More flexible approach: use list-collect like creditor addresses

#### #18 — More Payment Date Entries
**Change**: In `107-question-blocks.yml`:
- Insider payment dates limited to 3 entries
- Convert to `there_is_another` loop, or increase hardcoded slots

#### #26 — Explanation Boxes Without Yes/No Gate
**Change**: In `106J-question-blocks.yml` (and potentially 106I):
- Currently, explanation text fields are gated behind a yes/no question ("Is there anything you want to explain?")
- Make explanation fields always visible (optional text area) without requiring a yes/no gate
- Or change the yes/no label to something more inviting like "Would you like to add any notes for the trustee?"

#### #29 — Credit Counseling Options
**Change**: In `101-question-blocks.yml`:
- Currently only shows 2 of 4 possible counseling status options
- Add missing options: "Exigent circumstances" and "Not required"
- Add validation or warning if counseling not completed
- Consider making certificate upload mandatory for the "briefed with certificate" option

#### #30 — Reporting Section Placement
**Change**: In `voluntary-petition.yml`:
- Move reporting questions earlier in the flow (near district/case selection)
- Auto-populate asset/liability/creditor estimates from already-entered data
- Requires `assets_estimate` auto-calculation (see #21)

### Priority 3: Significant Changes (4+ hours each)

#### #4 — Secured Personal Property (Furniture)
**Problem**: No way to mark personal property items as secured. If furniture is secured, the user needs two entries — one exempt, one not — linked to a creditor.
**Approach**:
1. Add a "Is this item securing a debt?" yes/no to each personal property entry
2. If yes, collect the creditor name and link to secured creditor list
3. This ties into exemption handling (#5/#22)
**Complexity**: High — affects property entry flow, exemption calculation, and secured creditor cross-referencing.
**Files**: `106AB-question-blocks.yml`, `106C-question-blocks.yml`, possibly `106D-question-blocks.yml`

#### #5 / #22 — Exemptions from Existing Property
**Problem**: Exemption entry requires re-typing property descriptions that were already entered in Schedule A/B. No dropdown to select from existing property.
**Approach**:
1. Build a dynamic choices list from already-entered `property` items (real property, vehicles, deposits, personal property)
2. Present as a dropdown or multi-select when entering exemptions
3. Auto-populate description and value from the selected property
4. Allow manual entry for items not in the list
**Complexity**: High — requires cross-referencing property data structures, building dynamic choice lists, and handling the property→exemption data flow.
**Files**: `106C-question-blocks.yml`, may need new code block in `voluntary-petition.yml`

#### #12 / #24 — Link Codebtors to Specific Debts
**Problem**: Codebtors are entered as a separate section, not linked to the specific debts they co-signed.
**Approach**:
1. Add a "Does this debt have a codebtor?" question to each creditor entry (secured and unsecured)
2. If yes, collect codebtor name and relationship inline
3. Auto-populate Schedule H (codebtors) from creditor entries
4. Remove or simplify the standalone codebtor section
**Complexity**: High — affects multiple creditor entry flows, codebtor form generation, and data aggregation.
**Files**: `106D-question-blocks.yml`, `106EF-question-blocks.yml`, codebtor question blocks, `voluntary-petition.yml`

#### #17 — Separate Income Sources for Last 2 Years (Married Couples)
**Problem**: For married couples, income for the last 2 years needs to be separated by spouse. Currently combined.
**Approach**:
1. For joint filings, duplicate the 2-year income history questions per debtor
2. Show "Debtor 1 income for [year]" and "Debtor 2 income for [year]" separately
3. Map to correct PDF fields for Form 107
**Complexity**: Medium-High — requires conditional question duplication for joint filings.
**Files**: `107-question-blocks.yml`

#### #20 — Income Section Duplication (106I vs 122A)
**Problem**: Users enter income data twice — once for Schedule I (Form 106I) and again for the Means Test (Form 122A). Different variable namespaces (`debtor[0].income.*` vs `monthly_income.*`).
**Approach**:
1. After Schedule I income entry, auto-populate Form 122A fields from 106I data:
   - `debtor[0].income.income_amount_1` → `monthly_income.gross_wages1`
   - `debtor[0].income.social_security` → `monthly_income.social1`
   - Similar mappings for unemployment, pension, interest, rental, business income
2. Present 122A as a "review and confirm" step rather than fresh data entry
3. Only require manual entry for 122A-specific fields (spouse income if not filing jointly, means test exemptions)
**Complexity**: Medium — variable mapping is straightforward but needs careful testing to ensure all fields align.
**Files**: `122A-question-blocks.yml`, possibly new code block in `voluntary-petition.yml`

---

## Recommended Implementation Order

### Sprint 1: Quick Wins
1. **#9** — Account number: text type + full number label
2. **#10** — Student loans: fix "PRIORITY" label
3. **#21** — Auto-calculate `assets_estimate`
4. **#33** — Conditional "Debtor 1"/"Debtor 2" text
5. **#28** — Simplify hazardous material to one question
6. Fix typo: "calulate" → "calculate" in `122A-question-blocks.yml:34`

### Sprint 2: Moderate Improvements
7. **#8** — Unsecured creditor unlimited notice parties
8. **#26** — Remove yes/no gate from explanation boxes
9. **#29** — Add missing credit counseling options
10. **#16** — More address slots (convert to loop)
11. **#18** — More payment date entries (convert to loop)
12. **#13** — More income deduction slots

### Sprint 3: Flow & UX Improvements
13. **#30** — Move reporting section + auto-populate estimates
14. **#20** — Auto-populate 122A from 106I income data
15. **#25** — Move income section earlier in flow
16. **#17** — Separate 2-year income for married couples

### Sprint 4: Architectural Changes
17. **#5/#22** — Exemptions dropdown from existing property
18. **#4** — Secured personal property option
19. **#12/#24** — Link codebtors to specific debts

---

## Test Coverage

Each fix should include:
- **YAML code change** in the relevant question-blocks file
- **Deploy and verify** via `bash deploy.sh` + manual spot-check
- **Automated test** added to `tests/issue-verification.spec.ts` where feasible
- **Existing scenario tests** re-run to ensure no regressions

Issues that can be verified by automated tests:
- #9: Navigate to creditor entry, type letters in account number field, verify acceptance
- #10: Check label text on nonpriority claim type dropdown
- #21: Complete interview, verify `assets_estimate` field in PDF is non-empty
- #33: Run individual filing, verify no "Debtor 2" text appears on pages
- #8: Add 4+ notice parties to unsecured creditor
- #28: Verify single hazardous material question

Issues requiring manual/visual verification:
- #5/#22: Exemption dropdown UX
- #4: Secured furniture entry flow
- #12/#24: Codebtor linking UX
- #20: Income pre-population accuracy
- #26: Explanation box visibility
