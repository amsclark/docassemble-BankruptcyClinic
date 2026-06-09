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

# sentinel added to a guard-set when the enclosing condition is a definedness
# check (`if defined('X'):` / hasattr) — reads inside are defensively guarded.
DEFENDED = "\x01defended"


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
    # String-literal keys (checkboxes/DADict, e.g. type["Other"]) are reads of
    # the base variable — drop them so this agrees with chain_to_path's AST
    # handling (which also skips string-Constant subscripts).
    p = re.sub(r"\[\s*['\"][^'\"]*['\"]\s*\]", "", path)
    p = re.sub(r"\[[^\]]*\]", "[i]", p)
    p = p.replace(".elements[i]", "[i]")   # DAList internal .elements[k]
    while "[i][i]" in p:
        p = p.replace("[i][i]", "[i]")
    return p


def chain_to_path(node):
    parts, cur = [], node
    while True:
        if isinstance(cur, ast.Attribute):
            parts.append(cur.attr); cur = cur.value
        elif isinstance(cur, ast.Subscript):
            sl = cur.slice
            if isinstance(sl, ast.Slice):
                # String/list slicing (e.g. tax_id[-4:]) — a read of the base
                # value itself, not of an element that needs its own definer.
                pass
            elif isinstance(sl, ast.Constant) and isinstance(sl.value, str):
                # String-key access (checkboxes/DADict, e.g. type['Other']) —
                # docassemble defines the whole dict via its question, so the
                # base variable is what must be defined.
                pass
            else:
                parts.append("[i]")
            cur = cur.value
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
        # method-name Attribute nodes (the `.get` in x.y.get(...)) are not
        # variable reads — exclude them; their base chain is still walked.
        method_attrs = {id(sub.func) for sub in ast.walk(node)
                        if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Attribute)}
        for sub in ast.walk(node):
            if id(sub) in method_attrs:
                continue
            if isinstance(sub, (ast.Attribute, ast.Subscript, ast.Name)):
                kind, val = self._resolve(sub)
                if kind == 'leaf':
                    out.add(val)
                elif kind == 'local':
                    out |= self.locals[val]
            elif (isinstance(sub, ast.Call) and isinstance(sub.func, ast.Name)
                  and sub.func.id == 'getattr' and len(sub.args) >= 2
                  and isinstance(sub.args[1], ast.Constant)
                  and isinstance(sub.args[1].value, str)):
                # getattr(obj, 'attr'[, default]) — a read of obj.attr; resolve
                # it so a local like `_x = getattr(debtors, 'had_spouse', F)`
                # carries the real path into guards that test `_x`.
                kind, val = self._resolve(sub.args[0])
                if kind == 'leaf':
                    out.add(norm(val + "." + sub.args[1].value))
        if self._defensive(node):
            out.add(DEFENDED)
        return out

    @staticmethod
    def _defensive(node):
        """Does this condition contain a definedness check (defined/hasattr)?"""
        for sub in ast.walk(node):
            if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Name) \
                    and sub.func.id in ("defined", "hasattr"):
                return True
        return False

    def _record(self, node):
        kind, val = self._resolve(node)
        if kind == 'leaf':
            self._add(val)
        elif kind == 'local':
            for lf in self.locals[val]:
                self._add(lf)

    def _bind_loop(self, target, it):
        # for x in LIST  /  for i, x in enumerate(LIST)  — resolve LIST through
        # any enclosing loop vars so `for alias in debt.alias` binds alias to
        # debtor[i].alias, not debtor.
        if isinstance(it, ast.Call) and isinstance(it.func, ast.Name) and it.func.id in ("enumerate", "reversed") and it.args:
            it = it.args[0]
        kind, val = self._resolve(it)
        if kind != "leaf":
            return
        self.lists.add(val)
        if isinstance(target, ast.Name):
            self.loopvars[target.id] = val
        elif isinstance(target, ast.Tuple):
            for elt in target.elts:
                if isinstance(elt, ast.Name):
                    self.loopvars[elt.id] = val

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
        # else: guards are value-insensitive paths, and reaching EITHER branch
        # means the test vars were evaluated — so the else carries the same
        # paths (`else` of `== False` is the True case). Never carry DEFENDED:
        # the else of `if defined(x):` is precisely where x is undefined.
        self.if_stack.append(self._paths_in(node.test) - {DEFENDED})
        for c in node.orelse:
            self.visit(c)
        self.if_stack.pop()

    def visit_IfExp(self, node):
        self.visit(node.test)
        self.if_stack.append(self._paths_in(node.test))
        self.visit(node.body)
        self.if_stack.pop()
        self.if_stack.append(self._paths_in(node.test) - {DEFENDED})
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

    def visit_Call(self, node):
        # Method calls (x.y.get(...), lst.gather()) — the method name is not an
        # interview variable; record a read of the base object, not `x.y.get`.
        if isinstance(node.func, ast.Attribute):
            self.visit(node.func.value)
        else:
            self.visit(node.func)
        for a in node.args:
            self.visit(a)
        for kw in node.keywords:
            self.visit(kw.value)

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

