#!/usr/bin/env python3
"""
interview_dependency_check.py — complement to form_variable_manifest.py.

The manifest checks the OUTPUT contract (is every form variable defined by the
time the form assembles). This checks INTERNAL SOUNDNESS: variables with more
than one DEFINER — a question AND a code block, or two code blocks.

Why this shape matters: the worst crash we hit (the means-test
`infinite loop: x.median_dependents, x.reviewed`) was exactly this — a variable
(`median_dependents`) defined BOTH by a screen and by a code fallback that sat
*after* a screen which read it. docassemble's resolver could pick either
definer; the after-the-consumer one closed a dependency loop.

It deliberately does NOT build a full execution-flow / cycle model: docassemble
resolves lazily at runtime, so a static control-flow graph would be approximate
and high-maintenance. Instead it flags the cheap, high-signal shape — multiply
-defined variables, especially question+code combos — as an ordered review
list. Each hit is a "confirm the definers are mutually exclusive and correctly
ordered (e.g. the fallback is in an else-branch, not after the reader)."
"""
import ast
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import form_variable_manifest as fvm  # reuse extraction helpers

QDIR = fvm.QDIR


class Definers(ast.NodeVisitor):
    """Interview variables assigned (defined) in a code block."""
    def __init__(self, roots):
        self.roots = roots
        self.defined = set()

    def _t(self, node):
        root, path = fvm.chain_to_path(node)
        if root and root in self.roots and root not in fvm.IGNORE_ROOTS:
            self.defined.add(fvm.norm(path))

    def visit_Assign(self, node):
        for t in node.targets:
            self._t(t)
        self.generic_visit(node)

    def visit_AugAssign(self, node):
        self._t(node.target)
        self.generic_visit(node)

    def visit_AnnAssign(self, node):
        self._t(node.target)
        self.generic_visit(node)


def scan():
    roots = fvm.interview_roots()
    rootalt = "|".join(sorted(map(re.escape, roots), key=len, reverse=True))
    PATH = rf"(?:{rootalt})(?:\.\w+|\[[^\]]*\])*"
    field_target = re.compile(rf"^(\s*)-\s*(?:[^:#]+:\s*)?({PATH})\s*$")
    setter = re.compile(rf"^\s*(?:{'|'.join(fvm.SETTER_KEYS)})\s*:\s*({PATH})\s*$")

    # normalized var -> list of (kind, file, line)
    sites = {}

    def add(var, kind, f, ln):
        sites.setdefault(var, []).append((kind, f.name, ln))

    for f in sorted(QDIR.glob("*.yml")):
        docs = fvm.split_blocks(f)
        lines = f.read_text().splitlines()
        # questions: field/setter targets (line-based)
        for idx, ln in enumerate(lines):
            ms = setter.match(ln)
            if ms:
                add(fvm.norm(ms.group(1)), "question", f, idx + 1); continue
            m = field_target.match(ln)
            if m:
                add(fvm.norm(m.group(2)), "question", f, idx + 1)
        # code blocks: assignment targets (AST)
        for doc in docs:
            code = fvm.get_code(doc)
            if not code:
                continue
            try:
                tree = ast.parse(code)
            except SyntaxError:
                continue
            d = Definers(roots)
            d.visit(tree)
            for v in d.defined:
                add(v, "code", f, 0)
    return sites


def main(argv):
    sites = scan()
    # The normal list-gather idiom defines X[i].complete via both the question
    # (`allowed to set`) and a `= True` code line — that's intentional, not a
    # risk. The median_dependents-class risk is a TOP-LEVEL SCALAR with a
    # conditional code fallback that also has a question. Filter to that shape.
    GATHER_ATTRS = (".complete", ".gathered", ".there_are_any", ".there_is_another", ".revisit")
    sites = {
        v: l for v, l in sites.items()
        if "[i]" not in v and not v.endswith(GATHER_ATTRS)
    }
    qc, cc = [], []
    for var, lst in sorted(sites.items()):
        kinds = {k for k, _, _ in lst}
        files = {fn for _, fn, _ in lst}
        n_code = sum(1 for k, _, _ in lst if k == "code")
        if "question" in kinds and "code" in kinds:
            qc.append((var, lst))
        elif n_code >= 2 and len(files) >= 2:
            cc.append((var, lst))

    print("== Variables defined by BOTH a question and code (loop/ordering risk) ==")
    print("   For each: confirm the code definer is an else-branch / runs only when")
    print("   the screen is skipped, and is NOT positioned after a screen that reads it.\n")
    for var, lst in qc:
        where = ", ".join(sorted({f"{fn}{':'+str(l) if l else ''}" for k, fn, l in lst}))
        print(f"  {var}")
        print(f"      {where}")
    print(f"\n  ({len(qc)} question+code variables)\n")

    if cc:
        print("== Variables assigned by code in 2+ files (review for ambiguity) ==")
        for var, lst in cc:
            where = ", ".join(sorted({fn for _, fn, _ in lst}))
            print(f"  {var}   [{where}]")
        print(f"\n  ({len(cc)} multi-file code-defined variables)")


if __name__ == "__main__":
    main(sys.argv)
