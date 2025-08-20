Feature: I am a user

Scenario: I have a name
  Given I start the interview at "voluntary-petition.yml"
  And the user gets to "conclusion_screen" with this data:
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
    | courts_list[0] | Middle District of Alabama |  |
    | courts_list[1] | Northern District of Alabama |  |
    | courts_list[2] | Southern District of Alabama |  |
    | courts_list[3] | District of Alaska |  |
    | courts_list[4] | District of Arizona |  |
    | courts_list[5] | Eastern and Western District of Arkansas |  |
    | courts_list[6] | Central District of California |  |
    | courts_list[7] | Eastern District of California |  |
    | courts_list[8] | Northern District of California |  |
    | courts_list[9] | Southern District of California |  |
    | courts_list[10] | District of Colorado |  |
    | courts_list[11] | District of Connecticut |  |
    | courts_list[12] | District of Columbia |  |
    | courts_list[13] | District of Delaware |  |
    | courts_list[14] | Middle District of Florida |  |
    | courts_list[15] | Northern District of Florida |  |
    | courts_list[16] | Southern District of Florida |  |
    | courts_list[17] | Middle District of Georgia |  |
    | courts_list[18] | Northern District of Georgia |  |
    | courts_list[19] | Southern District of Georgia |  |
    | courts_list[20] | District of Guam |  |
    | courts_list[21] | District of Hawaii |  |
    | courts_list[22] | District of Idaho |  |
    | courts_list[23] | Central District of Illinois |  |
    | courts_list[24] | Northern District of Illinois |  |
    | courts_list[25] | Southern District of Illinois |  |
    | courts_list[26] | Northern District of Indiana |  |
    | courts_list[27] | Southern District of Indiana |  |
    | courts_list[28] | Northern District of Iowa |  |
    | courts_list[29] | Southern District of Iowa |  |
    | courts_list[30] | District of Kansas |  |
    | courts_list[31] | Eastern District of Kentucky |  |
    | courts_list[32] | Western District of Kentucky |  |
    | courts_list[33] | Eastern District of Louisiana |  |
    | courts_list[34] | Middle District of Louisiana |  |
    | courts_list[35] | Western District of Louisiana |  |
    | courts_list[36] | District of Maine |  |
    | courts_list[37] | District of Maryland |  |
    | courts_list[38] | District of Massachusetts |  |
    | courts_list[39] | District of Montana |  |
    | courts_list[40] | Eastern District of Michigan |  |
    | courts_list[41] | Western District of Michigan |  |
    | courts_list[42] | District of Minnesota |  |
    | courts_list[43] | Northern District of Mississippi |  |
    | courts_list[44] | Southern District of Mississippi |  |
    | courts_list[45] | Eastern District of Missouri |  |
    | courts_list[46] | Western District of Missouri |  |
    | courts_list[47] | District of Nebraska |  |
    | courts_list[48] | District of Nevada |  |
    | courts_list[49] | District of New Hampshire |  |
    | courts_list[50] | District of New Jersey |  |
    | courts_list[51] | District of New Mexico |  |
    | courts_list[52] | Eastern District of New York |  |
    | courts_list[53] | Northern District of New York |  |
    | courts_list[54] | Southern District of New York |  |
    | courts_list[55] | Western District of New York |  |
    | courts_list[56] | Eastern District of North Carolina |  |
    | courts_list[57] | Middle District of North Carolina |  |
    | courts_list[58] | Western District of North Carolina |  |
    | courts_list[59] | District of North Dakota |  |
    | courts_list[60] | District of Northern Mariana Islands |  |
    | courts_list[61] | Northern District of Ohio |  |
    | courts_list[62] | Southern District of Ohio |  |
    | courts_list[63] | Eastern District of Oklahoma |  |
    | courts_list[64] | Northern District of Oklahoma |  |
    | courts_list[65] | Western District of Oklahoma |  |
    | courts_list[66] | District of Oregon |  |
    | courts_list[67] | Eastern District of Pennsylvania |  |
    | courts_list[68] | Middle District of Pennsylvania |  |
    | courts_list[69] | Western District of Pennsylvania |  |
    | courts_list[70] | District of Puerto Rico |  |
    | courts_list[71] | District of Rhode Island |  |
    | courts_list[72] | District of South Carolina |  |
    | courts_list[73] | District of South Dakota |  |
    | courts_list[74] | Eastern District of Tennessee |  |
    | courts_list[75] | Middle District of Tennessee |  |
    | courts_list[76] | Western District of Tennessee |  |
    | courts_list[77] | Eastern District of Texas |  |
    | courts_list[78] | Northern District of Texas |  |
    | courts_list[79] | Southern District of Texas |  |
    | courts_list[80] | Western District of Texas |  |
    | courts_list[81] | District of Utah |  |
    | courts_list[82] | District of Vermont |  |
    | courts_list[83] | District of Virgin Islands |  |
    | courts_list[84] | Eastern District of Virginia |  |
    | courts_list[85] | Western District of Virginia |  |
    | courts_list[86] | Eastern District of Washington |  |
    | courts_list[87] | Western District of Washington |  |
    | courts_list[88] | Northern District of West Virginia |  |
    | courts_list[89] | Southern District of West Virginia |  |
    | courts_list[90] | Eastern District of Wisconsin |  |
    | courts_list[91] | Western District of Wisconsin |  |
    | courts_list[92] | District of Wyoming |  |
    | current_district | District of Nebraska |  |
    | debtor[0].address.address | 123 fake st |  |
    | debtor[0].address.city | Omaha |  |
    | debtor[0].address.state | NE |  |
    | debtor[0].address.unit | Douglas County |  |
    | debtor[0].address.zip | 12345 |  |
    | debtor[0].alias[0].business |  |  |
    | debtor[0].alias[0].complete | True |  |
    | debtor[0].alias[0].first_name | alexander |  |
    | debtor[0].alias[0].last_name | clark |  |
    | debtor[0].alias[0].middle_name |  |  |
    | debtor[0].alias.revisit | True |  |
    | debtor[0].alias.there_are_any | True |  |
    | debtor[0].alias.there_is_another | --- invalid. See docs at https://suffolklitlab.org/docassemble-AssemblyLine-documentation/docs/automated_integrated_testing/#there_is_another-loop ---  |  |
    | debtor[0].complete | True |  |
    | debtor[0].district_info.is_current_district | True |  |
    | debtor[0].expenses.joint_case | True |  |
    | debtor[0].has_other_mailing_address | True |  |
    | debtor[0].mailing_city | mailcity |  |
    | debtor[0].mailing_state | NE |  |
    | debtor[0].mailing_street | 123 mailing street |  |
    | debtor[0].mailing_zip | 88888 |  |
    | debtor[0].name.first | alex |  |
    | debtor[0].name.last | clark |  |
    | debtor[0].name.middle |  |  |
    | debtor[0].name.suffix |  |  |
    | debtor[0].tax_id.tax_id | 333333333 |  |
    | debtor[0].tax_id.tax_id_type | 1 |  |
    | debtor[1].address.address | 123 fake st |  |
    | debtor[1].address.city | lincoln |  |
    | debtor[1].address.state | NE |  |
    | debtor[1].address.unit | Lancaster County |  |
    | debtor[1].address.zip | 88888 |  |
    | debtor[1].alias[0].business |  |  |
    | debtor[1].alias[0].complete | True |  |
    | debtor[1].alias[0].first_name | sarah |  |
    | debtor[1].alias[0].last_name | beringer |  |
    | debtor[1].alias[0].middle_name |  |  |
    | debtor[1].alias.revisit | True |  |
    | debtor[1].alias.there_are_any | True |  |
    | debtor[1].alias.there_is_another | --- invalid. See docs at https://suffolklitlab.org/docassemble-AssemblyLine-documentation/docs/automated_integrated_testing/#there_is_another-loop ---  |  |
    | debtor[1].complete | True |  |
    | debtor[1].district_info.is_current_district | True |  |
    | debtor[1].has_other_mailing_address | True |  |
    | debtor[1].mailing_city | lin |  |
    | debtor[1].mailing_state | NE |  |
    | debtor[1].mailing_street | 123 fake street |  |
    | debtor[1].mailing_zip | 77777 |  |
    | debtor[1].name.first | spouse |  |
    | debtor[1].name.last | beringer |  |
    | debtor[1].name.middle |  |  |
    | debtor[1].name.suffix |  |  |
    | debtor[1].tax_id.tax_id | 444444444 |  |
    | debtor[1].tax_id.tax_id_type | 1 |  |
    | debtor.revisit | True |  |
    | debtor.target_number | 2 |  |
    | debtor.there_are_any | True |  |
    | district_final | True |  |
    | filing_status | Filing with spouse |  |
    | introduction_screen | True |  |
    | unsecured_claim | 0 |  |