def _dynamic_code_defs(code, roots):
    """Paths defined via define('p', ...) / setattr(obj, 'a', ...), including the
    defensive-default idiom: `for x in [<string literals>]:` loops with string
    concat (e.g. define('prop.' + _a, 0)). Returns a set of normalized paths."""
    out = set()
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return out
    loopstrs = {}

    def lit_list(node):
        if isinstance(node, (ast.List, ast.Tuple)):
            vals = [e.value for e in node.elts if isinstance(e, ast.Constant) and isinstance(e.value, str)]
            return vals if vals and len(vals) == len(node.elts) else None
        return None

    def eval_str(node):
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            return [node.value]
        if isinstance(node, ast.Name) and node.id in loopstrs:
            return loopstrs[node.id]
        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
            l, r = eval_str(node.left), eval_str(node.right)
            return [a + b for a in l for b in r] if l and r else []
        return []

    class W(ast.NodeVisitor):
        def visit_For(self, node):
            if isinstance(node.target, ast.Name):
                lits = lit_list(node.iter)
                if lits is not None:
                    loopstrs[node.target.id] = lits
            self.generic_visit(node)

        def visit_Call(self, node):
            fn = node.func.id if isinstance(node.func, ast.Name) else None
            if fn == "define" and node.args:
                for p in eval_str(node.args[0]):
                    if re.match(r"[A-Za-z_]\w*", p) and p.split(".")[0].split("[")[0] in roots:
                        out.add(norm(p))
            elif fn == "setattr" and len(node.args) >= 2:
                r, p = chain_to_path(node.args[0])
                if r in roots and p:
                    for a in eval_str(node.args[1]):
                        out.add(norm(p + "." + a))
            self.generic_visit(node)

    W().visit(tree)
    return out


