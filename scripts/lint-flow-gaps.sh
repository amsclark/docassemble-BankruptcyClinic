#!/bin/bash
# Flow-gap gate for assembled forms.
#
# Runs scripts/form_variable_manifest.py, which works backward from each
# assembled PDF and reports interview variables that a form reads but that may
# not be defined when the form assembles:
#   NEVER_DEFINED - read by a form, defined nowhere (typo / missing field)
#   SHOWIF_GAP    - defined only behind a `show if`, read without mirroring it
# Either can crash interview assembly on a branch the happy-path tests skip.
#
# This is a burn-down gate, NOT a strict snapshot:
#   - NEW findings (not in the baseline) FAIL the build  -> you introduced a gap.
#   - FIXED findings (in baseline, now gone) PASS, and prompt you to tighten the
#     baseline with --update.
#
# Usage:
#   ./scripts/lint-flow-gaps.sh           # check
#   ./scripts/lint-flow-gaps.sh --update  # regenerate baseline after fixing/adding
set -uo pipefail
cd "$(dirname "$0")/.."

BASE="scripts/form-variables-baseline.txt"
GEN=(python3 scripts/form_variable_manifest.py --findings)

if [ "${1:-}" = "--update" ]; then
  "${GEN[@]}" > "$BASE"
  echo "✅ Updated $BASE ($(wc -l < "$BASE") findings)"
  exit 0
fi

if [ ! -f "$BASE" ]; then
  echo "❌ Baseline missing: $BASE — run: $0 --update"
  exit 1
fi

CUR=$(mktemp); trap 'rm -f "$CUR"' EXIT
"${GEN[@]}" | sort > "$CUR"
sort "$BASE" -o "$BASE.sorted.tmp"; mv "$BASE.sorted.tmp" "$CUR.base" 2>/dev/null || cp "$BASE" "$CUR.base"
sort "$BASE" > "$CUR.base"

NEW=$(comm -13 "$CUR.base" "$CUR")
FIXED=$(comm -23 "$CUR.base" "$CUR")
rm -f "$CUR.base"

if [ -n "$NEW" ]; then
  echo "❌ flow-gaps: NEW undefined-at-assembly risk(s) introduced:"
  echo
  echo "$NEW" | sed 's/^/  + /'
  echo
  echo "Each line is: <file>  <form>  <type>  <variable>"
  echo "Fix by: mirroring the show-if in the form builder, guarding the read with"
  echo "getattr()/defined(), or defining the variable before assembly. See CLAUDE.md."
  echo "If genuinely intentional, run: $0 --update"
  exit 1
fi

if [ -n "$FIXED" ]; then
  echo "✅ flow-gaps: no new risks. $(echo "$FIXED" | grep -c .) baseline finding(s) now FIXED — tighten with: $0 --update"
  exit 0
fi

echo "✅ flow-gaps: clean (no new undefined-at-assembly risks)"
exit 0
