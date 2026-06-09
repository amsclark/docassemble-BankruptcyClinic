# BankruptcyClinic — interview engineering notes

A docassemble interview that assembles official bankruptcy forms (101, 106A/B–J,
107, 108, 121, 122A, 2030, …) for Nebraska and South Dakota filers. The
assembled PDFs are the deliverable, so the bar for "does not crash at assembly"
is high.

## Controlling interview execution flow

docassemble resolves variables lazily: referencing an undefined variable makes
it go "seek" a question/code block to define it. Uncontrolled seeking pulls
screens out of order, asks unexpected questions, or loops. Make seeking
**deterministic and intentional**:

1. **One source of flow truth** — the `mandatory` block in `voluntary-petition.yml`,
   in explicit order. Ordering lives there, not in the accident of which template
   references a variable first. (`need()` is *semantic sugar* — equivalent to
   referencing the variables in order; it documents intent, it does not add
   ordering power.)
2. **Gate review / notice / derived screens with `continue button field`** so the
   variable is defined by a deliberate user action, not an implicit mid-template
   seek.
3. **Mirror every `show if` / `hide if` condition** in any code / PDF-builder /
   gather block that reads the conditional field. Reading a show-if'd field when
   its condition is false is undefined → crash or loop. (This caused the
   Schedule G `Infinite loop: x.gathered`.)
4. **Guard every read of a possibly-undefined derived variable** with
   `defined()` / `getattr(obj, 'x', 0)`.
5. **Pre-initialize only derived/internal scalars** (type-correct empty), inside
   the code block that owns them. **Never** pre-initialize a *user-input*
   variable — that silently suppresses its question and ships a blank form field
   (worse than a crash on a legal document). Never `''`-init a `DAList`/`DAObject`.
6. **One generator per variable.** A variable defined by both a question *and* a
   code fallback is a loop risk — make the definers mutually exclusive (fallback
   in an `else`, never positioned *after* a screen that reads the variable). This
   caused the means-test `infinite loop: x.median_dependents, x.reviewed`.
7. **A list's per-item `complete` code block must reference every field** the
   item's question *and* every downstream consumer (PDFs, tables) read — match
   the working creditor pattern in `voluntary-petition.yml`. A field the gather
   forgets but the PDF reads loops or crashes.

## Static analysis tools (run before shipping interview-flow changes)

The forms are the output contract; verify it statically rather than only via
happy-path Playwright runs (which mask these bugs — see `tests/navigation-helpers.ts`).

- **`python3 scripts/form_variable_manifest.py [<file.yml>] [-v]`** — for each
  assembled form, enumerates the interview variables it reads (resolving local
  aliases, `for`/`enumerate` loops, bare globals) and flags:
  - **NEVER DEFINED** — read by a form but defined nowhere (typo / missing field).
  - **SHOW-IF GAP** — defined only behind a `show if`, but read without mirroring
    that condition (covers enclosing `if`, short-circuit `and`, and `if defined()`
    block guards).
  - **BRANCH GAP** — *branch-sensitive*: the variable is collected by the
    `mandatory` block only under some `if` guard, but a form reads it under a
    *broader* condition. Caught `122A monthly_income.gross_wages2` (collected only
    for married-filing, read for any consumer-debt filer → single filers crash).
  - **ORPHAN_READ** (`--orphans`) — a variable referenced *anywhere* in the
    interview (code blocks AND screen templates: `${ }`, `% if`, field defaults,
    show-if, review/`subquestion` text) that is defined **nowhere**. This is the
    purest "user can't proceed" dead-end (`no question to define X`). Covers the
    whole interview, not just PDF assembly. Currently **0** — and the gate keeps
    it that way (a new stale/typo'd reference fails the build).
  Also caught `122A separated_status` and the `106AB` grand-total bug (totals sum
  ~50 show-if'd category `*_value`/`*_amount` fields unconditionally).

- **`python3 scripts/interview_dependency_check.py`** — "internal soundness":
  top-level scalars defined by **both a question and code** (the rule-6 loop
  risk). Each hit is a "confirm the definers are mutually exclusive and ordered."
  Flags `monthly_income.median_dependents` — the exact variable behind the
  means-test loop.

Both are static and approximate — treat output as high-signal review lists.

These run as **burn-down gates** in `npm run lint` / `pretest`:
- `npm run lint:flow` (`scripts/lint-flow-gaps.sh`) — fails on any NEW never-defined
  / show-if gap vs `scripts/form-variables-baseline.txt`. After fixing one, tighten
  with `./scripts/lint-flow-gaps.sh --update`.
- `npm run lint:test-complete` (`scripts/lint-test-completeness.sh`) — see Testing.

## Testing

See `tests/navigation-helpers.ts`. The section helpers drive the **happy path**
and therefore skip the failing branches (e.g. `navigateMeansTest` sets
`non_consumer_debts=true`, which short-circuits the means-test review where the
crashes live). When testing a fix, drive the *actual failing branch*. Deploy
locally with `./deploy.sh` (installs into the `docassemble` Docker container);
read real tracebacks from `docker exec docassemble tail /usr/share/docassemble/log/docassemble.log`.

**Every scenario/regression test must run ALL THE WAY THROUGH to PDF assembly.**
A passing mid-interview screen proves a screen, not the deliverable; crashes
like the 106AB grand-total sum surface only at assembly, and a mid-interview fix
can introduce a *later* failure. End such tests with:

```ts
import { finishAndAssertAllPdfs } from './assert-helpers';
await finishAndAssertAllPdfs(page);  // asserts conclusion + all PDFs, no error page
```

`npm run lint:test-complete` (`scripts/lint-test-completeness.sh`) is a burn-down
gate: new specs that stop mid-interview fail unless explicitly exempted
(`--update`). Coverage should span the show-if branches the manifest flags
(missing property categories, consumer vs non-consumer debts, single vs joint) —
that's where assembly-time gaps hide.

## Workflow

Branch + PR; the PR is merged in the web portal, not via CLI. Exemption caps are
duplicated in `objects.py` and `data/static/exemptions.js` — keep them in sync.
Legal citations / statutory dollar amounts require authoritative-source
verification and attorney sign-off — never trust an LLM on a statute.
