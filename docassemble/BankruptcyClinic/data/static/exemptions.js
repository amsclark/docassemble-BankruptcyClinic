
// Nebraska exemptions — MUST stay in sync with objects.py get_exemption_limits().
// These are a client-side copy used only for the live per-screen tracker/warning;
// the authoritative caps (and joint-case stacking) live in objects.py. When you
// change a dollar limit there (e.g. the § 25-1556 CPI adjustment), change it here
// too. Update from: https://www.justice.gov/ust/means-testing
const nebraskaExemptions = {
  homestead: { law: 'Homestead (Neb. Rev. Stat. §§ 40-101 - 40-118)', limit: 120000, amount: 0 },
  homestead_proceeds: { law: 'Homestead, proceeds of sale (Neb. Rev. Stat. § 40-116)', limit: 60000, amount: 0 },
  motor_vehicle: { law: 'Motor vehicle (Neb. Rev. Stat. § 25-1556(1)(e))', limit: 5970, amount: 0 },
  household_goods: { law: 'Household goods (Neb. Rev. Stat. § 25-1556(1)(c))', limit: 3582, amount: 0 },
  tools: { law: 'Tools of the trade (Neb. Rev. Stat. § 25-1556(1)(d))', limit: 5970, amount: 0 },
  health_savings: { law: 'Health savings (Neb. Rev. Stat. § 8-1,131(2)(b))', limit: 25000, amount: 0 },
  // § 44-371 covers annuity contract benefits as well as life insurance
  // proceeds (Roxanne Alhejaj, Legal Aid of NE, June 2026). Law string must
  // match objects.py NEBRASKA_EXEMPTIONS exactly — the tracker keys on it.
  life_insurance: { law: 'Life insurance and annuity contracts (Neb. Rev. Stat. § 44-371)', limit: 100000, amount: 0 },
  wildcard: { law: 'Wildcard (Neb. Rev. Stat. § 25-1552)', limit: 5970, amount: 0 },
  clothing: { law: 'Clothing (Neb. Rev. Stat. § 25-1556(1)(b))', limit: 0, amount: 0 },
  personal_possessions: { law: 'Immediate personal possessions (Neb. Rev. Stat. § 25-1556(1)(a))', limit: 0, amount: 0 },
  health_aids: { law: 'Health aids (Neb. Rev. Stat. § 25-1556(1)(f))', limit: 0, amount: 0 },
  retirement: { law: 'Retirement accounts (Neb. Rev. Stat. § 25-1563.01)', limit: 0, amount: 0 },
  wages: { law: 'Wages (Neb. Rev. Stat. § 25-1558)', limit: 0, amount: 0 },
  public_benefits: { law: 'Public benefits (Neb. Rev. Stat. § 68-148)', limit: 0, amount: 0 },
  earned_income: { law: 'Earned Income Tax Credit (Neb Rev Stat 25-1553)', limit: 0, amount: 0 },
  structured_settlement: { law: 'Structured settlement (Neb. Rev. Stat. § 25-1563.02)', limit: 0, amount: 0 },
  workers_comp: { law: 'Workers compensation (Neb. Rev. Stat. § 48-149)', limit: 0, amount: 0 },
  unemployment: { law: 'Unemployment (Neb. Rev. Stat. § 48-647)', limit: 0, amount: 0 },
  college_savings: { law: 'College Savings Plan (Neb. Rev. Stat. § 85-1809)', limit: 0, amount: 0 },
  student_loan: { law: 'Student loan (20 U.S.C. § 1095a(d))', limit: 0, amount: 0 },
  social_security: { law: 'Social Security (42 U.S.C. § 407)', limit: 0, amount: 0 },
  va: { law: 'VA Benefits (38 U.S.C. § 5301(a))', limit: 0, amount: 0 },
  unknown: { law: 'Unknown law', limit: 0, amount: 0 }
};

