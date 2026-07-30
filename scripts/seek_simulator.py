#!/usr/bin/env python3
"""
seek_simulator.py — path-sensitive simulation of docassemble's seek resolver.

The existing static gates (form_variable_manifest / interview_graph) answer
"does every read have a definer, and do the guards look mirrored?" — they are
path-INSENSITIVE queries on the def/use graph. This tool goes one level deeper:
it symbolically EXECUTES the interview the way docassemble does.

Model
-----
docassemble re-runs the `mandatory` code blocks top-down; every read of an
undefined variable SEEKS a definer block (question -> show screen, all its
fields become defined; code -> execute it, recursively seeking ITS reads).
Crashes are exactly:
  * seek dead-end  — no definer block can fire      -> DAErrorMissingVariable
  * seek cycle     — seeking X re-enters seeking X  -> "Infinite loop"

The simulator walks the mandatory block statement by statement, maintaining
  state = (must-defined set, may-defined set, known values, assumed facts)
and simulates SEEK for every read. Branches whose condition it can evaluate
(from the configuration or tracked assignments) are taken concretely; unknown
branches are explored BOTH ways and joined (must=intersection, may=union,
assumptions=intersection).

Guard correlation: every show-if field (and every code definition that only
happens inside an `if` body) is recorded with its governing (variable, value)
condition. A branch's assumed facts (`if x.type['Other']:`, `else` of
`X == False`, `if defined('p')`, 2-value radio `!= 'a'  =>  == 'b'`) then
prove such conditionally-defined variables safe to read — so a builder that
MIRRORS a show-if never fires a finding, and one that doesn't, does.

Configurations: a small cross-product of the LONG-RANGE guard answers
(filing status, payment method, debt classification, means-test shape, NE/SD)
— the answers whose effects span distant parts of the interview.  Everything
else is handled by the local fork-join.  Each finding therefore carries a
concrete answer-sheet + seek chain = a reproduction recipe.

Finding kinds
-------------
  DEAD_END        read of X on this path, and no definer block fires
  SEEK_CYCLE      seeking X transitively required seeking X again
  OUT_OF_ORDER    a screen's template reads an undefined USER-INPUT variable,
                  so the engine will interject that other question first
                  (flow driven by template accident, not the mandatory block)
  SHOWIF_RESHOW   seek of X whose only definers are screens ALREADY shown
                  (the show-if gap, path-sensitively confirmed: the engine
                  re-presents an answered screen, or loops)
  REVIEW_OMITTED  a `review:` item reads a name defined NOWHERE (typo /
                  stale rename). Never crashes — docassemble just omits the
                  item — so the review entry silently never displays for
                  ANY user (config-independent check)

Modeled engine semantics worth knowing
--------------------------------------
  * gather() renders the item-question and add-another screens (their
    templates run for real, so unguarded show-if reads there are caught);
    when several questions define the same item field, only the LAST-parsed
    one fires — matching docassemble's candidate preference.
  * `review:` list items are skip-if-undefined in docassemble (an item whose
    variable is undefined is OMITTED, not sought) — reads inside review
    items never seek and never produce findings.
  * `validation code:` assignments count as fields the screen defines.
  * 3-arg getattr / `defined()` / `hasattr()` are defended reads (no seek);
    `defined('x')` assumed true also proves x's same-guard show-if siblings.
  * local temps aliasing a path (`_x = getattr(o,'a',d)`, plain Assign only)
    correlate guards on _x to the real variable.
  * checkbox-key guards (`show if: x.type["Other"]`) compare at the variable
    level — two different keys of one checkboxes var are not distinguished.
  * boolean-literal compares infer both ways: the else of `X == False`
    assumes X truthy (sound for yesno fields, which is all this codebase
    compares against bool literals).

Known approximations (documented, deliberate)
---------------------------------------------
  * gather() optimistically defines every item field that has a question
    (does not model an incomplete per-item `complete` chain — rule 7).
  * lists are assumed NON-EMPTY after gather, and `for` loops run >=1 time
    (emptiness is the fuzz walker's territory).
  * mandatory-block re-pass clobbering (assign-over-user-answer) not modeled
    (lint:namespace-clobber owns that class).
  * unknown bare names with no definer are ignored (ORPHAN_READ gate owns them).

Usage
-----
  python3 scripts/seek_simulator.py               # run all configs, report
  python3 scripts/seek_simulator.py --findings    # stable diffable lines (gate)
  python3 scripts/seek_simulator.py --configs     # list configurations
  python3 scripts/seek_simulator.py --screens N   # predicted screen order, config N
"""
import ast
import itertools
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import form_variable_manifest as M

QDIR = M.QDIR
MAIN = M.MAIN

UNK = object()          # unknown abstract value


# ---------------------------------------------------------------- YAML blocks

def split_blocks_lined(path):
    """Like M.split_blocks but yields (start_line, text)."""
    docs, cur, start = [], [], 1
    for n, line in enumerate(path.read_text().splitlines(), 1):
        if line.strip() == "---":
            docs.append((start, "\n".join(cur))); cur = []; start = n + 1
        else:
            cur.append(line)
    docs.append((start, "\n".join(cur)))
    return docs


class QBlock:
    """A screen: question / event. Showing it defines its fields."""
    def __init__(self, file, line, label):
        self.file, self.line, self.label = file, line, label
        self.fields_uncond = []    # normed paths
        self.fields_showif = []    # [(normed path, guard)]; guard =
                                   #   (gvar_norm, expected) | ("?", None)
        self.template_reads = {}   # normed path -> list[frozenset(guards)]
        self.kind = "question"

    def __repr__(self):
        return f"Q({self.label}@{self.file}:{self.line})"


class CBlock:
    """A non-mandatory code block; sought when it can define a variable."""
    def __init__(self, file, line, tree, assigns):
        self.file, self.line, self.tree, self.assigns = file, line, tree, assigns
        self.kind = "code"

    def __repr__(self):
        return f"C({self.file}:{self.line})"


class ABlock:
    """attachment block: seeking its trigger variable reads the builder dict."""
    def __init__(self, file, line, attachvar, dictvars, name):
        self.file, self.line = file, line
        self.attachvar, self.dictvars, self.name = attachvar, dictvars, name
        self.kind = "attachment"

    def __repr__(self):
        return f"A({self.attachvar}@{self.file}:{self.line})"


FIELD_LINE = re.compile(r"^(\s*)-\s*(?:[^:#]*?:\s*)?([A-Za-z_][\w.\[\]]*)\s*$")
SETTER_LINE = re.compile(
    r"^(?:yesno|yesnoradio|noyes|noyesradio|field|continue button field|signature|event):\s*"
    r"([A-Za-z_][\w.\[\]]*)\s*$", re.M)
SETS_BLOCK = re.compile(r"^sets:\s*\n((?:[ \t]+-[ \t]*\S+[ \t]*\n?)+)", re.M)
SETS_INLINE = re.compile(r"^sets:\s*([A-Za-z_][\w.\[\]]*)\s*$", re.M)


