#!/usr/bin/env python3
"""Re-fetch the US Trustee Program means-testing tables and regenerate
`docassemble/BankruptcyClinic/means_test_data.py`.

The USTP republishes the IRS Standards and the Chapter 13 administrative
expense multipliers roughly every six months, keyed by filing period. A stale
table puts a wrong figure on a filed court form and raises no error, so this
script exists to make the refresh mechanical rather than a retyping exercise.

Usage:

    python3 scripts/fetch_means_test_data.py --list
        Show the filing periods the USTP currently publishes, newest first,
        and which one this repository is pinned to.

    python3 scripts/fetch_means_test_data.py --period 20260715
        Fetch that period's tables and rewrite means_test_data.py.

    python3 scripts/fetch_means_test_data.py --period 20260715 --check
        Fetch and compare against the committed module without writing.
        Exits 1 if anything differs. Suitable for a scheduled check.

Every number in the generated module is read off the fetched page. Nothing is
written from memory, and the script fails loudly rather than guessing if a
table's shape changes.

What this script does NOT cover:

  * The DOJ median family income table, which lives in `objects.py`
    (`DOJ_MEDIAN_INCOME_TABLES`) and is fetched from the same filing period.
  * The 11 U.S.C. 707(b)(2) presumption thresholds, which are statutory
    amounts printed on the face of the official form and adjusted on a
    three-year cycle. Those are read off the form PDF and require attorney
    verification; see MEANS_TEST_* at the foot of the generated module.

Both are flagged in the generated module's header.
"""

import argparse
import datetime
import html
import io
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docassemble', 'BankruptcyClinic', 'means_test_data.py')

USTP = 'https://www.justice.gov'
INDEX = USTP + '/ust/means-testing'

# The interview supports these two states only. Adding a state means adding it
# here AND transcribing its MSA transportation figures, which this script does
# not do (see the module note on the Midwest region).
STATES = (('Nebraska', 'NE'), ('South Dakota', 'SD'))

# County counts, asserted so a truncated or reshaped page fails loudly instead
# of silently dropping counties.
EXPECTED_COUNTIES = {'Nebraska': 93, 'South Dakota': 66}


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'BankruptcyClinic means-test data refresh'})
    with urllib.request.urlopen(req, timeout=60) as fh:
        return fh.read().decode('utf-8', errors='replace')


def tables(page):
    """Every <table> on the page, as a list of lists of cell strings."""
    page = re.sub(r'(?s)<(script|style).*?</\1>', '', page)
    out = []
    for tbl in re.findall(r'(?s)<table.*?</table>', page, re.I):
        rows = []
        for row in re.findall(r'(?s)<tr.*?</tr>', tbl, re.I):
            cells = [re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', c))).strip()
                     for c in re.findall(r'(?s)<t[dh][^>]*>(.*?)</t[dh]>', row, re.I)]
            if any(cells):
                rows.append(cells)
        out.append(rows)
    return out


def money(text):
    return int(text.replace('$', '').replace(',', '').strip())


def periods():
    """Filing periods the USTP publishes, newest first."""
    page = fetch(INDEX)
    found = []
    for m in re.finditer(r'<option value="([^"]*)"[^>]*>(.*?)</option>', page, re.I | re.S):
        href, label = m.group(1), re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', m.group(2)))).strip()
        pm = re.search(r'(\d{8})', href)
        if pm:
            found.append((pm.group(1), label))
    seen = set()
    uniq = []
    for p, label in found:
        if p not in seen:
            seen.add(p)
            uniq.append((p, label))
    uniq.sort(reverse=True)
    return uniq


def pinned_period():
    if not os.path.exists(OUT):
        return None
    m = re.search(r'Period index:\s*\S*?/means-testing/(\d{8})', open(OUT).read())
    return m.group(1) if m else None


