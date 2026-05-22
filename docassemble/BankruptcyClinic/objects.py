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
    'retirement': 'Retirement (SDCL 43-45-26)',
    'public_assistance': 'Public assistance (SDCL 28-7-16)',
    'wages': 'Wages (SDCL 15-20-12)',
    'life_insurance': 'Life insurance proceeds (SDCL 58-12-4. 43-45-6)',
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
    'life_insurance': 'Life insurance proceeds (Neb. Rev. Stat. § 44-371)',
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
    Derive the Schedule C "claiming less than 100% of fair market value" flag.

    The explicit question was removed from the property pages (clinic feedback);
    instead we infer it: a claimed `amount` strictly less than the item's `value`
    is a partial (specific-dollar) claim; an amount equal to (or above) the value
    is a 100%/fair-market claim. Safe by construction — any bad/None input falls
    back to False (= 100% / fair market, the debtor-favorable default).
    """
    try:
        if amount is None or value is None:
            return False
        amt = float(str(amount).replace('$', '').replace(',', ''))
        val = float(str(value).replace('$', '').replace(',', ''))
        return amt < val
    except (TypeError, ValueError):
        return False

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
            'retirement': 0,          # Unlimited
            'wages': 0,              # Unlimited (follow federal garnishment rules)
            'life_insurance': 0,      # Unlimited
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
            'wildcard': 5000,
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

    def _add_exemption(item, attr_prefix=''):
        """Extract exemption claims from a property item."""
        is_claiming = getattr(item, attr_prefix + 'is_claiming_exemption', False)
        if not is_claiming:
            return
        # When the debtor claims a FULL (100%) exemption, no explicit
        # exemption_value is captured (that field only shows when claiming less
        # than 100%). Fall back to the property's owned value so the claim still
        # counts in the running totals — otherwise the summary wrongly reported
        # "No exemptions have been claimed yet" (Roxanne feedback).
        sub_100 = getattr(item, attr_prefix + 'claiming_sub_100', False)
        full_value = getattr(item, attr_prefix + 'current_owned_value',
                             getattr(item, attr_prefix + 'current_value', 0))
        law1 = getattr(item, attr_prefix + 'exemption_laws', '')
        val1 = getattr(item, attr_prefix + 'exemption_value', 0)
        if law1 and not val1 and not sub_100:
            val1 = full_value
        if law1 and val1:
            claimed_by_law[law1] = claimed_by_law.get(law1, 0) + _safe_float(val1)

        law2 = getattr(item, attr_prefix + 'exemption_laws_2', '')
        val2 = getattr(item, attr_prefix + 'exemption_value_2', 0)
        if law2 and val2:
            claimed_by_law[law2] = claimed_by_law.get(law2, 0) + _safe_float(val2)

    # Real property
    for interest in getattr(prop, 'interests', []):
        _add_exemption(interest)

    # Vehicles
    for vehicle in getattr(prop, 'ab_vehicles', []):
        _add_exemption(vehicle)
    for vehicle in getattr(prop, 'ab_other_vehicles', []):
        _add_exemption(vehicle)

    # Household goods (stored as flat attributes on prop)
    if getattr(prop, 'household_goods_is_claiming_exemption', False):
        law1 = getattr(prop, 'household_goods_exemption_laws', '')
        val1 = getattr(prop, 'household_goods_exemption_value', 0)
        if law1 and not val1 and not getattr(prop, 'household_goods_claiming_sub_100', False):
            val1 = getattr(prop, 'household_goods_value', 0)
        if law1 and val1:
            claimed_by_law[law1] = claimed_by_law.get(law1, 0) + _safe_float(val1)

    if getattr(prop, 'secured_household_goods_is_claiming_exemption', False):
        law1 = getattr(prop, 'secured_household_goods_exemption_laws', '')
        val1 = getattr(prop, 'secured_household_goods_exemption_value', 0)
        if law1 and not val1 and not getattr(prop, 'secured_household_goods_claiming_sub_100', False):
            val1 = getattr(prop, 'secured_household_goods_value', 0)
        if law1 and val1:
            claimed_by_law[law1] = claimed_by_law.get(law1, 0) + _safe_float(val1)

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