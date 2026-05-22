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
    compute_exemption_totals, NEBRASKA_EXEMPTIONS, claiming_less_than_full)

WILD = NEBRASKA_EXEMPTIONS['wildcard']


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
    """The '<100% of FMV' flag is derived: amount < value => partial (True),
    amount == or > value => 100%/fair-market (False); bad input => False."""
    assert claiming_less_than_full(1500, 4000) is True      # partial
    assert claiming_less_than_full(4000, 4000) is False     # exactly 100%
    assert claiming_less_than_full(5000, 4000) is False     # over -> 100%
    assert claiming_less_than_full(None, 4000) is False     # no amount
    assert claiming_less_than_full(1500, None) is False     # no value
    assert claiming_less_than_full('$1,500', '$4,000') is True   # currency strings
    assert claiming_less_than_full('bogus', 4000) is False  # unparseable


if __name__ == '__main__':
    test_full_claim_counts_owned_value()
    test_partial_claim_uses_explicit_value()
    test_claim_without_law_ignored()
    test_citation_has_no_bogus_subsection()
    test_claiming_less_than_full_derivation()
    print('OK: all exemption-totals unit tests passed')
