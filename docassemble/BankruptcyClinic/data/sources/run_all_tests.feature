 Feature: I am preparing a bankruptcy petition

Scenario: Minimal single filer
  Given I start the interview at "voluntary-petition.yml"
  And the user gets to "filing_status" with this data:
    | var | value | trigger |
    | introduction_screen | True |  |
    | chapter | Chapter 7 |  |
    | amended_filing | False |  |
    | current_district | District of Nebraska |  |
    | district_final | True |  |
    | filing_status | Filing individually |  |

