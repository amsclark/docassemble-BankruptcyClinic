
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
    // Helper: build choices for the law selects based on current state and property type
  function setSelectOptions(selectElem, options) {
      if (!selectElem) return;
      // Preserve current value if possible
      const previous = selectElem.value;
      // Clear and rebuild
      while (selectElem.options.length) selectElem.remove(0);
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select...';
      selectElem.appendChild(placeholder);
      (options || []).forEach(o => {
        const opt = document.createElement('option');
        opt.value = o;
        opt.textContent = o;
        selectElem.appendChild(opt);
      });
      // Restore selection if still valid
      if (previous && options && options.includes(previous)) {
        selectElem.value = previous;
      }
    }

    function inferPropertyType() {
      const key = String(exemption_laws || '').toLowerCase();
      if (key.includes('.ab_vehicles')) return 'vehicle';
      if (key.includes('.interests[')) return 'real_property';
      return 'all';
    }

    function buildLawIndex(exemptionsObj) {
      const idx = {};
      try {
        Object.keys(exemptionsObj || {}).forEach(k => {
          const e = exemptionsObj[k];
          if (e && e.law) idx[e.law] = e;
        });
      } catch(e) {}
      return idx;
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


    function addOnChangeListener(element, extraHandler) {
      element.addEventListener('change', event => {
        try { if (typeof extraHandler === 'function') extraHandler(); } catch(e) { console.log(e); }
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

    // Resolve the actual state input element from the provided userState variable name
    var stateElement = null;
    if (userState) {
      stateElement = getFormElementByName(getBtoaSearchName(userState))[0];
      if (!stateElement) {
        // Fallback if not found by name
        var inputs = getFormElement(getBtoaSearchString(userState), 'input');
        if (inputs && inputs.length) stateElement = inputs[0];
      }
    }
    // Last-resort: find by label caption "State"
    if (!stateElement) {
      try {
        var labels = document.querySelectorAll('label');
        for (var i = 0; i < labels.length; i++) {
          var txt = (labels[i].textContent || '').trim().toLowerCase();
          if (txt === 'state' || txt === 'state*' || txt.startsWith('state')) {
            var forId = labels[i].getAttribute('for');
            if (forId) {
              var candidate = document.getElementById(forId);
              if (candidate) { stateElement = candidate; break; }
            }
            // try next sibling input/select
            var next = labels[i].nextElementSibling;
            while (next && !(next.tagName === 'INPUT' || next.tagName === 'SELECT' || next.tagName === 'TEXTAREA')) {
              next = next.nextElementSibling;
            }
            if (next) { stateElement = next; break; }
          }
        }
      } catch(e) { console.log(e); }
    }

    function refreshExemptionContext() {
  var stateVal = stateElement ? stateElement.value : null;
  // Set the currentExemptions map used by validations, keyed by law string
  currentExemptions = buildLawIndex(getCurrentExemptions(stateVal));
      // Populate the law selects with the correct choices for this property type
      var propertyType = inferPropertyType();
      var choices = window.getExemptionChoicesForState(stateVal, propertyType);
      function updateAll(nameExpr, fallbackElem) {
        var updated = 0;
        try {
          var byName = getFormElementByName(getBtoaSearchName(nameExpr));
          if (byName && byName.length) {
            for (var i = 0; i < byName.length; i++) {
              if (byName[i].tagName === 'SELECT') { setSelectOptions(byName[i], choices); updated++; }
            }
          }
        } catch(e) {}
        try {
          var byData = getFormElement(getBtoaSearchString(nameExpr), "select");
          if (byData && byData.length) {
            for (var j = 0; j < byData.length; j++) { setSelectOptions(byData[j], choices); updated++; }
          }
        } catch(e) {}
        if (!updated && fallbackElem) setSelectOptions(fallbackElem, choices);
      }
      updateAll(exemption_laws, law1Element);
      updateAll(exemption_laws_2, law2Element);
    }

  // Apply change listener to every element
  addOnChangeListener(isClaimingExemptionElement, refreshExemptionContext);
  addOnChangeListener(isNotClaimingExemptionElement, refreshExemptionContext);
    addOnChangeListener(isCustomExemptionElement);
    addOnChangeListener(isNotCustomExemptionElement);
    addOnChangeListener(currentValueElement);
    addOnChangeListener(value1Element);
    addOnChangeListener(law1Element);
    addOnChangeListener(value2Element);
    addOnChangeListener(law2Element);
    if (stateElement) {
      addOnChangeListener(stateElement, refreshExemptionContext);
      try { stateElement.addEventListener('input', refreshExemptionContext); } catch(e) { console.log(e); }
    }

    // Observe DOM changes to law selects and refresh when they appear/re-render
    try {
      const mo = new MutationObserver(() => {
        try { refreshExemptionContext(); } catch(e) { console.log(e); }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch(e) { console.log(e); }

    // Initial populate/refresh using the current state value (and a slight delay for safety)
    try {
      refreshExemptionContext();
      setTimeout(refreshExemptionContext, 250);
      setTimeout(refreshExemptionContext, 750);
    } catch (e) {
      console.log('Failed to refresh exemption context:', e);
    }

  }
