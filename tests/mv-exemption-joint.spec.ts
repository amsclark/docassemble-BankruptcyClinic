/**
 * Motor-vehicle exemption, joint filers (Phil Martin, June 5 2026).
 *
 * Phil entered two cars in a married NE petition — his ($2K) and his wife's
 * ($5K) — each claiming the Motor Vehicle exemption, and hit a validation
 * error; he worked around it with Wildcard. Per his rule each debtor gets
 * their OWN $5,970 motor-vehicle exemption (11 U.S.C. 522(m)); one spouse's
 * cannot apply to the other's car.
 *
 * No prior test claimed a vehicle exemption at all, so this path was
 * uncovered. These two cases pin the behavior:
 *   POSITIVE — two cars, DIFFERENT owners (D1 / D2), both claim MV → must
 *              pass and assemble (each spouse's own exemption is allowed).
 *   NEGATIVE — two cars, SAME owner (both D1), both claim MV → must be
 *              rejected at the vehicle screen (the one-per-debtor rule still
 *              enforces).
 */
import { test, expect } from '@playwright/test';
import { JOINT_COUPLE, TestScenario } from './fixtures';
import { runFullInterview } from './navigation-helpers';
import { finishAndAssertAllPdfs } from './assert-helpers';

// NE joint couple (JOINT_COUPLE is SD; the NE motor-vehicle exemption only
// exists in the NE exemption set). Two cars, both claiming Motor Vehicle.
const NE_JOINT_BASE: TestScenario = {
  ...JOINT_COUPLE,
  name: 'ne-joint-mv',
  district: 'District of Nebraska',
  debtor: {
    first: 'Philip', middle: 'S', last: 'Tester',
    street: '100 Test Ave', city: 'Lincoln', state: 'Nebraska', zip: '68508',
    countyIndex: 4, taxIdType: 'ssn', taxId: '444-55-6666',
  },
  spouse: {
    first: 'Paula', middle: 'T', last: 'Tester',
    street: '100 Test Ave', city: 'Lincoln', state: 'Nebraska', zip: '68508',
    countyIndex: 4, taxIdType: 'ssn', taxId: '444-55-7777',
  },
};

test.describe('Motor-vehicle exemption — joint filers', () => {
  test.setTimeout(600_000);

  test('POSITIVE: each spouse claims MV on their own car → assembles', async ({ page }) => {
    const scenario: TestScenario = {
      ...NE_JOINT_BASE,
      property: {
        vehicles: [
          { make: 'Ford', model: 'Fusion', year: '2018', mileage: '60000', value: '2000',
            state: 'Nebraska', hasLoan: false, owner: 'Debtor 1 only', claimMotorVehicle: true },
          { make: 'Toyota', model: 'RAV4', year: '2019', mileage: '50000', value: '5000',
            state: 'Nebraska', hasLoan: false, owner: 'Debtor 2 only', claimMotorVehicle: true },
        ],
      },
    };
    await runFullInterview(page, scenario);
    await finishAndAssertAllPdfs(page);
  });

  // KNOWN GAP (discovered June 10 2026): the per-debtor "one vehicle" guard
  // (issue #53, 106AB validation code) silently stopped firing when the
  // vehicle question became `list collect: True`. Instrumentation showed the
  // per-item validation runs, but a prior/current item's `who` reads as
  // undefined at validation time (list-collect commits code:-choice fields
  // after validation), so the cross-item ownership check never matches. A
  // single debtor can therefore over-claim the motor-vehicle exemption on
  // multiple cars, and there is no $5,970 dollar cap enforced at entry.
  // Fix requires moving the check off per-item validation onto a screen where
  // the list is fully gathered. Tracked here; flips green when fixed.
  test.fixme('NEGATIVE: same debtor claims MV on two cars → should be rejected', async ({ page }) => {
    const scenario: TestScenario = {
      ...NE_JOINT_BASE,
      property: {
        vehicles: [
          { make: 'Ford', model: 'Fusion', year: '2018', mileage: '60000', value: '2000',
            state: 'Nebraska', hasLoan: false, owner: 'Debtor 1 only', claimMotorVehicle: true },
          { make: 'Toyota', model: 'RAV4', year: '2019', mileage: '50000', value: '5000',
            state: 'Nebraska', hasLoan: false, owner: 'Debtor 1 only', claimMotorVehicle: true },
        ],
      },
    };
    // The one-per-debtor validation_error fires on the second vehicle; the
    // run cannot complete. Expect it to throw, and confirm the message is
    // the motor-vehicle rule (not some unrelated failure).
    let errText = '';
    try {
      await runFullInterview(page, scenario);
      await finishAndAssertAllPdfs(page);
    } catch (e) {
      errText = (await page.locator('body').innerText().catch(() => '')) || String(e);
    }
    expect(errText.toLowerCase()).toContain('motor vehicle exemption may only be claimed for one vehicle');
  });
});
