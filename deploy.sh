#!/bin/bash
# Deploy the docassemble package to the local server.
# Usage: ./deploy.sh
#
# The Docker container has no DNS/internet, so we install directly
# with --no-build-isolation to use the already-installed setuptools.

set -e

API_KEY="${DA_API_KEY:-M1L356QF6eplHGeaNNkF8QxDic126Wtv}"
API_URL="${DA_API_URL:-http://localhost:8080}"
PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_CONTAINER="${DA_CONTAINER:-docassemble}"

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

# Copy zip into container and install directly with --no-build-isolation
# (the container has no internet access for pip build isolation)
echo "Copying zip to container..."
sg docker -c "docker cp /tmp/da-package.zip $DOCKER_CONTAINER:/tmp/da-package.zip"

echo "Installing package..."
sg docker -c "docker exec $DOCKER_CONTAINER /usr/share/docassemble/local3.12/bin/pip install \
  --no-build-isolation --no-cache-dir \
  --prefix=/usr/share/docassemble/local3.12 \
  --upgrade /tmp/da-package.zip 2>&1" | tail -5

echo "Restarting uwsgi..."
sg docker -c "docker exec $DOCKER_CONTAINER supervisorctl restart uwsgi 2>&1"

# Wait for server to come back
echo "Waiting for server..."
for i in $(seq 1 30); do
  sleep 2
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/" 2>/dev/null)
  if [ "$HTTP" = "200" ]; then
    echo "Server is ready!"
    exit 0
  fi
done
echo "Warning: server did not come back within timeout"
exit 1
