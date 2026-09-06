"""IRS and US Trustee Program means-testing standards for Form 122A-2.

GENERATED FILE - do not hand-edit. Regenerate with:

    python3 scripts/fetch_means_test_data.py --period 20260715

Every figure below is read off the published USTP tables for the filing
period named here. None of it may be written from memory.

Filing period:  cases filed on or after 2026-07-15
Period index:   https://www.justice.gov/ust/means-testing/20260715
Pulled:         2026-09-06

NEXT REVIEW: the USTP republishes these tables roughly every six months.
A stale table puts a wrong figure on a filed court form and raises no
error, so this is a silent failure. Run
`python3 scripts/fetch_means_test_data.py --list` to see whether a newer
filing period has been published, and regenerate when one has.

NOT COVERED HERE, and needing the same refresh:
  * DOJ median family income - objects.py, DOJ_MEDIAN_INCOME_TABLES.
  * The 11 U.S.C. 707(b)(2) presumption thresholds - see the foot of
    this file. Those are statutory amounts on a three-year cycle, are
    read off the face of the official form, and require attorney
    verification before any change ships.
"""

# ---------------------------------------------------------------------------
# Line 6 - National Standards for food, clothing and other items.
# Source: https://www.justice.gov/ust/eo/bapcpa/20260715/bci_data/national_expense_standards.htm
# The transcribed row is the published "Total" row, which is the figure
# line 6 of Form 122A-2 asks for.
# ---------------------------------------------------------------------------
IRS_NATIONAL_STANDARDS = {
    1: 867,
    2: 1558,
    3: 1857,
    4: 2176,
}
IRS_NATIONAL_STANDARDS_ADDITIONAL_PER_PERSON = 397

# ---------------------------------------------------------------------------
# Lines 7a and 7d - out-of-pocket health care allowance, per person.
# Source: https://www.justice.gov/ust/eo/bapcpa/20260715/bci_data/national_oop_healthcare.htm
# ---------------------------------------------------------------------------
IRS_OOP_HEALTHCARE_UNDER_65 = 90
IRS_OOP_HEALTHCARE_65_AND_OVER = 163

# ---------------------------------------------------------------------------
# Lines 12, 13a, 13d and 14 - IRS Local Transportation Expense Standards.
# Source: https://www.justice.gov/ust/eo/bapcpa/20260715/bci_data/IRS_Trans_Exp_Stds_MW.htm
#
# Nebraska and South Dakota are both in the Midwest Census Region, and the
# USTP lists no Metropolitan Statistical Area in either state (the Midwest
# MSAs are Chicago, Cleveland, Detroit, Minneapolis-St. Paul and St. Louis).
# So every filer this interview supports takes the plain regional operating
# figure. Adding a state outside NE/SD means transcribing that state's MSA
# rows as well - these numbers must not be reused for another region.
# ---------------------------------------------------------------------------
IRS_TRANSPORTATION_OPERATING_MIDWEST = {1: 263, 2: 526}
IRS_TRANSPORTATION_OWNERSHIP = {1: 703, 2: 1406}
IRS_PUBLIC_TRANSPORTATION = 220

