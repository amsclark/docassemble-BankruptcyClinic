"""
Unit test for the exemption-summary data-flow fix (Roxanne feedback: the
Schedule C summary reported "No exemptions have been claimed yet" even after
the debtor claimed exemptions on each property item).

Root cause: a FULL (100%) exemption claim never sets `exemption_value` (that
field only appears when claiming *less* than 100%), so compute_exemption_totals
saw a zero value and skipped the claim. The fix falls back to the property's
owned value for full claims.

Run inside the docassemble container (it needs docassemble.base.util):

    sg docker -c "docker cp tests/test_exemption_totals.py docassemble:/tmp/ && \\
      docker exec docassemble /usr/share/docassemble/local3.12/bin/python /tmp/test_exemption_totals.py"
"""
import types
from docassemble.BankruptcyClinic.objects import (
    compute_exemption_totals, NEBRASKA_EXEMPTIONS, claiming_less_than_full,
    get_exemption_limits, get_motor_vehicle_violations)

WILD = NEBRASKA_EXEMPTIONS['wildcard']
VEHICLE = NEBRASKA_EXEMPTIONS['motor_vehicle']
HOMESTEAD = NEBRASKA_EXEMPTIONS['homestead']


def _prop(*interests):
    return types.SimpleNamespace(interests=list(interests), ab_vehicles=[], ab_other_vehicles=[])


def test_full_claim_counts_owned_value():
    """A 100% claim (no explicit exemption_value) counts the full owned value."""
    item = types.SimpleNamespace(
        is_claiming_exemption=True, claiming_sub_100=False, current_owned_value=4000,
        exemption_laws=WILD, exemption_value=0, exemption_laws_2='', exemption_value_2=0)
    res = compute_exemption_totals(_prop(item), 'Nebraska')
    assert WILD in res, res
    assert res[WILD]['claimed'] == 4000.0, res


def test_partial_claim_uses_explicit_value():
    """A <100% claim uses the explicit exemption_value the debtor entered."""
    item = types.SimpleNamespace(
        is_claiming_exemption=True, claiming_sub_100=True, current_owned_value=4000,
        exemption_laws=WILD, exemption_value=1500, exemption_laws_2='', exemption_value_2=0)
    res = compute_exemption_totals(_prop(item), 'Nebraska')
    assert res[WILD]['claimed'] == 1500.0, res


def test_claim_without_law_ignored():
    """Claiming an exemption but citing no law contributes nothing."""
    item = types.SimpleNamespace(
        is_claiming_exemption=True, claiming_sub_100=False, current_owned_value=999,
        exemption_laws='', exemption_value=0, exemption_laws_2='', exemption_value_2=0)
    assert compute_exemption_totals(_prop(item), 'Nebraska') == {}


def test_citation_has_no_bogus_subsection():
    """Wildcard citation is § 25-1552 (no non-existent (1)(c) subsection)."""
    assert WILD == 'Wildcard (Neb. Rev. Stat. § 25-1552)'


def test_claiming_less_than_full_derivation():
    """The 'specific dollar amount' flag is derived: ANY entered amount (> 0)
    is a specific-dollar claim — including amount == value, which previously
    flipped to '100% of FMV' on Schedule C (Roxanne, Legal Aid of NE, June
    2026: exemptions should be dollar amounts unless the debtor specifically
    chose 100% of FMV). Only a claim with no amount entered is 100%/FMV."""
    assert claiming_less_than_full(1500, 4000) is True       # partial
    assert claiming_less_than_full(4000, 4000) is True       # full value entered -> still $ amount
    assert claiming_less_than_full(5000, 4000) is True       # over -> $ amount as entered
    assert claiming_less_than_full(None, 4000) is False      # no amount -> 100% FMV
    assert claiming_less_than_full('', 4000) is False        # blank -> 100% FMV
    assert claiming_less_than_full(0, 4000) is False         # zero -> 100% FMV
    assert claiming_less_than_full(1500, None) is True       # value not needed
    assert claiming_less_than_full('$1,500', '$4,000') is True   # currency strings
    assert claiming_less_than_full('bogus', 4000) is False   # unparseable


