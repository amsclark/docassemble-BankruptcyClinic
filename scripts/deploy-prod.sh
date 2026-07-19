#!/usr/bin/env bash
#
# Deploy the package to the UAT/prod server (docassemble2.metatheria.solutions)
# via the docassemble package API. For the LOCAL docker container use ./deploy.sh.
#
# Usage:
#   ./scripts/deploy-prod.sh
#
# Credentials: sources ~/.config/bankruptcyclinic/prod-creds.env (DA_SERVER,
# DA_API_KEY) unless DA_API_KEY is already in the environment. Never commit
# credentials.
#
# Exit: 0 = installed and server healthy, non-zero otherwise.
set -euo pipefail

CREDS="${DA_PROD_CREDS:-$HOME/.config/bankruptcyclinic/prod-creds.env}"
if [ -z "${DA_API_KEY:-}" ] && [ -f "$CREDS" ]; then
  set -a; . "$CREDS"; set +a
fi
DA_SERVER="${DA_SERVER:-https://docassemble2.metatheria.solutions}"
if [ -z "${DA_API_KEY:-}" ]; then
  echo "ERROR: DA_API_KEY not set and $CREDS not found" >&2
  exit 2
fi

PACKAGE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ZIP=/tmp/da-package-prod.zip

echo "Building package zip from $PACKAGE_DIR ..."
cd "$(dirname "$PACKAGE_DIR")"
rm -f "$ZIP"
zip -r "$ZIP" \
  "$(basename "$PACKAGE_DIR")/setup.py" \
  "$(basename "$PACKAGE_DIR")/setup.cfg" \
  "$(basename "$PACKAGE_DIR")/README.md" \
  "$(basename "$PACKAGE_DIR")/LICENSE" \
  "$(basename "$PACKAGE_DIR")/docassemble/" \
  -x "*.pyc" -x "*__pycache__*" > /dev/null
echo "Package zip: $(ls -lh "$ZIP" | awk '{print $5}')"

echo "Uploading to $DA_SERVER/api/package ..."
RESP=$(curl -fsS --max-time 120 -X POST "$DA_SERVER/api/package" \
  -H "X-API-Key: $DA_API_KEY" \
  -F "zip=@$ZIP")
TASK_ID=$(printf '%s' "$RESP" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("task_id",""))' 2>/dev/null || true)
if [ -z "$TASK_ID" ]; then
  echo "ERROR: no task_id in response: $RESP" >&2
  exit 1
fi
echo "Install task: $TASK_ID"

# Poll until the background install finishes (server restarts on success).
for i in $(seq 1 60); do
  sleep 5
  STATUS=$(curl -fsS --max-time 20 \
    -H "X-API-Key: $DA_API_KEY" \
    "$DA_SERVER/api/package_update_status?task_id=$TASK_ID" 2>/dev/null || echo '{}')
  STATE=$(printf '%s' "$STATUS" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("status","unknown"))' 2>/dev/null || echo unknown)
  if [ "$STATE" = "completed" ]; then
    OK=$(printf '%s' "$STATUS" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("ok"))' 2>/dev/null || echo None)
    if [ "$OK" = "True" ]; then
      echo "Install completed OK."
      break
    fi
    echo "ERROR: install failed:" >&2
    printf '%s\n' "$STATUS" >&2
    exit 1
  fi
  echo "  ... $STATE ($((i * 5))s)"
  if [ "$i" -eq 60 ]; then
    echo "ERROR: install did not complete within 300s" >&2
    exit 1
  fi
done

echo "Waiting for interview to come back ..."
URL="$DA_SERVER/interview?i=docassemble.BankruptcyClinic:data/questions/voluntary-petition.yml&new_session=1"
for i in $(seq 1 30); do
  sleep 4
  HTTP=$(curl -s -o /dev/null --max-time 20 -w "%{http_code}" "$URL" 2>/dev/null || echo 000)
  if [ "$HTTP" = "200" ]; then
    echo "Server is healthy: $URL"
    exit 0
  fi
done
echo "ERROR: interview did not return 200 within timeout" >&2
exit 1
