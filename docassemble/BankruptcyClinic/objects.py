from docassemble.base.util import DAObject, Individual

# State-specific exemption laws
SOUTH_DAKOTA_EXEMPTIONS = {
    'homestead': 'Homestead (SDCL 43-31-1 – 43-31-6)',
    'homestead_proceeds': 'Homestead, proceeds of sale (SDCL 43-31-4)',
    'household_goods': 'Furniture and bedding (SDCL 43-45-5(5))',
    'wildcard': 'Wildcard (SDCL 43-5-4)',
    'personal_property': 'Bible, books, family pictures, burial plots, all wearing apparel, church pew, food & fuel to last one year, and clothing (SDCL 43-45-2)',
    'domestic_support': 'Alimony, maintenance, or support of the debtor (SDCL 43-45-2)',
    'health_aids': 'Health aids (SDCL 43-45-2)',
    'tools': 'Tools of the trade (SDCL 43-45-5(6))',
    'city_employee_pensions': 'City employee pensions (SDCL 9-16-47)',
    'public_employee_pensions': 'Public employee pensions (SDCL 3-12-115)',
    'retirement': 'Retirement (SDCL 43-45-16)',
    'public_assistance': 'Public assistance (SDCL 28-7-16)',
    'wages': 'Wages (SDCL 15-20-12)',
    'life_insurance': 'Life insurance proceeds (SDCL 58-12-4, 43-45-6)',
    'workers_comp': 'Workers compensation (SDCL 62-4-42)',
    'unemployment': 'Unemployment (SDCL 61-6-28)',
    'student_loan': 'Student loan (20 U.S.C. § 1095a(d))',
    'social_security': 'Social Security (42 U.S.C. § 407)',
    'va': 'VA Benefits (38 U.S.C. § 5301(a))',
    'unknown': 'Unknown law',
}

NEBRASKA_EXEMPTIONS = {
    'homestead': 'Homestead (Neb. Rev. Stat. §§ 40-101 - 40-118)',
    'homestead_proceeds': 'Homestead, proceeds of sale (Neb. Rev. Stat. § 40-116)',
    'motor_vehicle': 'Motor vehicle (Neb. Rev. Stat. § 25-1556(1)(e))',
    'household_goods': 'Household goods (Neb. Rev. Stat. § 25-1556(1)(c))',
    'tools': 'Tools of the trade (Neb. Rev. Stat. § 25-1556(1)(d))',
    'clothing': 'Clothing (Neb. Rev. Stat. § 25-1556(1)(b))',
    'personal_possessions': 'Immediate personal possessions (Neb. Rev. Stat. § 25-1556(1)(a))',
    'health_aids': 'Health aids (Neb. Rev. Stat. § 25-1556(1)(f))',
    'health_savings': 'Health savings (Neb. Rev. Stat. § 8-1,131(2)(b))',
    'retirement': 'Retirement accounts (Neb. Rev. Stat. § 25-1563.01)',
    'wages': 'Wages (Neb. Rev. Stat. § 25-1558)',
    'public_benefits': 'Public benefits (Neb. Rev. Stat. § 68-148)',
    'earned_income': 'Earned Income Tax Credit (Neb Rev Stat 25-1553)',
    # § 44-371 covers annuity contract benefits as well as life insurance
    # proceeds, $100,000 limit (Roxanne Alhejaj, Legal Aid of NE, June 2026).
    'life_insurance': 'Life insurance and annuity contracts (Neb. Rev. Stat. § 44-371)',
    'structured_settlement': 'Structured settlement (Neb. Rev. Stat. § 25-1563.02)',
    'workers_comp': 'Workers compensation (Neb. Rev. Stat. § 48-149)',
    'unemployment': 'Unemployment (Neb. Rev. Stat. § 48-647)',
    'college_savings': 'College Savings Plan (Neb. Rev. Stat. § 85-1809)',
    'student_loan': 'Student loan (20 U.S.C. § 1095a(d))',
    'social_security': 'Social Security (42 U.S.C. § 407)',
    'va': 'VA Benefits (38 U.S.C. § 5301(a))',
    'wildcard': 'Wildcard (Neb. Rev. Stat. § 25-1552)',
    'unknown': 'Unknown law',
}

