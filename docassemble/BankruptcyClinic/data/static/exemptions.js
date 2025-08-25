
// Nebraska exemptions (example, fill in as needed)
const nebraskaExemptions = {
  homestead: { law: 'Homestead (Neb. Rev. Stat. § 40-101)', limit: 60000, amount: 0 },
  homestead_proceeds: { law: 'Homestead, proceeds of sale (Neb. Rev. Stat. § 40-116)', limit: 60000, amount: 0 },
  wildcard: { law: 'Wildcard (Neb. Rev. Stat. § 25-1552(1)(c))', limit: 2500, amount: 0 },
  motor_vehicle: { law: 'Motor vehicle (Neb. Rev. Stat. § 25-1556(1)(e))', limit: 2400, amount: 0 },
  unknown: { law: 'Unknown law', limit: 0, amount: 0 }
};

// South Dakota exemptions
const southDakotaExemptions = {
  homestead: { law: 'Homestead (SDCL 43-31-1 – 43-31-6)', limit: 120000, amount: 0 },
  homestead_proceeds: { law: 'Homestead, proceeds of sale (SDCL 43-31-4)', limit: 60000, amount: 0 }, // Note: 170000 for 70 and older
  household_goods: { law: 'Furniture and bedding (SDCL 43-45-5(5))', limit: 200, amount: 0 },
  wildcard: { law: 'Wildcard (SDCL 43-5-4)', limit: 2000, amount: 0 }, // 2000 not head of household, 5000 head of household, 7000 total max
  personal_property: { law: 'Bible, books, family pictures, burial plots, all wearing apparel, church pew, food & fuel to last one year, and clothing (SDCL 43-45-2)', limit: 0, amount: 0 },
  domestic_support: { law: 'alimony, maintenance, or support of the debtor (SDCL 43-45-2)', limit: 0, amount: 0 },
  health_aids: { law: 'Health Aids (SDCL 43-45-2)', limit: 0, amount: 0 },
  city_employee_pensions: { law: 'city employee pensions (SDCL 9-16-47)', limit: 0, amount: 0 },
  public_employee_pensions: { law: 'public employee pensions (SDCL 3-12-115)', limit: 0, amount: 0 },
  retirement: { law: 'retirement (SDCL 43-45-26)', limit: 1000000, amount: 0 },
  public_assistance: { law: 'public assistance (SDCL 28-7-16)', limit: 0, amount: 0 },
  wages: { law: 'Wages (SDCL 15-20-12)', limit: 0, amount: 0 },
  life_insurance: { law: 'Life insurance proceeds (SDCL 58-12-4. 43-45-6)', limit: 10000, amount: 0 },
  workers_comp: { law: 'Workers Compensation (SDCL 62-4-42)', limit: 0, amount: 0 },
  unemployment: { law: 'Unemployment (SDCL 61-6-28)', limit: 0, amount: 0 },
  student_loan: { law: 'Student Loan (20 U.S.C. § 1095a(d))', limit: 0, amount: 0 },
  social_security: { law: 'Social Security (42 U.S.C. § 407)', limit: 0, amount: 0 },
  va: { law: 'VA Benefits (38 U.S.C. § 5301(a))', limit: 0, amount: 0 },
  unknown: { law: 'Unknown law', limit: 0, amount: 0 }
};

// Helper to select the correct exemption set
function getCurrentExemptions(userState) {
  if (userState && userState.toLowerCase().includes('south dakota')) {
    return southDakotaExemptions;
  }
  // Default to Nebraska
  return nebraskaExemptions;
}

// Helper to get exemption law names for real property (homestead, wildcard, etc.)
function getRealPropertyExemptionLaws(userState) {
  const exemptions = getCurrentExemptions(userState);
  const realPropertyLaws = [];
  
  if (userState && userState.toLowerCase().includes('south dakota')) {
    // South Dakota real property exemptions
    realPropertyLaws.push(exemptions.homestead.law);
    realPropertyLaws.push(exemptions.homestead_proceeds.law);
    realPropertyLaws.push(exemptions.wildcard.law);
    realPropertyLaws.push(exemptions.unknown.law);
  } else {
    // Nebraska real property exemptions
    realPropertyLaws.push(exemptions.homestead.law);
    realPropertyLaws.push(exemptions.homestead_proceeds.law);
    realPropertyLaws.push(exemptions.wildcard.law);
    realPropertyLaws.push(exemptions.unknown.law);
  }
  
  return realPropertyLaws;
}

// Helper to get exemption law names for vehicles
function getVehicleExemptionLaws(userState) {
  const exemptions = getCurrentExemptions(userState);
  const vehicleLaws = [];
  
  if (userState && userState.toLowerCase().includes('south dakota')) {
    // South Dakota vehicle exemptions
    vehicleLaws.push(exemptions.wildcard.law);
    vehicleLaws.push(exemptions.unknown.law);
  } else {
    // Nebraska vehicle exemptions
    vehicleLaws.push(exemptions.motor_vehicle.law);
    vehicleLaws.push(exemptions.wildcard.law);
    vehicleLaws.push(exemptions.unknown.law);
  }
  
  return vehicleLaws;
}

// Helper to get all exemption law names
function getAllExemptionLaws(userState) {
  const exemptions = getCurrentExemptions(userState);
  const allLaws = [];
  
  for (const key in exemptions) {
    if (exemptions.hasOwnProperty(key)) {
      allLaws.push(exemptions[key].law);
    }
  }
  
  return allLaws;
}