# ---------------------------------------------------------------------------
# Lines 8 and 9a - IRS Local Standards for housing and utilities, by county.
# Source: https://www.justice.gov/ust/eo/bapcpa/20260715/bci_data/housing_charts/irs_housing_charts_NE.htm
#         https://www.justice.gov/ust/eo/bapcpa/20260715/bci_data/housing_charts/irs_housing_charts_SD.htm
#
# Keys are county names spelled exactly as county_list.py spells them; the
# generator fails if the two ever diverge. Each value is:
#
#   [FIPS,
#    non-mortgage 1 person,  mortgage/rent 1 person,
#    non-mortgage 2 people,  mortgage/rent 2 people,
#    non-mortgage 3 people,  mortgage/rent 3 people,
#    non-mortgage 4 people,  mortgage/rent 4 people,
#    non-mortgage 5 or more, mortgage/rent 5 or more]
#
# The non-mortgage figure is the insurance-and-operating allowance for
# line 8. The mortgage/rent figure is the allowance for line 9a.
# ---------------------------------------------------------------------------
IRS_HOUSING_NEBRASKA = {
    'Adams County': [31001, 605, 996, 711, 1170, 749, 1233, 835, 1375, 849, 1397],
    'Antelope County': [31003, 676, 770, 794, 905, 836, 954, 933, 1063, 948, 1080],
    'Arthur County': [31005, 587, 1027, 690, 1206, 727, 1271, 811, 1417, 824, 1440],
    'Banner County': [31007, 737, 1075, 866, 1262, 912, 1330, 1017, 1483, 1033, 1507],
    'Blaine County': [31009, 558, 998, 655, 1173, 691, 1235, 770, 1377, 782, 1400],
    'Boone County': [31011, 640, 952, 752, 1118, 792, 1178, 883, 1314, 897, 1335],
    'Box Butte County': [31013, 611, 919, 718, 1079, 757, 1137, 844, 1268, 857, 1289],
    'Boyd County': [31015, 721, 1043, 847, 1225, 893, 1290, 995, 1439, 1011, 1462],
    'Brown County': [31017, 608, 568, 714, 667, 753, 702, 839, 783, 853, 796],
    'Buffalo County': [31019, 586, 1229, 687, 1444, 725, 1521, 808, 1696, 821, 1724],
    'Burt County': [31021, 741, 833, 870, 979, 917, 1031, 1023, 1149, 1039, 1168],
    'Butler County': [31023, 612, 1006, 719, 1182, 758, 1245, 845, 1388, 858, 1411],
    'Cass County': [31025, 629, 1327, 739, 1559, 779, 1642, 868, 1831, 883, 1860],
    'Cedar County': [31027, 606, 903, 712, 1060, 750, 1117, 836, 1246, 850, 1265],
    'Chase County': [31029, 614, 858, 721, 1008, 760, 1062, 847, 1185, 861, 1203],
    'Cherry County': [31031, 569, 862, 669, 1012, 705, 1066, 786, 1189, 798, 1209],
    'Cheyenne County': [31033, 698, 901, 820, 1058, 864, 1115, 963, 1244, 979, 1263],
    'Clay County': [31035, 637, 850, 748, 998, 789, 1051, 879, 1173, 894, 1191],
    'Colfax County': [31037, 565, 852, 664, 1001, 699, 1055, 780, 1176, 792, 1195],
    'Cuming County': [31039, 695, 904, 817, 1061, 861, 1118, 960, 1247, 975, 1267],
    'Custer County': [31041, 673, 860, 790, 1010, 833, 1064, 929, 1186, 944, 1205],
    'Dakota County': [31043, 669, 1141, 786, 1340, 828, 1412, 923, 1575, 938, 1600],
    'Dawes County': [31045, 653, 738, 767, 867, 808, 914, 901, 1019, 915, 1036],
    'Dawson County': [31047, 623, 941, 731, 1106, 771, 1165, 859, 1300, 873, 1320],
    'Deuel County': [31049, 651, 807, 765, 948, 806, 999, 898, 1115, 913, 1132],
    'Dixon County': [31051, 581, 922, 683, 1082, 719, 1141, 802, 1272, 815, 1292],
    'Dodge County': [31053, 640, 1002, 752, 1176, 793, 1239, 884, 1382, 898, 1404],
    'Douglas County': [31055, 620, 1360, 728, 1597, 767, 1683, 855, 1877, 869, 1907],
    'Dundy County': [31057, 600, 614, 704, 722, 742, 761, 828, 848, 841, 862],
    'Fillmore County': [31059, 594, 819, 698, 962, 735, 1014, 820, 1130, 833, 1149],
    'Franklin County': [31061, 630, 711, 740, 835, 780, 880, 870, 981, 884, 997],
    'Frontier County': [31063, 614, 932, 721, 1094, 760, 1153, 847, 1286, 861, 1306],
    'Furnas County': [31065, 724, 750, 850, 881, 896, 928, 999, 1035, 1015, 1052],
    'Gage County': [31067, 596, 951, 701, 1116, 738, 1177, 823, 1312, 837, 1333],
    'Garden County': [31069, 603, 591, 708, 695, 746, 732, 832, 816, 845, 830],
    'Garfield County': [31071, 607, 927, 713, 1089, 751, 1148, 837, 1280, 851, 1301],
    'Gosper County': [31073, 644, 1083, 756, 1272, 797, 1340, 889, 1494, 903, 1518],
    'Grant County': [31075, 720, 573, 845, 673, 890, 710, 993, 791, 1009, 804],
    'Greeley County': [31077, 683, 843, 802, 990, 845, 1043, 942, 1163, 957, 1182],
    'Hall County': [31079, 576, 1158, 677, 1360, 713, 1433, 795, 1598, 808, 1623],
    'Hamilton County': [31081, 546, 1137, 641, 1336, 676, 1407, 753, 1570, 765, 1595],
    'Harlan County': [31083, 614, 844, 721, 992, 760, 1045, 847, 1166, 861, 1184],
    'Hayes County': [31085, 634, 1164, 744, 1368, 784, 1441, 874, 1607, 889, 1632],
    'Hitchcock County': [31087, 624, 659, 733, 774, 773, 815, 862, 909, 875, 924],
    'Holt County': [31089, 651, 930, 764, 1093, 806, 1151, 898, 1284, 913, 1304],
    'Hooker County': [31091, 691, 785, 812, 922, 856, 971, 954, 1083, 969, 1101],
    'Howard County': [31093, 662, 847, 777, 996, 819, 1049, 913, 1170, 928, 1188],
    'Jefferson County': [31095, 673, 815, 790, 957, 832, 1009, 928, 1125, 943, 1143],
    'Johnson County': [31097, 605, 903, 711, 1060, 749, 1117, 835, 1246, 848, 1266],
    'Kearney County': [31099, 634, 1063, 744, 1249, 784, 1316, 874, 1468, 888, 1491],
    'Keith County': [31101, 639, 846, 750, 994, 791, 1047, 882, 1167, 896, 1186],
    'Keya Paha County': [31103, 597, 959, 702, 1126, 740, 1186, 824, 1323, 838, 1344],
    'Kimball County': [31105, 698, 760, 819, 893, 863, 941, 962, 1049, 978, 1066],
    'Knox County': [31107, 634, 761, 745, 894, 785, 942, 876, 1050, 890, 1067],
    'Lancaster County': [31109, 552, 1289, 648, 1514, 683, 1595, 762, 1778, 774, 1807],
    'Lincoln County': [31111, 639, 997, 750, 1172, 791, 1234, 882, 1376, 896, 1398],
    'Logan County': [31113, 728, 1026, 855, 1205, 901, 1270, 1005, 1416, 1021, 1439],
    'Loup County': [31115, 859, 756, 1010, 887, 1064, 935, 1186, 1043, 1205, 1060],
    'Madison County': [31119, 579, 1026, 680, 1206, 716, 1271, 799, 1417, 811, 1440],
    'McPherson County': [31117, 773, 1146, 908, 1346, 957, 1418, 1067, 1581, 1084, 1607],
    'Merrick County': [31121, 612, 896, 719, 1052, 757, 1109, 845, 1236, 858, 1256],
    'Morrill County': [31123, 697, 812, 819, 953, 863, 1004, 962, 1120, 977, 1138],
    'Nance County': [31125, 552, 938, 648, 1102, 683, 1161, 762, 1294, 774, 1315],
    'Nemaha County': [31127, 657, 760, 772, 893, 813, 941, 907, 1049, 921, 1066],
    'Nuckolls County': [31129, 581, 813, 683, 954, 719, 1006, 802, 1121, 815, 1139],
    'Otoe County': [31131, 608, 1061, 714, 1247, 752, 1314, 839, 1465, 852, 1489],
    'Pawnee County': [31133, 804, 766, 944, 900, 995, 948, 1109, 1057, 1127, 1074],
    'Perkins County': [31135, 676, 676, 794, 794, 836, 837, 932, 933, 948, 948],
    'Phelps County': [31137, 592, 1005, 696, 1180, 733, 1244, 817, 1387, 831, 1409],
    'Pierce County': [31139, 621, 1039, 729, 1221, 768, 1287, 857, 1434, 870, 1458],
    'Platte County': [31141, 563, 1160, 661, 1362, 697, 1435, 777, 1600, 790, 1626],
    'Polk County': [31143, 702, 913, 825, 1072, 869, 1130, 969, 1260, 985, 1280],
    'Red Willow County': [31145, 632, 852, 742, 1001, 782, 1055, 872, 1176, 886, 1195],
    'Richardson County': [31147, 741, 650, 871, 763, 917, 805, 1023, 897, 1039, 912],
    'Rock County': [31149, 668, 685, 785, 804, 827, 847, 922, 945, 937, 960],
    'Saline County': [31151, 650, 1134, 763, 1332, 804, 1404, 897, 1565, 912, 1590],
    'Sarpy County': [31153, 611, 1521, 718, 1786, 757, 1882, 843, 2099, 857, 2133],
    'Saunders County': [31155, 580, 1295, 682, 1521, 718, 1603, 801, 1787, 814, 1816],
    'Scotts Bluff County': [31157, 640, 990, 752, 1162, 793, 1224, 884, 1365, 898, 1387],
    'Seward County': [31159, 616, 1118, 724, 1313, 763, 1383, 851, 1542, 864, 1567],
    'Sheridan County': [31161, 693, 787, 814, 925, 857, 975, 956, 1087, 972, 1104],
    'Sherman County': [31163, 605, 754, 711, 885, 749, 933, 835, 1040, 849, 1057],
    'Sioux County': [31165, 548, 1074, 643, 1263, 678, 1330, 756, 1483, 768, 1507],
    'Stanton County': [31167, 596, 963, 700, 1132, 737, 1193, 822, 1330, 835, 1352],
    'Thayer County': [31169, 645, 687, 758, 807, 799, 850, 891, 948, 905, 963],
    'Thomas County': [31171, 605, 576, 711, 676, 749, 713, 835, 795, 848, 808],
    'Thurston County': [31173, 671, 850, 787, 999, 830, 1052, 925, 1173, 940, 1192],
    'Valley County': [31175, 619, 796, 727, 935, 766, 985, 854, 1098, 868, 1116],
    'Washington County': [31177, 559, 1325, 656, 1557, 692, 1640, 771, 1829, 783, 1859],
    'Wayne County': [31179, 643, 904, 755, 1062, 796, 1119, 887, 1248, 902, 1268],
    'Webster County': [31181, 606, 829, 712, 973, 750, 1026, 836, 1144, 850, 1162],
    'Wheeler County': [31183, 824, 986, 968, 1158, 1020, 1220, 1137, 1361, 1155, 1383],
    'York County': [31185, 606, 957, 712, 1123, 750, 1184, 836, 1320, 850, 1341],
}

