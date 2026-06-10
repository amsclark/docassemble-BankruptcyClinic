#!/usr/bin/env python3
"""
interview_graph.py — materialize the interview's variable dependency graph.

Unifies the flow analyses into ONE inspectable structure. For every interview
variable it records where it is DEFINED and READ (with file:line, kind, and the
`show if` condition for gated fields), plus the data-dependency graph
(X = f(Y)  ->  X depends on Y) with cycle detection.

  interview_graph.py                # summary + checks (orphans / multi-definers / data cycles)
  interview_graph.py --map          # write docs/VARIABLE-MAP.md (the inspectable artifact)
  interview_graph.py <variable>     # full def/use picture for one variable

Why a graph and not a simple "define-before-use" trace: docassemble has no
static control flow — it lazily backward-chains, and a variable's definition is
conditional and multi-source. So the clean static property is "every read has a
definer" (orphans); path-sensitive properties (branch / cycle) live in the
companion checks in form_variable_manifest.py, which are queries on this same
def/read/condition data.
"""
import ast
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import form_variable_manifest as M

ROOTS = M.interview_roots()
ROOTALT = "|".join(sorted(map(re.escape, ROOTS), key=len, reverse=True))
PATH = rf"(?:{ROOTALT})(?:\.\w+|\[[^\]]*\])*"
FIELD_RE = re.compile(rf"^(\s*)-\s*(?:[^:#]+:\s*)?({PATH})\s*$")
SETTER_RE = re.compile(rf"^\s*(?:{'|'.join(M.SETTER_KEYS)})\s*:\s*({PATH})\s*$")
ASSIGN_RE = None  # code assignments handled via AST


def _showif_after(lines, idx, indent):
    gov = []
    for la in lines[idx + 1: idx + 16]:
        lai = len(la) - len(la.lstrip())
        if re.match(r"^\s*-\s", la) and lai <= indent:
            break
        if la.strip() and lai <= indent and not re.match(r"\s*(show if|hide if|variable|is)\b", la):
            break
        if re.search(r"\b(show if|hide if)\b", la):
            gov += re.findall(PATH, la)
    return " & ".join(sorted({M.norm(g) for g in gov})) if gov else ""


def _vars_in(node):
    out = set()
    for sub in ast.walk(node):
        if isinstance(sub, (ast.Attribute, ast.Subscript, ast.Name)):
            r, p = M.chain_to_path(sub)
            if r in ROOTS and r not in M.IGNORE_ROOTS and p:
                out.add(M.norm(p))
    return out


def build_graph():
    """Returns (nodes, depends_on):
      nodes[var] = {'def': [ {file,line,kind,cond} ], 'read': [ {file,kind} ]}
      depends_on[var] = set(vars) from code assignments  X = f(Y)
    """
    nodes = {}
    depends_on = {}

    def node(v):
        return nodes.setdefault(M.norm(v), {"def": [], "read": []})

    # ---- definitions ----
    om = re.search(r"^objects:\s*\n((?:[ \t].*\n|\n)+)", M.MAIN.read_text(), re.M)
    if om:
        for ln in om.group(1).splitlines():
            mm = re.match(r"\s*-\s*([A-Za-z_][\w.\[\]]*)\s*:", ln)
            if mm:
                node(mm.group(1))["def"].append(
                    {"file": M.MAIN.name, "line": 0, "kind": "object", "cond": ""})

    for f in sorted(M.QDIR.glob("*.yml")):
        lines = f.read_text().splitlines()
        for idx, ln in enumerate(lines):
            ms = SETTER_RE.match(ln)
            if ms:
                node(ms.group(1))["def"].append(
                    {"file": f.name, "line": idx + 1, "kind": "question", "cond": ""})
                continue
            mf = FIELD_RE.match(ln)
            if mf:
                cond = _showif_after(lines, idx, len(mf.group(1)))
                node(mf.group(2))["def"].append(
                    {"file": f.name, "line": idx + 1, "kind": "field", "cond": cond})
        for doc in M.split_blocks(f):
            code = M.get_code(doc)
            if not code:
                continue
            try:
                tree = ast.parse(code)
            except SyntaxError:
                continue
            for n in ast.walk(tree):
                if isinstance(n, (ast.Assign, ast.AugAssign, ast.AnnAssign)):
                    targets = n.targets if isinstance(n, ast.Assign) else [n.target]
                    rhs = _vars_in(n.value) if n.value else set()
                    for t in targets:
                        r, p = M.chain_to_path(t)
                        if r in ROOTS and r not in M.IGNORE_ROOTS and p:
                            pn = M.norm(p)
                            node(pn)["def"].append(
                                {"file": f.name, "line": n.lineno, "kind": "code", "cond": ""})
                            depends_on.setdefault(pn, set()).update(rhs - {pn})

    # ---- reads (code + templates) ----
    for v, rec in M.all_interview_reads(ROOTS).items():
        for fn in rec["files"]:
            node(v)["read"].append({"file": fn, "kind": "code/template"})
    # ---- reads (PDF form builders) ----
    di = M.build_def_index(ROOTS)
    mand = M.mandatory_collection_guards(ROOTS)
    for path in sorted(M.QDIR.glob("*.yml")):
        for form_name, dv, leaves, lists, missing, showif, branch in M.analyze(path, di, mand):
            for v in leaves:
                node(v)["read"].append({"file": path.name, "kind": f"form:{form_name}"})

    return nodes, depends_on, di, mand


