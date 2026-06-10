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
 * uncovered. Coverage is split for reliability:
 *   POSITIVE (here)  — joint NE filing, two cars with DIFFERENT owners both
 *                      claiming MV → assembles (no false block).
 *   DOLLAR CAP (here)— a single car claiming MV over $5,970 → blocked at the
 *                      exemption-summary screen (proves the block fires E2E).
 *   one-per-debtor   — the count rule (two same-owner MV cars → blocked) is
 *                      unit-tested in tests/test_exemption_totals.py
 *                      (test_mv_*). Driving a SECOND vehicle's show-if'd
 *                      owner/exemption fields through list collect is harness-
 *                      fragile (the indexed make/value fields fill, but the
 *                      code:-choice `who` radio and exemption dropdown don't),
 *                      so the pure-function rule is verified directly there.
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

  // (one-per-debtor count rule → unit-tested in test_exemption_totals.py;
  //  driving a 2nd vehicle's show-if'd owner/exemption through list collect
  //  is harness-fragile — see the file header.)

  test('DOLLAR CAP: MV claim over $5,970 on one car → blocked at exemption summary', async ({ page }) => {
    const scenario: TestScenario = {
      ...NE_JOINT_BASE,
      property: {
        vehicles: [
          // $9,000 car, full Motor Vehicle exemption — exceeds the $5,970 cap.
          { make: 'Chevy', model: 'Tahoe', year: '2020', mileage: '40000', value: '9000',
            state: 'Nebraska', hasLoan: false, owner: 'Debtor 1 only', claimMotorVehicle: true },
        ],
      },
    };
    let errText = '';
    try {
      await runFullInterview(page, scenario);
      await finishAndAssertAllPdfs(page);
    } catch (e) {
      errText = (await page.locator('body').innerText().catch(() => '')) || String(e);
    }
    expect(errText.toLowerCase()).toContain('over the $5,970');
  });
});