def build_def_index(roots):
    """(defined_uncond:set, defined_condonly:dict path->set(governing paths))"""
    rootalt = "|".join(sorted(map(re.escape, roots), key=len, reverse=True))
    PATH = rf"(?:{rootalt})(?:\.\w+|\[[^\]]*\])*"
    field_target = re.compile(rf"^(\s*)-\s*(?:[^:#]+:\s*)?({PATH})\s*$")
    setter = re.compile(rf"^\s*(?:{'|'.join(SETTER_KEYS)})\s*:\s*({PATH})\s*$")
    assign_lhs = re.compile(rf"^\s*({PATH})\s*(?:=(?!=)|\.gather\(\))")
    path_anywhere = re.compile(rf"({PATH})")

    strong, field_uncond, cond = set(), set(), {}
    mtext = MAIN.read_text()
    om = re.search(r"^objects:\s*\n((?:[ \t].*\n|\n)+)", mtext, re.M)
    if om:
        for ln in om.group(1).splitlines():
            mm = re.match(r"\s*-\s*([A-Za-z_][\w.\[\]]*)\s*:", ln)
            if mm:
                strong.add(norm(mm.group(1)))

    for f in sorted(QDIR.glob("*.yml")):
        lines = f.read_text().splitlines()
        for idx, ln in enumerate(lines):
            ms = setter.match(ln)
            if ms:
                field_uncond.add(norm(ms.group(1))); continue
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
                    field_uncond.add(p)
                continue
            ma = assign_lhs.match(ln)
            if ma:
                strong.add(norm(ma.group(1)))
        # define()/setattr() definitions (incl. defensive-default loops)
        for doc in split_blocks(f):
            c = get_code(doc)
            if c:
                strong.update(_dynamic_code_defs(c, roots))
    cond = {p: g for p, g in cond.items() if p not in strong and p not in field_uncond}
    return strong, field_uncond, cond


def mandatory_collection_guards(roots):
    """Branch-sensitivity: parse the `mandatory` code blocks and learn the
    CONDITION under which each variable is collected (sought).

    A variable referenced with an empty guard-set is always collected. A
    variable referenced only inside `if` guards is collected ONLY under those
    conditions — so a form that reads it under a *broader* condition can hit it
    undefined (the gross_wages2 class: collected only for married-filing, read
    for any consumer-debt filer).

    Returns (mand_uncond:set, mand_cond:dict var -> list[frozenset(guard paths)]).
    """
    mand_uncond, refs = set(), {}
    # Attachment trigger variables (ab_attach, form_103b_attach, …) are bare
    # names outside the object roots — include them so we learn the guard each
    # form is ASSEMBLED under (analyze() credits it to the form's reads).
    attach_vars = {av for f in sorted(QDIR.glob("*.yml"))
                   for _, _, av in find_forms(f) if av}
    for f in sorted(QDIR.glob("*.yml")):
        for doc in split_blocks(f):
            if not re.search(r"^mandatory:\s*(True|true)\b", doc, re.M):
                continue
            code = get_code(doc)
            if not code:
                continue
            col = Collector(roots | attach_vars, "\x00")  # no output dict in a mandatory block
            try:
                col.visit(ast.parse(code))
            except SyntaxError:
                continue
            for var, gsets in col.reads.items():
                for g in gsets:
                    refs.setdefault(var, []).append(frozenset(g))
                    if not g:
                        mand_uncond.add(var)
    mand_cond = {v: gs for v, gs in refs.items() if v not in mand_uncond}
    return mand_uncond, mand_cond


# ---------- whole-interview reads (templates + code) --------------------------

