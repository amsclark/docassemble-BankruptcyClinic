# Master Plan: Bankruptcy Clinic → Customer-Ready Release

## Current Status Summary

### ✅ What's Working
| Test File | Tests | Status |
|-----------|-------|--------|
| `full-interview.spec.ts` | 3 tests (individual filing to conclusion + joint to property + list collect) | ✅ ALL PASS |
| `section-regression.spec.ts` | 6 tests (nav, property, personal items, sidebar, amended/non-amended) | ✅ ALL PASS |
| `edge-cases.spec.ts` | 13 tests (special chars, boundaries, amended, mailing, conditional, suffix) | ✅ ALL PASS |
| `data-validation.spec.ts` | 10 tests (required fields, case number, zip, form guards) | ✅ ALL PASS |
| `creditor-library.spec.ts` | 8 tests (admin CRUD, picker, selection injection) | ✅ ALL PASS |
| `comprehensive-e2e.spec.ts` | NE-individual-minimal | ✅ PASS (19 PDFs) |
| `comprehensive-e2e.spec.ts` | SD-individual-minimal | ✅ PASS (19 PDFs) |
| **Subtotal** | **43 tests passing** | |

### ❌ What's Broken
| Test | Issue | Root Cause |
|------|-------|------------|
| `comprehensive-e2e.spec.ts` – NE-individual-property-vehicle | Stuck on vehicle list collect form | `clickContinue()` fails to submit list collect forms — jQuery validation blocks submission due to disabled pre-rendered required fields |
| `comprehensive-e2e.spec.ts` – 10 remaining scenarios | Not tested yet | Depend on fixing the list collect submission issue |
| `full-complex-path.spec.ts` | `who` radio label click fails in list collect | Same root cause — list collect form renders 16 radio slots, direct `label[for=...]` click resolves to wrong element |

### Root Cause: List Collect Form Validation Bug

**The core problem**: Docassemble's `list collect: True` pre-renders 16 invisible/disabled form slots. When clicking "Continue" to submit:
1. jQuery validation sees 16 sets of `required` disabled inputs
2. Even with `validator.settings.ignore = ':hidden, :disabled'`, the validator caches rules at form parse time
3. The `removeAttr('required')` approach runs too late — validator rules are already cached
4. Result: form silently fails to submit, page doesn't advance

**Why minimal tests pass**: Minimal scenarios skip all property sections (answer "No" to `there_are_any`) and never encounter list collect forms.

---

## Architecture Reference

### Deployment
- **Docker container**: `b12d3e146121` (jhpyle/docassemble), port 8080→80
- **Interview source**: Playground (`docassemble.playground1:voluntary-petition.yml`)
- **Package path**: `/usr/share/docassemble/local3.12/lib/python3.12/site-packages/docassemble/BankruptcyClinic/`
- **Playground path**: `/usr/share/docassemble/files/playground/1/`
- Tests hit the **playground** URL, not the installed package
- **Deploy command**: `docker cp <file> b12d3e146121:/usr/share/docassemble/files/playground/1/<file>` then `docker exec b12d3e146121 bash -c "redis-cli FLUSHALL && supervisorctl restart uwsgi celery celerysingle"`

### Interview Structure (18+ YAML files)
| File | Section | Forms Generated |
|------|---------|----------------|
| `voluntary-petition.yml` | Master interview + object definitions + attachment blocks | All 19 PDFs |
| `101-question-blocks.yml` | Core debtor/case questions | Form B101 |
| `101A-question-blocks.yml` | Eviction judgment | Form B101A/B |
| `103A-question-blocks.yml` | Installment payments | Form B103A |
| `103B-question-blocks.yml` | Fee waiver | Form B103B |
| `106AB-question-blocks.yml` | Property (real, vehicles, personal, deposits) — **7373 lines!** | Forms B106A/B |
| `106C-question-blocks.yml` | Exemptions | Form B106C |
| `106D-question-blocks.yml` | Secured creditors | Form B106D |
| `106EF-question-blocks.yml` | Unsecured claims (priority + nonpriority) | Forms B106E/F |
| `106G-question-blocks.yml` | Contracts/Leases | Form B106G |
| `106H-question-blocks.yml` | Codebtors | Form B106H |
| `106I-question-blocks.yml` | Income | Form B106I |
| `106J-question-blocks.yml` | Expenses | Form B106J |
| `107-question-blocks.yml` | Statement of Financial Affairs — **2893 lines** | Form B107 |
| `108-question-blocks.yml` | Statement of Intention | Form B108 |
| `121-question-blocks.yml` | SSN Statement | Form B121 |
| `122A-question-blocks.yml` | Means Test / Monthly Income | Form B122A |
| `2030-question-blocks.yml` | Attorney Disclosure | Form B2030 |
| `106Sum-question-blocks.yml` | Summary of Schedules | Summary |
| `106Dec-question-blocks.yml` | Declaration | Declaration |