# Per-property-type list of exemption keys to surface in the dropdown.
# Keys absent from a state's dict are skipped, so the same category can be
# resolved for any supported state.
CATEGORY_KEYS = {
    'real_property':            ['homestead', 'homestead_proceeds', 'wildcard', 'unknown'],
    'vehicle':                  ['motor_vehicle', 'wildcard', 'unknown'],
    'household_goods':          ['household_goods', 'wildcard', 'unknown'],
    'electronics':              ['tools', 'household_goods', 'wildcard', 'unknown'],
    'collectibles':             ['household_goods', 'wildcard', 'unknown'],
    'hobby_equipment':          ['wildcard', 'unknown'],
    'firearms':                 ['wildcard', 'unknown'],
    'clothes':                  ['clothing', 'personal_property', 'wildcard', 'unknown'],
    'jewelry':                  ['clothing', 'personal_possessions', 'personal_property', 'wildcard', 'unknown'],
    'animal':                   ['wildcard', 'unknown'],
    'other_household_items':    ['health_aids', 'wildcard', 'unknown'],
    'cash':                     ['wildcard', 'public_benefits', 'public_assistance', 'unknown'],
    'deposits':                 ['wildcard', 'unknown'],
    'bonds_stocks':             ['wildcard', 'unknown'],
    'non_traded_stock':         ['wildcard', 'unknown'],
    'corporate_bonds':          ['wildcard', 'unknown'],
    'retirement':               ['retirement', 'social_security', 'va', 'wildcard',
                                 'city_employee_pensions', 'public_employee_pensions', 'unknown'],
    'prepayments':              ['wildcard', 'unknown'],
    'wages':                    ['wages', 'wildcard', 'unknown'],
    'wildcard_only':            ['wildcard', 'unknown'],
    'edu_accounts':             ['college_savings', 'wildcard', 'unknown'],
    'tax_refund':               ['earned_income', 'wildcard', 'unknown'],
    'insurance':                ['life_insurance', 'wildcard', 'health_savings', 'unknown'],
    # Annuities: NE § 44-371 ($100k, shared with life insurance) plus the
    # retirement exemption for qualified retirement annuities. Previously the
    # annuity page offered the 'wages' list, which omitted § 44-371 entirely —
    # the debtor could not claim the annuity exemption at all (Roxanne UAT,
    # June 2026).
    'annuity':                  ['life_insurance', 'retirement', 'wildcard', 'unknown'],
    'trust':                    ['structured_settlement', 'wildcard', 'unknown'],
    'third_party':              ['structured_settlement', 'life_insurance', 'wildcard', 'unknown'],
    # Contingent/unliquidated claims can be many things (back pay -> wages,
    # personal-injury settlement -> structured settlement, benefits, etc.), so
    # offer more than wildcard. ATTORNEY REVIEW: confirm this list per claim type.
    'contingent_claims':        ['wildcard', 'wages', 'structured_settlement',
                                 'public_benefits', 'workers_comp', 'social_security', 'unknown'],
    'other_assets':             ['wildcard', 'unknown'],
    'future_property_interest': ['wildcard', 'unknown'],
    'ip':                       ['wildcard', 'unknown'],
    'intangible':               ['wildcard', 'unknown'],
    'business_ar':              ['wildcard', 'tools', 'unknown'],
    'business_equipment':       ['tools', 'wildcard', 'unknown'],
    'business_machinery':       ['tools', 'wildcard', 'unknown'],
    'business_inventory':       ['wildcard', 'tools', 'unknown'],
    'business_partnership':     ['wildcard', 'tools', 'unknown'],
    'business_lists':           ['wildcard', 'tools', 'unknown'],
    'business_other':           ['wildcard', 'tools', 'unknown'],
    'farming_animal':           ['wildcard', 'unknown'],
    'farming_crops':            ['wildcard', 'unknown'],
    'farming_equipment':        ['tools', 'wildcard', 'unknown'],
    'farming_supplies':         ['wildcard', 'unknown'],
    'farming_fishing':          ['wildcard', 'unknown'],
    'other_prop':               ['wildcard', 'unknown'],
}

# States supported by get_exemption_choices_combined(); keep in sync with
# the per-state exemption dicts above.
SUPPORTED_STATES = ('Nebraska', 'South Dakota')


# ── Field-level validators (referenced via `validate:` in question YAML) ──
import re as _re

_ZIP_PATTERN = _re.compile(r'^\d{5}(-\d{4})?$')
_CITY_PATTERN = _re.compile(r'[A-Za-z]')

