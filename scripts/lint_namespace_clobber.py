#!/usr/bin/env python3
"""Gate: code blocks must not clobber interview-global object names.

docassemble `exec`s a `code:` block against the interview's variable
namespace (the user dict). There are no function scopes, so EVERY binding a
code block creates is a WRITE to a global interview variable — including
`for` loop targets, comprehension targets, `with ... as` targets, and walrus
assignments.

That makes an innocuous-looking loop a silent overwrite:

    for payment in financial_affairs.consumer_debt_payments:   # BUG
        fin['creditor'] = payment.creditor_name

`payment` is the Form 103A installment-application DAObject. After this loop
runs, the global `payment` IS a SOFA list item, so the 103A builder's
`payment.payment_on_petition` resolves against the wrong object and there is
no question to define it. Prod symptom (2026-07-30):

    DAErrorMissingVariable: there was a reference to a variable
    'financial_affairs.consumer_debt_payments[0].payment_on_petition'

...and because the `mandatory` block re-runs on every screen, the filer is
dead-ended for the rest of the session.

This check parses each `code:` block's Python with `ast` and reports any
binding whose name collides with a name declared in an `objects:` block.

Exit status: 0 = clean, 1 = new clobber found (see the baseline file).
"""

from __future__ import annotations

import argparse
import ast
import glob
import os
import sys

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
QUESTIONS = os.path.join(ROOT, "docassemble", "BankruptcyClinic", "data", "questions")
BASELINE = os.path.join(HERE, "namespace-clobber-baseline.txt")

# False-clean guard: the interview currently has ~136 code blocks. If we parse
# far fewer, the checker did not really run.
MIN_CODE_BLOCKS = 100


def interview_globals(files: list[str]) -> set[str]:
    """Top-level names declared in any `objects:` block."""
    names: set[str] = set()
    for path in files:
        try:
            docs = list(yaml.safe_load_all(open(path, encoding="utf-8")))
        except yaml.YAMLError:
            continue
        for doc in docs:
            if not isinstance(doc, dict) or "objects" not in doc:
                continue
            entries = doc["objects"]
            if not isinstance(entries, list):
                entries = [entries]
            for entry in entries:
                if isinstance(entry, dict):
                    for key in entry:
                        names.add(str(key).split(".")[0].split("[")[0])
    return names


def code_blocks(path: str):
    """Yield (first_code_line, code_text) for every `code:` block in a file.

    Uses the YAML composer rather than text splitting so document separators and
    block scalars are handled by the parser, and so each `code:` value carries a
    real source mark. `first_code_line` is the 1-indexed file line of the
    block's first line of Python, making `first_code_line + node.lineno - 1` the
    exact file line of an AST node.
    """
    text = open(path, encoding="utf-8").read()
    try:
        docs = list(yaml.compose_all(text))
    except yaml.YAMLError:
        return

    for doc in docs:
        if not isinstance(doc, yaml.MappingNode):
            continue
        for key, value in doc.value:
            if not (isinstance(key, yaml.ScalarNode) and key.value == "code"):
                continue
            if not isinstance(value, yaml.ScalarNode):
                continue
            # For a literal block scalar (`code: |`), start_mark.line is the
            # line of the `|` indicator, so the Python starts on the next line.
            yield value.start_mark.line + 2, value.value


def bound_names(code: str):
    """Yield (name, lineno, kind) for every name a code block binds."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return

    def targets(node, kind):
        for sub in ast.walk(node):
            if isinstance(sub, ast.Name) and isinstance(sub.ctx, ast.Store):
                yield sub.id, sub.lineno, kind

    for node in ast.walk(tree):
        if isinstance(node, (ast.For, ast.AsyncFor)):
            yield from targets(node.target, "for-loop target")
        elif isinstance(node, ast.comprehension):
            yield from targets(node.target, "comprehension target")
        elif isinstance(node, (ast.With, ast.AsyncWith)):
            for item in node.items:
                if item.optional_vars is not None:
                    yield from targets(item.optional_vars, "with-as target")
        elif isinstance(node, ast.NamedExpr):
            yield from targets(node.target, "walrus assignment")


def load_baseline() -> set[str]:
    if not os.path.exists(BASELINE):
        return set()
    out = set()
    for line in open(BASELINE, encoding="utf-8"):
        line = line.split("#", 1)[0].strip()
        if line:
            out.add(line)
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--update",
        action="store_true",
        help="rewrite the baseline to the current findings (tighten after a fix)",
    )
    args = ap.parse_args()

    files = sorted(glob.glob(os.path.join(QUESTIONS, "*.yml")))
    if not files:
        print(f"lint:namespace-clobber: no YAML found under {QUESTIONS}", file=sys.stderr)
        return 1

    reserved = interview_globals(files)
    findings: list[tuple[str, str]] = []  # (key, human-readable line)
    blocks_seen = 0

    for path in files:
        rel = os.path.relpath(path, ROOT)
        for block_line, code in code_blocks(path):
            blocks_seen += 1
            for name, lineno, kind in bound_names(code):
                if name not in reserved:
                    continue
                key = f"{rel}:{name}:{kind}"
                where = f"line {block_line + lineno - 1}"
                findings.append((key, f"{rel} {where}: {kind} `{name}` overwrites the global object `{name}`"))

    findings.sort()
    keys = {k for k, _ in findings}

    # A gate that silently analysed nothing reports "clean" — the worst failure
    # mode for a burn-down gate. Refuse to pass on an empty parse.
    if blocks_seen < MIN_CODE_BLOCKS:
        print(
            f"lint:namespace-clobber: FAIL — only parsed {blocks_seen} code block(s) "
            f"across {len(files)} file(s), expected >= {MIN_CODE_BLOCKS}. The checker "
            "probably did not run (YAML parse failure or moved question files).",
            file=sys.stderr,
        )
        return 1

    if args.update:
        with open(BASELINE, "w", encoding="utf-8") as fh:
            fh.write("# Known code-block writes to interview-global object names.\n")
            fh.write("# Regenerate with: python3 scripts/lint_namespace_clobber.py --update\n")
            for key in sorted(keys):
                fh.write(key + "\n")
        print(f"lint:namespace-clobber: baseline updated ({len(keys)} entries)")
        return 0

    baseline = load_baseline()
    new = [(k, msg) for k, msg in findings if k not in baseline]

    if new:
        print("lint:namespace-clobber: FAIL — new code-block write(s) to a global object name:\n")
        for _, msg in new:
            print(f"  {msg}")
        print(
            "\nA docassemble `code:` block has no function scope: a loop/comprehension\n"
            "target is a WRITE to the interview variable of that name. Rename the local\n"
            "(e.g. `for pmt in ...`), or run --update if this is genuinely intended."
        )
        return 1

    stale = sorted(baseline - keys)
    print(f"lint:namespace-clobber: OK ({blocks_seen} code blocks, {len(keys)} known, 0 new)")
    if stale:
        print(f"  {len(stale)} baseline entry(ies) now fixed — tighten with --update:")
        for key in stale:
            print(f"    {key}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