def national_standards(base):
    rows = tables(fetch(base + '/national_expense_standards.htm'))
    total = None
    additional = None
    for tbl in rows:
        for cells in tbl:
            if cells[0].strip().lower() == 'total' and len(cells) >= 5:
                total = [money(c) for c in cells[1:5]]
            if 'additional person' in cells[0].lower() and len(cells) >= 2:
                # Two rows match this text on the page: the Total-row companion
                # (the one we want) and the food-and-clothing-only row further
                # down. The first is the "add to four-person total allowance"
                # row; take it and nothing else.
                if 'four-person total allowance' in cells[0].lower():
                    additional = money(cells[1])
    if not total or len(total) != 4:
        raise SystemExit('National Standards: could not read the Total row')
    if not additional:
        raise SystemExit('National Standards: could not read the per-additional-person amount')
    return total, additional


def oop_healthcare(base):
    under = over = None
    for tbl in tables(fetch(base + '/national_oop_healthcare.htm')):
        for cells in tbl:
            key = cells[0].strip().lower()
            if key.startswith('under 65') and len(cells) >= 2:
                under = money(cells[1])
            elif key.startswith('65 and older') and len(cells) >= 2:
                over = money(cells[1])
    if under is None or over is None:
        raise SystemExit('Out-of-pocket health care: could not read both age bands')
    return under, over


def transportation(base):
    """Midwest Census Region figures. NE and SD are both in the Midwest and
    neither contains a listed MSA, so the regional figure applies to every
    supported filer."""
    page = fetch(base + '/IRS_Trans_Exp_Stds_MW.htm')
    if 'Midwest Census Region' not in page:
        raise SystemExit('Transportation: fetched page is not the Midwest region table')
    for state, _ in STATES:
        if state not in page:
            raise SystemExit('Transportation: %s no longer listed in the Midwest region' % state)
    public = operating = ownership = None
    for tbl in tables(page):
        for cells in tbl:
            head = cells[0].strip()
            if head == 'National' and len(cells) == 2:
                public = money(cells[1])
            elif head.startswith('Midwest Region') and len(cells) >= 3:
                operating = (money(cells[1]), money(cells[2]))
            elif len(cells) == 2 and cells[0].startswith('$') and cells[1].startswith('$'):
                ownership = (money(cells[0]), money(cells[1]))
    if None in (public, operating, ownership):
        raise SystemExit('Transportation: could not read public / operating / ownership figures')
    return public, operating, ownership


def housing(base, abbrev, state):
    page = fetch(base + '/housing_charts/irs_housing_charts_%s.htm' % abbrev)
    out = []
    for tbl in tables(page):
        for cells in tbl:
            # county | FIPS | 10 dollar figures
            if len(cells) == 12 and re.match(r'^\d{5}$', cells[1]):
                out.append((cells[0], [int(cells[1])] + [money(c) for c in cells[2:]]))
    want = EXPECTED_COUNTIES[state]
    if len(out) != want:
        raise SystemExit('Housing %s: read %d counties, expected %d' % (state, len(out), want))
    return out


def ch13_multipliers(base):
    page = fetch(base + '/ch13_exp_mult.htm')
    found = {}
    for tbl in tables(page):
        for cells in tbl:
            joined = ' | '.join(cells)
            m = re.search(r'\|\s*(?:NE|SD)\s*\|\s*District of (Nebraska|South Dakota)\s*\|\s*([\d.]+)\s*%', joined)
            if m:
                found[m.group(1)] = float(m.group(2))
    if set(found) != {s for s, _ in STATES}:
        raise SystemExit('Chapter 13 multipliers: could not read both districts, got %r' % found)
    return found


def check_county_names(data):
    """The generated tables are keyed by county name, and the interview offers
    county names from county_list.py. If the two ever disagree a filer picks a
    county the housing table has no row for."""
    sys.path.insert(0, os.path.join(ROOT, 'docassemble', 'BankruptcyClinic'))
    try:
        from county_list import county_list
    except ImportError:
        print('  (county_list.py not importable; skipping the name cross-check)')
        return
    for state, _ in STATES:
        offered = set(county_list(state))
        published = set(name for name, _ in data[state])
        missing = sorted(published - offered)
        extra = sorted(offered - published)
        if missing:
            raise SystemExit('county_list.py is missing %s counties the USTP publishes: %s'
                             % (state, ', '.join(missing)))
        if extra:
            raise SystemExit('county_list.py offers %s counties the USTP does not publish: %s'
                             % (state, ', '.join(extra)))
    print('  county names match county_list.py for both states')