def code_assign_targets(tree, extra_roots):
    """All paths a code block assigns (incl. define()/setattr string forms)."""
    out = set()
    for n in ast.walk(tree):
        if isinstance(n, (ast.Assign, ast.AugAssign, ast.AnnAssign)):
            targets = n.targets if isinstance(n, ast.Assign) else [n.target]
            for t in targets:
                r, p = M.chain_to_path(t)
                if r and p:
                    out.add(M.norm(p))
    return out


class Index:
    def __init__(self):
        self.definers = {}           # norm path -> [block] in parse order
        self.mandatory = []          # [(file, line, tree)] in include order
        self.objects = set()         # paths declared under objects:
        self.item_fields = {}        # list normed prefix -> [(tail, uncond, guard)]
        self.domains = {}            # normed path -> list of choice values
        self.roots = M.interview_roots()
        self.qfields_by_block = {}
        self.tables = set()          # names defined by `table:` blocks
        self.review_reads = []       # [(file, line, label, read, is_path)]
        self.mandatory_assigns = set()  # paths the mandatory blocks assign

    def add_definer(self, path, block):
        self.definers.setdefault(path, []).append(block)

    def candidates(self, npath):
        """Definers for a normalized path, docassemble preference order
        (LAST parsed wins) — reversed parse order."""
        return list(reversed(self.definers.get(npath, [])))


def include_order():
    m = re.search(r"^include:\s*\n((?:[ \t]+-[ \t]*\S+[ \t]*\n?)+)", MAIN.read_text(), re.M)
    files = []
    if m:
        for ln in m.group(1).splitlines():
            mm = re.match(r"\s*-\s*(\S+)", ln)
            if mm and (QDIR / mm.group(1)).exists():
                files.append(QDIR / mm.group(1))
    files.append(MAIN)
    return files


def parse_field_guard(lines, idx, indent):
    """Guard governing the field at lines[idx].
    None                    = unconditional
    (gvar_norm, expected)   = shown iff gvar has value `expected`
                              (True = truthy, False = falsy, str = exact value)
    ("?", None)             = governed, but by a condition we can't model
                              (js show if / code: / complex)."""
    block = lines[idx + 1: idx + 16]
    for j, la in enumerate(block):
        lai = len(la) - len(la.lstrip())
        if re.match(r"^\s*-\s", la) and lai <= indent:
            break
        if la.strip() and lai <= indent and not re.match(
                r"\s*(show if|hide if|js show if|js hide if|variable|is|sign)\b", la):
            break
        m = re.match(r"\s*(js )?(show|hide) if:\s*(.*)$", la)
        if not m:
            continue
        js, mode, rest = m.group(1), m.group(2), m.group(3).strip()
        if js or rest.startswith("code"):
            return ("?", None)
        if rest:                                # inline form: show if: some.var
            # checkbox-key guards (`show if: x.type["Other"]`) compare at the
            # variable level — drop the string subscript (see gvar_norm)
            plain = re.sub(r"\[[\"'][^\]]*[\"']\]", "", rest)
            if re.match(r"[A-Za-z_][\w.\[\]]*$", plain):
                return (M.norm(plain), mode == "show")
            return ("?", None)
        gvar = gval = None                      # structured variable:/is: form
        for lb in block[j + 1: j + 6]:
            mv = re.match(r"\s*variable:\s*(\S+)\s*$", lb)
            mi = re.match(r"\s*is:\s*(.+?)\s*$", lb)
            if mv:
                gvar = mv.group(1)
            elif mi:
                gval = mi.group(1).strip().strip("\"'")
        if not gvar:
            return ("?", None)
        if gval is None:
            return (M.norm(gvar), mode == "show")
        if gval in ("True", "true"):
            gval = True
        elif gval in ("False", "false"):
            gval = False
        return (M.norm(gvar), gval) if mode == "show" else ("?", None)
    return None


def parse_field_choices(lines, idx, indent):
    """Literal `choices:` values of the field at lines[idx] (label: value or
    bare value forms). Empty when absent / code-driven."""
    vals = []
    in_choices = False
    for la in lines[idx + 1: idx + 24]:
        lai = len(la) - len(la.lstrip())
        if la.strip() and lai <= indent:
            break
        if re.match(r"\s*choices:\s*$", la):
            in_choices = True
            continue
        if in_choices:
            mc = re.match(r"\s*-\s*(?:[^:#]+:\s*)?(\S[^#]*?)\s*$", la)
            if mc:
                vals.append(mc.group(1).strip().strip("\"'"))
            else:
                break
    return vals


