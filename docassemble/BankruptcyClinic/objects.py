from docassemble.base.util import DAObject, Individual

# State-specific exemption laws
def get_exemption_choices(user_state, property_type='all'):
    """
    Returns a list of exemption law choices based on the user's state and property type.
    
    Args:
        user_state (str): The user's state (e.g., "Nebraska", "South Dakota")
        property_type (str): Type of property - 'real_property', 'vehicle', or 'all'
    
    Returns:
        list: List of exemption law strings
    """
    
    # Handle case where user_state might be None or undefined
    try:
        state_str = str(user_state).lower() if user_state else ''
    except Exception:
        state_str = ''

    # South Dakota exemptions
    south_dakota_exemptions = {
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
        'unknown': 'Unknown law'
    }
    
    # Nebraska exemptions  
    nebraska_exemptions = {
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
        'wildcard': 'Wildcard (Neb. Rev. Stat. § 25-1552(1)(c))',
        'unknown': 'Unknown law'
    }
    # Determine which exemption set to use
    if 'south dakota' in state_str:
        exemptions = south_dakota_exemptions
    else:
        exemptions = nebraska_exemptions
    
    # Filter based on property type
    if property_type == 'real_property':
        choices = [
            exemptions['homestead'],
            exemptions['homestead_proceeds'],
            exemptions['wildcard'],
            exemptions['unknown']
        ]
    elif property_type == 'vehicle':
        if 'south dakota' in state_str:
            choices = [
                exemptions['wildcard'],
                exemptions['unknown']
            ]
        else:
            choices = [
                exemptions['motor_vehicle'],
                exemptions['wildcard'],
                exemptions['unknown']
            ]
    else:
        # Return all exemptions for general property
        choices = list(exemptions.values())
    
    return choices

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
        return {
            'homestead': 120000,
            'homestead_proceeds': 60000,
            'motor_vehicle': 5000,
            'household_goods': 3000,
            'wildcard': 5000,
            'clothing': 0,            # Unlimited
            'personal_possessions': 0, # Unlimited
            'health_aids': 0,         # Unlimited
            'health_savings': 25000,
            'tools': 5000,
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


def compute_exemption_totals(prop, debtor_state):
    """
    Compute running exemption totals from all property items.

    Args:
        prop: The prop DAObject containing interests, vehicles, etc.
        debtor_state (str): The debtor's state for looking up limits.

    Returns:
        dict: {law_string: {'claimed': total_claimed, 'limit': limit_value, 'remaining': remaining}}
    """
    limits = get_exemption_limits(debtor_state)
    law_choices = get_exemption_choices(debtor_state, 'all')

    # Map law strings to category keys for limit lookups
    law_to_category = {}
    if 'south dakota' in str(debtor_state).lower():
        sd_exemptions = {
            'homestead': 'Homestead (SDCL 43-31-1',
            'homestead_proceeds': 'Homestead, proceeds',
            'household_goods': 'Furniture and bedding',
            'wildcard': 'Wildcard',
            'personal_property': 'Bible, books',
            'health_aids': 'Health aids',
            'tools': 'Tools of the trade',
            'retirement': 'Retirement',
            'wages': 'Wages',
            'life_insurance': 'Life insurance',
            'workers_comp': 'Workers compensation',
            'unemployment': 'Unemployment',
            'social_security': 'Social Security',
            'va': 'VA Benefits',
        }
        for cat, prefix in sd_exemptions.items():
            for law_str in law_choices:
                if law_str.startswith(prefix):
                    law_to_category[law_str] = cat
                    break
    else:
        ne_exemptions = {
            'homestead': 'Homestead (Neb. Rev. Stat. §§ 40-101',
            'homestead_proceeds': 'Homestead, proceeds',
            'motor_vehicle': 'Motor vehicle',
            'household_goods': 'Household goods',
            'wildcard': 'Wildcard',
            'clothing': 'Clothing',
            'personal_possessions': 'Immediate personal possessions',
            'health_aids': 'Health aids',
            'health_savings': 'Health savings',
            'tools': 'Tools of the trade',
            'retirement': 'Retirement',
            'wages': 'Wages',
            'public_benefits': 'Public benefits',
            'earned_income': 'Earned Income',
            'life_insurance': 'Life insurance',
            'structured_settlement': 'Structured settlement',
            'workers_comp': 'Workers compensation',
            'unemployment': 'Unemployment',
            'college_savings': 'College Savings',
            'social_security': 'Social Security',
            'va': 'VA Benefits',
        }
        for cat, prefix in ne_exemptions.items():
            for law_str in law_choices:
                if law_str.startswith(prefix):
                    law_to_category[law_str] = cat
                    break

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
        law1 = getattr(item, attr_prefix + 'exemption_laws', '')
        val1 = getattr(item, attr_prefix + 'exemption_value', 0)
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
        if law1 and val1:
            claimed_by_law[law1] = claimed_by_law.get(law1, 0) + _safe_float(val1)

    if getattr(prop, 'secured_household_goods_is_claiming_exemption', False):
        law1 = getattr(prop, 'secured_household_goods_exemption_laws', '')
        val1 = getattr(prop, 'secured_household_goods_exemption_value', 0)
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