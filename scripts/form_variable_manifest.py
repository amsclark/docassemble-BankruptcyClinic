#!/usr/bin/env python3
"""
form_variable_manifest.py — enumerate the interview variables each assembled
form (PDF attachment) reads, and flag any that may not be defined by the time
the form assembles.

Why: the assembled forms are the interview's output contract. Working backward
from them — "here is the finite set of variables the deliverable needs" — is a
more reliable way to guarantee no uncontrolled 'seek' / undefined-variable crash
at assembly than tracing every forward path.

What it does (static, AST-based, therefore APPROXIMATE):
  1. Find each `attachment:` block and the dict variable it fills (`code: <d>`).
  2. AST-parse the code block(s) that build <d>, collecting attribute/subscript
     chains rooted at an interview object (from `objects:`) or a known global,
     resolving local aliases, `for x in list`, and `for i, x in enumerate(list)`.
  3. Build a corpus-wide DEFINITION index from every question file: field
     targets, question setters (yesno/field/continue button field/...), code
     assignments, and `objects:` declarations — recording which definitions are
     gated by `show if` / `hide if`.
  4. Classify each variable a form reads:
       OK            - defined unconditionally, or read via getattr()/defined()
       SHOW-IF GAP   - defined ONLY behind a show/hide-if, AND at least one read
                       site is NOT enclosed by an `if` testing that condition
                       (i.e. the read does not mirror the show-if -> can crash)
       NEVER-DEFINED - no definition site found anywhere (likely crash / typo)

Limitations (documented, not hidden):
  - Mirror check covers enclosing `if` statements, not short-circuit `and`
    guards on the same line.
  - Dynamic dict keys / deep getattr chains are approximated.
Treat NEVER-DEFINED and SHOW-IF GAP as high-signal review lists, not gospel.
"""
import ast
import re
import sys
from pathlib import Path

QDIR = Path(__file__).resolve().parent.parent / "docassemble/BankruptcyClinic/data/questions"
MAIN = QDIR / "voluntary-petition.yml"

IGNORE_ROOTS = {
    "currency", "len", "str", "int", "float", "bool", "round", "sum", "min", "max",
    "range", "enumerate", "sorted", "list", "dict", "set", "getattr", "hasattr",
    "defined", "value", "True", "False", "None", "i", "j", "k", "x", "_", "abs",
    "comma_and_list", "word", "nice_number", "format", "map", "filter", "zip",
    "showifdef", "define", "force_ask", "need", "url_action", "action_button_html",
    "title_case", "capitalize", "re", "math", "any", "all",
}

SETTER_KEYS = ("yesno", "yesnoradio", "field", "continue button field", "sets", "signature")


# ---------- YAML block helpers -------------------------------------------------

def split_blocks(path):
    docs, cur = [], []
    for line in path.read_text().splitlines():
        if line.strip() == "---":
            docs.append("\n".join(cur)); cur = []
        else:
            cur.append(line)
    docs.append("\n".join(cur))
    return docs


def get_code(doc):
    m = re.search(r"^code: \|\s*\n((?:[ \t].*\n?|\n)+)", doc, re.M)
    if not m:
        return None
    lines = m.group(1).splitlines()
    indent = next((len(l) - len(l.lstrip()) for l in lines if l.strip()), None)
    if indent is None:
        return None
    return "\n".join(l[indent:] if len(l) >= indent else l for l in lines)


def interview_roots():
    roots = set()
    text = MAIN.read_text()
    m = re.search(r"^objects:\s*\n((?:[ \t].*\n|\n)+)", text, re.M)
    if m:
        for ln in m.group(1).splitlines():
            mm = re.match(r"\s*-\s*([A-Za-z_]\w*)", ln)
            if mm:
                roots.add(mm.group(1))
    roots |= {"debtor", "debtors", "prop", "monthly_income", "case", "reporting",
              "financial_affairs", "payment", "current_district", "current_county",
              "case_number", "amended_filing", "nav", "personal_leases"}
    return roots