IRS_HOUSING_SOUTH_DAKOTA = {
    'Aurora County': [46003, 718, 918, 843, 1079, 889, 1136, 991, 1267, 1007, 1287],
    'Beadle County': [46005, 631, 928, 741, 1090, 781, 1148, 871, 1280, 885, 1301],
    'Bennett County': [46007, 785, 623, 922, 732, 972, 771, 1083, 860, 1101, 874],
    'Bon Homme County': [46009, 688, 850, 808, 998, 851, 1052, 949, 1173, 965, 1191],
    'Brookings County': [46011, 610, 1225, 716, 1439, 755, 1516, 841, 1691, 855, 1718],
    'Brown County': [46013, 629, 1039, 739, 1220, 779, 1285, 868, 1433, 883, 1456],
    'Brule County': [46015, 625, 964, 734, 1133, 773, 1194, 862, 1331, 876, 1353],
    'Buffalo County': [46017, 659, 879, 774, 1032, 815, 1088, 909, 1213, 924, 1232],
    'Butte County': [46019, 623, 1176, 732, 1381, 771, 1456, 860, 1623, 874, 1649],
    'Campbell County': [46021, 750, 661, 881, 776, 928, 818, 1035, 912, 1051, 927],
    'Charles Mix County': [46023, 687, 1162, 807, 1364, 850, 1438, 948, 1603, 963, 1629],
    'Clark County': [46025, 715, 722, 840, 848, 885, 894, 987, 997, 1003, 1013],
    'Clay County': [46027, 614, 1150, 721, 1351, 760, 1423, 847, 1587, 860, 1613],
    'Codington County': [46029, 605, 1050, 711, 1233, 749, 1299, 835, 1449, 848, 1472],
    'Corson County': [46031, 670, 650, 788, 763, 830, 804, 925, 897, 940, 911],
    'Custer County': [46033, 579, 1387, 680, 1629, 717, 1716, 800, 1913, 813, 1944],
    'Davison County': [46035, 641, 956, 752, 1123, 793, 1183, 884, 1319, 898, 1341],
    'Day County': [46037, 683, 732, 802, 860, 845, 906, 942, 1010, 957, 1027],
    'Deuel County': [46039, 611, 946, 718, 1111, 757, 1170, 844, 1305, 857, 1326],
    'Dewey County': [46041, 672, 641, 789, 753, 831, 794, 927, 885, 942, 899],
    'Douglas County': [46043, 625, 906, 734, 1064, 774, 1121, 863, 1250, 876, 1271],
    'Edmunds County': [46045, 690, 823, 810, 967, 854, 1018, 952, 1135, 967, 1154],
    'Fall River County': [46047, 626, 905, 735, 1063, 775, 1120, 864, 1249, 878, 1269],
    'Faulk County': [46049, 768, 611, 902, 718, 950, 757, 1059, 844, 1077, 857],
    'Grant County': [46051, 582, 966, 683, 1135, 720, 1196, 803, 1333, 816, 1355],
    'Gregory County': [46053, 685, 963, 804, 1131, 847, 1192, 944, 1329, 960, 1350],
    'Haakon County': [46055, 575, 937, 675, 1101, 711, 1160, 793, 1293, 806, 1314],
    'Hamlin County': [46057, 663, 1017, 778, 1195, 820, 1259, 915, 1403, 930, 1426],
    'Hand County': [46059, 689, 860, 810, 1009, 853, 1064, 951, 1186, 967, 1205],
    'Hanson County': [46061, 714, 947, 838, 1113, 883, 1173, 985, 1307, 1001, 1328],
    'Harding County': [46063, 618, 785, 726, 922, 765, 972, 853, 1084, 867, 1101],
    'Hughes County': [46065, 620, 1115, 728, 1310, 767, 1380, 855, 1539, 869, 1564],
    'Hutchinson County': [46067, 621, 808, 729, 949, 768, 1000, 856, 1115, 870, 1133],
    'Hyde County': [46069, 771, 948, 906, 1113, 954, 1174, 1064, 1309, 1081, 1330],
    'Jackson County': [46071, 748, 693, 878, 815, 926, 858, 1032, 957, 1048, 973],
    'Jerauld County': [46073, 697, 1040, 819, 1221, 863, 1287, 962, 1435, 978, 1458],
    'Jones County': [46075, 897, 676, 1054, 794, 1111, 836, 1239, 932, 1259, 947],
    'Kingsbury County': [46077, 701, 887, 823, 1042, 867, 1098, 967, 1224, 982, 1244],
    'Lake County': [46079, 646, 1060, 759, 1245, 800, 1312, 892, 1463, 907, 1486],
    'Lawrence County': [46081, 592, 1207, 695, 1417, 732, 1494, 816, 1666, 829, 1693],
    'Lincoln County': [46083, 591, 1418, 694, 1665, 731, 1755, 815, 1957, 828, 1989],
    'Lyman County': [46085, 617, 926, 725, 1088, 764, 1146, 852, 1278, 866, 1298],
    'Marshall County': [46091, 714, 812, 838, 955, 883, 1006, 985, 1121, 1001, 1139],
    'McCook County': [46087, 663, 1109, 778, 1303, 820, 1373, 915, 1530, 930, 1555],
    'McPherson County': [46089, 610, 670, 717, 786, 755, 829, 842, 924, 856, 939],
    'Meade County': [46093, 599, 1287, 704, 1511, 741, 1593, 827, 1775, 840, 1804],
    'Mellette County': [46095, 613, 610, 720, 716, 759, 754, 846, 841, 859, 855],
    'Miner County': [46097, 673, 836, 791, 982, 833, 1035, 929, 1154, 944, 1172],
    'Minnehaha County': [46099, 560, 1268, 657, 1490, 693, 1569, 772, 1750, 785, 1778],
    'Moody County': [46101, 652, 1139, 765, 1338, 806, 1410, 899, 1572, 914, 1597],
    'Oglala Lakota County': [46102, 553, 535, 649, 628, 684, 662, 763, 738, 775, 750],
    'Pennington County': [46103, 585, 1308, 687, 1537, 724, 1619, 807, 1805, 820, 1835],
    'Perkins County': [46105, 666, 731, 783, 858, 825, 904, 920, 1008, 934, 1025],
    'Potter County': [46107, 657, 769, 771, 904, 813, 952, 906, 1062, 921, 1079],
    'Roberts County': [46109, 785, 905, 922, 1063, 972, 1120, 1083, 1250, 1101, 1269],
    'Sanborn County': [46111, 744, 715, 874, 840, 921, 885, 1027, 987, 1043, 1003],
    'Spink County': [46115, 711, 874, 835, 1027, 880, 1082, 981, 1207, 997, 1226],
    'Stanley County': [46117, 641, 917, 753, 1077, 794, 1134, 885, 1265, 899, 1285],
    'Sully County': [46119, 651, 1018, 764, 1196, 805, 1260, 898, 1404, 913, 1427],
    'Todd County': [46121, 645, 662, 757, 778, 798, 819, 890, 913, 904, 928],
    'Tripp County': [46123, 807, 671, 948, 788, 999, 830, 1114, 925, 1132, 940],
    'Turner County': [46125, 635, 1043, 746, 1225, 786, 1291, 877, 1439, 891, 1462],
    'Union County': [46127, 597, 1257, 701, 1477, 738, 1557, 823, 1736, 837, 1763],
    'Walworth County': [46129, 588, 1079, 691, 1267, 728, 1335, 811, 1489, 824, 1513],
    'Yankton County': [46135, 574, 1040, 674, 1222, 711, 1287, 792, 1436, 805, 1459],
    'Ziebach County': [46137, 796, 705, 935, 828, 985, 873, 1099, 973, 1116, 989],
}