def is_valid_zip(value):
    """Reject ZIPs that aren't 5 digits or 5+4 (e.g. 'abcde' or '1234')."""
    if value is None or value == '':
        return True  # let `required:` handle empties
    if not _ZIP_PATTERN.match(str(value)):
        return "Please enter a 5-digit ZIP (e.g. 68508) or ZIP+4 (68508-1234)."
    return True

def is_valid_city(value):
    """City must contain at least one letter; reject pure-numeric / garbage input."""
    if value is None or value == '':
        return True
    if not _CITY_PATTERN.search(str(value)):
        return "Please enter a valid city name (letters required)."
    return True


_STATE_TO_ABBR = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
}

def mark_list_emptied(the_list):
    """Record that the filer deleted every row on a list-collect screen — an
    explicit "I have none" (Roxanne UAT follow-up, June 2026). Done through a
    function on purpose: assigning `the_list.there_are_any` / `.gathered`
    directly inside a question's `validation code` registers that list-collect
    question as a DEFINER of those variables, so an empty-list gather seek
    asks the collect screen without an index ("list collect question needs
    iterator i" crash) instead of the yesno gate question."""
    the_list.there_are_any = False
    the_list.gathered = True


def state_abbr(value):
    """Return the 2-letter abbreviation for a state name; pass through if already
    an abbreviation or unrecognized. Used to keep court-form PDF fields in the
    'NE' / 'SD' format the templates expect even when the question stores the
    full state name (e.g. from a get_all_us_states() dropdown)."""
    if value is None or value == '':
        return ''
    s = str(value).strip()
    if len(s) == 2 and s.upper() == s:
        return s
    return _STATE_TO_ABBR.get(s.lower(), s)


_ABBR_TO_STATE = {abbr: name.title() for name, abbr in _STATE_TO_ABBR.items()}


def state_name(value):
    """Return the full state name for a 2-letter abbreviation; pass through if
    already a full name or unrecognized. Inverse of state_abbr(). Used when
    pre-filling a question whose dropdown stores full names (get_all_us_states())
    from data kept in 'NE' / 'SD' abbreviation form (e.g. the creditor library)."""
    if value is None or value == '':
        return ''
    s = str(value).strip()
    if len(s) == 2 and s.upper() == s:
        return _ABBR_TO_STATE.get(s.upper(), s)
    return s


def get_exemption_choices(user_state, property_type='all'):
    """
    Returns a list of exemption law choices based on the user's state and property type.

    Args:
        user_state (str): The user's state (e.g., "Nebraska", "South Dakota")
        property_type (str): Property category key (see CATEGORY_KEYS) or 'all'.

    Returns:
        list: List of exemption law strings (state-specific).
    """
    try:
        state_str = str(user_state).lower() if user_state else ''
    except Exception:
        state_str = ''

    exemptions = SOUTH_DAKOTA_EXEMPTIONS if 'south dakota' in state_str else NEBRASKA_EXEMPTIONS

    if property_type == 'all':
        return list(exemptions.values())

    keys = CATEGORY_KEYS.get(property_type, [])
    return [exemptions[k] for k in keys if k in exemptions]


def get_exemption_choices_combined(property_type='all'):
    """
    Returns the de-duplicated union of every supported state's exemption law
    choices for the given property category. Use this in interview YAML so the
    dropdown is consistent across pages and does not depend on whether the
    debtor's address has been entered yet.
    """
    seen = []
    for state in SUPPORTED_STATES:
        for law in get_exemption_choices(state, property_type):
            if law not in seen:
                seen.append(law)
    return seen


def get_exemption_choices_or_combined(state, property_type='all'):
    """
    If `state` is one of the supported states, return ONLY that state's exemption
    choices — filing in Nebraska shows Nebraska exemptions, filing in South
    Dakota shows South Dakota exemptions (Roxanne feedback / clinic decision).
    If `state` is empty/unknown (district not chosen yet), fall back to the
    de-duplicated NE+SD union so the dropdown is never empty.
    """
    if state:
        for s in SUPPORTED_STATES:
            if s.lower() == str(state).lower():
                return get_exemption_choices(s, property_type)
    return get_exemption_choices_combined(property_type)