// Global function that can be called from Docassemble to populate dropdown choices
window.getExemptionChoicesForState = function(userState, propertyType) {
  propertyType = propertyType || 'all';
  
  switch(propertyType.toLowerCase()) {
    case 'real_property':
    case 'homestead':
      return getRealPropertyExemptionLaws(userState);
    case 'vehicle':
    case 'motor_vehicle':
      return getVehicleExemptionLaws(userState);
    case 'all':
    default:
      return getAllExemptionLaws(userState);
  }
};

// Main function, now expects userState as an extra argument
function checkQuestionExemptions(currentExemptions, is_claiming_exemption, claiming_sub_100,
    current_owned_value, exemption_value, exemption_laws, exemption_value_2,
    exemption_laws_2, userState) {
    if (userState) {
      currentExemptions = getCurrentExemptions(userState);
    }

  function runExemptionCheck() {
      console.log("running exemption check");
      var isClaimingExemption = isClaimingExemptionElement.checked;
      var isCustomExemption = isCustomExemptionElement.checked;
      var currentValue = currentValueElement.value;
      var value1 = value1Element.value;
      var law1 = law1Element.value;
      var value2 = value2Element.value;
      var law2 = law2Element.value;
      console.log("current values", isClaimingExemption, isCustomExemption, currentValue, value1, law1, value2, law2);

      currentValueElement.setCustomValidity("");
      value1Element.setCustomValidity("");
      law1Element.setCustomValidity("");
      value2Element.setCustomValidity("");
      law2Element.setCustomValidity("");
      flash(null, null, true);


      // If not claiming exemptions skip check
      if (!isClaimingExemption) {return;}

      if (!isCustomExemption && law1Element.value && currentExemptions[law1]) {
        if (parseFloat(currentValue) > currentExemptions[law1].limit && currentExemptions[law1].limit !== 0) {
          console.log('ERROR OVER LIMIT');
          flash(currentValue + " is over " + law1 + " limit.", "danger");
          law1Element.setCustomValidity("Invalid");
          currentValueElement.setCustomValidity("Invalid");
        }
      }

      if (currentExemptions[law1] && currentExemptions[law1].limit !== 0 && (parseFloat(value1) + currentExemptions[law1].amount) > currentExemptions[law1].limit) {
        console.log('ERROR VALUE 1 TOO HIGH');
        flash(value1 + " would exceed limit of " + law1 + ".", "danger");
        value1Element.setCustomValidity("Invalid");
        law1Element.setCustomValidity("Invalid");
      }

      if (currentExemptions[law2] && currentExemptions[law2].limit !== 0 && (parseFloat(value2) + currentExemptions[law2].amount) > currentExemptions[law2].limit) {
        console.log('ERROR VALUE 2 TOO HIGH');
        flash(value2 + " would exceed limit of " + law2 + ".", "danger");
        value2Element.setCustomValidity("Invalid");
        law2Element.setCustomValidity("Invalid");
      }

    }

    function getBtoaSearchString(full_name) {
      var btoaVal = btoa(full_name);
      if (btoaVal.slice(-1) == "=") {
          btoaVal = btoaVal.substr(0, btoaVal.length - 1);
      }
      if (btoaVal.slice(-1) == "=") {
          btoaVal = btoaVal.substr(0, btoaVal.length - 1);
      }
      return "[data-saveas='" + btoaVal + "']";
    }

    function getBtoaSearchName(full_name) {
      var btoaVal = btoa(full_name);
      if (btoaVal.slice(-1) == "=") {
          btoaVal = btoaVal.substr(0, btoaVal.length - 1);
      }
      if (btoaVal.slice(-1) == "=") {
          btoaVal = btoaVal.substr(0, btoaVal.length - 1);
      }
      return btoaVal;
    }

    function getFormElement(searchString, type) {
      return document.querySelectorAll(searchString)[0]
          .getElementsByTagName(type);
    }

    function getFormElementByName(searchString) {
      return document.getElementsByName(searchString);
    }


    function addOnChangeListener(element) {
      element.addEventListener('change', event => {
        runExemptionCheck();
      });
    }

    // Get exemption elements
    var isClaimingExemptionElement = getFormElementByName(getBtoaSearchName(is_claiming_exemption))[0];
    var isNotClaimingExemptionElement = getFormElementByName(getBtoaSearchName(is_claiming_exemption))[1];
    var isCustomExemptionElement = getFormElement(getBtoaSearchString(claiming_sub_100), "input")[0];
    var isNotCustomExemptionElement = getFormElement(getBtoaSearchString(claiming_sub_100), "input")[1];
    var currentValueElement = getFormElementByName(getBtoaSearchName(current_owned_value))[0];
    if (!currentValueElement) {
        var currentValueElement = getFormElement(getBtoaSearchString(current_owned_value), "input")[0];
    }
    var value1Element = getFormElement(getBtoaSearchString(exemption_value), "input")[0];
    var law1Element = getFormElement(getBtoaSearchString(exemption_laws), "select")[0];
    var value2Element = getFormElement(getBtoaSearchString(exemption_value_2), "input")[0];
    var law2Element = getFormElement(getBtoaSearchString(exemption_laws_2), "select")[0];

    // Apply change listener to every element
    addOnChangeListener(isClaimingExemptionElement);
    addOnChangeListener(isNotClaimingExemptionElement);
    addOnChangeListener(isCustomExemptionElement);
    addOnChangeListener(isNotCustomExemptionElement);
    addOnChangeListener(currentValueElement);
    addOnChangeListener(value1Element);
    addOnChangeListener(law1Element);
    addOnChangeListener(value2Element);
    addOnChangeListener(law2Element);

  }
