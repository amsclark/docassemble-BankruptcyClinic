#!/usr/bin/env bash
#
# Prod log scanner — pull the docassemble production logs and surface real
# user-facing crashes (tracebacks, seek loops, undefined-variable dead ends)
# without waiting for a tester to email a screenshot.
#
# Today's root causes ("Infinite loop: x.gathered", "infinite loop:
# x.median_dependents") were only visible in these logs. Prod rotates
# frequently and a daily ~06:25 restart truncates docassemble.log, so run this
# at least daily (cron/scheduled job) to not lose same-day crashes.
#
# Usage:
#   DA_SERVER=https://docassemble2.metatheria.solutions \
#   DA_API_KEY=... DA_ADMIN_USER=admin@example.com DA_ADMIN_PASS=... \
#   ./scripts/scan_prod_logs.sh [rotations-to-scan]
#
# The API key must belong to an admin account; /api/login_url additionally
# requires the account's username AND password to mint the autologin session.
# NEVER commit credentials; pass them via environment (or a local .env
# outside git).
#
# Exit: 0 = no crash signatures found, 1 = findings (prints them), 2 = setup error.
set -u

DA_SERVER="${DA_SERVER:-https://docassemble2.metatheria.solutions}"
ROTATIONS="${1:-3}"   # how many docassemble.log.N rotations to scan besides current

if [ -z "${DA_API_KEY:-}" ] || [ -z "${DA_ADMIN_PASS:-}" ]; then
  echo "ERROR: set DA_API_KEY and DA_ADMIN_PASS (admin credentials for $DA_SERVER)" >&2
  exit 2
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
JAR="$WORK/cookies.jar"

# 1. Mint an autologin URL from the API key, establish a session cookie.
AUTOLOGIN=$(curl -fsS -X POST "$DA_SERVER/api/login_url" \
  -H "X-API-Key: $DA_API_KEY" \
  --data-urlencode "username=${DA_ADMIN_USER:-admin@admin.com}" \
  --data-urlencode "password=$DA_ADMIN_PASS" 2>/dev/null \
  | python3 -c 'import sys,json; print(json.load(sys.stdin))' 2>/dev/null)
if [ -z "$AUTOLOGIN" ]; then
  echo "ERROR: could not mint autologin URL (check DA_API_KEY / DA_ADMIN_USER)" >&2
  exit 2
fi
curl -fsS -c "$JAR" -L "$AUTOLOGIN" -o /dev/null || { echo "ERROR: autologin failed" >&2; exit 2; }

# 2. Fetch current log + recent rotations.
FILES="docassemble.log"
for n in $(seq 1 "$ROTATIONS"); do FILES="$FILES docassemble.log.$n"; done

for f in $FILES; do
  curl -fsS -b "$JAR" "$DA_SERVER/logfile/$f" -o "$WORK/$f" 2>/dev/null || true
done

# 3. Scan for the crash signatures that mean a USER hit a dead end.
#    (Same classes the static gates guard against — this is the runtime
#    confirmation loop.)
PATTERNS='Traceback (most recent call last)|[Ii]nfinite loop|There was a reference to a variable|could not be looked up|DAError|Exception raised'

FOUND=0
for f in $FILES; do
  [ -s "$WORK/$f" ] || continue
  HITS=$(grep -nE "$PATTERNS" "$WORK/$f" | grep -vE 'apache|startup' || true)
  if [ -n "$HITS" ]; then
    FOUND=1
    echo "════ $f ════"
    # Show each hit with 6 lines of context (enough for the variable name /
    # bottom of the traceback).
    grep -nE -A 6 "$PATTERNS" "$WORK/$f" | tail -n 200
    echo
  fi
done

if [ "$FOUND" -eq 0 ]; then
  echo "OK: no crash signatures in $FILES on $DA_SERVER."
  exit 0
fi
echo "FINDINGS above — each one is a real user hitting a dead end. Reproduce locally per CLAUDE.md (deploy.sh + docker log tail)."
exit 1
