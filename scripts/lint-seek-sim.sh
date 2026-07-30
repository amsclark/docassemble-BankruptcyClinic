#!/bin/bash
# Seek-simulation gate: path-sensitive undefined-variable / infinite-loop check.
#
# Runs scripts/seek_simulator.py, which symbolically executes the interview's
# mandatory flow the way docassemble's seek resolver does, across the
# cross-product of long-range answer configurations. Findings:
#   DEAD_END       - a path reaches a read no definer block can satisfy
#   SEEK_CYCLE     - seeking X transitively re-seeks X ("Infinite loop")
#   OUT_OF_ORDER   - a screen template pulls another question out of order
#   SHOWIF_RESHOW  - a show-if'd field is read on a path where it may be
#                    hidden -> the engine re-presents an answered screen/loops
#   REVIEW_OMITTED - a review item reads a never-defined name -> docassemble
#                    silently omits the item for EVERY user (no crash; the
#                    Revisit entry just never displays)
#
# Burn-down gate, same contract as lint-flow-gaps.sh:
#   - NEW findings (not in the baseline) FAIL the build.
#   - FIXED findings prompt you to tighten with --update.
# Crash/loop findings are ZERO — the interview simulates clean; keep it that
# way. The baseline holds 13 REVIEW_OMITTED typos awaiting burn-down.
#
# Usage:
#   ./scripts/lint-seek-sim.sh           # check
#   ./scripts/lint-seek-sim.sh --update  # regenerate baseline
set -uo pipefail
cd "$(dirname "$0")/.."

BASE="scripts/seek-sim-baseline.txt"
GEN=(python3 scripts/seek_simulator.py --findings)

if [ "${1:-}" = "--update" ]; then
  "${GEN[@]}" > "$BASE"
  echo "✅ Updated $BASE ($(grep -c . "$BASE" || true) findings)"
  exit 0
fi

if [ ! -f "$BASE" ]; then
  echo "❌ Baseline missing: $BASE — run: $0 --update"
  exit 1
fi

CUR=$(mktemp); trap 'rm -f "$CUR" "$CUR.base"' EXIT
"${GEN[@]}" | sort > "$CUR"
sort "$BASE" > "$CUR.base"

NEW=$(comm -13 "$CUR.base" "$CUR")
FIXED=$(comm -23 "$CUR.base" "$CUR")

if [ -n "$NEW" ]; then
  echo "❌ seek-sim: NEW crash/loop path(s) introduced:"
  echo
  echo "$NEW" | sed 's/^/  + /'
  echo
  echo "Each line is: <definer/site>  <kind>  <variable>  [config] <seek chain>"
  echo "The [config] bracket is a reproduction recipe: those long-range answers"
  echo "drive the interview onto the failing path. Fix by mirroring the show-if"
  echo "condition at the read, guarding with getattr()/defined(), or making the"
  echo "mandatory block collect the variable on that branch. See CLAUDE.md."
  echo "If genuinely intentional, run: $0 --update"
  exit 1
fi

if [ -n "$FIXED" ]; then
  echo "✅ seek-sim: no new findings. $(echo "$FIXED" | grep -c .) baseline finding(s) now FIXED — tighten with: $0 --update"
  exit 0
fi

echo "✅ seek-sim: clean (no crash/loop paths across all configurations)"
exit 0
