function checkQuestionExemptions(currentExemptions, is_claiming_exemption, claiming_sub_100,
    current_owned_value, exemption_value, exemption_laws, exemption_value_2,
    exemption_laws_2) {

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

      if (!isCustomExemption && law1Element.value) {
        if (currentValue > currentExemptions[law1].limit) {
          console.log('ERROR OVER LIMIT');
          flash(currentValue + " is over " + law1 + " limit.", "danger");
          law1Element.setCustomValidity("Invalid");
          currentValueElement.setCustomValidity("Invalid");
        }
      }

      if ((value1 + currentExemptions[law1].amount) > currentExemptions[law1].limit) {
        console.log('ERROR VALUE 1 TOO HIGH');
        flash(value1 + " would exceed limit of " + law1 + ".", "danger");
        value1Element.setCustomValidity("Invalid");
        law1Element.setCustomValidity("Invalid");
      }

      if ((value2 + currentExemptions[law2].amount) > currentExemptions[law2].limit) {
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
