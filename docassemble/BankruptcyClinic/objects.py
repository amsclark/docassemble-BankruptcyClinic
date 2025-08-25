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
    except:
        state_str = ''
    
    # South Dakota exemptions
    south_dakota_exemptions = {
        'homestead': 'Homestead (SDCL 43-31-1 – 43-31-6)',
        'homestead_proceeds': 'Homestead, proceeds of sale (SDCL 43-31-4)',
        'household_goods': 'Furniture and bedding (SDCL 43-45-5(5))',
        'wildcard': 'Wildcard (SDCL 43-5-4)',
        'personal_property': 'Bible, books, family pictures, burial plots, all wearing apparel, church pew, food & fuel to last one year, and clothing (SDCL 43-45-2)',
        'domestic_support': 'alimony, maintenance, or support of the debtor (SDCL 43-45-2)',
        'health_aids': 'Health Aids (SDCL 43-45-2)',
        'city_employee_pensions': 'city employee pensions (SDCL 9-16-47)',
        'public_employee_pensions': 'public employee pensions (SDCL 3-12-115)',
        'retirement': 'retirement (SDCL 43-45-26)',
        'public_assistance': 'public assistance (SDCL 28-7-16)',
        'wages': 'Wages (SDCL 15-20-12)',
        'life_insurance': 'Life insurance proceeds (SDCL 58-12-4. 43-45-6)',
        'workers_comp': 'Workers Compensation (SDCL 62-4-42)',
        'unemployment': 'Unemployment (SDCL 61-6-28)',
        'student_loan': 'Student Loan (20 U.S.C. § 1095a(d))',
        'social_security': 'Social Security (42 U.S.C. § 407)',
        'va': 'VA Benefits (38 U.S.C. § 5301(a))',
        'unknown': 'Unknown law'
    }
    
    # Nebraska exemptions
    nebraska_exemptions = {
        'homestead': 'Homestead (Neb. Rev. Stat. §§ 40-101 - 40-118)',
        'homestead_proceeds': 'Homestead, proceeds of sale (Neb. Rev. Stat. § 40-116)',
        'wildcard': 'Wildcard (Neb. Rev. Stat. § 25-1552(1)(c))',
        'motor_vehicle': 'Motor vehicle (Neb. Rev. Stat. § 25-1556(1)(e))',
        'unknown': 'Unknown law'
    }
    
    # Determine which exemption set to use
    if 'south dakota' in state_str:
        exemptions = south_dakota_exemptions
    else:
        exemptions = nebraska_exemptions
    
    # Filter based on property type
    if property_type == 'real_property':
        if 'south dakota' in state_str:
            choices = [
                exemptions['homestead'],
                exemptions['homestead_proceeds'],
                exemptions['wildcard'],
                exemptions['unknown']
            ]
        else:
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
        # Return all exemptions
        choices = list(exemptions.values())
    
    return choices

class Debtor(Individual):
  aliases = []
  def init(self, *pargs, **kwargs):
    self.initializeAttribute('tax_id', DebtorTaxId)
    self.initializeAttribute('district_info', DebtorDistrictInfo)
    super().init(*pargs, **kwargs)

class DebtorAlias(Individual):
  business = None
  
class DebtorTaxId(DAObject):
  def init(self, *pargs, **kwargs):
    super().init(*pargs, **kwargs)
  
class DebtorDistrictInfo(DAObject):
  def init(self, *pargs, **kwargs):
    super().init(*pargs, **kwargs)