Feature: I am preparing a bankruptcy petition

Scenario: The interview loads
  Given I start the interview at "voluntary-petition.yml"

### Minimalist scenario: as much as possible skipped
Scenario: Minimalist single filer
  Given I start the interview at "voluntary-petition.yml"
  And I get to the question id "filing_status" with this data:
    | var | value | trigger |
    | amended_filing | False |  |
    | chapter | Chapter 7 |  |
    | courts_list[0] | District of Nebraska |  |
    | courts_list[1] | District of South Dakota |  |
    | current_district | District of Nebraska |  |
    | debtor[0].address.address | 123 fake st |  |
    | debtor[0].address.city | omaha |  |
    | debtor[0].address.county | Douglas County |  |
    | debtor[0].address.state | South Dakota |  |
    | debtor[0].address.zip | 68022 |  |
    | debtor[0].alias.revisit | True |  |
    | debtor[0].alias.there_are_any | False |  |
    | debtor[0].complete | True |  |
    | debtor[0].district_info.is_current_district | True |  |
    | debtor[0].expenses.joint_case | False |  |
    | debtor[0].has_other_mailing_address | False |  |
    | debtor[0].name.first | Alex |  |
    | debtor[0].name.last | Clark |  |
    | debtor[0].name.middle |  |  |
    | debtor[0].name.suffix |  |  |
    | debtor[0].tax_id.tax_id | 555-55-5555 |  |
    | debtor[0].tax_id.tax_id_type | 1 |  |
    | debtor.revisit | True |  |
    | debtor.target_number | 1 |  |
    | debtor.there_are_any | True |  |
    | debtor_basic_info | True |  |
    | debtor_final | True |  |
    | district_final | True |  |
    | filing_status | Filing individually |  |
    | hidden_county |  |  |
    | introduction_screen | True |  |
    | prop.ab_other_vehicles.revisit | True |  |
    | prop.ab_other_vehicles.there_are_any | False |  |
    | prop.ab_vehicles.revisit | True |  |
    | prop.ab_vehicles.there_are_any | False |  |
    | prop.animal_is_claiming_exemption | False |  |
    | prop.business_property.has_property | False |  |
    | prop.clothes_is_claiming_exemption | False |  |
    | prop.collectibles_is_claiming_exemption | False |  |
    | prop.collectibles_value | 0 |  |
    | prop.electronics_is_claiming_exemption | False |  |
    | prop.electronics_value | 0 |  |
    | prop.farming_property.has_property | False |  |
    | prop.financial_assets.annuities.revisit | True |  |
    | prop.financial_assets.annuities.there_are_any | False |  |
    | prop.financial_assets.bonds_and_stocks.revisit | True |  |
    | prop.financial_assets.bonds_and_stocks.there_are_any | False |  |
    | prop.financial_assets.cash_is_claiming_exemption | False |  |
    | prop.financial_assets.corporate_bonds.revisit | True |  |
    | prop.financial_assets.corporate_bonds.there_are_any | False |  |
    | prop.financial_assets.deposits.revisit | True |  |
    | prop.financial_assets.deposits.there_are_any | False |  |
    | prop.financial_assets.edu_accounts.revisit | True |  |
    | prop.financial_assets.edu_accounts.there_are_any | False |  |
    | prop.financial_assets.future_property_interest_has_claim | False |  |
    | prop.financial_assets.has_cash | False |  |
    | prop.financial_assets.has_future_property_interest | False |  |
    | prop.financial_assets.has_intangible_interest | False |  |
    | prop.financial_assets.has_ip_interest | False |  |
    | prop.financial_assets.intangible_interest_has_claim | False |  |
    | prop.financial_assets.ip_interest_has_claim | False |  |
    | prop.financial_assets.non_traded_stock.revisit | True |  |
    | prop.financial_assets.non_traded_stock.there_are_any | False |  |
    | prop.financial_assets.prepayments.revisit | True |  |
    | prop.financial_assets.prepayments.there_are_any | False |  |
    | prop.financial_assets.retirement_accounts.revisit | True |  |
    | prop.financial_assets.retirement_accounts.there_are_any | False |  |
    | prop.firearms_is_claiming_exemption | False |  |
    | prop.has_animals | False |  |
    | prop.has_clothes | False |  |
    | prop.has_collectibles | False |  |
    | prop.has_electronics | False |  |
    | prop.has_firearms | False |  |
    | prop.has_hobby_equipment | False |  |
    | prop.has_household_goods | False |  |
    | prop.has_jewlery | False |  |
    | prop.has_other_household_items | False |  |
    | prop.has_other_prop | False |  |
    | prop.has_secured_household_goods | False |  |
    | prop.hobby_equipment_is_claiming_exemption | False |  |
    | prop.hobby_equipment_value | 0 |  |
    | prop.household_goods_is_claiming_exemption | False |  |
    | prop.interests.revisit | True |  |
    | prop.interests.there_are_any | False |  |
    | prop.jewlery_is_claiming_exemption | False |  |
    | prop.other_household_items_is_claiming_exemption | False |  |
    | prop.other_prop_has_claim | False |  |
    | prop.owed_property.contingent_claims_has_claim | False |  |
    | prop.owed_property.family_support_has_claim | False |  |
    | prop.owed_property.first_insurance_interest_has_claim | False |  |
    | prop.owed_property.has_contingent_claims | False |  |
    | prop.owed_property.has_family_support | False |  |
    | prop.owed_property.has_insurance_interest | False |  |
    | prop.owed_property.has_other_amounts | False |  |
    | prop.owed_property.has_other_assets | False |  |
    | prop.owed_property.has_tax_refund | False |  |
    | prop.owed_property.has_third_party | False |  |
    | prop.owed_property.has_trust | False |  |
    | prop.owed_property.other_amounts_has_claim | False |  |
    | prop.owed_property.other_assets_has_claim | False |  |
    | prop.owed_property.tax_refund_has_claim | False |  |
    | prop.owed_property.third_party_has_claim | False |  |
    | prop.owed_property.trust_has_claim | False |  |
    | prop.secured_household_goods_is_claiming_exemption | False |  |
    | property_intro | True |  |
    | selected_state | South Dakota |  |
    | unsecured_claim | 0 |  |

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