def build_index():
    idx = Index()
    # objects: declarations
    om = re.search(r"^objects:\s*\n((?:[ \t].*\n|\n)+)", MAIN.read_text(), re.M)
    if om:
        for ln in om.group(1).splitlines():
            mm = re.match(r"\s*-\s*([A-Za-z_][\w.\[\]]*)\s*:", ln)
            if mm:
                idx.objects.add(M.norm(mm.group(1)))

    field_ok_root = idx.roots | {"family", "additional", "business",
                                 "hazardous_property", "attorney_disclosure",
                                 "wish_to_stay", "landlord_name"}

    for f in include_order():
        for start, doc in split_blocks_lined(f):
            if not doc.strip():
                continue
            tm = re.search(r"^table:[ \t]*([A-Za-z_][\w.\[\]]*)", doc, re.M)
            if tm:
                idx.tables.add(tm.group(1))
            code = M.get_code(doc)
            is_mand = re.search(r"^mandatory:\s*(True|true)\b", doc, re.M)
            is_attach = re.search(r"^attachment:", doc, re.M)
            is_question = re.search(r"^(question|event):", doc, re.M)

            if is_attach:
                av = re.search(r"variable name:\s*([A-Za-z_]\w*)", doc)
                dvs = re.findall(r"^\s*code:\s*([A-Za-z_]\w*)\s*$", doc, re.M)
                nm = re.search(r"-?\s*(?:name|filename):\s*(.+)", doc)
                ab = ABlock(f.name, start, av.group(1) if av else None,
                            dvs, nm.group(1).strip() if nm else "?")
                if av:
                    idx.add_definer(M.norm(av.group(1)), ab)
                continue

            if code:
                try:
                    tree = ast.parse(code)
                except SyntaxError:
                    continue
                if is_mand:
                    idx.mandatory.append((f.name, start, tree))
                    idx.mandatory_assigns |= \
                        code_assign_targets(tree, idx.roots) | \
                        M._dynamic_code_defs(code, idx.roots)
                    continue
                assigns = code_assign_targets(tree, idx.roots)
                assigns |= M._dynamic_code_defs(code, idx.roots)
                cb = CBlock(f.name, start, tree, assigns)
                for p in assigns:
                    idx.add_definer(p, cb)
                # a `question:`-less code block is just a code block; a doc can
                # have both code and question? not in this codebase.
                continue

            if is_question:
                qid = re.search(r"^id:\s*(.+)$", doc, re.M)
                ev = re.search(r"^event:\s*([A-Za-z_][\w.\[\]]*)\s*$", doc, re.M)
                label = (qid.group(1).strip() if qid else
                         (ev.group(1) if ev else f"{f.name}:{start}"))
                qb = QBlock(f.name, start, label)
                defined_any = False
                for msm in SETTER_LINE.finditer(doc):
                    qb.fields_uncond.append(M.norm(msm.group(1))); defined_any = True
                sm = SETS_BLOCK.search(doc) or SETS_INLINE.search(doc)
                if sm:
                    for v in re.findall(r"[A-Za-z_][\w.\[\]]*", sm.group(1)):
                        qb.fields_uncond.append(M.norm(v)); defined_any = True
                # `validation code:` runs on submit -> its assignments are
                # additional fields the screen defines (e.g. the 106AB
                # current_owned_value computations).
                vc = re.search(r"^validation code:\s*\|?-?\s*\n"
                               r"((?:[ \t]+.*\n|[ \t]*\n)+)", doc, re.M)
                if vc:
                    body = vc.group(1)
                    ind = min((len(l) - len(l.lstrip())
                               for l in body.splitlines() if l.strip()), default=0)
                    try:
                        vtree = ast.parse("\n".join(
                            l[ind:] for l in body.splitlines()))
                        for p in code_assign_targets(vtree, idx.roots) | \
                                M._dynamic_code_defs(body, idx.roots):
                            if p.split(".")[0].split("[")[0] in field_ok_root:
                                qb.fields_uncond.append(p)
                                defined_any = True
                    except SyntaxError:
                        pass
                lines = doc.splitlines()
                in_fields = False
                for i, ln in enumerate(lines):
                    if re.match(r"^fields:\s*$", ln):
                        in_fields = True; continue
                    if in_fields and ln and not ln[0].isspace() and not ln.startswith("-"):
                        in_fields = False
                    if not in_fields:
                        continue
                    mf = FIELD_LINE.match(ln)
                    if mf:
                        root = mf.group(2).split(".")[0].split("[")[0]
                        if root not in field_ok_root:
                            continue
                        p = M.norm(mf.group(2))
                        guard = parse_field_guard(lines, i, len(mf.group(1)))
                        if guard is not None:
                            qb.fields_showif.append((p, guard))
                        else:
                            qb.fields_uncond.append(p)
                        dom = parse_field_choices(lines, i, len(mf.group(1)))
                        if len(dom) >= 2:
                            idx.domains[p] = dom
                        defined_any = True
                # template reads — minus `review:` items: docassemble shows a
                # review item only when its variable is already defined
                # (undefined items are OMITTED, not sought), so reads inside
                # them can never trigger a seek. The flip side: a review item
                # reading a NEVER-defined name (typo) is silently omitted for
                # every user — collect review reads for that separate check.
                rm = re.search(r"^review:[ \t]*\n((?:(?:[ \t]+[^\n]*)?\n)*)",
                               doc, re.M)
                if rm:
                    rtext = rm.group(1)
                    rcol = M.Collector(idx.roots, "\x00")
                    try:
                        rcol.visit(ast.parse(M.mako_to_py(rtext)))
                    except SyntaxError:
                        pass
                    for rp, gsets in rcol.reads.items():
                        if all(M.DEFENDED in g for g in gsets):
                            continue
                        idx.review_reads.append(
                            (f.name, start, label, M.norm(rp), True))
                    for mb in re.finditer(r"\$\{\s*([A-Za-z_]\w*)\s*([(.]?)",
                                          rtext):
                        name, nxt = mb.group(1), mb.group(2)
                        if nxt == "(" or name in idx.roots:
                            continue    # function call / path (handled above)
                        if nxt == "." :
                            continue    # non-root path base — out of scope
                        idx.review_reads.append(
                            (f.name, start, label, name, False))
                tdoc = re.sub(r"^review:[ \t]*\n(?:(?:[ \t]+[^\n]*)?\n)*",
                              "", doc, flags=re.M)
                col = M.Collector(idx.roots | {"wish_to_stay", "landlord_name"}, "\x00")
                try:
                    col.visit(ast.parse(M.mako_to_py(tdoc)))
                except SyntaxError:
                    pass
                qb.template_reads = dict(col.reads)
                for p in qb.fields_uncond + [fp for fp, _ in qb.fields_showif]:
                    idx.add_definer(p, qb)
                if not defined_any:
                    continue

    # per-list item fields (for gather modelling)
    for p, blocks in idx.definers.items():
        if "[i]." in p:
            prefix, tail = p.split("[i].", 1)
            uncond, guard = False, None
            for b in blocks:
                if isinstance(b, CBlock):
                    uncond = True
                elif isinstance(b, QBlock):
                    if p in b.fields_uncond:
                        uncond = True
                    elif guard is None:
                        for fp, g in b.fields_showif:
                            if fp == p:
                                guard = g
                                break
            idx.item_fields.setdefault(prefix, []).append((tail, uncond, guard))
    return idx


# ---------------------------------------------------------------- config space

# Answer sheets for the LONG-RANGE guard questions. Key = concrete var path.
def config_space():
    means_shapes = [
        # (reporting_type, veteran, mi_filing_status, separated_status)
        ("1", False, "Filing single", ""),
        ("1", False, "Married and your spouse is filing with you.", ""),
        ("1", False, "Married and your spouse is NOT filing with you.", "Living together"),
        ("1", False, "Married and your spouse is NOT filing with you.",
         "Living separately or are legally separated"),
        ("1", True, "Filing single", ""),      # veteran -> means test skipped
        ("2", False, "Filing single", ""),     # business debts -> skipped
    ]
    cfgs = []
    for joint, pm, (rt, vet, mifs, sep), sd in itertools.product(
            (False, True), ("1", "2", "3"), means_shapes, (False, True)):
        cfgs.append({
            "filing_status": "Filing with spouse" if joint else "Filing individually",
            "case.payment_method": pm,
            "reporting.reporting_type": rt,
            "monthly_income.disabled_veteran": vet,
            "monthly_income.reservists": False,
            "monthly_income.filing_status": mifs,
            "monthly_income.separated_status": sep,
            "debtor[0].address.state": "South Dakota" if sd else "Nebraska",
            "debtor[1].address.state": "South Dakota" if sd else "Nebraska",
        })
    return cfgs


def config_label(cfg):
    return (f"{'joint' if cfg['filing_status'].endswith('spouse') else 'single'}"
            f"/pay{cfg['case.payment_method']}"
            f"/debts{cfg['reporting.reporting_type']}"
            f"{'/vet' if cfg['monthly_income.disabled_veteran'] else ''}"
            f"/mi={cfg['monthly_income.filing_status'].split()[0].lower()}"
            f"{'(sep)' if 'separately' in cfg['monthly_income.separated_status'] else ''}"
            f"/{'SD' if cfg['debtor[0].address.state'] == 'South Dakota' else 'NE'}")


# ---------------------------------------------------------------- the walker

MAX_SEEK_DEPTH = 60


class Finding:
    def __init__(self, kind, var, where, chain, cfg, note=""):
        self.kind, self.var, self.where = kind, var, where
        self.chain, self.cfg, self.note = list(chain), cfg, note

    def key(self):
        return (self.kind, self.var, self.where)

    def line(self):
        ch = " -> ".join(self.chain[-6:])
        lbl = config_label(self.cfg) if self.cfg else "any config"
        return f"{self.where}\t{self.kind}\t{self.var}\t[{lbl}] {ch}" + \
               (f"  ({self.note})" if self.note else "")