def find_cycles(depends_on):
    """Cycles in the data-dependency graph (Tarjan SCCs of size > 1, or self-loops)."""
    index, low, onstack, stack, idx = {}, {}, set(), [], [0]
    sccs = []

    def strong(v):
        index[v] = low[v] = idx[0]; idx[0] += 1
        stack.append(v); onstack.add(v)
        for w in depends_on.get(v, ()):
            if w not in index:
                strong(w); low[v] = min(low[v], low[w])
            elif w in onstack:
                low[v] = min(low[v], index[w])
        if low[v] == index[v]:
            comp = []
            while True:
                w = stack.pop(); onstack.discard(w); comp.append(w)
                if w == v:
                    break
            sccs.append(comp)

    sys.setrecursionlimit(10000)
    for v in list(depends_on):
        if v not in index:
            strong(v)
    cycles = [c for c in sccs if len(c) > 1]
    cycles += [[v] for v in depends_on if v in depends_on.get(v, ())]
    return cycles


def write_map(nodes, depends_on, orphan_set, out_path):
    lines = ["# Interview variable map", "",
             "Auto-generated by `scripts/interview_graph.py --map`. For each interview",
             "variable: where it is **defined** and **read**, with the `show if`",
             "condition for gated fields. ORPHAN = referenced but defined nowhere.",
             ""]
    for v in sorted(nodes):
        rec = nodes[v]
        defs = rec["def"]
        reads = rec["read"]
        tag = "  ⚠️ ORPHAN (read, defined nowhere)" if v in orphan_set else (
            "  ⚠️ multi-definer" if len({(d['file'], d['kind']) for d in defs}) > 1 else "")
        lines.append(f"### `{v}`{tag}")
        if defs:
            lines.append("- **defined by:**")
            for d in sorted(defs, key=lambda d: (d["file"], d["line"])):
                c = f"  — show if `{d['cond']}`" if d.get("cond") else ""
                loc = f"{d['file']}:{d['line']}" if d["line"] else d["file"]
                lines.append(f"  - `{loc}` ({d['kind']}){c}")
        else:
            lines.append("- **defined by:** _nothing_")
        if reads:
            rf = sorted({f"{r['file']} ({r['kind']})" for r in reads})
            lines.append(f"- **read by:** {', '.join(rf)}")
        if v in depends_on and depends_on[v]:
            lines.append(f"- **depends on:** {', '.join(sorted(depends_on[v]))}")
        lines.append("")
    Path(out_path).write_text("\n".join(lines))
    return out_path


def main(argv):
    nodes, depends_on, di, mand = build_graph()
    orphan_set = set(M.orphan_reads(di, mand))
    if "--map" in argv:
        out = Path(__file__).resolve().parent.parent / "docs" / "VARIABLE-MAP.md"
        out.parent.mkdir(exist_ok=True)
        write_map(nodes, depends_on, orphan_set, out)
        print(f"✅ wrote {out}  ({len(nodes)} variables, {len(orphan_set)} orphans)")
        return
    args = [a for a in argv[1:] if not a.startswith("-")]
    if args:
        v = M.norm(args[0])
        rec = nodes.get(v)
        if not rec:
            print(f"{v}: not found"); return
        print(f"{v}")
        print("  defined by:")
        for d in rec["def"]:
            c = f"  show if {d['cond']}" if d.get("cond") else ""
            print(f"    {d['file']}:{d['line']} ({d['kind']}){c}")
        rb = sorted({f"{r['file']} ({r['kind']})" for r in rec['read']})
        print("  read by:", ", ".join(rb) or "—")
        if depends_on.get(v):
            print("  depends on:", ", ".join(sorted(depends_on[v])))
        return
    # default: summary + checks
    multi = [v for v, r in nodes.items() if len({(d["file"], d["kind"]) for d in r["def"]}) > 1]
    cycles = find_cycles(depends_on)
    print(f"variables: {len(nodes)}")
    print(f"orphans (read, defined nowhere): {len(orphan_set)}")
    for v in sorted(orphan_set):
        print(f"  XX {v}")
    print(f"multi-definer variables: {len(multi)}")
    print(f"data-dependency cycles: {len(cycles)}")
    for c in cycles:
        print(f"  ↻ {' -> '.join(c)} -> {c[0]}")
    print("\n(run with --map to write docs/VARIABLE-MAP.md)")


if __name__ == "__main__":
    main(sys.argv)