# ---------- path flattening ----------------------------------------------------

def norm(path):
    return re.sub(r"\[[^\]]*\]", "[i]", path)


def chain_to_path(node):
    parts, cur = [], node
    while True:
        if isinstance(cur, ast.Attribute):
            parts.append(cur.attr); cur = cur.value
        elif isinstance(cur, ast.Subscript):
            parts.append("[i]"); cur = cur.value
        elif isinstance(cur, ast.Name):
            parts.append(cur.id)
            return cur.id, _join(list(reversed(parts)))
        else:
            return None, None


def _join(parts):
    out = ""
    for p in parts:
        out = out + "[i]" if p == "[i]" else (f"{out}.{p}" if out else p)
    return out


# ---------- read collector -----------------------------------------------------

class Collector(ast.NodeVisitor):
    def __init__(self, roots, dictvar):
        self.roots, self.dictvar = roots, dictvar
        self.locals = {}      # name -> set(normalized leaf paths)
        self.loopvars = {}    # name -> list-root path (un-normalized)
        self.reads = {}       # normalized path -> list[frozenset(guard paths)]
        self.lists = set()
        self.if_stack = []

    @property
    def leaves(self):
        return set(self.reads)

    def _guards(self):
        g = set()
        for s in self.if_stack:
            g |= s
        return frozenset(g)

    def _add(self, p):
        self.reads.setdefault(p, []).append(self._guards())
        if p.endswith("[i]") and "." not in p.split("[")[0] and p.count(".") == 0:
            self.lists.add(p)

    def _resolve(self, node):
        """-> ('leaf', normpath) | ('local', name) | (None, None)"""
        root, path = chain_to_path(node)
        if root is None or root == self.dictvar:
            return (None, None)
        if root in self.loopvars:
            rest = path[len(root):]
            return ('leaf', norm(self.loopvars[root] + "[i]" + rest))
        if root in self.locals:
            return ('local', root)
        if root in IGNORE_ROOTS:
            return (None, None)
        if root in self.roots:
            return ('leaf', norm(path))
        return (None, None)

    def _paths_in(self, node):
        out = set()
        for sub in ast.walk(node):
            if isinstance(sub, (ast.Attribute, ast.Subscript, ast.Name)):
                kind, val = self._resolve(sub)
                if kind == 'leaf':
                    out.add(val)
                elif kind == 'local':
                    out |= self.locals[val]
        return out

    def _record(self, node):
        kind, val = self._resolve(node)
        if kind == 'leaf':
            self._add(val)
        elif kind == 'local':
            for lf in self.locals[val]:
                self._add(lf)

    def _bind_loop(self, target, it):
        # for x in LIST   /   for i, x in enumerate(LIST)   /   zip(...)
        listroot = None
        if isinstance(it, ast.Call) and isinstance(it.func, ast.Name) and it.func.id in ("enumerate", "reversed") and it.args:
            it = it.args[0]
        root, path = chain_to_path(it)
        if root in self.roots:
            listroot = path
            self.lists.add(norm(path))
        elif root in self.loopvars:
            listroot = self.loopvars[root]
        if listroot is None:
            return
        if isinstance(target, ast.Name):
            self.loopvars[target.id] = listroot
        elif isinstance(target, ast.Tuple):
            # (idx, item) from enumerate -> last elt is the item
            for elt in target.elts:
                if isinstance(elt, ast.Name):
                    self.loopvars[elt.id] = listroot

    def visit_For(self, node):
        self._bind_loop(node.target, node.iter)
        for c in node.body:
            self.visit(c)
        for c in node.orelse:
            self.visit(c)

    def visit_comprehension(self, node):
        self._bind_loop(node.target, node.iter)

    def visit_Assign(self, node):
        if len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            name = node.targets[0].id
            if name != self.dictvar:
                self.locals[name] = self._paths_in(node.value)
        self.visit(node.value)

    def visit_If(self, node):
        self.visit(node.test)                      # test vars are reads too
        self.if_stack.append(self._paths_in(node.test))
        for c in node.body:
            self.visit(c)
        self.if_stack.pop()
        self.if_stack.append(set())                # else: condition is false
        for c in node.orelse:
            self.visit(c)
        self.if_stack.pop()

    def visit_IfExp(self, node):
        self.visit(node.test)
        self.if_stack.append(self._paths_in(node.test))
        self.visit(node.body)
        self.if_stack.pop()
        self.if_stack.append(set())
        self.visit(node.orelse)
        self.if_stack.pop()

    def visit_BoolOp(self, node):
        # short-circuit `and`: each operand guards the operands to its right
        # (e.g. `if claiming and value_2:` protects value_2). `or` does not guard.
        if isinstance(node.op, ast.And):
            acc = set()
            for v in node.values:
                self.if_stack.append(set(acc))
                self.visit(v)
                self.if_stack.pop()
                acc |= self._paths_in(v)
        else:
            for v in node.values:
                self.visit(v)

    def visit_Attribute(self, node):
        self._record(node)

    def visit_Subscript(self, node):
        self._record(node)
        if isinstance(node.slice, ast.Name):
            self.visit(node.slice)

    def visit_Name(self, node):
        if isinstance(node.ctx, ast.Load):
            rid = node.id
            if rid in self.roots and rid not in self.loopvars and rid not in self.locals and rid != self.dictvar:
                self._add(norm(rid))


