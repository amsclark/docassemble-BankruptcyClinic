# Completed Bug Fixes

## Phase 1: Critical Blockers (6 bugs)
- **BUG-001**: 121-question-blocks.yml - Fixed iterator bug (`for i in debtor` → `for idx, debt in enumerate(debtor)`)
- **BUG-002**: 101-question-blocks.yml - Fixed income ghost vars (replaced `income_amount + overtime_pay` with sum of `_1` through `_6`)
- **BUG-004**: 101 & 106EF - Removed trailing commas causing syntax errors
- **BUG-005**: 106C & 106D - Added `else: debtor2_name = ''` for single debtor case
- **BUG-013**: 101-question-blocks.yml - Fixed loop scoping (moved county/mailing/district inside for loop)
- **BUG-017**: 101A-question-blocks.yml - Fixed unconditional mailing_state reference

## Phase 2: Arithmetic/Data Fixes (12 bugs)
- **BUG-003**: 101 & 106EF - Fixed currency() string arithmetic → numeric sums first, then format
- **BUG-008**: 106D - Fixed account_number slice `[:-4]` → `[-4:]` (last 4 digits)
- **BUG-009**: 106EF - Added missing `clm += 1` in priority claims loop
- **BUG-010**: 106EF - Fixed duplicate notification loop (was overwriting priority as nonpriority)
- **BUG-011**: 103B - Fixed net income formula (changed `- family.assistance_income` to `+`)
- **BUG-012**: 122A - Fixed debtor_2_income copy-paste (all `*1` → `*2`)
- **BUG-014**: 106I - Fixed currency() on text description
- **BUG-015**: 106J - Fixed overall_other_description crash (wrapped with getattr defaults)
- **BUG-016**: 106J - Fixed incomeTotal wrong variable references
- **BUG-019**: 106EF - Added missing nonpriority type totals
- **BUG-020**: 106EF - Fixed currency string arithmetic for totals
- **BUG-021**: 122A - Fixed source2 key overwrites and duplicate case_number_2

## Phase 3: Variable Conflicts
- 106D: Removed `leases = {}` and `codebtors = {}` side effects (dead code, caused conflicts)
- 106G: Renamed `leases` → `leases_106g` and `codebtors` → `codebtors_106g`
- 106H and 108 keep their authoritative `codebtors` and `leases` variables

## Phase 4: Medium Severity (6 fixes)
- voluntary-petition.yml: Fixed `show if: len(debtor) > 2` → `> 1`
- voluntary-petition.yml: Fixed `reporting.custom_type` → `reporting.other_debt_description`
- 106H: Removed spurious `list collect: True` on community property question
- 106I: Removed debug `continue button field: test`
- 101: Changed `if/if/if` to `if/elif/elif` for reporting type
- 101: Removed orphaned `custom_debt_type` question block (dead code)

## Phase 5: Typos (12 fixes)
- judgement → judgment (101A x3, 101 x3, 106D x1)
- invetigation → investigation (103B)
- isntallments → installments (103B)
- excemption → exemption (106C)
- lein → lien, lean → lien (106D x2)
- Pervious → Previous (101)
- Statment → Statement (voluntary-petition.yml)
- inot → into, wather → water, statues → statutes (107)

## Files Modified (14 total)
1. 101-question-blocks.yml
2. 101A-question-blocks.yml
3. 103B-question-blocks.yml
4. 106C-question-blocks.yml
5. 106D-question-blocks.yml
6. 106EF-question-blocks.yml
7. 106G-question-blocks.yml
8. 106H-question-blocks.yml
9. 106I-question-blocks.yml
10. 106J-question-blocks.yml
11. 107-question-blocks.yml
12. 108-question-blocks.yml (no changes needed - kept authoritative)
13. 121-question-blocks.yml
14. 122A-question-blocks.yml
15. voluntary-petition.yml
