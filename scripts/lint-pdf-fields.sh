#!/bin/bash
# Gate: PDF form-builder keys must exist as fields in their PDF templates.
#
# docassemble fills a PDF by EXACT field-name match; a builder key that is not
# a field in the template is SILENTLY DROPPED (the answer never reaches the
# form). That is silent data loss on a sworn legal document — the scariest
# bug class on the deliverable (e.g. the 106AB jewelry / noInsurace
# misspellings and 101 `creditors_*` checkbox typos this check found).
#
# Burn-down gate (like lint:flow): NEW WROTE_NONEXISTENT findings fail the
# build; the baseline holds the triaged remainder (harmless dead keys +
# template-gap items awaiting attorney/template changes — see
# scripts/pdf-field-baseline.txt). After fixing one, tighten with --update.
set -uo pipefail
cd "$(dirname "$0")/.."

BASE="scripts/pdf-field-baseline.txt"
GEN=(python3 scripts/form_pdf_field_check.py --findings)

if [ "${1:-}" = "--update" ]; then
  "${GEN[@]}" > "$BASE"
  echo "✅ Updated $BASE ($(wc -l < "$BASE") findings)"
  exit 0
fi
if [ ! -f "$BASE" ]; then
  echo "❌ Baseline missing: $BASE — run: $0 --update"; exit 1
fi

CUR=$(mktemp); trap 'rm -f "$CUR" "$CUR.b"' EXIT
"${GEN[@]}" | sort > "$CUR"
sort "$BASE" > "$CUR.b"
NEW=$(comm -23 "$CUR" "$CUR.b")
if [ -n "$NEW" ]; then
  echo "❌ pdf-fields: NEW builder keys absent from their PDF template (silent data loss):"
  echo "$NEW" | sed 's/^/    /'
  echo "  Fix the builder key to the real template field name, or (if intended)"
  echo "  baseline with: $0 --update"
  exit 1
fi
echo "✅ pdf-fields: no new builder-key/template mismatches"
