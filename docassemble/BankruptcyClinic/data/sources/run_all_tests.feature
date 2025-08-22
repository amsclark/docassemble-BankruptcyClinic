 Feature: I am preparing a bankruptcy petition

Scenario: Minimal single filer
  Given I start the interview at "voluntary-petition.yml"
  And the user gets to "chapter" with this data:
    | var | value | trigger |
    | introduction_screen | True |  |