class State:
    __slots__ = ("must", "may", "values", "assume")

    def __init__(self):
        self.must, self.may, self.values = set(), set(), {}
        self.assume = set()        # (path, value) facts assumed on this branch

    def copy(self):
        s = State.__new__(State)
        s.must, s.may, s.values = set(self.must), set(self.may), dict(self.values)
        s.assume = set(self.assume)
        return s

    def define(self, cpath, value=UNK, sure=True):
        (self.must if sure else self.may).add(cpath)
        self.may.add(cpath)
        if value is not UNK:
            self.values[cpath] = value
        elif sure:
            self.values.pop(cpath, None)

    def join(self, other):
        self.must &= other.must
        self.may |= other.may
        self.values = {k: v for k, v in self.values.items()
                       if other.values.get(k, UNK) == v}
        self.assume &= other.assume


def cnorm(cpath):
    return M.norm(re.sub(r"\[(\d+|\*)\]", "[i]", cpath))


def gvar_norm(g):
    """Checkbox-subscript guards (`show if: x.type["Other"]`) must compare at
    the variable level: cpath drops dict-string keys, so a fact derived from
    `if x.type['Other']:` comes back as `x.type` — normalize recorded guards
    the same way. (Approximation: two different keys of one checkboxes var
    are not distinguished.)"""
    return re.sub(r"\[[\"'][^\]]*[\"']\]", "", g)


def concretize(field_norm, like_cpath):
    """Substitute the '[i]'s in a block's normed field path with the concrete
    indices of the path being sought (positional zip; leftovers -> [*])."""
    idxs = re.findall(r"\[(\d+|\*)\]", like_cpath)
    out, k = [], 0
    for part in re.split(r"(\[i\])", field_norm):
        if part == "[i]":
            out.append(f"[{idxs[k]}]" if k < len(idxs) else "[*]")
            k += 1
        else:
            out.append(part)
    return "".join(out)


