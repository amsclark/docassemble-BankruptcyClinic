# Comprehensive Bug Report

## Critical Bugs (21 total)

### BUG-001: Form 121 (SSN Statement) - Iterator Bug [121-question-blocks.yml]
- `for i in debtor` iterates over debtor objects, but then uses `debtor[i]` which expects integer index
- `debt.tax_id.tax_id_type` references undefined `debt` variable (loop var is `i`)
- f-string keys create invalid keys like `"debtor<DAObject>_first_name"`
- **Fix:** Use `for idx, debt in enumerate(debtor):` and reference via `debt.` directly

### BUG-002: `income_amount` / `overtime_pay` Ghost Variables [101, 106I, 106J, voluntary-petition.yml]
- Multiple files reference `debt.income.income_amount` and `debt.income.overtime_pay`
- But 106I defines `income_amount_1` through `income_amount_6` (per-paycheck)
- These single variables never exist → AttributeError crashes
- **Fix:** Create computed `income_amount` and `overtime_pay` properties or fix references

### BUG-003: `currency()` String Arithmetic [106EF, 101]
- `currency()` returns formatted strings like "$1,234.00"
- Code tries to add these strings as numbers for totals
- `reporting.liabilities_estimate = unsecured_claims['loansTotal'] + ...` will TypeError
- **Fix:** Use numeric values for arithmetic, apply currency() only for display

### BUG-004: Trailing Commas Create Tuples [101, 106EF]
- `main["liability_100m_500m"] = ... else False,` — trailing comma creates tuple `(False,)`
- PDF checkbox expects boolean, not tuple
- **Fix:** Remove trailing commas

### BUG-005: `debtor2_name` Undefined for Single Debtors [106C, 106D, 106G]
- `debtor2_name` only set inside `if len(debtor) > 1:` block
- Referenced unconditionally afterward → NameError
- **Fix:** Add `else: debtor2_name = ''` in each file

### BUG-006: `leases` Variable Conflict [106D, 106G, 108]
- Three files define `leases = {}` as code blocks with different data
- Docassemble's dependency resolution picks one arbitrarily
- At least 2 of 3 forms will have wrong/empty lease data
- **Fix:** Rename to `leases_106d`, `leases_106g`, `leases_108`

### BUG-007: `codebtors` Variable Conflict [106G, 106H]
- Two files define `codebtors = {}` with different logic
- Same conflict issue as leases
- **Fix:** Rename to `codebtors_106g`, `codebtors_106h` or merge

### BUG-008: 106D Account Number Slice Direction Wrong
- `account_number[:-4]` removes last 4 chars instead of keeping them
- Should be `account_number[-4:]` for "Last 4 digits"
- **Fix:** Change `[:-4]` to `[-4:]`

### BUG-009: 106EF Missing `clm += 1` in Priority Claims Loop
- Priority claims loop never increments counter
- Every claim overwrites the same index keys in the dict
- **Fix:** Add `clm += 1` at end of loop

### BUG-010: 106EF Duplicate Notification Loop Overwrites Priority
- Priority claim notifications looped twice
- Second loop marks all as nonpriority, overwriting correct values
- **Fix:** Remove duplicate loop or merge logic

### BUG-011: 103B Net Income Formula Backwards
- `monthly_net_income = (you_income + spouse_income) - assistance_income`
- Should ADD government assistance, not subtract
- **Fix:** `monthly_net_income = you_income + spouse_income + assistance_income`

### BUG-012: 122A Debtor 2 Income Copy-Paste Bug
- `debtor_2_income` calculated using Debtor 1's variables (gross_wages1, alimony1, etc.)
- Should use gross_wages2, alimony2, etc.
- **Fix:** Change all `1` suffixes to `2` in debtor_2_income calculation

### BUG-013: 101 Indentation/Scoping Bug in Debtor Loop
- Lines setting `main['debtor_county'...]`, mailing, district info are OUTSIDE the `for` loop
- Only processes the last debtor's data
- **Fix:** Move these lines inside the for loop with proper indentation

### BUG-014: 106I `currency()` Applied to Text String
- `income1['otherIncomeDesc'] = currency(debt.income.specify_monthly_income)`
- `specify_monthly_income` is a text description, not a number
- **Fix:** Remove currency() wrapper

### BUG-015: 106J `overall_other_description` Crashes When No Custom Expenses
- Concatenation references `overall_other_description_1` through `_5`
- These only exist if user said yes to custom expenses
- **Fix:** Add default empty strings or guard with hasattr

### BUG-016: 106J `incomeTotal` References Wrong Variables
- Uses `income_amount` and `overtime_pay` from different code block scope
- These local variables aren't accessible
- **Fix:** Reference debtor income variables directly

### BUG-017: 101A `debtor[0].mailing_state` Used Unconditionally
- Only exists if `debtor[0].has_other_mailing_address` is True
- Will raise AttributeError otherwise
- **Fix:** Add conditional check

### BUG-018: 106EF Trailing Comma (Same as BUG-004)
- Multiple instances of `else False,` creating tuples

### BUG-019: 106EF Nonpriority Types Not Totaled
- Medical, Credit Card, Contract claims excluded from total calculations
- **Fix:** Add these types to the total sum

### BUG-020: 106EF `currency()` String Addition for Totals
- `p1Total = currency(domesticTotal + taxTotal + ...)` where values are already currency strings
- **Fix:** Keep numeric values, apply currency() only at final display

### BUG-021: 122A `income['source2']` Overwritten 3 Times
- First two assignments silently lost
- **Fix:** Use correct distinct keys

## Medium Bugs (18 total)
- 101A: `right_to_stay` inconsistent types (True vs 1)
- 103A: Chapter hardcoded regardless of user selection
- 106AB: ~400 lines of commented-out dead code
- 106D: Off-by-one indexing between claims and leases
- 106G: Missing `else: debtor2_name = ''`
- 106H: `list collect: True` on non-list question
- 106I: `continue button field: test` leftover debug code
- 106I: `overallIncome` sum uses wrong debtor-specific values
- 106J: `debtor[0].expenses.joint_case` referenced but never defined
- 107: `financial_affairs.debtor_count` referenced in show_if but potentially undefined
- 122A: `monthly_income.dependents` vs `monthly_income.median_dependents` mismatch
- 122A: `income['case_number_2']` assigned twice
- 122A: `monthly_income.source2_amount_1` missing datatype: currency
- Voluntary-petition.yml: Review `show if: len(debtor) > 2` should be `> 1`
- Voluntary-petition.yml: `reporting.custom_type` vs `reporting.other_debt_description` mismatch
- 101: Overlapping asset/liability/creditor ranges
- 106D/106G/108: `leases` variable name conflict
- 106G/106H: `codebtors` variable name conflict

## Low Bugs (7 total)
- "Judgement" → "Judgment" typo (101A)
- "invetigation" → "investigation", "isntallments" → "installments" (103B)
- "filied" → "filed" (103B)
- "excemption" → "exemption" (106C)
- "Unliquified" → "Unliquidated" (106EF)
- 121: Unused counter `x`
- Objects module reference check needed (106AB)