// South Dakota exemptions — synced with objects.py get_exemption_limits()
const southDakotaExemptions = {
  homestead: { law: 'Homestead (SDCL 43-31-1 – 43-31-6)', limit: 0, amount: 0 }, // Unlimited
  homestead_proceeds: { law: 'Homestead, proceeds of sale (SDCL 43-31-4)', limit: 0, amount: 0 }, // Unlimited
  // No household_goods entry: SDCL 43-45-5(5) (furniture and bedding) is
  // repealed and is not a valid South Dakota exemption (William Franck, ERLS,
  // Aug 2026). Removed from objects.py in PR #157; this table must match.
  wildcard: { law: 'Wildcard (SDCL 43-45-4)', limit: 5000, amount: 0 }, // SDCL 43-45-4 floor: $5,000 single / $7,000 head of family (the head-of-family bump is applied server-side in objects.py)
  personal_property: { law: 'Bible, books, family pictures, burial plots, all wearing apparel, church pew, food & fuel to last one year, and clothing (SDCL 43-45-2)', limit: 0, amount: 0 },
  domestic_support: { law: 'alimony, maintenance, or support of the debtor (SDCL 43-45-2)', limit: 0, amount: 0 },
  health_aids: { law: 'Health Aids (SDCL 43-45-2)', limit: 0, amount: 0 },
  city_employee_pensions: { law: 'city employee pensions (SDCL 9-16-47)', limit: 0, amount: 0 },
  public_employee_pensions: { law: 'public employee pensions (SDCL 3-12-115)', limit: 0, amount: 0 },
  retirement: { law: 'retirement (SDCL 43-45-16)', limit: 1000000, amount: 0 }, // $1M cap on employee benefit plans (William Franck, ERLS, June 2026)
  public_assistance: { law: 'public assistance (SDCL 28-7-16)', limit: 0, amount: 0 },
  wages: { law: 'Wages (SDCL 15-20-12)', limit: 0, amount: 0 },
  life_insurance: { law: 'Life insurance proceeds (SDCL 58-12-4, 43-45-6)', limit: 20000, amount: 0 }, // SDCL 58-12-4 beneficiary proceeds, $20,000 (William Franck, ERLS, June 2026)
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

// Helper to get exemption law names for annuities — NE § 44-371 (shared
// life-insurance/annuity cap) plus retirement for qualified retirement
// annuities. Mirror of CATEGORY_KEYS['annuity'] in objects.py.
function getAnnuityExemptionLaws(userState) {
  const exemptions = getCurrentExemptions(userState);
  const laws = [];
  if (exemptions.life_insurance) laws.push(exemptions.life_insurance.law);
  if (exemptions.retirement) laws.push(exemptions.retirement.law);
  laws.push(exemptions.wildcard.law);
  laws.push(exemptions.unknown.law);
  return laws;
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
    case 'annuity':
      return getAnnuityExemptionLaws(userState);
    case 'all':
    default:
      return getAllExemptionLaws(userState);
  }
};

