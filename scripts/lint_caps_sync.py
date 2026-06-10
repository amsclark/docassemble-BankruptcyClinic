#!/usr/bin/env python3
"""
Caps-sync lint: the exemption dollar caps are duplicated in
  - docassemble/BankruptcyClinic/objects.py        (authoritative; server-side)
  - docassemble/BankruptcyClinic/data/static/exemptions.js  (client-side tracker copy)

A cap changed in one file but not the other silently shows users a wrong
warning threshold (js) or enforces a wrong cap (py). This lint statically
parses both and fails on any category whose dollar limit differs between the
two files for the same state.

Keys present in only one file are reported as INFO (the js tracker carries
extra display-only categories like 'unknown'); only *value* mismatches on
shared keys fail.

Known mismatches awaiting attorney verification live in
scripts/caps-sync-baseline.txt (burn-down pattern, same as lint-flow-gaps):
the gate fails only on NEW mismatches not in the baseline, and prompts you to
tighten the baseline when one is fixed. Run with --update to rewrite the
baseline from current findings.

Exit codes: 0 = in sync / only baselined mismatches, 1 = new mismatch or
fixed-but-stale baseline, 2 = parse failure.
Usage: python3 scripts/lint_caps_sync.py [--update]
"""
import ast
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PY_FILE = ROOT / 'docassemble/BankruptcyClinic/objects.py'
JS_FILE = ROOT / 'docassemble/BankruptcyClinic/data/static/exemptions.js'
BASELINE = ROOT / 'scripts/caps-sync-baseline.txt'


def parse_py_limits():
    """Extract the two state dicts returned by get_exemption_limits()."""
    tree = ast.parse(PY_FILE.read_text())
    func = next(
        (n for n in ast.walk(tree)
         if isinstance(n, ast.FunctionDef) and n.name == 'get_exemption_limits'),
        None,
    )
    if func is None:
        sys.exit('PARSE FAILURE: get_exemption_limits not found in objects.py')
    returns = [n for n in ast.walk(func) if isinstance(n, ast.Return)
               and isinstance(n.value, ast.Dict)]
    if len(returns) != 2:
        sys.exit(f'PARSE FAILURE: expected 2 return-dicts in get_exemption_limits, got {len(returns)}')

    def to_dict(d):
        out = {}
        for k, v in zip(d.keys, d.values):
            if isinstance(k, ast.Constant) and isinstance(v, ast.Constant):
                out[k.value] = v.value
        return out

    # Source order: the South Dakota branch returns first, Nebraska second.
    return {'South Dakota': to_dict(returns[0].value),
            'Nebraska': to_dict(returns[1].value)}


def parse_js_limits():
    """Extract {category: limit} from the two const objects in exemptions.js."""
    txt = JS_FILE.read_text()
    out = {}
    for state, const in (('Nebraska', 'nebraskaExemptions'),
                         ('South Dakota', 'southDakotaExemptions')):
        m = re.search(re.escape(const) + r'\s*=\s*\{(.*?)\n\};', txt, re.S)
        if not m:
            sys.exit(f'PARSE FAILURE: const {const} not found in exemptions.js')
        body = m.group(1)
        limits = {}
        for entry in re.finditer(r'^\s*(\w+)\s*:\s*\{[^}]*?\blimit\s*:\s*([0-9_]+)', body, re.M):
            limits[entry.group(1)] = int(entry.group(2))
        if not limits:
            sys.exit(f'PARSE FAILURE: no limit entries parsed from {const}')
        out[state] = limits
    return out


def main():
    py = parse_py_limits()
    js = parse_js_limits()

    mismatches = []
    for state in ('Nebraska', 'South Dakota'):
        p, j = py[state], js[state]
        shared = sorted(set(p) & set(j))
        for cat in shared:
            if p[cat] != j[cat]:
                mismatches.append((state, cat, p[cat], j[cat]))
        only_py = sorted(set(p) - set(j))
        only_js = sorted(set(j) - set(p) - {'unknown'})
        for cat in only_py:
            print(f'INFO  {state}: {cat!r} in objects.py only (limit {p[cat]})')
        for cat in only_js:
            print(f'INFO  {state}: {cat!r} in exemptions.js only (limit {j[cat]})')

    lines = sorted(f'{state}\t{cat}\tpy={pv}\tjs={jv}'
                   for state, cat, pv, jv in mismatches)

    if '--update' in sys.argv:
        BASELINE.write_text('\n'.join(lines) + ('\n' if lines else ''))
        print(f'Baseline updated: {len(lines)} known mismatch(es) recorded.')
        return 0

    baseline = set()
    if BASELINE.exists():
        baseline = {l for l in BASELINE.read_text().splitlines() if l.strip()}

    new = [l for l in lines if l not in baseline]
    fixed = sorted(baseline - set(lines))

    for l in lines:
        tag = 'NEW MISMATCH' if l in new else 'known mismatch (baselined, awaiting attorney verification)'
        print(f'{tag}: {l}')

    if fixed:
        print(f'\n{len(fixed)} baselined mismatch(es) now FIXED — tighten the '
              f'baseline with: python3 scripts/lint_caps_sync.py --update')
        for l in fixed:
            print(f'  fixed: {l}')

    if new:
        print(f'\nFAIL: {len(new)} NEW exemption cap(s) out of sync between '
              f'objects.py and exemptions.js.')
        print('The legal value must be verified against the statute and attorney-'
              'approved before either side is changed (see CLAUDE.md).')
        return 1
    if fixed:
        return 1

    if not lines:
        print('OK: all shared exemption caps in sync between objects.py and exemptions.js.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