def render(period, pull_date, nat, nat_add, oop_under, oop_over,
           public, operating, ownership, house, ch13):
    base = '%s/ust/eo/bapcpa/%s/bci_data' % (USTP, period)
    buf = io.StringIO()
    w = buf.write

    w('"""IRS and US Trustee Program means-testing standards for Form 122A-2.\n')
    w('\n')
    w('GENERATED FILE - do not hand-edit. Regenerate with:\n')
    w('\n')
    w('    python3 scripts/fetch_means_test_data.py --period %s\n' % period)
    w('\n')
    w('Every figure below is read off the published USTP tables for the filing\n')
    w('period named here. None of it may be written from memory.\n')
    w('\n')
    w('Filing period:  cases filed on or after %s-%s-%s\n'
      % (period[0:4], period[4:6], period[6:8]))
    w('Period index:   %s/ust/means-testing/%s\n' % (USTP, period))
    w('Pulled:         %s\n' % pull_date)
    w('\n')
    w('NEXT REVIEW: the USTP republishes these tables roughly every six months.\n')
    w('A stale table puts a wrong figure on a filed court form and raises no\n')
    w('error, so this is a silent failure. Run\n')
    w('`python3 scripts/fetch_means_test_data.py --list` to see whether a newer\n')
    w('filing period has been published, and regenerate when one has.\n')
    w('\n')
    w('NOT COVERED HERE, and needing the same refresh:\n')
    w('  * DOJ median family income - objects.py, DOJ_MEDIAN_INCOME_TABLES.\n')
    w('  * The 11 U.S.C. 707(b)(2) presumption thresholds - see the foot of\n')
    w('    this file. Those are statutory amounts on a three-year cycle, are\n')
    w('    read off the face of the official form, and require attorney\n')
    w('    verification before any change ships.\n')
    w('"""\n\n')

    w('# ---------------------------------------------------------------------------\n')
    w('# Line 6 - National Standards for food, clothing and other items.\n')
    w('# Source: %s/national_expense_standards.htm\n' % base)
    w('# The transcribed row is the published "Total" row, which is the figure\n')
    w('# line 6 of Form 122A-2 asks for.\n')
    w('# ---------------------------------------------------------------------------\n')
    w('IRS_NATIONAL_STANDARDS = {\n')
    for size, amount in enumerate(nat, start=1):
        w('    %d: %d,\n' % (size, amount))
    w('}\n')
    w('IRS_NATIONAL_STANDARDS_ADDITIONAL_PER_PERSON = %d\n\n' % nat_add)

    w('# ---------------------------------------------------------------------------\n')
    w('# Lines 7a and 7d - out-of-pocket health care allowance, per person.\n')
    w('# Source: %s/national_oop_healthcare.htm\n' % base)
    w('# ---------------------------------------------------------------------------\n')
    w('IRS_OOP_HEALTHCARE_UNDER_65 = %d\n' % oop_under)
    w('IRS_OOP_HEALTHCARE_65_AND_OVER = %d\n\n' % oop_over)

    w('# ---------------------------------------------------------------------------\n')
    w('# Lines 12, 13a, 13d and 14 - IRS Local Transportation Expense Standards.\n')
    w('# Source: %s/IRS_Trans_Exp_Stds_MW.htm\n' % base)
    w('#\n')
    w('# Nebraska and South Dakota are both in the Midwest Census Region, and the\n')
    w('# USTP lists no Metropolitan Statistical Area in either state (the Midwest\n')
    w('# MSAs are Chicago, Cleveland, Detroit, Minneapolis-St. Paul and St. Louis).\n')
    w('# So every filer this interview supports takes the plain regional operating\n')
    w('# figure. Adding a state outside NE/SD means transcribing that state\'s MSA\n')
    w('# rows as well - these numbers must not be reused for another region.\n')
    w('# ---------------------------------------------------------------------------\n')
    w('IRS_TRANSPORTATION_OPERATING_MIDWEST = {1: %d, 2: %d}\n' % operating)
    w('IRS_TRANSPORTATION_OWNERSHIP = {1: %d, 2: %d}\n' % ownership)
    w('IRS_PUBLIC_TRANSPORTATION = %d\n\n' % public)

    w('# ---------------------------------------------------------------------------\n')
    w('# Lines 8 and 9a - IRS Local Standards for housing and utilities, by county.\n')
    w('# Source: %s/housing_charts/irs_housing_charts_NE.htm\n' % base)
    w('#         %s/housing_charts/irs_housing_charts_SD.htm\n' % base)
    w('#\n')
    w('# Keys are county names spelled exactly as county_list.py spells them; the\n')
    w('# generator fails if the two ever diverge. Each value is:\n')
    w('#\n')
    w('#   [FIPS,\n')
    w('#    non-mortgage 1 person,  mortgage/rent 1 person,\n')
    w('#    non-mortgage 2 people,  mortgage/rent 2 people,\n')
    w('#    non-mortgage 3 people,  mortgage/rent 3 people,\n')
    w('#    non-mortgage 4 people,  mortgage/rent 4 people,\n')
    w('#    non-mortgage 5 or more, mortgage/rent 5 or more]\n')
    w('#\n')
    w('# The non-mortgage figure is the insurance-and-operating allowance for\n')
    w('# line 8. The mortgage/rent figure is the allowance for line 9a.\n')
    w('# ---------------------------------------------------------------------------\n')
    for state, _ in STATES:
        w('IRS_HOUSING_%s = {\n' % state.upper().replace(' ', '_'))
        for name, values in house[state]:
            w("    '%s': [%s],\n" % (name, ', '.join(str(v) for v in values)))
        w('}\n\n')
    w('IRS_HOUSING_TABLES = {\n')
    for state, _ in STATES:
        w("    '%s': IRS_HOUSING_%s,\n" % (state.lower(), state.upper().replace(' ', '_')))
    w('}\n\n')

    w('# ---------------------------------------------------------------------------\n')
    w('# Line 36 - Chapter 13 administrative expense multiplier, by judicial\n')
    w('# district. Published as a percentage.\n')
    w('# Source: %s/ch13_exp_mult.htm\n' % base)
    w('# ---------------------------------------------------------------------------\n')
    w('CH13_ADMIN_MULTIPLIER_PERCENT = {\n')
    for state in sorted(ch13):
        w("    '%s': %s,\n" % (state.lower(), ch13[state]))
    w('}\n\n')

    w(THRESHOLDS)
    w(LOOKUPS)
    return buf.getvalue()