def claiming_less_than_full(amount, value):
    """
    Derive the Schedule C "specific dollar amount" (vs "100% of fair market
    value") flag.

    The explicit question was removed from the property pages (clinic feedback);
    we infer it from the entered numbers. Originally an amount EQUAL to the
    item's value was treated as a 100%-of-FMV claim, but Schedule C then showed
    "100% of FMV" for every debtor who exempted the item's full dollar value —
    Roxanne (Legal Aid of NE, June 2026): exemptions should be stated as dollar
    amounts unless the debtor specifically chose 100% of FMV. So now: any
    entered exemption amount (> 0) is a specific-dollar claim; only a claim with
    no amount entered falls back to the 100%/fair-market checkbox. `value` is
    kept in the signature so the 50 existing call sites don't change.
    """
    try:
        if amount is None or str(amount).strip() == '':
            return False
        amt = float(str(amount).replace('$', '').replace(',', ''))
        return amt > 0
    except (TypeError, ValueError):
        return False

# DOJ Median Family Income thresholds for the Ch. 7 means test.
# Source: https://www.justice.gov/ust/eo/bapcpa/20250515/bci_data/median_income_table.htm
# Update when new DOJ tables are published (every ~6 months).
DOJ_MEDIAN_INCOME_TABLES = {
    'south dakota': {1: 61022, 2: 92469, 3: 96008, 4: 116374},
    'nebraska':     {1: 65292, 2: 89130, 3: 103358, 4: 120323},
}
DOJ_MEDIAN_ADDITIONAL_PER_PERSON = 11100


def get_median_family_income(state, household_size):
    """DOJ median family income for the state and household size. Households
    over 4 add $11,100 per additional person (DOJ table note). Bad input falls
    back to a household of 1; unknown states fall back to Nebraska (the
    interview only supports NE / SD)."""
    try:
        hs = int(float(household_size))
    except (TypeError, ValueError):
        hs = 1
    if hs < 1:
        hs = 1
    s = str(state or '').lower()
    table = (DOJ_MEDIAN_INCOME_TABLES['south dakota']
             if 'south dakota' in s else DOJ_MEDIAN_INCOME_TABLES['nebraska'])
    if hs <= 4:
        return table.get(hs, table[1])
    return table[4] + (hs - 4) * DOJ_MEDIAN_ADDITIONAL_PER_PERSON


def get_exemption_limits(user_state):
    """
    Returns a dict of exemption category -> dollar limit for the given state.
    A limit of 0 means unlimited.

    Args:
        user_state (str): The user's state (e.g., "Nebraska", "South Dakota")

    Returns:
        dict: {category_key: dollar_limit_or_0_for_unlimited}
    """
    try:
        state_str = str(user_state).lower() if user_state else ''
    except Exception:
        state_str = ''

    if 'south dakota' in state_str:
        return {
            'homestead': 0,          # Unlimited
            'homestead_proceeds': 0,  # Unlimited
            'household_goods': 0,     # Unlimited (SD doesn't specify a dollar limit on furniture/bedding)
            'wildcard': 6000,
            'personal_property': 0,   # Unlimited
            'health_aids': 0,         # Unlimited
            'tools': 0,              # Unlimited
            'retirement': 1000000,    # SDCL 43-45-16: $1,000,000 cap on
                                      # employee benefit plans (William Franck,
                                      # ERLS, June 2026). Prior cite 43-45-26
                                      # does not exist.
            'wages': 0,              # Unlimited (follow federal garnishment rules)
            'life_insurance': 20000,  # SDCL 58-12-4: proceeds payable to the
                                      # beneficiary, $20,000 (William Franck,
                                      # ERLS, June 2026). 43-45-6 ($10,000) is
                                      # the narrower estate-distribution case.
            'workers_comp': 0,        # Unlimited
            'unemployment': 0,        # Unlimited
            'social_security': 0,     # Unlimited
            'va': 0,                  # Unlimited
        }
    else:
        # Nebraska (default)
        #
        # The § 25-1556 personal-property dollar limits are adjusted for
        # inflation by the Nebraska Department of Revenue every fifth year
        # beginning with 2023 (Neb. Rev. Stat. § 25-1556(2)). The amounts below
        # reflect the 2023 adjustment (a uniform +19.4% CPI factor applied to
        # the statutory base figures): motor vehicle/tools $5,000 -> $5,970 and
        # household goods $3,000 -> $3,582. Source: Roxanne Alhejaj, Legal Aid
        # of Nebraska (May 2026). NEXT REVIEW: 2028 adjustment.
        # Homestead (§ 40-101, $120,000) is a separate statute with no CPI
        # clause, so it is not adjusted here.
        return {
            'homestead': 120000,
            'homestead_proceeds': 60000,
            'motor_vehicle': 5970,    # § 25-1556(1)(e), 2023 CPI-adjusted
            'household_goods': 3582,  # § 25-1556(1)(c), 2023 CPI-adjusted
            'wildcard': 5970,    # § 25-1552, 2023 CPI-adjusted (Phil Martin, Legal Aid of NE, June 2026)
            'clothing': 0,            # Unlimited
            'personal_possessions': 0, # Unlimited
            'health_aids': 0,         # Unlimited
            'health_savings': 25000,
            'tools': 5970,            # § 25-1556(1)(d), 2023 CPI-adjusted
            'retirement': 0,          # Unlimited
            'wages': 0,              # Unlimited (85% protected)
            'public_benefits': 0,     # Unlimited
            'earned_income': 0,       # Unlimited
            'life_insurance': 100000,
            'structured_settlement': 0, # Unlimited
            'workers_comp': 0,        # Unlimited
            'unemployment': 0,        # Unlimited
            'college_savings': 0,     # Unlimited
            'social_security': 0,     # Unlimited
            'va': 0,                  # Unlimited
        }


