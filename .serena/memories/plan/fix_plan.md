# Fix Plan: Prioritized Approach

## Phase 1: Critical Infrastructure Fixes (Blocks all testing)
These bugs prevent the interview from completing a single run.

1. **BUG-001**: Fix 121-question-blocks.yml iterator bug
2. **BUG-002**: Fix income_amount/overtime_pay ghost variables across all files
3. **BUG-005**: Fix debtor2_name undefined in 106C, 106D, 106G
4. **BUG-004**: Fix trailing comma tuples in 101, 106EF
5. **BUG-013**: Fix indentation/scoping in 101 debtor loop
6. **BUG-017**: Fix 101A mailing_state unconditional reference

## Phase 2: Arithmetic & Data Integrity Fixes (Wrong court filings)
These bugs produce incorrect data on court forms.

7. **BUG-003**: Fix currency() string arithmetic in 106EF, 101
8. **BUG-008**: Fix account number slice direction in 106D
9. **BUG-009**: Fix missing clm+=1 in 106EF priority claims
10. **BUG-010**: Fix duplicate notification loop in 106EF
11. **BUG-011**: Fix net income formula in 103B
12. **BUG-012**: Fix debtor 2 income copy-paste in 122A
13. **BUG-014**: Fix currency() on text string in 106I
14. **BUG-015**: Fix overall_other_description crash in 106J
15. **BUG-016**: Fix incomeTotal wrong variable references in 106J
16. **BUG-019**: Fix nonpriority types not totaled in 106EF
17. **BUG-020**: Fix currency() string addition in 106EF
18. **BUG-021**: Fix source2 overwrite in 122A

## Phase 3: Variable Conflict Resolution
19. **BUG-006**: Rename leases variables (106D, 106G, 108)
20. **BUG-007**: Rename codebtors variables (106G, 106H)

## Phase 4: Medium Severity Fixes
21-38. Fix all medium bugs listed in comprehensive report

## Phase 5: Low Severity / Typo Fixes
39-46. Fix all typos and minor issues

## Phase 6: Testing Framework
- Set up comprehensive Playwright test suite
- Create test scenarios for:
  - Individual filing (single debtor)
  - Joint filing (two debtors)
  - Fee waiver path
  - Installment payment path
  - Various property types
  - PDF generation verification

## Phase 7: Validation
- Run full test suite
- Manual verification on live server
- Review all PDF outputs
