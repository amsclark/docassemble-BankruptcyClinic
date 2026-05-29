#!/bin/bash
# Lint guard for test files — fails CI if any spec uses a selector pattern
# known to cause silent test failures.
#
# Banned patterns:
#   button:has-text("Yes")
#   button:has-text("No")
#     → ambiguous on multi-yesno pages; resolves to the first Yes/No on the
#       page rather than the gate the test wants. Use clickYesNoButton(page,
#       'var.name', yes) or clickGate(page, 'var.name', yes) — both anchor
#       to the specific field by name.
#
# Allowlist:
#   Tests can opt out per-line by appending  // selector-lint-ok: <reason>
#   to the offending line.

set -uo pipefail

cd "$(dirname "$0")/.."

# Files to scan
files=$(find tests -name "*.spec.ts" -not -path "*/archive/*")

violations=0

for file in $files; do
  # Look for the banned patterns, skipping lines with the allowlist tag.
  while IFS= read -r match; do
    if echo "$match" | grep -qF 'selector-lint-ok:'; then
      continue
    fi
    if [ -z "$match" ]; then continue; fi
    if [ $violations -eq 0 ]; then
      echo "❌ selector-lint failures:"
      echo
    fi
    echo "  $file:$match"
    violations=$((violations + 1))
  done < <(grep -nE 'button:has-text\("(Yes|No)"\)' "$file")
done

if [ $violations -gt 0 ]; then
  echo
  echo "Found $violations ambiguous-selector usage(s)."
  echo
  echo "Banned patterns and fixes:"
  echo "  ✗  page.locator('button:has-text(\"Yes\")').first().click()"
  echo "  ✓  await clickYesNoButton(page, 'prop.creditors.there_is_another', true)"
  echo "  ✓  await pickYesNoradio(page, 'var.name', true)  // for radios"
  echo
  echo "If a specific call is intentional and unambiguous (e.g. inside an"
  echo "isolated card where only one Yes button exists), append:"
  echo "  // selector-lint-ok: only one Yes button rendered here"
  echo "to silence the warning per-line."
  exit 1
fi

echo "✅ selector-lint: no banned patterns found in tests/*.spec.ts"
exit 0
