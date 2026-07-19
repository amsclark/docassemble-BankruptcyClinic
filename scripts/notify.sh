#!/usr/bin/env bash
#
# Push a notification via ntfy.sh (used by the feedback loop to flag runs
# that produced work: a PR, a UAT deploy, a reply file, or a failure).
#
# Usage: ./scripts/notify.sh "Title" "Body text"
#
# The topic name acts as the only access control, so it is random and lives
# outside git in ~/.config/bankruptcyclinic/notify.env (NTFY_TOPIC=...).
# Subscribe on your phone/browser at https://ntfy.sh/<topic>.
#
# Exits 0 when unconfigured so a missing topic never breaks the caller.
set -u

CONF="${NTFY_CONF:-$HOME/.config/bankruptcyclinic/notify.env}"
if [ -z "${NTFY_TOPIC:-}" ] && [ -f "$CONF" ]; then
  set -a; . "$CONF"; set +a
fi
if [ -z "${NTFY_TOPIC:-}" ]; then
  echo "notify.sh: NTFY_TOPIC not set ($CONF missing?) — skipping notification" >&2
  exit 0
fi

TITLE="${1:-BankruptcyClinic}"
BODY="${2:-(no message)}"

curl -fsS --max-time 15 \
  -H "Title: $TITLE" \
  -H "Priority: ${NTFY_PRIORITY:-default}" \
  -d "$BODY" \
  "https://ntfy.sh/$NTFY_TOPIC" > /dev/null \
  || { echo "notify.sh: ntfy.sh POST failed" >&2; exit 0; }
echo "notified: $TITLE"
