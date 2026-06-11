#!/usr/bin/env python3
"""
form_pdf_field_check.py — reconcile each PDF form-builder's output keys against
the actual fillable field names in its PDF template.

Why: the assembled PDFs are the deliverable. docassemble fills a template by
matching the keys of a builder dict to the template's field names; a key that
does NOT exist in the template is SILENTLY DROPPED — the answer never reaches
the form. That is the scariest bug class on a sworn legal document (the 106EF
"hasNonpriorityUnsecuredCreditors" bug: the builder wrote a field name that
isn't in form_b106ef.pdf, so the "any nonpriority claims?" box shipped blank
for every filer, undetected until a PDF content assertion caught it by luck).

This is STATIC and catches that whole class up front. For each attachment it:
  1. maps `pdf template file:` <-> the builder dict (`code:` var);
  2. collects the STATIC string-literal keys that builder assigns
     (`d['key'] = ...` and `d = {'key': ...}`); dynamic keys (`d['x'+str(i)]`)
     can't be resolved statically and are reported as a coverage caveat, not
     checked;
  3. reads the template's fillable field names (via pdf-lib in node);
  4. flags:
       WROTE_NONEXISTENT - a literal key written by the builder that is NOT a
                           field in the template  -> silent data loss;
       (optional --unfilled) template fields no builder literal-key writes ->
                           candidate always-blank fields (noisier: many are
                           filled via dynamic keys, so this is advisory).

Limitations: literal keys only (dynamic prefix+index keys are skipped, with a
count reported per form). Approximate, like the other static gates — treat
WROTE_NONEXISTENT as a high-signal review list.
"""
import ast
import difflib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QDIR = ROOT / "docassemble/BankruptcyClinic/data/questions"
TDIR = ROOT / "docassemble/BankruptcyClinic/data/templates"


def split_blocks(text):
    docs, cur = [], []
    for line in text.splitlines():
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


def find_attachments():
    """Return list of (form_file, template_pdf, dict_var)."""
    out = []
    item_re = re.compile(
        r"(?:^|\n)\s*-?\s*(?:name:.*\n)?(?:[^\n]*\n){0,6}?", re.M)  # unused, kept simple below
    for f in sorted(QDIR.glob("*.yml")):
        text = f.read_text()
        # walk line by line, pairing `pdf template file:` with the nearest
        # `code:` in the same attachment item (within a few lines).
        lines = text.splitlines()
        for i, ln in enumerate(lines):
            tm = re.match(r"\s*pdf template file:\s*(\S+)", ln)
            if not tm:
                continue
            tpl = tm.group(1).strip()
            dictvar = None
            for la in lines[max(0, i - 5): i + 6]:
                cm = re.match(r"\s*code:\s*([A-Za-z_]\w*)\s*$", la)
                if cm:
                    dictvar = cm.group(1)
                    break
            if dictvar:
                out.append((f.name, tpl, dictvar))
    return out


class KeyCollector(ast.NodeVisitor):
    """Collect static string-literal keys assigned to a target dict var, the
    static PREFIXES of dynamic keys (d['desc'+str(i)] -> prefix 'desc'), and a
    count of fully-dynamic assignments."""
    def __init__(self, dictvar):
        self.dictvar = dictvar
        self.literal_keys = set()
        self.prefixes = set()
        self.dynamic = 0

    def _is_target(self, node):
        return isinstance(node, ast.Name) and node.id == self.dictvar

    def _record_key(self, sl):
        if isinstance(sl, ast.Constant) and isinstance(sl.value, str):
            self.literal_keys.add(sl.value)
        elif isinstance(sl, ast.BinOp) and isinstance(sl.op, ast.Add) \
                and isinstance(sl.left, ast.Constant) and isinstance(sl.left.value, str):
            # 'prefix' + str(i) — covers prefix0, prefix1, ...
            self.prefixes.add(sl.left.value)
            self.dynamic += 1
        else:
            self.dynamic += 1

    def visit_Assign(self, node):
        for tgt in node.targets:
            if isinstance(tgt, ast.Subscript) and self._is_target(tgt.value):
                self._record_key(tgt.slice)
            if self._is_target(tgt) and isinstance(node.value, ast.Dict):
                for k in node.value.keys:
                    if isinstance(k, ast.Constant) and isinstance(k.value, str):
                        self.literal_keys.add(k.value)
                    else:
                        self.dynamic += 1
        self.generic_visit(node)


