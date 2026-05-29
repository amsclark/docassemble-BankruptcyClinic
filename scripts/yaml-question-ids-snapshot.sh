#!/bin/bash
# Snapshot guard for docassemble question ids.
#
# Tests anchor on question ids (heading text, button names, b64-encoded
# field names derived from id-bound variables). Silent renames in the
# YAML can break test selectors without obvious symptoms.
#
# This script:
#   1. Extracts every `^id: <name>` line from data/questions/*.yml
#   2. Sorts them as `<file>:<id>`
#   3. Compares to tests/fixtures/yaml-question-ids.snapshot.txt
#   4. Exits 0 if identical, 1 with a diff if not.
#
# Usage:
#   ./scripts/yaml-question-ids-snapshot.sh          # check
#   ./scripts/yaml-question-ids-snapshot.sh --update # regenerate
#
# When a check fails:
#   - Inspect the diff to see what was renamed / added / removed.
#   - Search test fixtures and selectors for the OLD id (it may be
#     referenced as a heading, page anchor, or variable suffix).
#   - When the rename has been propagated, regenerate the snapshot.

set -uo pipefail

cd "$(dirname "$0")/.."

SNAP="tests/fixtures/yaml-question-ids.snapshot.txt"

extract_ids() {
  find docassemble/BankruptcyClinic/data/questions -name '*.yml' \
    -not -path '*/archive/*' | sort | while read -r f; do
    awk -v fn="$f" '/^id: / {sub(/^id: /,""); print fn ":" $0}' "$f"
  done | sort -u
}

if [ "${1:-}" = "--update" ]; then
  mkdir -p "$(dirname "$SNAP")"
  extract_ids > "$SNAP"
  count=$(wc -l < "$SNAP")
  echo "✅ Updated $SNAP ($count ids)"
  exit 0
fi

if [ ! -f "$SNAP" ]; then
  echo "❌ Snapshot file missing: $SNAP"
  echo "   Run: $0 --update"
  exit 1
fi

CURRENT=$(mktemp)
trap 'rm -f "$CURRENT"' EXIT
extract_ids > "$CURRENT"

if diff -q "$SNAP" "$CURRENT" > /dev/null 2>&1; then
  count=$(wc -l < "$CURRENT")
  echo "✅ yaml-question-ids: snapshot matches ($count ids)"
  exit 0
fi

echo "❌ yaml-question-ids: snapshot mismatch"
echo
echo "Diff (snapshot → current):"
diff "$SNAP" "$CURRENT" | sed 's/^/  /'
echo
echo "If these changes are intentional:"
echo "  1. Audit tests for references to renamed / removed ids:"
echo "     grep -rn '<old-id>' tests/"
echo "  2. Update test selectors that anchor on these ids"
echo "  3. Regenerate the snapshot:"
echo "       ./scripts/yaml-question-ids-snapshot.sh --update"
exit 1