class Sim:
    def __init__(self, index, cfg):
        self.ix, self.cfg = index, cfg
        self.st = State()
        self.seek_stack = []       # normed paths in progress
        self.exec_stack = []       # blocks in progress
        self.shown = set()         # QBlocks already presented
        self.screens = []          # (label, file, line) in order
        self.findings = []
        self.cond = {}             # showif field cpath -> (gvar cpath, expected)
                                   # (monotonic metadata: shown-with-guard facts)
        # objects: are instantiated up front
        for o in index.objects:
            self.st.define(o)
        for extra in ("nav", "menu_items", "url_args", "role", "chapter"):
            self.st.define(extra)

    # ------------- findings
    def found(self, kind, var, where, note=""):
        self.findings.append(Finding(kind, var, where, self.seek_stack + [var],
                                     self.cfg, note))

    # ------------- constant evaluation (no seeking)
    def const(self, node, env):
        if isinstance(node, ast.Constant):
            return node.value
        if isinstance(node, (ast.Attribute, ast.Subscript, ast.Name)):
            p = self.cpath(node, env)
            if p is None:
                if isinstance(node, ast.Name) and node.id in env:
                    return env[node.id]
                return UNK
            if p in self.cfg:
                return self.cfg[p]
            return self.st.values.get(p, UNK)
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.Not):
            v = self.const(node.operand, env)
            return UNK if v is UNK else (not v)
        if isinstance(node, ast.BoolOp):
            vals = [self.const(v, env) for v in node.values]
            if isinstance(node.op, ast.And):
                if any(v is not UNK and not v for v in vals):
                    return False
                return True if all(v is not UNK and v for v in vals) else UNK
            if any(v is not UNK and v for v in vals):
                return True
            return False if all(v is not UNK and not v for v in vals) else UNK
        if isinstance(node, ast.Compare) and len(node.ops) == 1:
            l = self.const(node.left, env)
            r = self.const(node.comparators[0], env)
            if l is UNK or r is UNK:
                return UNK
            op = node.ops[0]
            try:
                if isinstance(op, ast.Eq):
                    return l == r
                if isinstance(op, ast.NotEq):
                    return l != r
                if isinstance(op, ast.In):
                    return l in r
                if isinstance(op, ast.NotIn):
                    return l not in r
                if isinstance(op, ast.Gt):
                    return l > r
                if isinstance(op, ast.Lt):
                    return l < r
                if isinstance(op, ast.GtE):
                    return l >= r
                if isinstance(op, ast.LtE):
                    return l <= r
            except TypeError:
                return UNK
            return UNK
        if isinstance(node, ast.Call):
            fn = node.func
            if isinstance(fn, ast.Name):
                if fn.id == "len" and node.args:
                    base = self.cpath(node.args[0], env)
                    if base == "debtor":
                        return self.st.values.get("debtor.target_number", UNK)
                    return UNK
                if fn.id == "defined" and node.args:
                    p = self._strpath(self._const_str(node.args[0], env), env)
                    if p is None:
                        return UNK
                    if p in self.st.must:
                        return True
                    if p not in self.st.may:
                        return False
                    return UNK
                if fn.id == "str" and node.args:
                    v = self.const(node.args[0], env)
                    return UNK if v is UNK else str(v)
                if fn.id == "getattr" and len(node.args) >= 2 and \
                        isinstance(node.args[1], ast.Constant):
                    base = self.cpath(node.args[0], env)
                    if base:
                        p = base + "." + node.args[1].value
                        if p in self.cfg:
                            return self.cfg[p]
                        if p in self.st.values:
                            return self.st.values[p]
                        if len(node.args) >= 3 and p not in self.st.may:
                            return self.const(node.args[2], env)
                    return UNK
            if isinstance(fn, ast.Attribute) and fn.attr == "lower":
                v = self.const(fn.value, env)
                return UNK if v is UNK else str(v).lower()
        return UNK

    def _strpath(self, s, env):
        """Resolve a string path literal like 'monthly_income.' + _f2 (env has
        the loop binding). Only called with a str already concatenated."""
        return s if isinstance(s, str) and re.match(r"[A-Za-z_][\w.\[\]]*$", s) else None

    # ------------- concrete path extraction
    def cpath(self, node, env):
        parts, cur = [], node
        while True:
            if isinstance(cur, ast.Attribute):
                parts.append("." + cur.attr); cur = cur.value
            elif isinstance(cur, ast.Subscript):
                sl = cur.slice
                if isinstance(sl, ast.Constant) and isinstance(sl.value, int):
                    parts.append(f"[{sl.value}]")
                elif isinstance(sl, ast.Constant) and isinstance(sl.value, str):
                    pass                       # dict string key -> base var
                elif isinstance(sl, ast.Slice):
                    pass
                else:
                    parts.append("[*]")
                cur = cur.value
            elif isinstance(cur, ast.Name):
                if cur.id in env and isinstance(env[cur.id], str) and \
                        env[cur.id].startswith("\x02"):
                    base = env[cur.id][1:]     # loop-item binding
                else:
                    base = cur.id
                return base + "".join(reversed(parts))
            else:
                return None

    # ------------- seeking
    def is_defined(self, cpath):
        if cpath in self.st.must or cnorm(cpath) in self.st.must:
            return True
        # concrete index vs symbolic item: L[0].x defined via gather's L[*].x
        if re.sub(r"\[\d+\]", "[*]", cpath) in self.st.must:
            return True
        # and the reverse: a template's debtor[*].x when debtor[0].x is defined
        return "[*]" in cpath and re.sub(r"\[\*\]", "[0]", cpath) in self.st.must

    def seek(self, cpath, why="read"):
        if cpath is None or self.is_defined(cpath):
            return
        if cpath in self.st.may:
            # conditionally defined; is its recorded guard implied by what
            # this branch has assumed? (show-if / flag correlation)
            g = self.cond.get(cpath) or self.cond.get(cnorm(cpath))
            if g and self._fact_implies(g):
                return
        npath = cnorm(cpath)
        base = npath.split(".")[0].split("[")[0]
        if base in M.IGNORE_ROOTS:
            return
        if npath in self.seek_stack:
            self.found("SEEK_CYCLE", npath, self._loc(), " <- ".join(self.seek_stack))
            self.st.define(cpath)          # break the loop, keep exploring
            return
        if len(self.seek_stack) > MAX_SEEK_DEPTH:
            self.st.define(cpath)
            return
        cands = self.ix.candidates(npath)
        if not cands:
            # attribute of an already-defined object with no question of its
            # own -> DAObject auto-attr or method; only flag interview-shaped
            # paths whose PARENT is defined but leaf clearly needs a definer.
            tail = npath.rsplit(".", 1)[-1].replace("[i]", "")
            if tail in M.DAOBJECT_ATTRS or base not in (self.ix.roots | {"wish_to_stay", "landlord_name"}):
                self.st.define(cpath)
                return
            self.found("DEAD_END", npath, self._loc(), why)
            self.st.define(cpath)
            return
        self.seek_stack.append(npath)
        try:
            for blk in cands:
                if isinstance(blk, QBlock):
                    if blk in self.shown:
                        # only flag if NO other kind of definer remains
                        if all(isinstance(b, QBlock) and b in self.shown for b in cands):
                            self.found("SHOWIF_RESHOW", npath, f"{blk.file}:{blk.line}",
                                       f"screen '{blk.label}' already shown")
                            self.st.define(cpath)
                            return
                        continue
                    self.show_screen(blk, cpath)
                    if self.is_defined(cpath):
                        return
                    self.st.define(cpath)      # e.g. showif field; optimistic
                    return
                if isinstance(blk, CBlock):
                    self.exec_code_block(blk)
                    if self.is_defined(cpath):
                        return
                    continue
                if isinstance(blk, ABlock):
                    for dv in blk.dictvars:
                        self.seek(dv, why=f"attachment {blk.name}")
                    self.st.define(cpath)
                    return
            # nothing fired
            self.found("DEAD_END", npath, self._loc(),
                       f"{len(cands)} definer(s), none fires on this path")
            self.st.define(cpath)
        finally:
            if self.seek_stack and self.seek_stack[-1] == npath:
                self.seek_stack.pop()

    def _loc(self):
        return self.exec_stack[-1] if self.exec_stack else "(mandatory)"

    # ------------- screens
    def show_screen(self, qb, like_cpath):
        self.shown.add(qb)
        self.screens.append((qb.label, qb.file, qb.line))
        # resolve template reads FIRST (docassemble renders before showing)
        for r, gsets in qb.template_reads.items():
            if all(M.DEFENDED in g for g in gsets):
                continue
            unguarded = any(not g for g in gsets)
            cp = concretize(r, like_cpath)
            # a read whose every site sits under `% if <its own show-if var>`
            # mirrors the guard (rule 3) -> only evaluated when defined
            cg = self.cond.get(cp) or self.cond.get(cnorm(cp))
            if cg and all(M.DEFENDED in g or
                          any(cnorm(x) == cnorm(cg[0]) for x in g)
                          for g in gsets):
                continue
            if self.is_defined(cp):
                continue
            if cp in self.st.may:
                if cg:
                    # show-if'd field, maybe hidden on this path, read by a
                    # template without mirroring the condition: the engine
                    # re-presents the (already answered) screen — and if the
                    # field is still hidden there, loops.
                    self.found("SHOWIF_RESHOW", cnorm(cp),
                               f"{qb.file}:{qb.line}",
                               f"template of '{qb.label}' reads show-if field "
                               f"(guard {cg[0]}) without mirroring it")
                continue
            ncands = self.ix.candidates(cnorm(cp))
            if unguarded:
                qcands = [b for b in ncands if isinstance(b, QBlock) and b is not qb]
                if qcands and not any(isinstance(b, (CBlock, ABlock)) for b in ncands):
                    self.found("OUT_OF_ORDER", cnorm(cp),
                               f"{qb.file}:{qb.line}",
                               f"template of '{qb.label}' pulls question "
                               f"'{qcands[0].label}' out of order")
                self.seek(cp, why=f"template of {qb.label}")
        for p in qb.fields_uncond:
            cp = concretize(p, like_cpath)
            self.st.define(cp, self.cfg.get(cp, UNK))
        for p, guard in qb.fields_showif:
            cp = concretize(p, like_cpath)
            if cp in self.cfg:
                self.st.define(cp, self.cfg[cp])       # config implies visible
            else:
                self.st.define(cp, sure=False)
                if guard and guard[0] != "?":
                    self.cond[cp] = (gvar_norm(concretize(guard[0], cp)),
                                     guard[1])

    # ------------- gather
    def do_gather(self, lpath):
        if self.is_defined(lpath + ".gathered"):
            return
        nl = cnorm(lpath)
        gate = lpath + ".there_are_any"
        if self.ix.candidates(cnorm(gate)) and not self.is_defined(gate):
            self.seek(gate, why=f"gather {lpath}")
        idxs = ["*"]
        if nl == "debtor":
            n = self.st.values.get("debtor.target_number", 1)
            idxs = [str(i) for i in range(n if isinstance(n, int) else 1)]
        # render the gather's item-question screens: their templates run in
        # the real engine (an unguarded show-if read there re-presents /
        # loops mid-gather), so resolve them like any other shown screen
        item_qbs = []
        for tail, _u, _g in self.ix.item_fields.get(nl, ()):
            # only the PREFERRED (last-parsed) question fires per field,
            # matching seek — showing every candidate would present screens
            # the engine never picks (e.g. the debtor-2 variant of a screen)
            for b in self.ix.candidates(f"{nl}[i].{tail}"):
                if isinstance(b, QBlock):
                    if b not in self.shown and b not in item_qbs:
                        item_qbs.append(b)
                    break
        for qb in item_qbs:
            self.show_screen(qb, f"{lpath}[{idxs[0]}]")
        for tail, uncond, guard in self.ix.item_fields.get(nl, ()):
            for i in idxs:
                cp = f"{lpath}[{i}].{tail}"
                self.st.define(cp, self.cfg.get(cp, UNK), sure=uncond)
                if not uncond and guard and guard[0] != "?":
                    self.cond[cp] = (gvar_norm(concretize(guard[0], cp)),
                                     guard[1])
        for i in idxs:
            self.st.define(f"{lpath}[{i}]")            # the bare item itself
        # the add-another gate screen also renders per item collected
        more = lpath + ".there_is_another"
        if self.ix.candidates(cnorm(more)) and not self.is_defined(more):
            self.seek(more, why=f"gather {lpath}")
        for suffix in ("", ".gathered", ".there_are_any", ".there_is_another"):
            self.st.define(lpath + suffix)

    # ------------- code execution
    def exec_code_block(self, cb):
        tag = f"{cb.file}:{cb.line}"
        if tag in self.exec_stack:
            return
        self.exec_stack.append(tag)
        try:
            self.exec_body(cb.tree.body, {})
        finally:
            self.exec_stack.pop()

    def exec_body(self, stmts, env):
        for s in stmts:
            self.exec_stmt(s, env)

    def exec_stmt(self, s, env):
        if isinstance(s, ast.Expr):
            self.eval(s.value, env)
        elif isinstance(s, (ast.Assign, ast.AugAssign, ast.AnnAssign)):
            val = UNK
            if s.value is not None:
                self.eval(s.value, env)
                val = self.const(s.value, env)
            targets = s.targets if isinstance(s, ast.Assign) else [s.target]
            # local temp aliasing an interview path (`_x = getattr(o,'a',d)`,
            # `_x = o.a`): bind it so guards on _x correlate to the real path.
            # Plain Assign ONLY — aliasing an AugAssign accumulator
            # (`_total += getattr(o,'a',0)`) would make every later read of
            # _total seek the last summand's path
            if isinstance(s, ast.Assign) and len(targets) == 1 and \
                    isinstance(targets[0], ast.Name) and \
                    targets[0].id not in self.ix.roots and s.value is not None:
                ap = self._alias_path(s.value, env)
                if ap:
                    env[targets[0].id] = "\x02" + ap
                    return
            for t in targets:
                p = self.cpath(t, env)
                if p:
                    self.st.define(p, val)
        elif isinstance(s, ast.If):
            self.eval(s.test, env)
            v = self.const(s.test, env)
            if v is True:
                self._apply_assumption(s.test, True, env)
                self.exec_body(s.body, env)
            elif v is False:
                self._apply_assumption(s.test, False, env)
                self.exec_body(s.orelse, env)
            else:
                a = self.st.copy()
                self._apply_assumption(s.test, True, env)
                self.exec_body(s.body, env)
                body_new = self.st.must - a.must
                b, self.st = self.st, a
                self._apply_assumption(s.test, False, env)
                self.exec_body(s.orelse, env)
                self.st.join(b)
                # vars defined ONLY in the true branch are conditionally
                # defined, guarded by the test (`if prop.has_home: prop.x=...`)
                facts = self._assumed_facts(s.test, True, env)
                if len(facts) == 1:
                    for var in body_new - self.st.must:
                        self.cond.setdefault(var, facts[0])
        elif isinstance(s, ast.For):
            self.exec_for(s, env)
        elif isinstance(s, ast.While):
            self.eval(s.test, env)
            snap = self.st.copy()
            self.exec_body(s.body, env)
            self.st.join(snap)
        elif isinstance(s, ast.Try):
            self.exec_body(s.body, env)
            for h in s.handlers:
                self.exec_body(h.body, env)
        # pass/import/etc: nothing

    def exec_for(self, s, env):
        it = s.iter
        if isinstance(it, ast.Call) and isinstance(it.func, ast.Name) and \
                it.func.id in ("list", "enumerate", "reversed", "sorted") and it.args:
            it = it.args[0]
        # literal string list -> iterate concretely (the define()-default idiom)
        if isinstance(it, (ast.List, ast.Tuple)) and it.elts and all(
                isinstance(e, ast.Constant) and isinstance(e.value, str) for e in it.elts):
            if isinstance(s.target, ast.Name):
                for e in it.elts:
                    env2 = dict(env); env2[s.target.id] = e.value
                    self.exec_body(s.body, env2)
            return
        lp = self.cpath(it, env)
        if lp and (cnorm(lp) in self.ix.item_fields or
                   self.ix.candidates(cnorm(lp) + ".there_are_any")):
            self.do_gather(lp)
            binding = "\x02" + lp + "[*]"
        elif lp == "debtor":
            self.do_gather("debtor")
            binding = "\x02debtor[*]"
        else:
            if lp:
                self.seek(lp, why="iterated")
            binding = UNK
        env2 = dict(env)
        names = [s.target] if isinstance(s.target, ast.Name) else \
                (s.target.elts if isinstance(s.target, ast.Tuple) else [])
        for i, tnode in enumerate(names):
            if isinstance(tnode, ast.Name):
                env2[tnode.id] = binding if binding is not UNK and \
                    (len(names) == 1 or i == len(names) - 1) else UNK
        # loops assumed to run >=1 time (matches the documented "lists are
        # non-empty after gather" approximation; emptiness is fuzz territory)
        self.exec_body(s.body, env2)

    # ------------- expression evaluation (performs seeks)
    def eval(self, node, env, defended=frozenset()):
        if node is None or isinstance(node, ast.Constant):
            return
        if isinstance(node, ast.Call):
            fn = node.func
            if isinstance(fn, ast.Name):
                if fn.id in ("defined", "showifdef", "value", "undefine",
                             "force_ask", "need", "url_action",
                             "action_button_html", "action_menu_item"):
                    return                      # no seek semantics we model
                if fn.id == "getattr" and len(node.args) >= 2:
                    self.eval(node.args[0], env, defended)
                    return                      # never seeks the attr itself
                if fn.id == "setattr" and len(node.args) >= 2 and \
                        isinstance(node.args[1], (ast.Constant, ast.Name)):
                    base = self.cpath(node.args[0], env)
                    attr = None
                    if isinstance(node.args[1], ast.Constant):
                        attr = node.args[1].value
                    elif isinstance(node.args[1], ast.Name):
                        v = env.get(node.args[1].id)
                        attr = v if isinstance(v, str) and not v.startswith("\x02") else None
                    if base and attr:
                        if len(node.args) >= 3:
                            self.eval(node.args[2], env, defended)
                        self.st.define(base + "." + attr)
                        return
                if fn.id == "define" and node.args:
                    p = self._const_str(node.args[0], env)
                    if p:
                        for a in node.args[1:]:
                            self.eval(a, env, defended)
                        self.st.define(p)
                        return
                if fn.id == "len" and node.args:
                    base = self.cpath(node.args[0], env)
                    if base and (cnorm(base) in self.ix.item_fields or
                                 self.ix.candidates(cnorm(base) + ".there_are_any")):
                        self.do_gather(base)
                        return
                self.eval_children(node, env, defended)
                return
            if isinstance(fn, ast.Attribute):
                base = self.cpath(fn.value, env)
                if fn.attr == "gather" and base:
                    self.do_gather(base)
                    return
                if fn.attr in ("get_sections", "set_sections", "using",
                               "append", "appendObject", "pop", "remove",
                               "add_action", "clear", "keys", "values", "items",
                               "get", "true_values", "comma_and_list",
                               "initializeAttribute", "complete_elements"):
                    if base and "." in (base or ""):
                        self.eval(fn.value, env, defended)
                    for a in node.args:
                        self.eval(a, env, defended)
                    return
                self.eval_children(node, env, defended)
                return
        if isinstance(node, (ast.Attribute, ast.Subscript, ast.Name)):
            p = self.cpath(node, env)
            if p is None:
                self.eval_children(node, env, defended)
                return
            base = p.split(".")[0].split("[")[0]
            if isinstance(node, ast.Name):
                # bare name: only meaningful if it has a definer / is a root
                if p in env or (base not in self.ix.roots and
                                not self.ix.candidates(cnorm(p))):
                    return
            if base in M.IGNORE_ROOTS:
                return
            if any(p == d or p.startswith(d + ".") or p.startswith(d + "[")
                   for d in defended):
                return
            if p.endswith(".gathered"):
                self.do_gather(p[: -len(".gathered")])
                return
            self.seek(p)
            # subscript index expr is also a read
            if isinstance(node, ast.Subscript) and isinstance(node.slice, ast.Name):
                self.eval(node.slice, env, defended)
            return
        if isinstance(node, ast.BoolOp) and isinstance(node.op, ast.And):
            acc = set(defended)
            for v in node.values:
                self.eval(v, env, frozenset(acc))
                acc |= self._defended_paths(v, env)
                acc |= self._assumed_defined(v, True, env)
            return
        if isinstance(node, ast.IfExp):
            self.eval(node.test, env, defended)
            d2 = defended | self._defended_paths(node.test, env) \
                          | self._assumed_defined(node.test, True, env)
            self.eval(node.body, env, frozenset(d2))
            d3 = defended | self._assumed_defined(node.test, False, env)
            self.eval(node.orelse, env, frozenset(d3))
            return
        if isinstance(node, (ast.ListComp, ast.SetComp, ast.GeneratorExp, ast.DictComp)):
            env2 = dict(env)
            for gen in node.generators:
                it = gen.iter
                if isinstance(it, ast.Call) and isinstance(it.func, ast.Name) and \
                        it.func.id in ("list", "enumerate", "reversed", "sorted") and it.args:
                    it = it.args[0]
                lp = self.cpath(it, env2)
                if lp and (cnorm(lp) in self.ix.item_fields or
                           self.ix.candidates(cnorm(lp) + ".there_are_any") or lp == "debtor"):
                    self.do_gather(lp)
                    if isinstance(gen.target, ast.Name):
                        env2[gen.target.id] = "\x02" + lp + "[*]"
                elif lp:
                    self.seek(lp, why="iterated")
            if isinstance(node, ast.DictComp):
                self.eval(node.key, env2, defended)
                self.eval(node.value, env2, defended)
            else:
                self.eval(node.elt, env2, defended)
            return
        self.eval_children(node, env, defended)

    def eval_children(self, node, env, defended):
        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.expr, ast.keyword)):
                sub = child.value if isinstance(child, ast.keyword) else child
                self.eval(sub, env, defended)

    def _const_str(self, node, env):
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            return node.value
        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
            l = self._const_str(node.left, env)
            r = self._const_str(node.right, env)
            return (l + r) if l and r else None
        if isinstance(node, ast.Name):
            v = env.get(node.id)
            return v if isinstance(v, str) and not v.startswith("\x02") else None
        return None

    def _alias_path(self, node, env):
        """Interview path a local-temp assignment aliases, if any."""
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and \
                node.func.id == "getattr" and len(node.args) >= 2:
            base = self.cpath(node.args[0], env)
            attr = self._const_str(node.args[1], env)
            if base and attr:
                return base + "." + attr
            return None
        if isinstance(node, (ast.Attribute, ast.Subscript)):
            p = self.cpath(node, env)
            if p and p.split(".")[0].split("[")[0] in self.ix.roots:
                return p
        return None

    def _apply_assumption(self, test, truth, env):
        for cp in self._assumed_defined(test, truth, env):
            self.st.define(cp)
        for fact in self._assumed_facts(test, truth, env):
            self.st.assume.add(fact)

    def _assumed_facts(self, test, truth, env):
        """(path, value) facts implied by `test` evaluating to `truth`.
        value: True = truthy, False = falsy, str/const = that value."""
        t = test
        if isinstance(t, ast.UnaryOp) and isinstance(t.op, ast.Not):
            return self._assumed_facts(t.operand, not truth, env)
        if isinstance(t, ast.BoolOp):
            facts = []
            if (isinstance(t.op, ast.And) and truth) or \
                    (isinstance(t.op, ast.Or) and not truth):
                for v in t.values:
                    facts += self._assumed_facts(v, truth, env)
            return facts
        if isinstance(t, ast.Call) and isinstance(t.func, ast.Name) and \
                t.func.id == "getattr" and len(t.args) >= 2:
            base = self.cpath(t.args[0], env)
            attr = self._const_str(t.args[1], env)
            return [(base + "." + attr, truth)] if base and attr else []
        if isinstance(t, (ast.Name, ast.Attribute, ast.Subscript)):
            p = self.cpath(t, env)
            return [(p, truth)] if p else []
        if isinstance(t, ast.Compare) and len(t.ops) == 1:
            l, r, op = t.left, t.comparators[0], t.ops[0]
            if isinstance(l, ast.Call) and isinstance(l.func, ast.Name) and \
                    l.func.id == "str" and l.args:
                l = l.args[0]
            p = self.cpath(l, env) if isinstance(
                l, (ast.Name, ast.Attribute, ast.Subscript)) else None
            eq = (isinstance(op, ast.Eq) and truth) or \
                 (isinstance(op, ast.NotEq) and not truth)
            if p and isinstance(r, ast.Constant):
                v = r.value
                if eq:
                    return [(p, v if isinstance(v, str) else bool(v))]
                neq = (isinstance(op, ast.NotEq) and truth) or \
                      (isinstance(op, ast.Eq) and not truth)
                if neq and isinstance(v, bool):
                    # boolean-literal compare: the else of `X == False` means
                    # X is truthy (assumes X is a yesno boolean — always true
                    # for this codebase's `== True/False` comparisons)
                    return [(p, not v)]
                dom = self.ix.domains.get(cnorm(p))
                if neq and dom and len(dom) == 2 and v in dom:
                    # two-value choice: != one value -> == the other
                    other = dom[0] if dom[1] == v else dom[1]
                    return [(p, other)]
        return []

    def _defined_closure(self, p):
        """p plus all show-if siblings sharing p's exact guard: if p got
        defined, its screen showed that guard true, defining the whole group."""
        out = {p}
        g = self.cond.get(p)
        if g:
            out.update(f for f, gf in self.cond.items() if gf == g)
        return out

    def _fact_implies(self, guard):
        """Is `guard` = (gvar, expected) implied by a current assumption?"""
        gv, exp = guard
        for fp, fval in self.st.assume:
            if fp != gv:
                continue
            if exp is True and (fval is True or
                                (isinstance(fval, str) and fval)):
                return True
            if exp is False and fval is False:
                return True
            if isinstance(exp, str) and isinstance(fval, str) and exp == fval:
                return True
        return False

    def _assumed_defined(self, test, truth, env):
        """Show-if <-> guard correlation: the fields whose governing show-if
        condition is IMPLIED TRUE by assuming `test` evaluates to `truth`.
        Inside that branch those fields are really defined (the screen showed
        them), so reads of them there are NOT gaps."""
        out = set()

        def promote(gpath, gval):
            # gval: True = assumed truthy, False = assumed falsy, str = value
            for f, (gv, exp) in self.cond.items():
                if gv != gpath:
                    continue
                if exp is True and (gval is True or
                                    (isinstance(gval, str) and gval)):
                    out.add(f)
                elif exp is False and gval is False:
                    out.add(f)
                elif isinstance(exp, str) and isinstance(gval, str) and exp == gval:
                    out.add(f)

        t = test
        if isinstance(t, ast.UnaryOp) and isinstance(t.op, ast.Not):
            return self._assumed_defined(t.operand, not truth, env)
        if isinstance(t, ast.BoolOp):
            if (isinstance(t.op, ast.And) and truth) or \
                    (isinstance(t.op, ast.Or) and not truth):
                for v in t.values:
                    out |= self._assumed_defined(v, truth, env)
            return out
        if isinstance(t, ast.Call) and isinstance(t.func, ast.Name):
            if t.func.id == "defined" and t.args:
                # assuming defined('x') true -> x IS defined in this branch,
                # and so is every sibling field behind the same show-if guard
                p = self._const_str(t.args[0], env)
                if p and truth:
                    out |= self._defined_closure(p)
                return out
            if t.func.id == "hasattr" and len(t.args) >= 2:
                base = self.cpath(t.args[0], env)
                attr = self._const_str(t.args[1], env)
                if base and attr and truth:
                    out |= self._defined_closure(base + "." + attr)
                return out
            if t.func.id == "getattr" and len(t.args) >= 2:
                base = self.cpath(t.args[0], env)
                attr = self._const_str(t.args[1], env)
                if base and attr:
                    promote(base + "." + attr, truth)
                return out
        if isinstance(t, (ast.Name, ast.Attribute, ast.Subscript)):
            p = self.cpath(t, env)
            if p:
                promote(p, truth)
            return out
        if isinstance(t, ast.Compare) and len(t.ops) == 1:
            l, r, op = t.left, t.comparators[0], t.ops[0]
            if isinstance(l, ast.Call) and isinstance(l.func, ast.Name) and \
                    l.func.id == "str" and l.args:
                l = l.args[0]
            p = self.cpath(l, env) if isinstance(
                l, (ast.Name, ast.Attribute, ast.Subscript)) else None
            eq = (isinstance(op, ast.Eq) and truth) or \
                 (isinstance(op, ast.NotEq) and not truth)
            if p and eq and isinstance(r, ast.Constant):
                v = r.value
                promote(p, v if isinstance(v, str) else bool(v))
            return out
        return out

    def _defended_paths(self, node, env):
        """Paths proven defined/tolerant by this condition (defined('x'),
        hasattr, 3-arg getattr) — reads to the right of an `and` are safe."""
        out = set()
        for sub in ast.walk(node):
            if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Name):
                if sub.func.id == "defined" and sub.args and \
                        isinstance(sub.args[0], ast.Constant):
                    out.add(sub.args[0].value)
                elif sub.func.id in ("hasattr", "getattr") and len(sub.args) >= 2 and \
                        isinstance(sub.args[1], ast.Constant):
                    base = self.cpath(sub.args[0], env)
                    if base:
                        out.add(base + "." + str(sub.args[1].value))
        return out

    # ------------- entry
    def run(self):
        for fname, line, tree in self.ix.mandatory:
            self.exec_stack.append(f"{fname}:{line}(mandatory)")
            try:
                self.exec_body(tree.body, {})
            finally:
                self.exec_stack.pop()