def test_2023_cpi_adjusted_amounts():
    """Personal-property caps reflect the 2023 § 25-1556(2) CPI adjustment
    (uniform +19.4% over the statutory base): motor vehicle/tools $5,970,
    household goods $3,582. Source: Roxanne Alhejaj, Legal Aid of Nebraska."""
    limits = get_exemption_limits('Nebraska')
    assert limits['motor_vehicle'] == 5970, limits
    assert limits['tools'] == 5970, limits
    assert limits['household_goods'] == 3582, limits
    assert limits['homestead'] == 120000, limits  # § 40-101, unadjusted


def test_joint_filing_stacks_caps():
    """A joint case stacks each debtor's exemptions (11 U.S.C. § 522(m)): the
    effective cap doubles, so a $9,000 vehicle claim is within a 2-debtor
    $11,940 cap but over a single debtor's $5,970 cap. Unlimited stays
    unlimited."""
    item = types.SimpleNamespace(
        is_claiming_exemption=True, claiming_sub_100=True, current_owned_value=9000,
        exemption_laws=VEHICLE, exemption_value=9000, exemption_laws_2='', exemption_value_2=0)
    solo = compute_exemption_totals(_prop(item), 'Nebraska', 1)
    joint = compute_exemption_totals(_prop(item), 'Nebraska', 2)
    assert solo[VEHICLE]['limit'] == 5970, solo
    assert joint[VEHICLE]['limit'] == 11940, joint
    # $9,000 is over a single debtor's cap but within a joint cap
    assert solo[VEHICLE]['remaining'] == 0, solo
    assert joint[VEHICLE]['remaining'] == 2940, joint


def test_homestead_stacks_to_240k():
    """Two debtors can together claim $240,000 homestead (Roxanne feedback)."""
    item = types.SimpleNamespace(
        is_claiming_exemption=True, claiming_sub_100=True, current_owned_value=240000,
        exemption_laws=HOMESTEAD, exemption_value=240000, exemption_laws_2='', exemption_value_2=0)
    joint = compute_exemption_totals(_prop(item), 'Nebraska', 2)
    assert joint[HOMESTEAD]['limit'] == 240000, joint
    assert joint[HOMESTEAD]['remaining'] == 0, joint  # exactly at the stacked cap


def test_num_debtors_defaults_and_bad_input():
    """num_debtors defaults to 1 and tolerates bad input (never raises)."""
    item = types.SimpleNamespace(
        is_claiming_exemption=True, claiming_sub_100=True, current_owned_value=4000,
        exemption_laws=VEHICLE, exemption_value=4000, exemption_laws_2='', exemption_value_2=0)
    assert compute_exemption_totals(_prop(item), 'Nebraska')[VEHICLE]['limit'] == 5970
    assert compute_exemption_totals(_prop(item), 'Nebraska', None)[VEHICLE]['limit'] == 5970
    assert compute_exemption_totals(_prop(item), 'Nebraska', 'x')[VEHICLE]['limit'] == 5970
    assert compute_exemption_totals(_prop(item), 'Nebraska', 0)[VEHICLE]['limit'] == 5970


# ── Motor-vehicle per-debtor exemption rule (Phil Martin, June 2026) ──
# Each debtor may claim the Motor Vehicle exemption on ONE vehicle, up to the
# per-vehicle cap ($5,970 in NE); it does not pool across debtors or vehicles.
# get_motor_vehicle_violations is the post-gather enforcement (the vehicle
# question's per-item list-collect validation can't read sibling items'
# owner reliably). Unit-tested here because driving two vehicles' show-if'd
# owner/exemption fields through the list-collect UI is harness-fragile.

VEHICLE_LAW = NEBRASKA_EXEMPTIONS['motor_vehicle']


def _vehicle(who, value, claims_mv=True, exemption_value=0, owned=None):
    return types.SimpleNamespace(
        is_claiming_exemption=True,
        who=who,
        year='2020', make='Test', model='Car',
        current_value=value,
        current_owned_value=value if owned is None else owned,
        exemption_laws=(VEHICLE_LAW if claims_mv else 'Wildcard (Neb. Rev. Stat. § 25-1552)'),
        exemption_value=exemption_value,
        exemption_laws_2='', exemption_value_2=0)


def _vprop(*vehicles):
    return types.SimpleNamespace(ab_vehicles=list(vehicles))


def test_mv_two_same_debtor_blocked():
    """Same debtor claiming MV on two cars → one-per-debtor violation."""
    p = _vprop(_vehicle('Debtor 1 only', 2000), _vehicle('Debtor 1 only', 5000))
    v = get_motor_vehicle_violations(p, 'Nebraska', 2)
    assert any('only ONE vehicle' in s for s in v), v