# ---------- definition index ---------------------------------------------------

def build_def_index(roots):
    """(defined_uncond:set, defined_condonly:dict path->set(governing paths))"""
    rootalt = "|".join(sorted(map(re.escape, roots), key=len, reverse=True))
    PATH = rf"(?:{rootalt})(?:\.\w+|\[[^\]]*\])*"
    field_target = re.compile(rf"^(\s*)-\s*(?:[^:#]+:\s*)?({PATH})\s*$")
    setter = re.compile(rf"^\s*(?:{'|'.join(SETTER_KEYS)})\s*:\s*({PATH})\s*$")
    assign_lhs = re.compile(rf"^\s*({PATH})\s*(?:=(?!=)|\.gather\(\))")
    path_anywhere = re.compile(rf"({PATH})")

    uncond, cond = set(), {}
    mtext = MAIN.read_text()
    om = re.search(r"^objects:\s*\n((?:[ \t].*\n|\n)+)", mtext, re.M)
    if om:
        for ln in om.group(1).splitlines():
            mm = re.match(r"\s*-\s*([A-Za-z_][\w.\[\]]*)\s*:", ln)
            if mm:
                uncond.add(norm(mm.group(1)))

    for f in sorted(QDIR.glob("*.yml")):
        lines = f.read_text().splitlines()
        for idx, ln in enumerate(lines):
            ms = setter.match(ln)
            if ms:
                uncond.add(norm(ms.group(1))); continue
            m = field_target.match(ln)
            if m:
                indent = len(m.group(1)); p = norm(m.group(2))
                governing = set()
                for la in lines[idx + 1: idx + 16]:
                    lai = len(la) - len(la.lstrip())
                    if re.match(r"^\s*-\s", la) and lai <= indent:
                        break
                    if la.strip() and lai <= indent and not re.match(r"\s*(show if|hide if|js show if|js hide if|variable|is|sign)\b", la):
                        break
                    if re.search(r"\b(show if|hide if)\b", la):
                        governing |= {norm(x) for x in path_anywhere.findall(la)}
                        # structured form: pull the `variable:` line(s) that follow
                        for lb in lines[idx + 1: idx + 16]:
                            mv = re.match(r"\s*variable:\s*(" + PATH + r")", lb)
                            if mv:
                                governing.add(norm(mv.group(1)))
                if governing:
                    cond.setdefault(p, set()).update(governing - {p})
                else:
                    uncond.add(p)
                continue
            ma = assign_lhs.match(ln)
            if ma:
                uncond.add(norm(ma.group(1)))
    cond = {p: g for p, g in cond.items() if p not in uncond}
    return uncond, cond


