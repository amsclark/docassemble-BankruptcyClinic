#!/bin/bash
# Mutation test for the static gates — "test the tests".
#
# A safety net that catches nothing is worthless. For each gate this injects a
# KNOWN bug of the class that gate is meant to catch, runs the gate, and
# asserts it FAILS (non-zero). Then it reverts the file via git. If a gate
# passes on its injected bug, that gate has no teeth — reported as BROKEN.
#
# Run from a clean working tree (it git-checkout-reverts each mutated file).
set -uo pipefail
cd "$(dirname "$0")/.."

FAILS=0
Q="docassemble/BankruptcyClinic/data/questions"

# usage: expect_gate_fails "<name>" "<file>" "<gate cmd>"  (mutation already applied)
check() {
  local name="$1" file="$2"; shift 2
  if "$@" >/dev/null 2>&1; then
    echo "  ✘ BROKEN: '$name' gate PASSED on an injected bug (no teeth)"; FAILS=1
  else
    echo "  ✓ '$name' gate caught the injected bug"
  fi
  git checkout -- "$file" 2>/dev/null
}

echo "Mutation-testing the static gates (inject bug -> expect gate failure -> revert):"

# 1) PDF field reconciliation: corrupt a known-good builder key to a typo.
f="$Q/106AB-question-blocks.yml"
sed -i "0,/ab\['householdDesc'\]/s//ab['householdDeskTYPO']/" "$f"
check "lint:pdf-fields (WROTE_NONEXISTENT)" "$f" ./scripts/lint-pdf-fields.sh

# 2) Flow gaps: read a never-defined variable from a form builder.
f="$Q/106H-question-blocks.yml"
# append a read of a guaranteed-undefined interview var into the codebtors builder
python3 - "$f" <<'PY'
import sys,re
p=sys.argv[1]; t=open(p).read()
t=t.replace("  codebtors = {}", "  codebtors = {}\n  codebtors['x'] = debtors.this_variable_is_never_defined_xyz", 1)
open(p,'w').write(t)
PY
check "lint:flow (NEVER_DEFINED)" "$f" ./scripts/lint-flow-gaps.sh

# 3) Caps sync: change one NE cap in objects.py so it diverges from exemptions.js.
f="docassemble/BankruptcyClinic/objects.py"
sed -i "0,/'wildcard': 5970,/s//'wildcard': 9999,/" "$f"
check "lint:caps-sync" "$f" python3 scripts/lint_caps_sync.py

# 4) Gathered-read: add a raw <list>.gathered read in a code block.
f="$Q/106H-question-blocks.yml"
python3 - "$f" <<'PY'
import sys
p=sys.argv[1]; t=open(p).read()
t=t.replace("  codebtors = {}", "  codebtors = {}\n  if debtors.codebtors.gathered:\n    pass", 1)
open(p,'w').write(t)
PY
check "lint:flow (GATHERED_READ)" "$f" ./scripts/lint-flow-gaps.sh

# 5) YAML question-id snapshot: rename a question id.
f="$Q/106H-question-blocks.yml"
sed -i "0,/^id: codebtors_any_exist/s//id: codebtors_any_exist_MUTATED/" "$f"
check "lint:yaml-ids (id snapshot)" "$f" ./scripts/yaml-question-ids-snapshot.sh

echo ""
if [ "$FAILS" -eq 0 ]; then
  echo "✅ all gates have teeth — every injected bug was caught"
else
  echo "❌ one or more gates failed to catch their injected bug (see above)"
fi
exit $FAILS