def collect_keys(dictvar):
    lits, prefixes, dyn = set(), set(), 0
    for f in sorted(QDIR.glob("*.yml")):
        for doc in split_blocks(f.read_text()):
            code = get_code(doc)
            if not code or dictvar not in code:
                continue
            try:
                tree = ast.parse(code)
            except SyntaxError:
                continue
            kc = KeyCollector(dictvar)
            kc.visit(tree)
            lits |= kc.literal_keys
            prefixes |= kc.prefixes
            dyn += kc.dynamic
    return lits, prefixes, dyn


_PDF_FIELD_JS = r"""
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
(async () => {
  const doc = await PDFDocument.load(fs.readFileSync(process.argv[1]), { ignoreEncryption: true });
  const names = doc.getForm().getFields().map(f => f.getName());
  process.stdout.write(JSON.stringify(names));
})().catch(e => { process.stderr.write(String(e)); process.exit(1); });
"""


def pdf_fields(template):
    path = TDIR / template
    if not path.exists():
        return None
    try:
        res = subprocess.run(
            ["node", "-e", _PDF_FIELD_JS, str(path)],
            cwd=ROOT, capture_output=True, text=True, timeout=60)
        if res.returncode != 0:
            return None
        return set(json.loads(res.stdout))
    except Exception:
        return None


def main(argv):
    show_unfilled = "--unfilled" in argv
    findings_only = "--findings" in argv     # stable, hint-free, for the gate
    findings = []
    stable = []
    # One builder dict can fill SEVERAL templates (e.g. 107 `fin` fills the
    # main page + ext1/ext2/ext3 overflow pages). A key is only "nonexistent"
    # if it's absent from the UNION of every template that dict fills.
    by_dict = {}   # dictvar -> {'forms': set, 'templates': set}
    for form_file, tpl, dictvar in find_attachments():
        e = by_dict.setdefault(dictvar, {"forms": set(), "templates": set()})
        e["forms"].add(form_file)
        e["templates"].add(tpl)

    for dictvar, e in sorted(by_dict.items()):
        union = set()
        ok_templates = []
        for tpl in sorted(e["templates"]):
            fields = pdf_fields(tpl)
            if fields is None:
                print(f"  (skip {tpl}: template missing or unreadable)", file=sys.stderr)
                continue
            union |= fields
            ok_templates.append(tpl)
        if not ok_templates:
            continue
        lits, prefixes, dyn = collect_keys(dictvar)
        nonexistent = sorted(k for k in lits if k not in union)
        forms = ",".join(sorted(e["forms"]))
        tpls = ",".join(ok_templates)
        # Suggest the closest template field name. A close match (typo / case /
        # misspelling, e.g. jewelry->jewleryDesc) means the data is being
        # SILENTLY DROPPED and the builder key should be corrected. No close
        # match suggests a genuinely orphan / dead key.
        union_l = {f.lower(): f for f in union}
        for k in nonexistent:
            ci = union_l.get(k.lower())            # case-only difference
            close = difflib.get_close_matches(k, union, n=1, cutoff=0.82)
            if ci:
                hint = f"  -> template has '{ci}' (case mismatch — DATA LOST)"
            elif close:
                hint = f"  -> closest template field '{close[0]}' (likely typo — DATA LOST)"
            else:
                hint = "  -> no close template field (orphan/dead key?)"
            findings.append(f"{forms}\t{tpls}\tWROTE_NONEXISTENT\t{dictvar}['{k}']{hint}")
            stable.append(f"{forms}\tWROTE_NONEXISTENT\t{dictvar}['{k}']")
        if show_unfilled:
            def _covered(fld):
                if fld in lits:
                    return True
                # covered by a dynamic 'prefix'+str(i) write?
                return any(fld.startswith(p) and fld[len(p):].lstrip("_").isdigit()
                           for p in prefixes) or any(fld.startswith(p) for p in prefixes)
            for fld in sorted(f for f in union if not _covered(f)):
                findings.append(f"{forms}\t{tpls}\tUNFILLED\t{fld}")
    if findings_only:
        print("\n".join(sorted(stable)))
        return 0
    for line in sorted(findings):
        print(line)
    nonex = sum(1 for x in findings if "WROTE_NONEXISTENT" in x)
    print(f"\n==== {nonex} WROTE_NONEXISTENT (builder literal key absent from ALL its PDF templates) ====",
          file=sys.stderr)
    return 1 if nonex else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