# ---------- form discovery + analysis -----------------------------------------

def find_forms(path):
    forms = []
    for doc in split_blocks(path):
        if re.search(r"^attachment:", doc, re.M):
            name = re.search(r"-?\s*(?:name|filename):\s*(.+)", doc)
            dv = re.search(r"code:\s*([A-Za-z_]\w*)\s*$", doc, re.M)
            if dv:
                forms.append(((name.group(1).strip() if name else "?"), dv.group(1)))
    return forms


def builder_blocks_for(path, dictvar):
    return [c for c in (get_code(d) for d in split_blocks(path))
            if c and re.search(rf"(^|\W){re.escape(dictvar)}\s*(\[|=[^=])", c)]


def guarded_in(code, leaf):
    return bool(re.search(r"getattr\(|defined\(", code)) and bool(re.search(re.escape(leaf.replace("[i]", "")), code))


def analyze(path, def_index):
    roots = interview_roots()
    uncond, cond = def_index
    out = []
    for form_name, dictvar in find_forms(path):
        blocks = builder_blocks_for(path, dictvar)
        col = Collector(roots, dictvar)
        joined = "\n".join(blocks)
        for b in blocks:
            try:
                col.visit(ast.parse(b))
            except SyntaxError as e:
                print(f"  ! parse error in {form_name}: {e}", file=sys.stderr)
        missing, showif = [], []
        for leaf, guard_sets in sorted(col.reads.items()):
            if guarded_in(joined, leaf) or leaf in uncond:
                continue
            if leaf in cond:
                gov = cond[leaf]
                # real gap only if some read site does NOT mirror a governing var
                unmirrored = any(not (g & gov) for g in guard_sets)
                if unmirrored:
                    showif.append(leaf)
            else:
                missing.append(leaf)
        out.append((form_name, dictvar, sorted(col.reads), sorted(col.lists), missing, showif))
    return out


def findings_lines(def_index, targets):
    """Stable, diffable lines: '<file>\t<FORM>\t<TYPE>\t<leaf>' for each gap."""
    lines = []
    for path in targets:
        for name, dv, leaves, lists, missing, showif in analyze(path, def_index):
            for g in missing:
                lines.append(f"{path.name}\t{name}\tNEVER_DEFINED\t{g}")
            for g in showif:
                lines.append(f"{path.name}\t{name}\tSHOWIF_GAP\t{g}")
    return sorted(lines)


def main(argv):
    def_index = build_def_index(interview_roots())
    if "--findings" in argv:
        targets = sorted(QDIR.glob("*.yml"))
        print("\n".join(findings_lines(def_index, targets)))
        return
    verbose = "-v" in argv
    argv = [a for a in argv if a != "-v"]
    targets = [QDIR / a for a in argv[1:]] if len(argv) > 1 else sorted(QDIR.glob("*.yml"))
    tm = ts = 0
    for path in targets:
        forms = analyze(path, def_index)
        if not forms:
            continue
        print(f"\n===== {path.name} =====")
        for name, dv, leaves, lists, missing, showif in forms:
            print(f"\n  FORM: {name}   (dict: {dv})  — {len(leaves)} leaf vars"
                  + (f", {len(lists)} list(s)" if lists else ""))
            if verbose:
                for lf in leaves:
                    print(f"      - {lf}")
            if missing:
                tm += len(missing)
                print(f"    !! NEVER DEFINED anywhere (likely crash/typo): {len(missing)}")
                for g in missing:
                    print(f"      XX {g}")
            if showif:
                ts += len(showif)
                print(f"    !  SHOW-IF GAP — read not mirrored by its show-if condition: {len(showif)}")
                for g in showif:
                    print(f"      ?? {g}")
    print(f"\n==== summary: {tm} never-defined, {ts} unmirrored show-if reads ====")


if __name__ == "__main__":
    main(sys.argv)