# ---------------------------------------------------------------- reporting

def review_omitted(index):
    """Config-independent check: a review item whose template reads a name
    defined NOWHERE is silently omitted by docassemble for every user — the
    typo never crashes, the item (and its Revisit button) just never shows."""
    out, seen = [], set()
    defined_names = set(index.definers) | index.tables | index.objects \
        | index.mandatory_assigns
    for fname, line, label, read, is_path in index.review_reads:
        n = cnorm(read)
        if n in defined_names or read in defined_names:
            continue
        if is_path:
            tail = n.rsplit(".", 1)[-1].replace("[i]", "").replace("[*]", "")
            if tail in M.DAOBJECT_ATTRS:
                continue
            # a list/object is materialized by its item questions / gather
            # attrs / objects declarations even without an exact-name definer
            if any(k.startswith(n + ".") or k.startswith(n + "[")
                   for k in defined_names):
                continue
        fd = Finding("REVIEW_OMITTED", n, f"{fname}:{line}",
                     [f"review '{label}'"], None,
                     "review item reads a never-defined name -> item is "
                     "silently omitted for every user")
        if fd.key() not in seen:
            seen.add(fd.key()); out.append(fd)
    return out


def run_all(index, cfgs):
    dedup = {}
    for fd in review_omitted(index):
        dedup.setdefault(fd.key(), fd)
    screens_by_cfg = []
    for cfg in cfgs:
        sim = Sim(index, cfg)
        sim.run()
        screens_by_cfg.append(sim.screens)
        for fd in sim.findings:
            dedup.setdefault(fd.key(), fd)
    return dedup, screens_by_cfg