### List Collect Sections (the problem areas)
These use `list collect: True` which pre-renders 16 disabled form slots:
1. **Real property interests** (`prop.interests`) in 106AB
2. **Vehicles** (`prop.ab_vehicles`) in 106AB
3. **Other vehicles** (`prop.ab_other_vehicles`) in 106AB
4. **Deposits** (`prop.financial_assets.deposits`) in 106AB
5. **Secured creditors** (`prop.creditors`) in 106D
6. **Priority claims** (`prop.priority_claims`) in 106EF
7. **Nonpriority claims** (`prop.nonpriority_claims`) in 106EF

### State Restriction (NE/SD only) — ✅ COMPLETE
- `get_bk_states_list()` returns `["Nebraska", "South Dakota"]`
- `get_exemption_choices()` supports NE/SD only
- `courts_list.py` has only `"District of Nebraska"` and `"District of South Dakota"`
- District dropdown in interview uses `get_bk_states_list()`

### Bug Fixes — ✅ 35 bugs fixed across 15 YAML files
See `bugs/fixes_completed` memory for details.

---

## Execution Plan

### Phase 1: Fix the List Collect Form Submission (CRITICAL BLOCKER)
**Goal**: Make `clickContinue()` reliably submit list collect forms  
**Priority**: P0 — blocks ALL property/creditor tests  
**Estimated time**: 1-2 hours  

**Approach**: Instead of fighting jQuery validation, use JavaScript to directly submit the form:

```typescript
async function clickContinue(page: Page) {
  // For list collect forms: reset the validator entirely, then submit
  await page.evaluate(() => {
    const $ = (window as any).jQuery;
    if (!$) return;
    const form = $('#daform');
    const validator = form.data('validator');
    if (validator) {
      // Nuclear option: remove all validation rules from disabled fields
      validator.resetForm();
      validator.settings.ignore = ':hidden, :disabled';
    }
    // Remove required from all disabled inputs
    form.find('input:disabled, select:disabled, textarea:disabled')
        .removeAttr('required')
        .removeClass('required');
  });
  await _clickContinue(page);
}
```

