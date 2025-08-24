Feature: I am preparing a bankruptcy petition

Scenario: The interview loads
  Given I start the interview at "voluntary-petition.yml"

### Minimalist scenario: as much as possible skipped
Scenario: Minimalist single filer
  Given I start the interview at "voluntary-petition.yml"
  And I get to the question id "debtor_final" with this data:
    | var | value |
    | introduction_screen | True |
    | current_district | District of Nebraska |
    | amended_filing | False |
    | district_final | True |
    | filing_status | Filing individually |
    | debtor[1].name.first | Alexander |
    | debtor[1].name.last | clark |
    | debtor[1].address.address | 111 Fake St. |
    | debtor[1].address.city | Omaha |
    | debtor[1].address.state | Nebraska |
    | debtor[1].address.zip | 68022 |
    | debtor[1].address.county | Douglas County |
    | debtor[1].tax_id.tax_id_type | 1 |
    | debtor[1].tax_id.tax_id | 1111111111 |
    | debtor[1].alias.there_are_any | False |
    | debtor[1].district_info.is_current_district| True |
    

#### Maximalist scenario: all sections filled, nothing skipped
#Scenario: Maximalist single or joint filer
#  # Filer chooses to file with spouse
#  Given I start the interview at "voluntary-petition.yml"
#  And I get to the question id "debtor_final" with this data:
#    | var | value |
#    | introduction_screen | True |
#    | current_district | District of Nebraska |
#    | amended_filing | True |
#    | case_number | 8:25-bk-12345 |
#    | district_final | True |
#    | filing_status | Filing with spouse |
#    | debtor.target_number | 2 |
#    | debtor[0].name.first | Alex |
#    | debtor[0].name.last | Smith |
#    | debtor[0].address.state | Nebraska |
#    | debtor[0].address.county | Douglas County |
#    | debtor[0].has_other_mailing_address | True |
#    | debtor[0].mailing_state | Nebraska |
#    | debtor[0].tax_id.tax_id_type | 1 |
#    | debtor[0].tax_id.tax_id | 123-45-6789 |
#    | debtor[0].alias.there_are_any | True |
#    | debtor[0].alias[0].first_name | A. |
#    | debtor[0].alias[0].last_name | S. |
#    | debtor[0].district_info.is_current_district | False |
#    | debtor[0].district_info.other_district_reason | Moved recently |
#    | debtor[1].name.first | Jamie |
#    | debtor[1].name.last | Smith |
#    | debtor[1].address.state | Nebraska |
#    | debtor[1].address.county | Douglas County |
#    | debtor[1].has_other_mailing_address | True |
#    | debtor[1].mailing_state | Nebraska |
#    | debtor[1].tax_id.tax_id_type | 2 |
#    | debtor[1].tax_id.tax_id | 987-65-4321 |
#    | debtor[1].alias.there_are_any | True |
#    | debtor[1].alias[0].first_name | J. |
#    | debtor[1].alias[0].last_name | S. |
#    | debtor[1].district_info.is_current_district | True |
#    | debtor.there_is_another | False |
#  # Add property, business, hazardous property, all payment and reporting options, etc.
#  # Continue with all sections, setting all booleans to True and providing at least one item for each list.
#
#
## Recommended tests for voluntary-petition.yml execution flow:
#
# 1. Amended filing branch:
#    - Test with amended_filing True (requires case_number)
#    - Test with amended_filing False (skips case_number)
#
# 2. Filing status (individual vs. spouse):
#    - Test with Filing individually (debtor.target_number = 1)
#    - Test with Filing with spouse (debtor.target_number = 2)
#
# 3. Property sections (106AB):
#    - Test with/without property interests, vehicles, household goods, collectibles, etc.
#
# 4. Business property and farming property:
#    - Test with business property (has_ar, has_lists)
#    - Test with farming property (has_animals, has_commercial)
#
# 5. Exempt property:
#    - Test with/without homestead exemption
#
# 6. Financial affairs:
#    - Test with multiple debtors and marital status True/False
#    - Test with/without other income, business types
#
# 7. Previous and pending bankruptcy:
#    - Test with/without previous_bankruptcy and pending_bankruptcy
#
# 8. Case payment method:
#    - Test with payment_method 1 (pay entire fee)
#    - Test with payment_method 2 (installments)
#    - Test with payment_method 3 (waiver)
#
# 9. Rent and eviction:
#    - Test with rents_residence True/False
#    - Test with eviction_judgement True/False
#
# 10. Business section:
#    - Test with/without business.has_business
#
# 11. Hazardous property:
#    - Test with/without hazardous_property.has_property
#
# 12. Credit counseling:
#    - Test with all counseling.counseling_type options (1-4)
#    - Test with/without not_required_reason
#
# 13. Reporting section:
#    - Test with all reporting.reporting_type options (1-3)
#    - Test with/without funds_for_creditors
#
# 14. Attachments and output:
#    - Test that all expected attachments are generated for each major path
#
# 15. Loops and collections:
#    - Test with multiple debtors, aliases, businesses, hazardous properties, etc.
#
# 16. Edge cases:
#    - Test with minimal data (single filer, no property, no business, no prior bankruptcy)
#    - Test with maximal data (joint filing, all sections filled, multiple items in each list)