IRS_HOUSING_TABLES = {
    'nebraska': IRS_HOUSING_NEBRASKA,
    'south dakota': IRS_HOUSING_SOUTH_DAKOTA,
}

# ---------------------------------------------------------------------------
# Line 36 - Chapter 13 administrative expense multiplier, by judicial
# district. Published as a percentage.
# Source: https://www.justice.gov/ust/eo/bapcpa/20260715/bci_data/ch13_exp_mult.htm
# ---------------------------------------------------------------------------
CH13_ADMIN_MULTIPLIER_PERCENT = {
    'nebraska': 8.4,
    'south dakota': 7.9,
}

# ---------------------------------------------------------------------------
# Line 40 - the 11 U.S.C. 707(b)(2)(A)(i) presumption thresholds.
#
# NOT SCRAPED. These are statutory dollar amounts, adjusted every three years
# under 11 U.S.C. 104, and they are printed on the face of the official form.
# The figures below are read off Official Form 122A-2, revision 04/25, the copy
# committed at data/templates/form_b122a-2.pdf, page 8 line 40:
#
#   "The line 39d is less than $10,275*"      -> no presumption of abuse
#   "The line 39d is more than $17,150*"      -> presumption of abuse
#   at least $10,275 but not more than $17,150 -> go to line 41
#
# Source of the form: https://www.uscourts.gov/forms-rules/forms/chapter-7-means-test-calculation-0
# (form file b_122a-2_0425-form.pdf, "Updated on April 1, 2025").
#
# ATTORNEY SIGN-OFF REQUIRED before changing either number, and before shipping
# a newer form revision. The next adjustment is due on the three-year cycle;
# when the courts publish a revised 122A-2, the template AND these two figures
# have to move together, or the interview will print a decision that does not
# match the form the filer signs.
# ---------------------------------------------------------------------------
MEANS_TEST_THRESHOLD_LOW = 10275
MEANS_TEST_THRESHOLD_HIGH = 17150
MEANS_TEST_FORM_REVISION = '04/25'

