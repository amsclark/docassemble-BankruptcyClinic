#!/bin/bash
# Stand up (or refresh) a pool of docassemble containers for parallel testing,
# one per Playwright worker — the fix for parallel-run flakiness.
#
# A single docassemble instance is the unit of concurrency: pointing several
# workers at one container overloads its single-process server and DB
# connections (slow renders / "SSL decryption failed" errors). Giving each
# worker its OWN container removes the contention entirely (proven: the specs
# that were flaky at workers=3-on-one-container pass clean first-try at
# workers=4 across 4 containers).
#
# New containers are CLONED from an existing working container (docker commit)
# rather than pulled fresh — a fresh `jhpyle/docassemble` pull uses a newer
# image layout that deploy.sh doesn't drive. After cloning, the package is
# (re)deployed into each clone (the clone's fresh DB loses the package
# registration even though the files are present).
#
# Usage:
#   ./scripts/test-container-pool.sh up      # create datest2/3 (ports 8910/8920) + deploy
#   ./scripts/test-container-pool.sh deploy  # redeploy current package to the whole pool
#   ./scripts/test-container-pool.sh down     # remove the extra clones
#   ./scripts/test-container-pool.sh env      # print the DA_CONTAINERS line to export
#
# Then run the suite across the pool:
#   DA_CONTAINERS="$(./scripts/test-container-pool.sh env)" npx playwright test --workers=4
set -uo pipefail
cd "$(dirname "$0")/.."

DOCKER="sg docker -c"
BASE_CONTAINER="${DA_BASE_CONTAINER:-datest}"     # an existing working container to clone
CLONES=("datest2:8910" "datest3:8920")            # name:hostport
POOL_URLS="http://localhost:8080,http://localhost:8900,http://localhost:8910,http://localhost:8920"

case "${1:-}" in
  up)
    echo "Cloning $BASE_CONTAINER -> dabank-test:clone"
    $DOCKER "docker commit $BASE_CONTAINER dabank-test:clone" >/dev/null
    for spec in "${CLONES[@]}"; do
      name="${spec%%:*}"; port="${spec##*:}"
      $DOCKER "docker rm -f $name" >/dev/null 2>&1 || true
      echo "Starting $name on :$port"
      $DOCKER "docker run -d --name $name -p ${port}:80 dabank-test:clone" >/dev/null
    done
    echo "Waiting for clones to serve..."
    for spec in "${CLONES[@]}"; do
      port="${spec##*:}"
      until curl -s -o /dev/null -w '%{http_code}' --max-time 8 "http://localhost:${port}/" 2>/dev/null | grep -q 200; do sleep 10; done
    done
    "$0" deploy
    ;;
  deploy)
    for c in datest2 datest3; do
      $DOCKER "docker ps --format '{{.Names}}'" | grep -qx "$c" && { echo "deploy -> $c"; DA_CONTAINER="$c" ./deploy.sh >/dev/null 2>&1 && echo "  ok"; }
    done
    echo "(also redeploy the base pool members 'docassemble' and '$BASE_CONTAINER' with ./deploy.sh / DA_CONTAINER=$BASE_CONTAINER ./deploy.sh as needed)"
    ;;
  down)
    for spec in "${CLONES[@]}"; do name="${spec%%:*}"; $DOCKER "docker rm -f $name" >/dev/null 2>&1 && echo "removed $name"; done
    ;;
  env)
    echo "$POOL_URLS"
    ;;
  *)
    echo "usage: $0 {up|deploy|down|env}"; exit 2;;
esac