def mako_to_py(text):
    """Roughly transpile a Mako template body to indented Python so the same
    Collector can extract variable reads + guards. Handles `% if/elif/else/for`,
    `% end*`, and `${ expr }`. Plain text is dropped."""
    out, indent = [], 0
    def emit(s):
        out.append("    " * indent + s)
    for raw in text.splitlines():
        s = raw.strip()
        if not s:
            continue
        if s.startswith("%"):
            d = s[1:].strip()
            if re.match(r"end\w+", d):
                indent = max(0, indent - 1)
            elif re.match(r"(elif|else)\b", d):
                indent = max(0, indent - 1)
                emit(d if d.endswith(":") else d + ":")
                indent += 1
            elif re.match(r"(if|for|while)\b", d):
                emit(d if d.endswith(":") else d + ":")
                indent += 1
            # other `%` directives (e.g. `% endfor` variants) handled above
            continue
        for expr in re.findall(r"\$\{(.*?)\}", raw):
            expr = expr.strip()
            if expr:
                emit("(" + expr + ")")
    # ensure non-empty bodies so ast.parse doesn't choke on empty blocks
    cleaned = []
    for i, ln in enumerate(out):
        cleaned.append(ln)
        stripped = ln.strip()
        nxt = out[i + 1].strip() if i + 1 < len(out) else ""
        cur_ind = len(ln) - len(ln.lstrip())
        nxt_ind = len(out[i + 1]) - len(out[i + 1].lstrip()) if i + 1 < len(out) else 0
        if stripped.endswith(":") and (i + 1 >= len(out) or nxt_ind <= cur_ind):
            cleaned.append("    " * (cur_ind // 4 + 1) + "pass")
    return "\n".join(cleaned)


def all_interview_reads(roots):
    """Every interview-variable read across ALL code blocks AND screen templates
    (subquestion/question/under/help/note/button/review text + field defaults +
    show-if). Returns dict normpath -> {'files': set, 'undefended': bool} where
    undefended is True if at least one read site is NOT hasattr/defined-guarded."""
    rootalt = "|".join(sorted(map(re.escape, roots), key=len, reverse=True))
    rows_re = re.compile(rf"^rows:\s*((?:{rootalt})(?:\.\w+|\[[^\]]*\])*)\s*$", re.M)
    reads = {}
    for f in sorted(QDIR.glob("*.yml")):
        for doc in split_blocks(f):
            code = get_code(doc)
            chunks = []
            if code:
                chunks.append(("code", code))
            tpy = mako_to_py(doc)
            if tpy.strip():
                chunks.append(("template", tpy))
            # a `rows:` table binds the magic `row_item` to that list
            rm = rows_re.search(doc)
            rows_path = rm.group(1) if rm else None
            for kind, src in chunks:
                col = Collector(roots, "\x00")
                if rows_path:
                    col.loopvars["row_item"] = rows_path
                try:
                    col.visit(ast.parse(src))
                except SyntaxError:
                    continue
                for v, gsets in col.reads.items():
                    rec = reads.setdefault(v, {"files": set(), "undefended": False})
                    rec["files"].add(f.name)
                    if any(DEFENDED not in g for g in gsets):
                        rec["undefended"] = True
    return reads


def definable_set(def_index, mand):
    strong, field_uncond, cond = def_index
    mand_uncond, mand_cond = mand
    return strong | field_uncond | set(cond) | mand_uncond | set(mand_cond)


# DAObject / built-in attributes & methods that are always available — not orphans
DAOBJECT_ATTRS = {
    "address", "name", "first", "middle", "last", "suffix", "full", "firstlast",
    "lastfirst", "on_one_line", "line_one", "line_two", "city", "state", "zip",
    "county", "country", "sms_number", "email", "phone_number", "instanceName",
    "there_are_any", "there_is_another", "gathered", "complete", "number",
    "total", "elements", "true_values", "value", "label",
    # DAList / DAObject methods
    "add_action", "item_actions", "appendObject", "gather", "append", "pop",
    "remove", "comma_and_list", "comma_list", "as_list", "initializeAttribute",
}


def orphan_reads(def_index, mand):
    """Interview variables referenced somewhere but defined NOWHERE — a read of
    one is a guaranteed dead-end ('no question to define X') if reached."""
    definable = definable_set(def_index, mand)
    roots_set = interview_roots()
    reads = all_interview_reads(roots_set)
    orphans = {}
    for v, rec in reads.items():
        if v in definable:
            continue
        if not rec["undefended"]:        # every read site is hasattr/defined-guarded
            continue
        tail = v.rsplit(".", 1)[-1].replace("[i]", "")
        if "." not in v:                 # bare root / bare list item
            base = v.replace("[i]", "")
            if base in roots_set or base in definable:
                continue
        if tail in DAOBJECT_ATTRS:
            continue
        # a trailing subscript on a definable scalar is a slice/index, not a new
        # variable (e.g. account_number[-4:]) — not an orphan
        if v.endswith("[i]") and v[:-3] in definable:
            continue
        parent = v.rsplit(".", 1)[0]     # method/attr on a definable object is OK
        if parent in definable:
            continue
        orphans[v] = sorted(rec["files"])
    return orphans


# ---------- table-column gaps (plain-YAML row_item reads) ---------------------

# Genuinely built-in / list-machinery attrs legitimate on any row_item.
_TABLE_BUILTIN_ATTRS = {"instanceName", "there_are_any", "there_is_another",
                        "gathered", "complete"}


def table_gaps(def_index, mand, roots):
    """`table:` block columns and `edit:` entries reference row_item.<attr> as
    plain YAML — never inside ${ }, so the AST/Mako collector can't see them.
    Resolve row_item against the block's `rows:` list and flag attrs that no
    question/code defines. Rendering such a table is a guaranteed
    'variable could not be looked up' dead-end (the hazardous_property
    row_item.number bug the fuzz walker found; ORPHAN_READ missed it for this
    exact reason)."""
    definable = definable_set(def_index, mand)
    rootalt = "|".join(sorted(map(re.escape, roots), key=len, reverse=True))
    rows_re = re.compile(rf"^rows:\s*((?:{rootalt})(?:\.\w+|\[[^\]]*\])*)\s*$", re.M)
    gaps = []
    for f in sorted(QDIR.glob("*.yml")):
        for doc in split_blocks(f):
            if not re.search(r"^table:\s*\w", doc, re.M):
                continue
            # strip YAML comment lines — a '# row_item.foo ...' note is not a read
            doc = "\n".join(l for l in doc.splitlines() if not l.lstrip().startswith("#"))
            rm = rows_re.search(doc)
            if not rm:
                continue
            base = norm(rm.group(1))
            attrs = set(re.findall(r"row_item\.(\w+)", doc))
            em = re.search(r"^edit:\s*\n((?:\s+-\s*\w+\s*\n?)+)", doc, re.M)
            if em:
                attrs |= set(re.findall(r"-\s*(\w+)", em.group(1)))
            for a in sorted(attrs):
                if a in _TABLE_BUILTIN_ATTRS:
                    continue
                cand = f"{base}[i].{a}"
                if cand in definable:
                    continue
                gaps.append((f.name, cand))
    return sorted(set(gaps))


# ---------- optional-but-load-bearing fields (lease_assumed loop class) -------

# Datatypes whose variable stays UNDEFINED when the user skips the field:
# an unclicked radio group or a blank date submits nothing. (Text-ish fields
# submit '' — defined — so they cannot loop this way.)
_RISKY_OPTIONAL_DATATYPES = {"yesnoradio", "noyesradio", "yesnomaybe", "date"}


def optional_risky_fields(roots):
    """Map of field var -> defining file for fields that are `required: False`
    with a skippable datatype. Such a variable is NOT guaranteed defined even
    after its question runs."""
    rootalt = "|".join(sorted(map(re.escape, roots), key=len, reverse=True))
    PATH = rf"(?:{rootalt})(?:\.\w+|\[[^\]]*\])*"
    field_re = re.compile(rf"^(\s*)-\s*(?:[^:#]+:\s*)?({PATH})\s*$")
    out = {}
    for f in sorted(QDIR.glob("*.yml")):
        lines = f.read_text().splitlines()
        for idx, ln in enumerate(lines):
            m = field_re.match(ln)
            if not m:
                continue
            indent = len(m.group(1))
            var = norm(m.group(2))
            dt, req_false = None, False
            for la in lines[idx + 1: idx + 16]:
                lai = len(la) - len(la.lstrip())
                if la.strip() and lai <= indent:
                    break
                md = re.match(r"\s*datatype:\s*(\S+)", la)
                if md:
                    dt = md.group(1)
                if re.match(r"\s*required:\s*[Ff]alse", la):
                    req_false = True
            if req_false and dt in _RISKY_OPTIONAL_DATATYPES:
                out[var] = f.name
    return out


def optional_gaps(def_index, mand, roots):
    """Optional-but-load-bearing: a skippable field (see above) that some code
    block / template reads WITHOUT a defined()/getattr guard. A filer who
    leaves the field blank strands that reader seeking a question that will
    never re-define it — the contracts lease_assumed 'Infinite loop:
    x.gathered' (matched 2026-06-05 prod hits). Fix by making the field
    required when visible, or guarding every read."""
    risky = optional_risky_fields(roots)
    if not risky:
        return []
    reads = all_interview_reads(roots)
    gaps = []
    for v, fname in sorted(risky.items()):
        rec = reads.get(v)
        if rec and rec["undefended"]:
            gaps.append((v, fname, sorted(rec["files"])))
    return gaps


# ---------- cycle / forward-reference risk (infinite-loop class) --------------

def _scalar_refs(roots, code):
    """Top-level scalar interview-var references in a code block, with line order.
    Returns (earliest: var->min lineno of ANY reference, code_assign: var->min
    lineno of a code ASSIGNMENT). Loop-item vars are ignored (the loop class we
    target — e.g. median_dependents/reviewed — is top-level scalars)."""
    earliest, code_assign = {}, {}
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return earliest, code_assign

    def note(p, lineno, is_assign):
        if not p or "[i]" in p:
            return
        pn = norm(p)
        earliest[pn] = min(earliest.get(pn, lineno), lineno)
        if is_assign:
            code_assign[pn] = min(code_assign.get(pn, lineno), lineno)

    class W(ast.NodeVisitor):
        def visit_Assign(self, node):
            for t in node.targets:
                r, p = chain_to_path(t)
                if r in roots and r not in IGNORE_ROOTS:
                    note(p, node.lineno, True)
            self.visit(node.value)

        def visit_Call(self, node):
            # skip the method-name attr in x.y.get(...) — not a variable
            if isinstance(node.func, ast.Attribute):
                self.visit(node.func.value)
            else:
                self.visit(node.func)
            for a in node.args:
                self.visit(a)
            for kw in node.keywords:
                self.visit(kw.value)

        def visit_Attribute(self, node):
            r, p = chain_to_path(node)
            if r in roots and r not in IGNORE_ROOTS:
                note(p, node.lineno, False)

        def visit_Name(self, node):
            if isinstance(node.ctx, ast.Load) and node.id in roots and node.id not in IGNORE_ROOTS:
                note(node.id, node.lineno, False)

    W().visit(tree)
    return earliest, code_assign


def _continue_button_screens(roots):
    """Review/notice screens (`continue button field: R`) and the variables they
    read in their template — (R, set(reads), file)."""
    rootalt = "|".join(sorted(map(re.escape, roots), key=len, reverse=True))
    cbf = re.compile(rf"^continue button field:\s*((?:{rootalt})(?:\.\w+|\[[^\]]*\])*)\s*$", re.M)
    out = []
    for f in sorted(QDIR.glob("*.yml")):
        for doc in split_blocks(f):
            m = cbf.search(doc)
            if not m:
                continue
            R = norm(m.group(1))
            col = Collector(roots, "\x00")
            try:
                col.visit(ast.parse(mako_to_py(doc)))
            except SyntaxError:
                pass
            out.append((R, set(col.reads), f.name))
    return out


def cycle_risks(roots):
    """Forward-reference loop risk: a continue-button review screen for R reads X,
    X's only mandatory definer is a code fallback, and X is NOT collected before R
    in the mandatory block — the median_dependents<->reviewed infinite-loop shape.
    Returns list of (X, R, screen_file)."""
    blocks = []
    for f in sorted(QDIR.glob("*.yml")):
        for doc in split_blocks(f):
            if re.search(r"^mandatory:\s*(True|true)\b", doc, re.M):
                code = get_code(doc)
                if code:
                    blocks.append(_scalar_refs(roots, code))
    risks = []
    for R, reads, sf in _continue_button_screens(roots):
        for earliest, code_assign in blocks:
            if R not in earliest:
                continue
            L_R = earliest[R]
            for X in reads:
                # X has a code fallback at/after R, and is not collected before R
                if X in code_assign and code_assign[X] >= L_R and earliest.get(X, 10 ** 9) >= L_R:
                    risks.append((X, R, sf))
    return sorted(set(risks))


# ---------- form discovery + analysis -----------------------------------------

def find_forms(path):
    forms = []
    for doc in split_blocks(path):
        if re.search(r"^attachment:", doc, re.M):
            name = re.search(r"-?\s*(?:name|filename):\s*(.+)", doc)
            dv = re.search(r"code:\s*([A-Za-z_]\w*)\s*$", doc, re.M)
            # The attachment's trigger variable (e.g. form_103b_attach) — the
            # mandatory block may seek it only under a guard (payment_method),
            # which then implicitly guards every read inside the form.
            av = re.search(r"variable name:\s*([A-Za-z_]\w*)", doc)
            if dv:
                forms.append(((name.group(1).strip() if name else "?"),
                              dv.group(1), av.group(1) if av else None))
    return forms


def builder_blocks_for(path, dictvar):
    return [c for c in (get_code(d) for d in split_blocks(path))
            if c and re.search(rf"(^|\W){re.escape(dictvar)}\s*(\[|=[^=])", c)]


def guarded_in(code, leaf):
    """Is THIS specific leaf read defensively (getattr/defined), not just any leaf?"""
    if "[i]" not in leaf and "." in leaf:
        # scalar obj.attr  ->  getattr(obj, 'attr', ...)
        obj, attr = leaf.rsplit(".", 1)
        if re.search(rf"getattr\(\s*{re.escape(obj)}\s*,\s*['\"]{re.escape(attr)}['\"]", code):
            return True
    else:
        # loop-item / bare: match by final attribute name (obj is a loop var)
        attr = leaf.rsplit(".", 1)[-1].replace("[i]", "")
        if attr and re.search(rf"getattr\(\s*[\w\[\]. ]+,\s*['\"]{re.escape(attr)}['\"]", code):
            return True
    # defined('...path...') — match the leaf's tail path
    tail = re.escape(leaf.rsplit("[i]", 1)[-1].lstrip("."))
    if tail and re.search(rf"defined\(\s*['\"][^'\"]*{tail}['\"]", code):
        return True
    return False


def analyze(path, def_index, mand):
    roots = interview_roots()
    strong, field_uncond, cond = def_index
    mand_uncond, mand_cond = mand
    out = []
    for form_name, dictvar, attachvar in find_forms(path):
        # Assembly guards: the conditions under which the mandatory block seeks
        # this form's attachment trigger (e.g. form_103b_attach only under
        # case.payment_method). Every read inside the form's builders happens
        # under these too — credit them when judging branch sensitivity.
        # Multiple seek sites = assembled if ANY fires, so a read must be safe
        # under EACH assembly guard-set separately.
        asm_sets = ([frozenset()] if (attachvar is None or attachvar in mand_uncond)
                    else mand_cond.get(attachvar, [frozenset()]))
        blocks = builder_blocks_for(path, dictvar)
        col = Collector(roots, dictvar)
        joined = "\n".join(blocks)
        for b in blocks:
            try:
                col.visit(ast.parse(b))
            except SyntaxError as e:
                print(f"  ! parse error in {form_name}: {e}", file=sys.stderr)
        missing, showif, branch = [], [], []
        for leaf, guard_sets in sorted(col.reads.items()):
            if guarded_in(joined, leaf):
                continue
            # A genuinely unconditional definition (code assignment / object) or an
            # unconditional reference in the mandatory block means always-defined.
            if leaf in strong or leaf in mand_uncond:
                continue
            # Branch-sensitivity: a variable whose ONLY forcing reference in the
            # mandatory block is conditional is defined only under those guards —
            # even if it also has a no-show-if field (the field collects only if
            # its screen is reached). Safe only if some collection guard-set is a
            # subset of the read's guard-set (read happens only when collected).
            if leaf in mand_cond:
                dsets = mand_cond[leaf]
                if any(DEFENDED not in R
                       and any(not any(d <= (R | A) for d in dsets) for A in asm_sets)
                       for R in guard_sets):
                    branch.append(leaf)
                continue
            if leaf in field_uncond:
                continue
            if leaf in cond:
                gov = cond[leaf]
                if any(DEFENDED not in g and not (g & gov) for g in guard_sets):
                    showif.append(leaf)
            else:
                missing.append(leaf)
        out.append((form_name, dictvar, sorted(col.reads), sorted(col.lists), missing, showif, branch))
    return out


def findings_lines(def_index, mand, targets):
    """Stable, diffable lines: '<file>\t<FORM>\t<TYPE>\t<leaf>' for each gap."""
    lines = []
    for path in targets:
        for name, dv, leaves, lists, missing, showif, branch in analyze(path, def_index, mand):
            for g in missing:
                lines.append(f"{path.name}\t{name}\tNEVER_DEFINED\t{g}")
            for g in showif:
                lines.append(f"{path.name}\t{name}\tSHOWIF_GAP\t{g}")
            for g in branch:
                lines.append(f"{path.name}\t{name}\tBRANCH_GAP\t{g}")
    # interview-wide: orphan references + forward-reference loop risks
    for v in orphan_reads(def_index, mand):
        lines.append(f"(interview)\t-\tORPHAN_READ\t{v}")
    for x, r, sf in cycle_risks(interview_roots()):
        lines.append(f"{sf}\t-\tCYCLE_RISK\t{x} (read by review screen for {r}, defined only later)")
    for fname, cand in table_gaps(def_index, mand, interview_roots()):
        lines.append(f"{fname}\t-\tTABLE_GAP\t{cand}")
    for v, fname, readers in optional_gaps(def_index, mand, interview_roots()):
        lines.append(f"{fname}\t-\tOPTIONAL_GAP\t{v} (required:False {'/'.join(sorted(_RISKY_OPTIONAL_DATATYPES))}-class; unguarded readers: {', '.join(readers)})")
    return sorted(lines)


def main(argv):
    def_index = build_def_index(interview_roots())
    mand = mandatory_collection_guards(interview_roots())
    if "--findings" in argv:
        targets = sorted(QDIR.glob("*.yml"))
        print("\n".join(findings_lines(def_index, mand, targets)))
        return
    if "--orphans" in argv:
        orph = orphan_reads(def_index, mand)
        print(f"Orphan references — read in code/templates, defined NOWHERE "
              f"(a guaranteed 'no question to define X' dead-end if reached): {len(orph)}")
        for v, files in sorted(orph.items()):
            print(f"  XX {v}   [{', '.join(files)}]")
        return
    verbose = "-v" in argv
    argv = [a for a in argv if a != "-v"]
    targets = [QDIR / a for a in argv[1:]] if len(argv) > 1 else sorted(QDIR.glob("*.yml"))
    tm = ts = tb = 0
    for path in targets:
        forms = analyze(path, def_index, mand)
        if not forms:
            continue
        print(f"\n===== {path.name} =====")
        for name, dv, leaves, lists, missing, showif, branch in forms:
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
            if branch:
                tb += len(branch)
                print(f"    !! BRANCH GAP — collected only on a narrower branch than it's read: {len(branch)}")
                for g in branch:
                    print(f"      >< {g}")
            if showif:
                ts += len(showif)
                print(f"    !  SHOW-IF GAP — read not mirrored by its show-if condition: {len(showif)}")
                for g in showif:
                    print(f"      ?? {g}")
    print(f"\n==== summary: {tm} never-defined, {tb} branch gaps, {ts} unmirrored show-if reads ====")


if __name__ == "__main__":
    main(sys.argv)