# ---------------------------------------------------------------------------
# Lookups.
#
# Every one of these is defended: the interview can reach them with a household
# size that is blank, a county the filer has not chosen yet, or a state string
# in any casing. None of them may raise, because a raise here is a crash on the
# way to assembling a court filing. Where input is unusable they fall back to
# the smallest household and to Nebraska, and the caller is expected to have
# collected real values before the figures reach the PDF.
# ---------------------------------------------------------------------------


def _household_size(value):
    """Coerce a household size to an integer of at least 1."""
    try:
        size = int(float(value))
    except (TypeError, ValueError):
        return 1
    return size if size >= 1 else 1


def _state_key(state):
    """Normalise a state to a key in IRS_HOUSING_TABLES. The interview supports
    Nebraska and South Dakota only; anything else falls back to Nebraska."""
    text = str(state or '').lower()
    return 'south dakota' if 'south dakota' in text else 'nebraska'


def get_national_standard(household_size):
    """Line 6. Households over four add a fixed amount per additional person."""
    size = _household_size(household_size)
    if size <= 4:
        return IRS_NATIONAL_STANDARDS.get(size, IRS_NATIONAL_STANDARDS[1])
    return (IRS_NATIONAL_STANDARDS[4]
            + (size - 4) * IRS_NATIONAL_STANDARDS_ADDITIONAL_PER_PERSON)


