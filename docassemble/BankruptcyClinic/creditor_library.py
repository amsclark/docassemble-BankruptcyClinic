"""
Shared Creditor Library
-----------------------
Provides functions to manage a clinic-wide library of common creditors
that persists across interview sessions using docassemble's SQL-based
write_record() / read_records() / delete_record() functions.

All creditors are stored under a single namespaced key so that any
interview on the server can access them.
"""

from docassemble.base.util import write_record, read_records, delete_record

# Namespaced key to avoid collisions with other packages on the same server
CREDITOR_LIBRARY_KEY = 'docassemble.BankruptcyClinic:common_creditors'


def get_all_creditors():
    """Return a dict of {record_id: creditor_data} for all library creditors."""
    return read_records(CREDITOR_LIBRARY_KEY)


def add_creditor(name, street, city, state, zip_code, creditor_type,
                 account_suffix='', notes=''):
    """
    Add a creditor to the shared library.

    Parameters
    ----------
    name : str
        Creditor's legal / business name.
    street : str
        Street address or PO Box.
    city : str
        City.
    state : str
        Two-letter state abbreviation.
    zip_code : str
        5-digit ZIP code.
    creditor_type : str
        One of the standard bankruptcy creditor types
        (e.g. 'Credit Card', 'Medical', 'Student loans', etc.).
    account_suffix : str, optional
        Last 4 digits of the account number (helpful for pre-fill).
    notes : str, optional
        Free-text notes for clinic staff.

    Returns
    -------
    int
        The unique record ID assigned by docassemble.
    """
    data = {
        'name': str(name),
        'street': str(street),
        'city': str(city),
        'state': str(state),
        'zip': str(zip_code),
        'type': str(creditor_type),
        'account_suffix': str(account_suffix),
        'notes': str(notes),
    }
    return write_record(CREDITOR_LIBRARY_KEY, data)


def remove_creditor(record_id):
    """Delete a single creditor record by its integer ID."""
    delete_record(CREDITOR_LIBRARY_KEY, record_id)


def get_creditor_choices(creditor_type_filter=None):
    """
    Return a list of dicts suitable for docassemble checkbox choices.

    Each item has:
      - 'value': the record ID (as a string, for use in checkbox values)
      - 'label': a human-readable display string
      - 'data':  the full creditor dict

    Parameters
    ----------
    creditor_type_filter : str or None
        If given, only return creditors whose 'type' matches.
    """
    records = get_all_creditors()
    choices = []
    for rec_id, data in records.items():
        if creditor_type_filter and data.get('type') != creditor_type_filter:
            continue
        label = f"{data['name']} — {data['city']}, {data['state']} ({data['type']})"
        choices.append({
            'value': str(rec_id),
            'label': label,
            'data': data,
        })
    # Sort alphabetically by label for consistent display
    choices.sort(key=lambda c: c['label'])
    return choices


def get_creditor_table_data():
    """
    Return a list of dicts for display in a table, with record IDs included.
    Sorted alphabetically by name.
    """
    records = get_all_creditors()
    rows = []
    for rec_id, data in records.items():
        row = dict(data)
        row['id'] = rec_id
        rows.append(row)
    rows.sort(key=lambda r: r.get('name', ''))
    return rows