# The statutory thresholds are NOT scraped: they are printed on the face of the
# official form and adjust on a three-year cycle under 11 U.S.C. 104. They are
# kept in the generated file so that everything Form 122A-2 needs lives in one
# module, but they are edited by hand, deliberately, with attorney sign-off.
THRESHOLDS = '''# ---------------------------------------------------------------------------
# Line 40 - the 11 U.S.C. 707(b)(2)(A)(i) presumption thresholds.
#
# NOT SCRAPED. These are statutory dollar amounts, adjusted every three years
# under 11 U.S.C. 104, and they are printed on the face of the official form.
# The figures below are read off Official Form 122A-2, revision 04/25, the copy
# committed at data/templates/form_b122a-2.pdf, page 8 line 40:
#
#   "The line 39d is less than $10,275*"      -> no presumption of abuse
#   "The line 39d is more than $17,150*"      -> presumption of abuse
#   at least $10,275 but not more than $17,150 -> go to line 41
#
# Source of the form: https://www.uscourts.gov/forms-rules/forms/chapter-7-means-test-calculation-0
# (form file b_122a-2_0425-form.pdf, "Updated on April 1, 2025").
#
# ATTORNEY SIGN-OFF REQUIRED before changing either number, and before shipping
# a newer form revision. The next adjustment is due on the three-year cycle;
# when the courts publish a revised 122A-2, the template AND these two figures
# have to move together, or the interview will print a decision that does not
# match the form the filer signs.
# ---------------------------------------------------------------------------
MEANS_TEST_THRESHOLD_LOW = 10275
MEANS_TEST_THRESHOLD_HIGH = 17150
MEANS_TEST_FORM_REVISION = '04/25'

'''