def get_oop_healthcare(under_65_count, over_65_count):
    """Lines 7a to 7g. Returns (per-person under 65, subtotal under 65,
    per-person 65 and over, subtotal 65 and over, total)."""
    try:
        younger = max(0, int(float(under_65_count or 0)))
    except (TypeError, ValueError):
        younger = 0
    try:
        older = max(0, int(float(over_65_count or 0)))
    except (TypeError, ValueError):
        older = 0
    younger_subtotal = IRS_OOP_HEALTHCARE_UNDER_65 * younger
    older_subtotal = IRS_OOP_HEALTHCARE_65_AND_OVER * older
    return (IRS_OOP_HEALTHCARE_UNDER_65, younger_subtotal,
            IRS_OOP_HEALTHCARE_65_AND_OVER, older_subtotal,
            younger_subtotal + older_subtotal)


def _housing_row(state, county):
    table = IRS_HOUSING_TABLES[_state_key(state)]
    row = table.get(str(county or '').strip())
    if row is None:
        return None
    return row


def get_housing_standards(state, county, household_size):
    """Lines 8 and 9a. Returns (insurance and operating, mortgage or rent).

    Returns (0, 0) for a county that is not in the published table rather than
    raising, so a half-answered interview cannot crash on the way to the PDF.
    A zero here is visible on the form and on the review screen; a traceback
    would lose the filer's session.
    """
    row = _housing_row(state, county)
    if row is None:
        return (0, 0)
    size = _household_size(household_size)
    if size > 5:
        size = 5
    # row = [FIPS, nm1, mr1, nm2, mr2, nm3, mr3, nm4, mr4, nm5, mr5]
    offset = 1 + (size - 1) * 2
    return (row[offset], row[offset + 1])


