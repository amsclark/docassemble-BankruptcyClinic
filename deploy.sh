#!/bin/bash
# Deploy the docassemble package to the local server.
# Usage: ./deploy.sh

set -e

API_KEY="${DA_API_KEY:-M1L356QF6eplHGeaNNkF8QxDic126Wtv}"
API_URL="${DA_API_URL:-http://localhost:8080}"
PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Building package zip..."
cd "$(dirname "$PACKAGE_DIR")"
rm -f /tmp/da-package.zip
zip -r /tmp/da-package.zip \
  "$(basename "$PACKAGE_DIR")/setup.py" \
  "$(basename "$PACKAGE_DIR")/setup.cfg" \
  "$(basename "$PACKAGE_DIR")/README.md" \
  "$(basename "$PACKAGE_DIR")/LICENSE" \
  "$(basename "$PACKAGE_DIR")/docassemble/" \
  -x "*.pyc" -x "*__pycache__*" > /dev/null

SIZE=$(ls -lh /tmp/da-package.zip | awk '{print $5}')
echo "Package zip: $SIZE"

echo "Uploading to $API_URL..."
TASK_ID=$(curl -s -X POST \
  -H "X-API-Key: $API_KEY" \
  -F "zip=@/tmp/da-package.zip" \
  "$API_URL/api/package" | python3 -c "import sys,json; print(json.load(sys.stdin)['task_id'])")
echo "Task ID: $TASK_ID"

echo "Waiting for install..."
for i in $(seq 1 60); do
  RESULT=$(curl -s -H "X-API-Key: $API_KEY" \
    "$API_URL/api/package_update_status?task_id=$TASK_ID" 2>/dev/null)
  STATUS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','?'))" 2>/dev/null)

  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "unknown" ]; then
    echo "Install completed (status: $STATUS). Server may restart..."
    break
  fi
  printf "."
  sleep 5
done
echo

# Wait for server to come back
echo "Waiting for server..."
for i in $(seq 1 30); do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/" 2>/dev/null)
  if [ "$HTTP" = "200" ]; then
    echo "Server is ready!"
    exit 0
  fi
  sleep 3
done
echo "Warning: server did not come back within timeout"
exit 1