def test_mv_each_debtor_own_car_ok():
    """Phil's scenario: each spouse claims MV on their own car → no violation."""
    p = _vprop(_vehicle('Debtor 1 only', 2000), _vehicle('Debtor 2 only', 5000))
    assert get_motor_vehicle_violations(p, 'Nebraska', 2) == [], \
        get_motor_vehicle_violations(p, 'Nebraska', 2)


def test_mv_over_cap_blocked():
    """A single MV claim over $5,970 (by equity, full claim) → violation."""
    p = _vprop(_vehicle('Debtor 1 only', 9000))  # full claim, equity 9000
    v = get_motor_vehicle_violations(p, 'Nebraska', 1)
    assert any('over the $5,970' in s for s in v), v


def test_mv_explicit_value_over_cap_blocked():
    """An explicit exemption_value over the cap → violation."""
    p = _vprop(_vehicle('Debtor 1 only', 20000, exemption_value=8000))
    v = get_motor_vehicle_violations(p, 'Nebraska', 1)
    assert any('over the $5,970' in s for s in v), v


def test_mv_under_cap_ok():
    """An MV claim at/under the cap → no violation."""
    p = _vprop(_vehicle('Debtor 1 only', 5970))
    assert get_motor_vehicle_violations(p, 'Nebraska', 1) == []


def test_mv_one_joint_car_combines_to_11940():
    """Roxanne's rule: joint debtors with ONE jointly-owned vehicle may
    combine both exemptions onto it ($11,940). $11,000 full claim → OK."""
    p = _vprop(_vehicle('Debtor 1 and Debtor 2 only', 11000))
    assert get_motor_vehicle_violations(p, 'Nebraska', 2) == [], \
        get_motor_vehicle_violations(p, 'Nebraska', 2)


def test_mv_one_joint_car_over_combined_cap_blocked():
    """A jointly-owned car over the combined $11,940 → violation."""
    p = _vprop(_vehicle('Debtor 1 and Debtor 2 only', 13000))
    v = get_motor_vehicle_violations(p, 'Nebraska', 2)
    assert any('over the $11,940' in s for s in v), v


def test_mv_sole_car_capped_at_one_slot_even_joint_case():
    """A SOLE-owned car in a joint case is still capped at one slot ($5,970),
    not the combined $11,940."""
    p = _vprop(_vehicle('Debtor 1 only', 9000))
    v = get_motor_vehicle_violations(p, 'Nebraska', 2)
    assert any('over the $5,970' in s for s in v), v


def test_mv_joint_car_plus_sole_car_splits_slot_blocked():
    """A joint MV car AND Debtor 1's own sole MV car uses Debtor 1's slot
    twice → violation (slot may not be split across vehicles)."""
    p = _vprop(_vehicle('Debtor 1 and Debtor 2 only', 8000),
               _vehicle('Debtor 1 only', 3000))
    v = get_motor_vehicle_violations(p, 'Nebraska', 2)
    assert any("Debtor 1's Motor Vehicle exemption is applied to more than one" in s
               for s in v), v


def test_mv_joint_car_single_filer_capped_at_one_slot():
    """Defensive: a 'both debtors' owner in a single-debtor case caps at one
    slot (no phantom second debtor)."""
    p = _vprop(_vehicle('Debtor 1 and Debtor 2 only', 9000))
    v = get_motor_vehicle_violations(p, 'Nebraska', 1)
    assert any('over the $5,970' in s for s in v), v


def test_mv_non_mv_claim_ignored():
    """A vehicle claiming a non-MV exemption is not counted by the MV rule."""
    p = _vprop(_vehicle('Debtor 1 only', 9000, claims_mv=False))
    assert get_motor_vehicle_violations(p, 'Nebraska', 1) == []


def test_mv_shared_owner_not_counted_for_one_per_debtor():
    """Jointly/third-party owned vehicles don't count against a single
    debtor's one-vehicle limit, but the per-vehicle cap still applies."""
    p = _vprop(_vehicle('Debtor 1 and Debtor 2 only', 3000),
               _vehicle('At least one of the debtors and another', 4000))
    assert get_motor_vehicle_violations(p, 'Nebraska', 2) == []