def get_housing_fips(state, county):
    """The published FIPS code for a county, or None. Not printed on the form;
    kept so a future maintainer can line a row up against the USTP workbook."""
    row = _housing_row(state, county)
    return row[0] if row else None


def get_vehicle_operating_cost(vehicle_count):
    """Line 12. Nebraska and South Dakota take the Midwest regional figure; the
    published table stops at two vehicles and so does Form 122A-2."""
    try:
        count = int(float(vehicle_count or 0))
    except (TypeError, ValueError):
        count = 0
    if count <= 0:
        return 0
    if count >= 2:
        return IRS_TRANSPORTATION_OPERATING_MIDWEST[2]
    return IRS_TRANSPORTATION_OPERATING_MIDWEST[1]


def get_vehicle_ownership_cost(vehicle_count=1):
    """Lines 13a and 13d. The form claims ownership cost one vehicle at a time,
    so the per-vehicle figure is what a builder normally wants."""
    try:
        count = int(float(vehicle_count or 1))
    except (TypeError, ValueError):
        count = 1
    if count <= 1:
        return IRS_TRANSPORTATION_OWNERSHIP[1]
    return IRS_TRANSPORTATION_OWNERSHIP[2]


def get_public_transportation_cost():
    """Line 14."""
    return IRS_PUBLIC_TRANSPORTATION


def get_ch13_multiplier(state):
    """Line 36, as a decimal fraction (8.4 per cent -> 0.084)."""
    return CH13_ADMIN_MULTIPLIER_PERCENT.get(_state_key(state), 0) / 100.0


def presumption_of_abuse(line_39d):
    """Line 40. Returns one of 'none', 'presumed', or 'check_line_41'.

    'check_line_41' means the total falls in the band where the answer depends
    on the filer's non-priority unsecured debt, which is line 41 of the form.
    """
    try:
        total = float(line_39d or 0)
    except (TypeError, ValueError):
        total = 0.0
    if total < MEANS_TEST_THRESHOLD_LOW:
        return 'none'
    if total > MEANS_TEST_THRESHOLD_HIGH:
        return 'presumed'
    return 'check_line_41'