def compute_exemption_totals(prop, debtor_state, num_debtors=1):
    """
    Compute running exemption totals from all property items.

    Args:
        prop: The prop DAObject containing interests, vehicles, etc.
        debtor_state (str): The debtor's state for looking up limits.
        num_debtors (int): Number of debtors in the case (1 or 2). In a joint
            case each debtor is entitled to a full, separate set of exemptions
            (11 U.S.C. § 522(m)), so the finite statutory caps "stack" — e.g.
            two Nebraska debtors can together claim $240,000 homestead and
            $11,940 (2 x $5,970) on motor vehicles. Unlimited caps (0) stay
            unlimited. Confirmed for homestead + motor vehicle/tools by Roxanne
            Alhejaj, Legal Aid of Nebraska (May 2026).

    Returns:
        dict: {law_string: {'claimed': total_claimed, 'limit': limit_value, 'remaining': remaining}}
    """
    try:
        _n = int(num_debtors)
    except (TypeError, ValueError):
        _n = 1
    if _n < 1:
        _n = 1
    limits = {cat: (lim * _n if lim and lim > 0 else 0)
              for cat, lim in get_exemption_limits(debtor_state).items()}

    # Map every supported state's law string -> category key. The user can pick
    # any state's law from the unified dropdowns, so the tracker has to recognize
    # all of them; limits are still looked up using the debtor's own state.
    law_to_category = {}
    for _state_dict in (NEBRASKA_EXEMPTIONS, SOUTH_DAKOTA_EXEMPTIONS):
        for cat, law in _state_dict.items():
            law_to_category[law] = cat

    # Accumulate claimed amounts per law string
    claimed_by_law = {}

    def _safe_float(val):
        """Convert to float safely, returning 0.0 on failure."""
        try:
            return float(str(val).replace('$', '').replace(',', '').strip())
        except (ValueError, TypeError):
            return 0.0

    def _add_claim(owner, claim_attr, sub100_attr, value_attr, ex_prefix):
        """Accumulate one item/category's exemption claims into claimed_by_law.

        `owner` is either a list element or the flat container (prop,
        prop.financial_assets, ...). Attribute names vary by category — the
        names here mirror the checkQuestionExemptions() signatures in
        106AB-question-blocks.yml, which are the authoritative per-screen map.
        """
        if not getattr(owner, claim_attr, False):
            return
        # When the debtor claims a FULL (100%) exemption, no explicit
        # exemption_value is captured. Fall back to the property's value so the
        # claim still counts in the running totals — otherwise the summary
        # wrongly reported "No exemptions have been claimed yet" (Roxanne).
        sub_100 = getattr(owner, sub100_attr, False)
        full_value = getattr(owner, value_attr, 0)
        law1 = getattr(owner, ex_prefix + 'exemption_laws', '')
        val1 = getattr(owner, ex_prefix + 'exemption_value', 0)
        if law1 and not val1 and not sub_100:
            val1 = full_value
        if law1 and val1:
            claimed_by_law[law1] = claimed_by_law.get(law1, 0) + _safe_float(val1)

        law2 = getattr(owner, ex_prefix + 'exemption_laws_2', '')
        val2 = getattr(owner, ex_prefix + 'exemption_value_2', 0)
        if law2 and val2:
            claimed_by_law[law2] = claimed_by_law.get(law2, 0) + _safe_float(val2)

    def _elements(container, name):
        """Items of a DAList attribute without triggering a gather-seek.
        Accepts plain lists too (unit tests use SimpleNamespace fixtures)."""
        lst = getattr(container, name, None)
        if lst is None:
            return []
        elems = getattr(lst, 'elements', None)
        if elems is not None:
            return list(elems)
        try:
            return list(lst)
        except TypeError:
            return []

    fa = getattr(prop, 'financial_assets', None)
    owed = getattr(prop, 'owed_property', None)
    biz = getattr(prop, 'business_property', None)
    farm = getattr(prop, 'farming_property', None)

    # ── List-based property (one claim per list item) ──
    # (container, list_attr, claim_attr, sub100_attr, value_attr)
    _list_sources = [
        (prop, 'interests', 'is_claiming_exemption', 'claiming_sub_100', 'current_owned_value'),
        (prop, 'ab_vehicles', 'is_claiming_exemption', 'claiming_sub_100', 'current_owned_value'),
        (prop, 'ab_other_vehicles', 'is_claiming_exemption', 'claiming_sub_100', 'current_owned_value'),
        (fa, 'deposits', 'is_claiming_exemption', 'sub_100', 'amount'),
        (fa, 'bonds_and_stocks', 'is_claiming_exemption', 'sub_100', 'amount'),
        (fa, 'non_traded_stock', 'is_claiming_exemption', 'sub_100', 'value'),
        (fa, 'corporate_bonds', 'is_claiming_exemption', 'sub_100', 'amount'),
        (fa, 'retirement_accounts', 'has_claim', 'sub_100', 'amount'),
        (fa, 'prepayments', 'has_claim', 'sub_100', 'amount'),
        (fa, 'annuities', 'has_claim', 'sub_100', 'amount'),
        (fa, 'edu_accounts', 'has_claim', 'sub_100', 'amount'),
    ]
    for container, list_attr, claim_attr, sub100_attr, value_attr in _list_sources:
        if container is None:
            continue
        for item in _elements(container, list_attr):
            _add_claim(item, claim_attr, sub100_attr, value_attr, '')

    # ── Flat (single-instance) property categories ──
    # (container, claim_attr, sub100_attr, value_attr, exemption_attr_prefix)
    _flat_sources = [
        (prop, 'household_goods_is_claiming_exemption', 'household_goods_claiming_sub_100', 'household_goods_value', 'household_goods_'),
        (prop, 'secured_household_goods_is_claiming_exemption', 'secured_household_goods_claiming_sub_100', 'secured_household_goods_value', 'secured_household_goods_'),
        (prop, 'electronics_is_claiming_exemption', 'electronics_claiming_sub_100', 'electronics_value', 'electronics_'),
        (prop, 'collectibles_is_claiming_exemption', 'collectibles_claiming_sub_100', 'collectibles_value', 'collectibles_'),
        (prop, 'hobby_equipment_is_claiming_exemption', 'hobby_equipment_claiming_sub_100', 'hobby_equipment_value', 'hobby_equipment_'),
        (prop, 'firearms_is_claiming_exemption', 'firearms_claiming_sub_100', 'firearms_value', 'firearms_'),
        (prop, 'clothes_is_claiming_exemption', 'clothes_claiming_sub_100', 'clothes_value', 'clothes_'),
        (prop, 'jewelry_is_claiming_exemption', 'jewelry_claiming_sub_100', 'jewelry_value', 'jewelry_'),
        (prop, 'animal_is_claiming_exemption', 'animal_claiming_sub_100', 'animal_value', 'animal_'),
        (prop, 'other_household_items_is_claiming_exemption', 'other_household_items_claiming_sub_100', 'other_household_items_value', 'other_household_items_'),
        (prop, 'other_prop_has_claim', 'other_prop_sub_100', 'other_prop_value', 'other_prop_'),
        (fa, 'cash_is_claiming_exemption', 'cash_sub_100', 'cash_value', 'cash_'),
        (fa, 'future_property_interest_has_claim', 'future_property_interest_sub_100', 'future_property_interest_value', 'future_property_interest_'),
        (fa, 'ip_interest_has_claim', 'ip_interest_sub_100', 'ip_interest_value', 'ip_interest_'),
        (fa, 'intangible_interest_has_claim', 'intangible_interest_sub_100', 'intangible_interest_value', 'intangible_interest_'),
        (owed, 'tax_refund_has_claim', 'tax_refund_sub_100', 'tax_refund_federal', 'tax_refund_'),
        (owed, 'family_support_has_claim', 'family_support_sub_100', 'family_support_alimony', 'family_support_'),
        (owed, 'other_amounts_has_claim', 'other_amounts_sub_100', 'other_amounts_value', 'other_amounts_'),
        (owed, 'first_insurance_interest_has_claim', 'first_insurance_interest_sub_100', 'first_insurance_interest_amount', 'first_insurance_interest_'),
        (owed, 'second_insurance_interest_has_claim', 'second_insurance_interest_sub_100', 'second_insurance_interest_amount', 'second_insurance_interest_'),
        (owed, 'third_insurance_interest_has_claim', 'third_insurance_interest_sub_100', 'third_insurance_interest_amount', 'third_insurance_interest_'),
        (owed, 'trust_has_claim', 'trust_sub_100', 'trust_amount', 'trust_'),
        (owed, 'third_party_has_claim', 'third_party_sub_100', 'third_party_amount', 'third_party_'),
        (owed, 'contingent_claims_has_claim', 'contingent_claims_sub_100', 'contingent_claims_amount', 'contingent_claims_'),
        (owed, 'other_assets_has_claim', 'other_assets_sub_100', 'other_assets_amount', 'other_assets_'),
        (biz, 'ar_has_claim', 'ar_sub_100', 'ar_amount', 'ar_'),
        (biz, 'equipment_has_claim', 'equipment_sub_100', 'equipment_amount', 'equipment_'),
        (biz, 'machinery_has_claim', 'machinery_sub_100', 'machinery_amount', 'machinery_'),
        (biz, 'inventory_has_claim', 'inventory_sub_100', 'inventory_amount', 'inventory_'),
        (biz, 'partnership_has_claim', 'partnership_sub_100', 'partnershipValue1', 'partnership_'),
        (biz, 'lists_has_claim', 'lists_sub_100', 'lists_amount', 'lists_'),
        (biz, 'otherProperty_has_claim', 'otherProperty_sub_100', 'otherPropertyAmount1', 'otherProperty_'),
        (farm, 'has_animal_claim', 'animal_sub_100', 'animal_amount', 'animal_'),
        (farm, 'has_crops_claim', 'crops_sub_100', 'crop_amount', 'crops_'),
        (farm, 'has_equipment_claim', 'equipment_sub_100', 'equipment_amount', 'equipment_'),
        (farm, 'has_supplies_claim', 'supplies_sub_100', 'supplies_amount', 'supplies_'),
        (farm, 'has_fishing_claim', 'fishing_sub_100', 'commercial_amount', 'fishing_'),
    ]
    for container, claim_attr, sub100_attr, value_attr, ex_prefix in _flat_sources:
        if container is None:
            continue
        _add_claim(container, claim_attr, sub100_attr, value_attr, ex_prefix)

    # Build result
    result = {}
    for law_str, claimed in claimed_by_law.items():
        cat = law_to_category.get(law_str, 'unknown')
        limit = limits.get(cat, 0)
        remaining = max(0, limit - claimed) if limit > 0 else float('inf')
        result[law_str] = {
            'claimed': claimed,
            'limit': limit,
            'remaining': remaining,
            'category': cat,
        }

    return result