**Alternative approach** (if above doesn't work): Submit the form via JavaScript:
```typescript
await page.evaluate(() => {
  const $ = (window as any).jQuery;
  // Trigger docassemble's form submission directly
  $('#da-continue-button').trigger('click');
  // Or: document.getElementById('daform').submit();
});
```

**Validation**: Run NE-individual-property-vehicle test — if it gets past the vehicle list collect page, the fix works.

### Phase 2: Fix `who` Radio Click in List Collect Forms
**Goal**: Click the correct `who` radio in list collect (16 pre-rendered radios with same label)  
**Priority**: P0 — needed for all property scenarios  
**Estimated time**: 30 min  

**Problem**: `label[for="base64(prop.ab_vehicles[0].who)_0"]` matches multiple labels in list collect.

**Fix**: Use `.first()` or use the enabled radio:
```typescript
const vehWhoLabel = page.locator(`label[for="${b64('prop.ab_vehicles[0].who')}_0"]`).first();
if (await vehWhoLabel.count() > 0) await vehWhoLabel.click();
```

Also fix in `full-complex-path.spec.ts` (line 269).

### Phase 3: Fix Loan Amount Field in List Collect
**Goal**: Reliably fill `current_owed_amount` in vehicle list collect  
**Priority**: P0  
**Estimated time**: 15 min  
**Status**: Partially fixed — using `.first()` on `getByLabel`. May need additional fix after Phase 1.

### Phase 4: Fix `handleAnotherPage()` for All List Sections
**Goal**: All "there_is_another" handlers work for both list collect and yes/no patterns  
**Priority**: P0  
**Estimated time**: 30 min  
**Status**: Helper function added, already applied to all 6 call sites. Needs testing after Phase 1 fix.

### Phase 5: Run All 12 Comprehensive E2E Scenarios Sequentially
**Goal**: Identify and fix all remaining failures one by one  
**Priority**: P1  
**Estimated time**: 3-5 hours (each test takes ~3 min + debug time)  

**Execution order** (simplest → most complex):
1. ✅ `NE-individual-minimal` — PASSING
2. ✅ `SD-individual-minimal` — PASSING  
3. `NE-individual-property-vehicle` — fix in Phase 1-3
4. `SD-individual-property-vehicle` — similar to #3
5. `NE-individual-secured-deposit` — deposit + secured creditor
6. `SD-individual-unsecured` — priority + nonpriority claims
7. `NE-individual-vehicle-nonpriority` — vehicle + nonpriority
8. `SD-individual-deposit-priority` — deposit + priority
9. `NE-individual-maximum-data` — ALL data types (real property + vehicle + deposit + secured + priority + nonpriority)
10. `NE-joint-minimal` — joint filing, no property
11. `SD-joint-minimal` — joint filing, no property
12. `SD-joint-property-creditors` — joint + property + creditors (most complex)

**Expected issues per scenario**:
- **Joint filing tests** (#10-12): May need spouse page navigation fixes, second debtor income/expense handling
- **Creditor tests** (#5-9): May need secured/priority/nonpriority creditor form list collect fixes
- **Maximum data test** (#9): Will exercise all list collect paths — good integration test

### Phase 6: Fix `full-complex-path.spec.ts`
**Goal**: Fix the existing complex path test so it passes too  
**Priority**: P1  
**Estimated time**: 1 hour  

**Issues to fix**:
1. `who` radio click (line 269) — use `.first()` or conditional
2. May have same list collect submission issue
3. Apply same `clickContinue` fix as Phase 1

### Phase 7: Verify PDF Content
**Goal**: Ensure all 19 PDFs contain correct data for each scenario  
**Priority**: P1  
**Estimated time**: 1-2 hours  

Each test already downloads all 19 PDFs and verifies they're valid. Enhance to check:
- Form 101: Debtor name, state, district, chapter
- Form 121: SSN fields populated
- Form 2030: Attorney name, fees
- Form 106A/B: Property data when applicable
- Form 106D: Secured creditor data when applicable
- Form 106E/F: Unsecured claim data when applicable

### Phase 8: Run Full Suite & Generate Report
**Goal**: All 12 comprehensive + 3 full-interview + 6 section + 13 edge + 10 validation + 8 creditor = **52+ tests** pass  
**Priority**: P1  
**Estimated time**: 1 hour  

```bash
npx playwright test tests/comprehensive-e2e.spec.ts tests/full-interview.spec.ts \
  tests/section-regression.spec.ts tests/edge-cases.spec.ts tests/data-validation.spec.ts \
  tests/creditor-library.spec.ts --timeout 600000 --workers 1
```

### Phase 9: Sync Playground with Local Files
**Goal**: Ensure all bug-fixed YAML files are deployed to the playground  
**Priority**: P2  
**Estimated time**: 30 min  

**Files that differ between local and playground** (from md5sum diff):
- `122A-question-blocks.yml` — may have local fixes not deployed
- `2030-question-blocks.yml` — new file
- `106Sum-question-blocks.yml` — new file
- `106Dec-question-blocks.yml` — new file
- `creditor-library-*.yml` — new files
- Test files (`Test-*.yml`) exist in playground but not local (can be deleted)

**Action**: Copy all local YAML files to playground, flush Redis, restart uwsgi.

---

## Definition of Done (Customer-Ready)

- [ ] All 12 comprehensive E2E tests pass (each generates 19 PDFs)
- [ ] All existing 40+ tests continue to pass
- [ ] No infinite loops or error conditions
- [ ] Interview restricted to Nebraska and South Dakota only
- [ ] All 19 PDF forms generated at conclusion contain correct data
- [ ] PDF form fields populated with debtor-entered data
- [ ] Both individual and joint filing paths complete successfully
- [ ] All property types (real property, vehicles, deposits) handled correctly
- [ ] All creditor types (secured, priority, nonpriority) handled correctly  
- [ ] Exemption choices show only NE/SD options
- [ ] Court dropdown shows only District of Nebraska and District of South Dakota

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| List collect validation may require server-side fix | High | Try JS-only approaches first; if all fail, modify YAML to remove `required` from disabled slots |
| Joint filing tests may reveal new bugs in spouse handling | Medium | Fix incrementally, starting with minimal joint test |
| PDF field mapping bugs for complex scenarios | Medium | Already verified for minimal scenarios; extend verification gradually |
| Docker container restart disrupts running tests | Low | Run one test at a time; don't deploy during test runs |

## File Inventory

### Test Files (to keep)
- `tests/helpers.ts` — shared utilities (337 lines)
- `tests/comprehensive-e2e.spec.ts` — 12 E2E scenarios (1582 lines)
- `tests/full-interview.spec.ts` — 3 full interview tests (1742 lines)
- `tests/full-complex-path.spec.ts` — 1 complex path test (1434 lines)
- `tests/section-regression.spec.ts` — 6 section tests
- `tests/edge-cases.spec.ts` — 13 edge case tests
- `tests/data-validation.spec.ts` — 10 validation tests
- `tests/creditor-library.spec.ts` — 8 creditor library tests

### Test Files (can be cleaned up)
- `tests/e2e.spec.ts` — old/unused?
- `tests/individual-filing.spec.ts` — superseded?
- `tests/smoke.spec.ts` — quick smoke test
- `tests/test-property.spec.ts` — one-off debug?
- `tests/debug-property-form.ts` — debug helper
- `tests/Human-written flow.spec.ts` — original manual test

---

*Last updated: March 1, 2026*
*Next action: Phase 1 — Fix list collect form submission*