# ── Property-based tests: generate many random property/vehicle combos and
#    assert invariants hold. Finds edge cases the example tests miss. Uses a
#    small seeded LCG (no external deps) so failures are reproducible. ──

class _Rng:
    def __init__(self, seed): self.s = seed & 0xFFFFFFFF
    def next(self):
        self.s = (1103515245 * self.s + 12345) & 0x7FFFFFFF
        return self.s
    def pick(self, seq): return seq[self.next() % len(seq)]
    def amt(self): return self.pick([0, 1000, 3000, 5970, 6000, 9000, 11940, 12000, 20000])


_OWNERS = ['Debtor 1 only', 'Debtor 2 only', 'Debtor 1 and Debtor 2 only',
           'At least one of the debtors and another']


def _rand_vehicle(rng):
    claims = rng.next() % 3 != 0   # ~2/3 claim MV
    return _vehicle(rng.pick(_OWNERS), rng.amt(),
                    claims_mv=claims, exemption_value=(rng.amt() if rng.next() % 2 else 0))


def test_mv_property_invariants():
    """1000 random vehicle sets: the function never crashes, always returns a
    list[str], a set with NO motor-vehicle claims yields [], and adding a
    non-MV vehicle never adds a violation."""
    rng = _Rng(20260611)
    cap = NEBRASKA_EXEMPTIONS_LIMIT_MV = get_exemption_limits('Nebraska')['motor_vehicle']
    for i in range(1000):
        n = 1 + (rng.next() % 2)
        vehicles = [_rand_vehicle(rng) for _ in range(rng.next() % 5)]
        p = _vprop(*vehicles)
        out = get_motor_vehicle_violations(p, 'Nebraska', n)
        assert isinstance(out, list) and all(isinstance(s, str) for s in out), (i, out)
        # no MV claim anywhere -> no violation
        if not any('motor vehicle' in str(getattr(v, 'exemption_laws', '')).lower()
                   or 'motor vehicle' in str(getattr(v, 'exemption_laws_2', '')).lower()
                   for v in vehicles):
            assert out == [], (i, 'unexpected violation with no MV claim', out)
        # adding a vehicle that does NOT claim MV must not introduce a violation
        extra = _vehicle('Debtor 1 only', 9000, claims_mv=False)
        out2 = get_motor_vehicle_violations(_vprop(*vehicles, extra), 'Nebraska', n)
        assert len(out2) <= max(len(out), 0) + 0 or len(out2) == len(out), \
            (i, 'non-MV vehicle changed violations', out, out2)


def test_mv_property_sole_single_car_under_cap_never_blocks():
    """For any single sole-owned car claiming MV at <= the per-vehicle cap,
    there is never a violation (across many random amounts at/under cap)."""
    rng = _Rng(7)
    cap = get_exemption_limits('Nebraska')['motor_vehicle']
    for _ in range(200):
        amt = rng.next() % (cap + 1)   # 0..cap
        for owner in ('Debtor 1 only', 'Debtor 2 only'):
            p = _vprop(_vehicle(owner, amt, claims_mv=True, exemption_value=amt))
            assert get_motor_vehicle_violations(p, 'Nebraska', 2) == [], (owner, amt)


def test_totals_property_never_negative_and_limit_scales():
    """compute_exemption_totals: claimed >= 0, and a finite cap scales exactly
    by num_debtors."""
    base = get_exemption_limits('Nebraska')['motor_vehicle']
    for n in (1, 2):
        item = types.SimpleNamespace(
            is_claiming_exemption=True, claiming_sub_100=True, current_owned_value=3000,
            exemption_laws=VEHICLE, exemption_value=3000, exemption_laws_2='', exemption_value_2=0)
        res = compute_exemption_totals(_vprop_interests(item), 'Nebraska', n)
        assert res[VEHICLE]['claimed'] >= 0
        assert res[VEHICLE]['limit'] == base * n, (n, res[VEHICLE]['limit'])


def _vprop_interests(*interests):
    return types.SimpleNamespace(interests=list(interests), ab_vehicles=[], ab_other_vehicles=[])


