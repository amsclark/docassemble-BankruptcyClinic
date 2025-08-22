 Feature: I am preparing a bankruptcy petition

Scenario: Minimal single filer
  Given I start the interview at "voluntary-petition.yml"
  And the user gets to "none" with this data:
    | var | value | trigger |
    | amended_filing | False |  |
    | chapter | Chapter 7 |  |
    | county_list[0] | Adams County |  |
    | county_list[1] | Antelope County |  |
    | county_list[2] | Arthur County |  |
    | county_list[3] | Banner County |  |
    | county_list[4] | Blaine County |  |
    | county_list[5] | Boone County |  |
    | county_list[6] | Box Butte County |  |
    | county_list[7] | Boyd County |  |
    | county_list[8] | Brown County |  |
    | county_list[9] | Buffalo County |  |
    | county_list[10] | Burt County |  |
    | county_list[11] | Butler County |  |
    | county_list[12] | Cass County |  |
    | county_list[13] | Cedar County |  |
    | county_list[14] | Chase County |  |
    | county_list[15] | Cherry County |  |
    | county_list[16] | Cheyenne County |  |
    | county_list[17] | Clay County |  |
    | county_list[18] | Colfax County |  |
    | county_list[19] | Cuming County |  |
    | county_list[20] | Custer County |  |
    | county_list[21] | Dakota County |  |
    | county_list[22] | Dawes County |  |
    | county_list[23] | Dawson County |  |
    | county_list[24] | Deuel County |  |
    | county_list[25] | Dixon County |  |
    | county_list[26] | Dodge County |  |
    | county_list[27] | Douglas County |  |
    | county_list[28] | Dundy County |  |
    | county_list[29] | Fillmore County |  |
    | county_list[30] | Franklin County |  |
    | county_list[31] | Frontier County |  |
    | county_list[32] | Furnas County |  |
    | county_list[33] | Gage County |  |
    | county_list[34] | Garden County |  |
    | county_list[35] | Garfield County |  |
    | county_list[36] | Gosper County |  |
    | county_list[37] | Grant County |  |
    | county_list[38] | Greeley County |  |
    | county_list[39] | Hall County |  |
    | county_list[40] | Hamilton County |  |
    | county_list[41] | Harlan County |  |
    | county_list[42] | Hayes County |  |
    | county_list[43] | Hitchcock County |  |
    | county_list[44] | Holt County |  |
    | county_list[45] | Hooker County |  |
    | county_list[46] | Howard County |  |
    | county_list[47] | Jefferson County |  |
    | county_list[48] | Johnson County |  |
    | county_list[49] | Kearney County |  |
    | county_list[50] | Keith County |  |
    | county_list[51] | Keya Paha County |  |
    | county_list[52] | Kimball County |  |
    | county_list[53] | Knox County |  |
    | county_list[54] | Lancaster County |  |
    | county_list[55] | Lincoln County |  |
    | county_list[56] | Logan County |  |
    | county_list[57] | Loup County |  |
    | county_list[58] | Madison County |  |
    | county_list[59] | McPherson County |  |
    | county_list[60] | Merrick County |  |
    | county_list[61] | Morrill County |  |
    | county_list[62] | Nance County |  |
    | county_list[63] | Nemaha County |  |
    | county_list[64] | Nuckolls County |  |
    | county_list[65] | Otoe County |  |
    | county_list[66] | Pawnee County |  |
    | county_list[67] | Perkins County |  |
    | county_list[68] | Phelps County |  |
    | county_list[69] | Pierce County |  |
    | county_list[70] | Platte County |  |
    | county_list[71] | Polk County |  |
    | county_list[72] | Red Willow County |  |
    | county_list[73] | Richardson County |  |
    | county_list[74] | Rock County |  |
    | county_list[75] | Saline County |  |
    | county_list[76] | Sarpy County |  |
    | county_list[77] | Saunders County |  |
    | county_list[78] | Scotts Bluff County |  |
    | county_list[79] | Seward County |  |
    | county_list[80] | Sheridan County |  |
    | county_list[81] | Sherman County |  |
    | county_list[82] | Sioux County |  |
    | county_list[83] | Stanton County |  |
    | county_list[84] | Thayer County |  |
    | county_list[85] | Thomas County |  |
    | county_list[86] | Thurston County |  |
    | county_list[87] | Valley County |  |
    | county_list[88] | Washington County |  |
    | county_list[89] | Wayne County |  |
    | county_list[90] | Webster County |  |
    | county_list[91] | Wheeler County |  |
    | county_list[92] | York County |  |
    | courts_list[0] | District of Nebraska |  |
    | courts_list[1] | District of South Dakota |  |
    | current_district | District of Nebraska |  |
    | debtor[0].address.address | hhh |  |
    | debtor[0].address.city | kkk |  |
    | debtor[0].address.state | NE |  |
    | debtor[0].address.county | Thomas County |  |
    | debtor[0].address.zip | 11111 |  |
    | debtor[0].alias.revisit | True |  |
    | debtor[0].alias.there_are_any | False |  |
    | debtor[0].complete | True |  |
    | debtor[0].district_info.is_current_district | True |  |
    | debtor[0].expenses.joint_case | False |  |
    | debtor[0].has_other_mailing_address | False |  |
    | debtor[0].name.first | homer |  |
    | debtor[0].name.last | simpson |  |
    | debtor[0].name.middle |  |  |
    | debtor[0].name.suffix |  |  |
    | debtor[0].tax_id.tax_id | 5555555555 |  |
    | debtor[0].tax_id.tax_id_type | 1 |  |
    | debtor.revisit | True |  |
    | debtor.target_number | 1 |  |
    | debtor.there_are_any | True |  |
    | debtor_final | True |  |
    | district_final | True |  |
    | filing_status | Filing individually |  |
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
    | prop.has_secured_household_goods | False |  |
    | prop.hobby_equipment_is_claiming_exemption | False |  |
    | prop.hobby_equipment_value | 0 |  |
    | prop.household_goods_is_claiming_exemption | False |  |
    | prop.interests.revisit | True |  |
    | prop.interests.there_are_any | False |  |
    | prop.jewlery_is_claiming_exemption | False |  |
    | prop.other_household_items_is_claiming_exemption | False |  |
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
    | unsecured_claim | 0 |  |