LOOKUPS = '''# ---------------------------------------------------------------------------
# Lookups.
#
# Every one of these is defended: the interview can reach them with a household
# size that is blank, a county the filer has not chosen yet, or a state string
# in any casing. None of them may raise, because a raise here is a crash on the
# way to assembling a court filing. Where input is unusable they fall back to
# the smallest household and to Nebraska, and the caller is expected to have
# collected real values before the figures reach the PDF.
# ---------------------------------------------------------------------------


def _household_size(value):
    """Coerce a household size to an integer of at least 1."""
    try:
        size = int(float(value))
    except (TypeError, ValueError):
        return 1
    return size if size >= 1 else 1


def _state_key(state):
    """Normalise a state to a key in IRS_HOUSING_TABLES. The interview supports
    Nebraska and South Dakota only; anything else falls back to Nebraska."""
    text = str(state or '').lower()
    return 'south dakota' if 'south dakota' in text else 'nebraska'


def get_national_standard(household_size):
    """Line 6. Households over four add a fixed amount per additional person."""
    size = _household_size(household_size)
    if size <= 4:
        return IRS_NATIONAL_STANDARDS.get(size, IRS_NATIONAL_STANDARDS[1])
    return (IRS_NATIONAL_STANDARDS[4]
            + (size - 4) * IRS_NATIONAL_STANDARDS_ADDITIONAL_PER_PERSON)


def get_oop_healthcare(under_65_count, over_65_count):
    """Lines 7a to 7g. Returns (per-person under 65, subtotal under 65,
    per-person 65 and over, subtotal 65 and over, total)."""
    try:
        younger = max(0, int(float(under_65_count or 0)))
    except (TypeError, ValueError):
        younger = 0
    try:
        older = max(0, int(float(over_65_count or 0)))
    except (TypeError, ValueError):
        older = 0
    younger_subtotal = IRS_OOP_HEALTHCARE_UNDER_65 * younger
    older_subtotal = IRS_OOP_HEALTHCARE_65_AND_OVER * older
    return (IRS_OOP_HEALTHCARE_UNDER_65, younger_subtotal,
            IRS_OOP_HEALTHCARE_65_AND_OVER, older_subtotal,
            younger_subtotal + older_subtotal)


def _housing_row(state, county):
    table = IRS_HOUSING_TABLES[_state_key(state)]
    row = table.get(str(county or '').strip())
    if row is None:
        return None
    return row


def get_housing_standards(state, county, household_size):
    """Lines 8 and 9a. Returns (insurance and operating, mortgage or rent).

    Returns (0, 0) for a county that is not in the published table rather than
    raising, so a half-answered interview cannot crash on the way to the PDF.
    A zero here is visible on the form and on the review screen; a traceback
    would lose the filer's session.
    """
    row = _housing_row(state, county)
    if row is None:
        return (0, 0)
    size = _household_size(household_size)
    if size > 5:
        size = 5
    # row = [FIPS, nm1, mr1, nm2, mr2, nm3, mr3, nm4, mr4, nm5, mr5]
    offset = 1 + (size - 1) * 2
    return (row[offset], row[offset + 1])


def get_housing_fips(state, county):
    """The published FIPS code for a county, or None. Not printed on the form;
    kept so a future maintainer can line a row up against the USTP workbook."""
    row = _housing_row(state, county)
    return row[0] if row else None


def get_vehicle_operating_cost(vehicle_count):
    """Line 12. Nebraska and South Dakota take the Midwest regional figure; the
    published table stops at two vehicles and so does Form 122A-2."""
    try:
        count = int(float(vehicle_count or 0))
    except (TypeError, ValueError):
        count = 0
    if count <= 0:
        return 0
    if count >= 2:
        return IRS_TRANSPORTATION_OPERATING_MIDWEST[2]
    return IRS_TRANSPORTATION_OPERATING_MIDWEST[1]


def get_vehicle_ownership_cost(vehicle_count=1):
    """Lines 13a and 13d. The IRS ownership or leasing standard is a PER-VEHICLE
    figure and Form 122A-2 claims it one vehicle at a time: line 13a for the
    first vehicle, line 13d for the second. So this always returns the
    single-vehicle amount. A count of 0 means no vehicle is claimed.
    IRS_TRANSPORTATION_OWNERSHIP[2] is the published TWO-vehicle total; use that
    constant directly where a combined figure is wanted."""
    try:
        count = int(float(vehicle_count if vehicle_count is not None else 1))
    except (TypeError, ValueError):
        count = 1
    if count <= 0:
        return 0
    return IRS_TRANSPORTATION_OWNERSHIP[1]


def get_public_transportation_cost():
    """Line 14."""
    return IRS_PUBLIC_TRANSPORTATION


def get_ch13_multiplier(state):
    """Line 36, as a decimal fraction (8.4 per cent -> 0.084)."""
    return CH13_ADMIN_MULTIPLIER_PERCENT.get(_state_key(state), 0) / 100.0


def presumption_of_abuse(line_39d):
    """Line 40. Returns one of 'none', 'presumed', or 'check_line_41'.

    'check_line_41' means the total falls in the band where the answer depends
    on the filer's non-priority unsecured debt, which is line 41 of the form.
    """
    try:
        total = float(line_39d or 0)
    except (TypeError, ValueError):
        total = 0.0
    if total < MEANS_TEST_THRESHOLD_LOW:
        return 'none'
    if total > MEANS_TEST_THRESHOLD_HIGH:
        return 'presumed'
    return 'check_line_41'
'''


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--period', help='USTP filing period, e.g. 20260715')
    ap.add_argument('--list', action='store_true', help='list published filing periods and exit')
    ap.add_argument('--check', action='store_true',
                    help='compare against the committed module without writing; exit 1 on any difference')
    args = ap.parse_args()

    pinned = pinned_period()

    if args.list or not args.period:
        published = periods()
        if not published:
            raise SystemExit('Could not read any filing period from %s' % INDEX)
        print('Filing periods published at %s:' % INDEX)
        for period, label in published:
            mark = '  <-- this repository' if period == pinned else ''
            print('  %s  %s%s' % (period, label, mark))
        if pinned and published[0][0] != pinned:
            print('\nA NEWER filing period is published than the one this repository uses.')
            print('Regenerate with: python3 scripts/fetch_means_test_data.py --period %s'
                  % published[0][0])
            return 1
        if not args.list:
            print('\nPass --period to regenerate.')
            return 0
        print('\nUp to date.')
        return 0

    period = args.period
    if not re.match(r'^\d{8}$', period):
        raise SystemExit('--period must be an eight-digit filing period, e.g. 20260715')

    base = '%s/ust/eo/bapcpa/%s/bci_data' % (USTP, period)
    print('Fetching means-testing tables for filing period %s' % period)

    nat, nat_add = national_standards(base)
    print('  National Standards total by household size: %r (+%d per person)' % (nat, nat_add))

    oop_under, oop_over = oop_healthcare(base)
    print('  Out-of-pocket health care: under 65 %d, 65 and over %d' % (oop_under, oop_over))

    public, operating, ownership = transportation(base)
    print('  Transportation: public %d, Midwest operating %r, ownership %r'
          % (public, operating, ownership))

    house = {}
    for state, abbrev in STATES:
        house[state] = housing(base, abbrev, state)
        print('  Housing: %s, %d counties' % (state, len(house[state])))
    check_county_names(house)

    ch13 = ch13_multipliers(base)
    print('  Chapter 13 multipliers: %r' % ch13)

    text = render(period, datetime.date.today().isoformat(), nat, nat_add,
                  oop_under, oop_over, public, operating, ownership, house, ch13)

    if args.check:
        if not os.path.exists(OUT):
            print('\nFAIL: %s does not exist yet.' % OUT)
            return 1
        current = open(OUT).read()
        # The pull date is the only line expected to move on a re-run of the
        # same period, so ignore it when comparing.
        strip = lambda s: re.sub(r'^Pulled:.*$', 'Pulled:', s, flags=re.M)
        if strip(current) == strip(text):
            print('\nUp to date: the committed module matches filing period %s.' % period)
            return 0
        print('\nFAIL: the committed module differs from filing period %s.' % period)
        print('Regenerate with: python3 scripts/fetch_means_test_data.py --period %s' % period)
        return 1

    with open(OUT, 'w') as fh:
        fh.write(text)
    print('\nWrote %s' % OUT)
    print('Remember: the 707(b)(2) thresholds at the foot of that file are NOT')
    print('scraped. Check them against the committed form template and get')
    print('attorney sign-off if the form revision has changed.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
