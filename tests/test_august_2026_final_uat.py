"""Regression coverage for Roxanne and William's final August 2026 UAT."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OBJECTS = (ROOT / 'docassemble/BankruptcyClinic/objects.py').read_text()


def test_south_dakota_repealed_furniture_exemption_is_not_offered():
    south_dakota_block = OBJECTS.split('SOUTH_DAKOTA_EXEMPTIONS = {', 1)[1].split(
        'NEBRASKA_EXEMPTIONS = {', 1
    )[0]
    south_dakota_limits = OBJECTS.split("if 'south dakota' in state_str:", 1)[1].split(
        'else:', 1
    )[0]
    assert "'household_goods'" not in south_dakota_block
    assert "'household_goods'" not in south_dakota_limits


def test_south_dakota_has_no_tools_exemption_and_both_life_insurance_citations():
    south_dakota_block = OBJECTS.split('SOUTH_DAKOTA_EXEMPTIONS = {', 1)[1].split(
        'NEBRASKA_EXEMPTIONS = {', 1
    )[0]
    south_dakota_limits = OBJECTS.split("if 'south dakota' in state_str:", 1)[1].split(
        'else:', 1
    )[0]
    assert "'tools'" not in south_dakota_block
    assert "'tools'" not in south_dakota_limits
    assert "'life_insurance': 'Life insurance proceeds (SDCL 58-12-4, 43-45-6)'" in OBJECTS


def test_declaration_does_not_preprint_debtor_signatures():
    source = (ROOT / 'docassemble/BankruptcyClinic/data/questions/106Dec-question-blocks.yml').read_text()
    assert "declaration_fields['Debtor1.signature'] = ''" in source
    assert "declaration_fields['Debtor2.signature'] = ''" in source
    assert "'/s/ '" not in source


if __name__ == '__main__':
    test_south_dakota_repealed_furniture_exemption_is_not_offered()
    test_south_dakota_has_no_tools_exemption_and_both_life_insurance_citations()
    test_declaration_does_not_preprint_debtor_signatures()
    print('OK: all August 2026 final-UAT regression tests passed')