def main(argv):
    index = build_index()
    cfgs = config_space()
    if "--configs" in argv:
        for i, c in enumerate(cfgs):
            print(f"{i:3d}  {config_label(c)}")
        return
    if "--screens" in argv:
        n = int(argv[argv.index("--screens") + 1])
        sim = Sim(index, cfgs[n])
        sim.run()
        print(f"config {n}: {config_label(cfgs[n])} — {len(sim.screens)} screens")
        for lbl, f, ln in sim.screens:
            print(f"  {lbl:50s} {f}:{ln}")
        for fd in sim.findings:
            print("  !! " + fd.line())
        return
    dedup, screens = run_all(index, cfgs)
    if "--findings" in argv:
        for k in sorted(dedup):
            print(dedup[k].line())
        return
    print(f"blocks: {sum(len(v) for v in index.definers.values())} definers, "
          f"{len(index.mandatory)} mandatory code blocks, {len(cfgs)} configs")
    counts = {}
    for fd in dedup.values():
        counts[fd.kind] = counts.get(fd.kind, 0) + 1
    for kind in sorted(counts):
        print(f"\n== {kind} ({counts[kind]}) ==")
        for k in sorted(dedup):
            if dedup[k].kind == kind:
                print("  " + dedup[k].line())
    lens = sorted(len(s) for s in screens)
    print(f"\nscreens per config: min {lens[0]}, median {lens[len(lens)//2]}, "
          f"max {lens[-1]}")


if __name__ == "__main__":
    main(sys.argv)
