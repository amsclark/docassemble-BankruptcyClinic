#!/bin/bash
# Test-completeness gate.
#
# Principle: a test that stops mid-interview proves a screen, not the
# deliverable. Crashes like the 106AB grand-total sum or the means-test review
# loop only surface at (or near) final PDF assembly, and a mid-interview fix can
# introduce a later failure. So scenario/regression tests must drive ALL THE WAY
# THROUGH to PDF assembly and assert it (see tests/assert-helpers.ts
# finishAndAssertAllPdfs, or downloadAllPdfs + a conclusion assertion).
#
# A spec is "complete" if it references PDF assembly / the conclusion screen.
# Fast, intentionally-focused unit/probe specs are exempt via the baseline.
#
# Burn-down gate (like lint-flow-gaps.sh):
#   - A NEW incomplete spec (not in the baseline) FAILS  -> add full assembly.
#   - A spec that BECAME complete passes, and prompts --update to tighten.
#
# Usage:
#   ./scripts/lint-test-completeness.sh           # check
#   ./scripts/lint-test-completeness.sh --update  # regenerate baseline
set -uo pipefail
cd "$(dirname "$0")/.."

BASE="scripts/test-completeness-baseline.txt"
SIGNAL='downloadAllPdfs|finishAndAssertAllPdfs|documents are ready|interview questions complete|conclusion'

list_incomplete() {
  for f in tests/*.spec.ts; do
    grep -qE "$SIGNAL" "$f" || basename "$f"
  done | sort
}

if [ "${1:-}" = "--update" ]; then
  list_incomplete > "$BASE"
  echo "✅ Updated $BASE ($(wc -l < "$BASE") specs exempt / not-yet-complete)"
  exit 0
fi

if [ ! -f "$BASE" ]; then
  echo "❌ Baseline missing: $BASE — run: $0 --update"
  exit 1
fi

CUR=$(mktemp); BSORT=$(mktemp); trap 'rm -f "$CUR" "$BSORT"' EXIT
list_incomplete > "$CUR"
sort "$BASE" > "$BSORT"

NEW=$(comm -13 "$BSORT" "$CUR")
NOWDONE=$(comm -23 "$BSORT" "$CUR")

if [ -n "$NEW" ]; then
  echo "❌ test-completeness: spec(s) that do not drive to PDF assembly:"
  echo
  echo "$NEW" | sed 's/^/  + /'
  echo
  echo "Every scenario/regression test must finish the interview and assert the"
  echo "PDFs assemble. End the test with:"
  echo "    import { finishAndAssertAllPdfs } from './assert-helpers';"
  echo "    await finishAndAssertAllPdfs(page);"
  echo "If this is an intentionally-focused unit/probe test, exempt it: $0 --update"
  exit 1
fi

if [ -n "$NOWDONE" ]; then
  echo "✅ test-completeness: no new gaps. $(echo "$NOWDONE" | grep -c .) spec(s) now drive to assembly — tighten with: $0 --update"
  exit 0
fi

echo "✅ test-completeness: clean (no new mid-interview-only specs)"
exit 0