def test_financial_assets_and_owed_property_counted():
    """Annuities, bank deposits, cash and owed-property claims feed the summary.
    Roxanne UAT (June 2026): the summary showed ONLY car/house/household goods —
    every other claiming category (financial assets, owed property, business,
    farm, personal items) was silently dropped from the running totals."""
    LIFE = NEBRASKA_EXEMPTIONS['life_insurance']
    EIC = NEBRASKA_EXEMPTIONS['earned_income']
    fa = types.SimpleNamespace(
        annuities=[types.SimpleNamespace(
            has_claim=True, sub_100=True, amount=28000,
            exemption_value=28000, exemption_laws=LIFE,
            exemption_value_2=0, exemption_laws_2='')],
        deposits=[types.SimpleNamespace(
            is_claiming_exemption=True, sub_100=False, amount=2500,
            exemption_value=0, exemption_laws=WILD,
            exemption_value_2=0, exemption_laws_2='')],
        cash_is_claiming_exemption=True, cash_sub_100=False, cash_value=300,
        cash_exemption_value=0, cash_exemption_laws=WILD,
        cash_exemption_value_2=0, cash_exemption_laws_2='')
    owed = types.SimpleNamespace(
        tax_refund_has_claim=True, tax_refund_sub_100=True, tax_refund_federal=1200,
        tax_refund_exemption_value=1200, tax_refund_exemption_laws=EIC,
        tax_refund_exemption_value_2=0, tax_refund_exemption_laws_2='')
    prop = types.SimpleNamespace(interests=[], ab_vehicles=[], ab_other_vehicles=[],
                                 financial_assets=fa, owed_property=owed)
    res = compute_exemption_totals(prop, 'Nebraska')
    assert res[LIFE]['claimed'] == 28000.0, res
    # deposits full claim falls back to the account amount; cash likewise
    assert res[WILD]['claimed'] == 2800.0, res
    assert res[EIC]['claimed'] == 1200.0, res


def test_flat_personal_property_categories_counted():
    """Jewelry/electronics-style flat categories count in the totals."""
    prop = types.SimpleNamespace(
        interests=[], ab_vehicles=[], ab_other_vehicles=[],
        jewelry_is_claiming_exemption=True, jewelry_claiming_sub_100=True,
        jewelry_value=5700, jewelry_exemption_value=5700,
        jewelry_exemption_laws=WILD, jewelry_exemption_value_2=0,
        jewelry_exemption_laws_2='')
    res = compute_exemption_totals(prop, 'Nebraska')
    assert res[WILD]['claimed'] == 5700.0, res


def test_annuity_category_offers_44_371():
    """The annuity exemption dropdown offers § 44-371 (life insurance/annuity,
    $100k) and the retirement exemption — previously it showed the 'wages'
    list, so the annuity exemption could not be claimed (Roxanne UAT)."""
    from docassemble.BankruptcyClinic.objects import get_exemption_choices
    choices = get_exemption_choices('Nebraska', 'annuity')
    assert NEBRASKA_EXEMPTIONS['life_insurance'] in choices, choices
    assert NEBRASKA_EXEMPTIONS['retirement'] in choices, choices
    assert NEBRASKA_EXEMPTIONS['wildcard'] in choices, choices


if __name__ == '__main__':
    test_full_claim_counts_owned_value()
    test_partial_claim_uses_explicit_value()
    test_claim_without_law_ignored()
    test_citation_has_no_bogus_subsection()
    test_claiming_less_than_full_derivation()
    test_2023_cpi_adjusted_amounts()
    test_joint_filing_stacks_caps()
    test_homestead_stacks_to_240k()
    test_num_debtors_defaults_and_bad_input()
    test_mv_two_same_debtor_blocked()
    test_mv_each_debtor_own_car_ok()
    test_mv_over_cap_blocked()
    test_mv_explicit_value_over_cap_blocked()
    test_mv_under_cap_ok()
    test_mv_non_mv_claim_ignored()
    test_mv_shared_owner_not_counted_for_one_per_debtor()
    test_mv_one_joint_car_combines_to_11940()
    test_mv_one_joint_car_over_combined_cap_blocked()
    test_mv_sole_car_capped_at_one_slot_even_joint_case()
    test_mv_joint_car_plus_sole_car_splits_slot_blocked()
    test_mv_joint_car_single_filer_capped_at_one_slot()
    test_mv_property_invariants()
    test_mv_property_sole_single_car_under_cap_never_blocks()
    test_totals_property_never_negative_and_limit_scales()
    test_financial_assets_and_owed_property_counted()
    test_flat_personal_property_categories_counted()
    test_annuity_category_offers_44_371()
    print('OK: all exemption-totals unit tests passed (incl. property-based)')