def get_motor_vehicle_violations(prop, debtor_state, num_debtors=1):
    """Return a list of human-readable motor-vehicle exemption violations
    (empty list == OK).

    Per Neb. Rev. Stat. § 25-1556(1)(e) as applied (Phil Martin + Roxanne
    Alhejaj, Legal Aid of Nebraska, June 2026), model each debtor as having ONE
    motor-vehicle exemption "slot" worth the per-vehicle cap ($5,970 in NE):

      * Each slot may be applied to at most one vehicle (Phil: "each debtor can
        claim one vehicle").
      * A SOLE-owned vehicle ('Debtor 1 only' / 'Debtor 2 only') draws that one
        debtor's slot, so its MV exemption is capped at one slot ($5,970).
      * A JOINTLY-owned vehicle ('Debtor 1 and Debtor 2 only') draws BOTH
        debtors' slots, so in a joint case its cap is two slots ($11,940) —
        Roxanne's rule: "if joint debtors only have one vehicle they can both
        combine their exemptions ... for a total of $11,940 towards one
        vehicle."
      * No debtor's slot may be split across two vehicles — e.g. a joint MV car
        AND that debtor's own sole MV car would use Debtor 1's slot twice.

    The aggregate category cap in compute_exemption_totals ($5,970 x
    num_debtors) still bounds the total independently; both hold at once.

    Enforced here, post-gather, rather than in the vehicle question's per-item
    `validation code`: under `list collect` the `who` owner radio (a code:-
    choice field) commits AFTER per-item validation fires, so sibling-item
    reads there returned undefined and the original guard (issue #53) silently
    passed. At this point prop.ab_vehicles is fully gathered and reads reliably.
    """
    cap = get_exemption_limits(debtor_state).get('motor_vehicle', 0)
    vehicles = getattr(prop, 'ab_vehicles', None)
    if vehicles is None:
        return []
    try:
        n = max(1, int(num_debtors))
    except (TypeError, ValueError):
        n = 1

    def _amt(val):
        try:
            return float(str(val).replace('$', '').replace(',', '').strip())
        except (ValueError, TypeError):
            return 0.0

    def _label(v, idx):
        parts = [str(getattr(v, a, '') or '').strip()
                 for a in ('year', 'make', 'model')]
        parts = [p for p in parts if p]
        return ' '.join(parts).strip() or ('Vehicle #' + str(idx + 1))

    def _money(x):
        return '${:,.0f}'.format(x)

    violations = []
    d1_slot_labels = []   # vehicles drawing Debtor 1's MV slot
    d2_slot_labels = []   # vehicles drawing Debtor 2's MV slot
    for idx in range(len(vehicles)):
        v = vehicles[idx]
        if not getattr(v, 'is_claiming_exemption', False):
            continue
        claims_mv = False
        mv_amount = 0.0
        for law_attr, val_attr in (('exemption_laws', 'exemption_value'),
                                   ('exemption_laws_2', 'exemption_value_2')):
            law = getattr(v, law_attr, None)
            if law and 'motor vehicle' in str(law).lower():
                claims_mv = True
                mv_amount += _amt(getattr(v, val_attr, 0))
        if not claims_mv:
            continue
        # Full (100%) claims capture no explicit value — fall back to equity.
        if mv_amount == 0:
            mv_amount = _amt(getattr(v, 'current_owned_value',
                                    getattr(v, 'current_value', 0)))
        label = _label(v, idx)
        owner = getattr(v, 'who', 'Debtor 1 only')
        # How many debtor slots this vehicle draws (and from whom).
        if owner == 'Debtor 1 only':
            slots = 1
            d1_slot_labels.append(label)
        elif owner == 'Debtor 2 only':
            slots = 1
            d2_slot_labels.append(label)
        elif owner == 'Debtor 1 and Debtor 2 only':
            slots = min(n, 2)
            d1_slot_labels.append(label)
            if n >= 2:
                d2_slot_labels.append(label)
        else:
            # Jointly owned with a non-filer / unclear: allow the debtors'
            # combined slots for the dollar cap, but don't pin it to a specific
            # debtor's one-vehicle limit (ownership is ambiguous). The
            # aggregate cap still bounds the total.
            slots = min(n, 2)
        per_vehicle_cap = cap * slots if cap else 0
        if cap and mv_amount > per_vehicle_cap:
            extra = ("" if slots == 1 else
                     " (two debtors may combine their exemptions on one shared vehicle)")
            violations.append(
                label + ": the Motor Vehicle exemption claimed (" + _money(mv_amount)
                + ") is over the " + _money(per_vehicle_cap) + " limit for this vehicle"
                + extra + ". Reduce it to " + _money(per_vehicle_cap)
                + " and claim the remainder under Wildcard.")
    if len(d1_slot_labels) > 1:
        violations.append(
            "Debtor 1's Motor Vehicle exemption is applied to more than one "
            "vehicle (" + ', '.join(d1_slot_labels) + "). Each debtor may apply it "
            "to only ONE vehicle — change the others to a different exemption "
            "(for example, Wildcard).")
    if len(d2_slot_labels) > 1:
        violations.append(
            "Debtor 2's Motor Vehicle exemption is applied to more than one "
            "vehicle (" + ', '.join(d2_slot_labels) + "). Each debtor may apply it "
            "to only ONE vehicle — change the others to a different exemption "
            "(for example, Wildcard).")
    return violations


class Debtor(Individual):
  def init(self, *pargs, **kwargs):
    self.aliases = []
    self.initializeAttribute('tax_id', DebtorTaxId)
    self.initializeAttribute('district_info', DebtorDistrictInfo)
    super().init(*pargs, **kwargs)

class DebtorAlias(Individual):
  business = None
  
class DebtorTaxId(DAObject):
  pass

class DebtorDistrictInfo(DAObject):
  pass