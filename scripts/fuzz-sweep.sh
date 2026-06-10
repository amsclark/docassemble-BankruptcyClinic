#!/bin/bash
# Wide seeded-fuzz sweep, sharded across docassemble containers.
#
# Usage:
#   ./scripts/fuzz-sweep.sh <first-seed> <last-seed> <base-url> [base-url...]
#   ./scripts/fuzz-sweep.sh 1 50 http://localhost:8080 http://localhost:8900
#
# Seeds are split round-robin across the given URLs; one playwright process
# per shard (each --workers=1 so a shard's seeds run serially against its own
# container — no interview-lock contention). Logs land in
# /tmp/fuzz-sweep/<port>.log; a summary with every failing seed (replayable
# via FUZZ_SEEDS=<seed>) prints at the end.
set -uo pipefail
cd "$(dirname "$0")/.."

FIRST=$1; LAST=$2; shift 2
URLS=("$@")
N=${#URLS[@]}
[ "$N" -ge 1 ] || { echo "need at least one base url"; exit 2; }

OUT=/tmp/fuzz-sweep
mkdir -p "$OUT"

declare -a SHARD_SEEDS
for ((s=FIRST; s<=LAST; s++)); do
  idx=$(( (s - FIRST) % N ))
  SHARD_SEEDS[$idx]="${SHARD_SEEDS[$idx]:-}${SHARD_SEEDS[$idx]:+,}$s"
done

PIDS=()
for ((i=0; i<N; i++)); do
  url=${URLS[$i]}
  port=${url##*:}
  echo "shard $i -> $url seeds ${SHARD_SEEDS[$i]}"
  BASE_URL="$url" FUZZ_SEEDS="${SHARD_SEEDS[$i]}" \
    npx playwright test tests/fuzz-walker.spec.ts --workers=1 --retries=0 \
    > "$OUT/shard-$port.log" 2>&1 &
  PIDS+=($!)
done

FAIL=0
for p in "${PIDS[@]}"; do wait "$p" || FAIL=1; done

echo
echo "════ SWEEP SUMMARY (seeds $FIRST-$LAST over $N shards) ════"
for ((i=0; i<N; i++)); do
  port=${URLS[$i]##*:}
  log="$OUT/shard-$port.log"
  passed=$(grep -oE '[0-9]+ passed' "$log" | tail -1)
  failed=$(grep -oE '[0-9]+ failed' "$log" | tail -1)
  echo "shard :$port  ${passed:-?} ${failed:-0 failed}"
  # Every distinct failing seed, replayable
  grep -oE 'Replay: FUZZ_SEEDS=[0-9]+' "$log" | sort -u | sed 's/^/    /'
  grep -E 'SILENT BLOCK' "$log" | sed 's/\x1b\[[0-9;]*[A-Za-z]//g' | sort -u | sed 's/^/    /'
done
exit $FAIL