// Main entry point, called from a `script:` block on every question that
// collects an exemption claim.
//
// The parameter list used to begin with a `currentExemptions` argument that no
// call site ever passed, so every argument landed one position to the left and
// `userState` was always undefined. The value was overwritten by
// refreshExemptionContext() before first use anyway, so it is now a local and
// the signature matches what the YAML actually calls with.
//
// `userState` is either the NAME of a state field present on this page (the
// value is then read live from that element) or a literal state string
// rendered server-side, e.g. "${ exemption_filing_state }". Pages that collect
// personal property have no state field of their own, so they pass the literal.
function checkQuestionExemptions(is_claiming_exemption, claiming_sub_100,
    current_owned_value, exemption_value, exemption_laws, exemption_value_2,
    exemption_laws_2, userState) {
    // Law-string -> {limit, amount} index for the filing state. Populated by
    // refreshExemptionContext() below, before any read.
    var currentExemptions = {};
    // Helper: build choices for the law selects based on current state and property type
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

  // Every element read here is optional. Most pages omit the second exemption
  // row, and `claiming_sub_100` is computed server-side (claiming_less_than_full)
  // so it has no element at all. Read defensively: a missing field degrades to
  // "no warning" rather than throwing out of the change handler and leaving the
  // rest of the checks dead.
  function elemValue(el) { return el ? el.value : ""; }
  function elemChecked(el) { return el ? el.checked : false; }
  function clearValidity(el) { if (el && el.setCustomValidity) el.setCustomValidity(""); }

  function runExemptionCheck() {
      console.log("running exemption check");
      var isClaimingExemption = elemChecked(isClaimingExemptionElement);
      var isCustomExemption = elemChecked(isCustomExemptionElement);
      var currentValue = elemValue(currentValueElement);
      var value1 = elemValue(value1Element);
      var law1 = elemValue(law1Element);
      var value2 = elemValue(value2Element);
      var law2 = elemValue(law2Element);
      console.log("current values", isClaimingExemption, isCustomExemption, currentValue, value1, law1, value2, law2);

      clearValidity(currentValueElement);
      clearValidity(value1Element);
      clearValidity(law1Element);
      clearValidity(value2Element);
      clearValidity(law2Element);
      flash(null, null, true);


      // If not claiming exemptions skip check
  if (!isClaimingExemption) {return;}

      // NOTE: these caps are per single debtor and do NOT account for joint-case
      // stacking (each spouse gets a separate set under 11 U.S.C. § 522(m)).
      // They are therefore shown as a non-blocking WARNING only — previously they
      // hard-blocked via setCustomValidity, which stopped legitimate joint claims
      // (e.g. $5,970 per vehicle) cold (Phil/Roxanne, May 2026). The authoritative,
      // joint-aware over-cap check lives in the server-side Schedule C summary.
      function overCapNote(law) {
        return "Heads up: this may exceed the per-debtor " + law +
               " cap. If you're filing jointly each spouse has a separate cap — " +
               "the Exemption Summary will confirm the totals.";
      }

  if (!isCustomExemption && law1 && currentExemptions[law1]) {
        if (parseFloat(currentValue) > currentExemptions[law1].limit && currentExemptions[law1].limit !== 0) {
          flash(overCapNote(law1), "warning");
        }
      }

      if (currentExemptions[law1] && currentExemptions[law1].limit !== 0 && (parseFloat(value1) + currentExemptions[law1].amount) > currentExemptions[law1].limit) {
        flash(overCapNote(law1), "warning");
      }

      if (currentExemptions[law2] && currentExemptions[law2].limit !== 0 && (parseFloat(value2) + currentExemptions[law2].amount) > currentExemptions[law2].limit) {
        flash(overCapNote(law2), "warning");
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

    // Returns an empty list rather than throwing when the field is absent from
    // this page. Some arguments name variables that are computed server-side
    // (e.g. `*_claiming_sub_100` via claiming_less_than_full) and so have no
    // element at all; a throw here would abort the whole setup below.
    function getFormElement(searchString, type) {
      var container = document.querySelectorAll(searchString)[0];
      if (!container) return [];
      return container.getElementsByTagName(type);
    }

    function getFormElementByName(searchString) {
      return document.getElementsByName(searchString);
    }


    function addOnChangeListener(element, extraHandler) {
      if (!element) return;
      element.addEventListener('change', event => {
        try { if (typeof extraHandler === 'function') extraHandler(); } catch(e) { console.log(e); }
        runExemptionCheck();
      });
    }

    // Get exemption elements.
    //
    // Two different markups have to be supported. On the list-collect pages
    // (prop.interests[i].*) docassemble names the input after the variable, so
    // getElementsByName finds it. On the personal-property pages the exemption
    // fields are `show if`-gated, which makes docassemble emit a generic
    // `_field_N` name and record the real variable only as `data-saveas` on the
    // surrounding container -- getElementsByName returns nothing there. Look up
    // by name first, then fall back to the container, the way the value and law
    // fields below already do. Without the fallback the claiming-exemption
    // radio reads as "not claiming" on those 44 pages and every cap check
    // silently short-circuits.
    var claimingElements = getFormElementByName(getBtoaSearchName(is_claiming_exemption));
    if (!claimingElements || !claimingElements.length) {
      claimingElements = getFormElement(getBtoaSearchString(is_claiming_exemption), "input");
    }
    var isClaimingExemptionElement = claimingElements[0];
    var isNotClaimingExemptionElement = claimingElements[1];
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

    // Resolve the state. `userState` is either the name of a state field on
    // this page or a literal state string rendered server-side; try the
    // element first and fall back to treating the argument as the value.
    var stateElement = null;
    var stateLiteral = null;
    if (userState) {
      stateElement = getFormElementByName(getBtoaSearchName(userState))[0];
      if (!stateElement) {
        // Fallback if not found by name
        var inputs = getFormElement(getBtoaSearchString(userState), 'input');
        if (inputs && inputs.length) stateElement = inputs[0];
      }
      if (!stateElement) stateLiteral = userState;
    }
    // Last-resort: find by label caption "State". Skipped when the state
    // arrived as a literal - on a personal-property page the only "State"
    // label belongs to an unrelated address, and guessing wrong silently
    // applies another state's exemption caps.
    if (!stateLiteral && !stateElement) {
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
  var stateVal = stateElement ? stateElement.value : stateLiteral;
  // Set the currentExemptions map used by validations, keyed by law string
  currentExemptions = buildLawIndex(getCurrentExemptions(stateVal));
  // Merge in running totals from the exemption tracker if available on this page
  // (computed server-side by compute_exemption_totals in objects.py)
  try {
    var trackerEl = document.getElementById('exemption-tracker-data');
    if (trackerEl) {
      var totals = JSON.parse(trackerEl.textContent || '{}');
      for (var lawStr in totals) {
        if (currentExemptions[lawStr]) {
          currentExemptions[lawStr].amount = totals[lawStr].claimed || 0;
        }
      }
    }
  } catch(e) { console.log('Could not read exemption tracker data:', e); }
      // NOTE: the law selects are deliberately NOT repopulated here. They are
      // rendered server-side from
      // get_exemption_choices_or_combined(exemption_filing_state, '<category>'),
      // which is category-specific; this file only distinguishes vehicle /
      // real_property / annuity and would otherwise overwrite a correct
      // two-entry list with the entire state table.
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

    // A body-wide MutationObserver used to live here to re-populate the law
    // selects after a re-render. Now that the selects are left to the server,
    // the context depends only on the state field, which has its own listener,
    // so the observer would just rebuild the same index on every DOM change.

    // Initial populate/refresh using the current state value (and a slight delay for safety)
    try {
      refreshExemptionContext();
      setTimeout(refreshExemptionContext, 250);
      setTimeout(refreshExemptionContext, 750);
    } catch (e) {
      console.log('Failed to refresh exemption context:', e);
    }

  }
