Feature: I am preparing a bankruptcy petition

# Recommended tests for voluntary-petition.yml execution flow:
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

Scenario: The interview loads
  Given I start the interview at "voluntary-petition.yml"


