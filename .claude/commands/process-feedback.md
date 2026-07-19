---
description: Process new UAT feedback email end-to-end (triage → fix → test → PR → deploy to UAT → draft reply)
---

Process new BankruptcyClinic tester-feedback email. This runs headless from
cron, so never wait for user input; when blocked, log why and exit cleanly.

# Hard guardrails (never violate)

- **Never send email.** Replies are written as local draft FILES for Alex to
  review and paste into Outlook (the M365 connector is read-only for this
  account — ALL Outlook write tools, including create_draft /
  create_reply_draft / label tools, return permission_error; do not attempt
  them). Reply files are plain text: no markdown, no blockquotes, no formatting.
- **Never merge a PR, never push to or commit on main.** Branch + PR only; Alex
  merges in the web portal.
- **Never deploy if tests fail.** A failing fix gets a pushed WIP branch and a
  draft PR (`gh pr create --draft`), no UAT deploy, no "it's fixed" reply draft.
- **Legal/statutory questions are attorney territory.** If feedback needs a
  substantive-law decision (exemption amounts, citations, form interpretation),
  do NOT change code — draft a reply saying it's been flagged for attorney
  review, and say so in the run log.

# Preconditions (check first, abort politely if unmet)

1. `git status --porcelain -- . ':!node_modules'` must be clean. If dirty, Alex
   is likely mid-work: log "working tree dirty, skipping run" and exit.
2. Record the current branch; switch back to it at the end of the run.
3. `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/` must be 200
   (local docassemble container up, needed for test deploys). If not, log and exit.

# Steps

1. **Find unprocessed feedback.** Use `outlook_email_search` for inbox messages
   from the last 14 days. Feedback = messages about the bankruptcy
   interview/forms/clinic app (testers include Roxanne, McKenna, William/ERLS —
   but judge by content, not just sender). Skip any message whose id is already
   in the state file `~/.config/bankruptcyclinic/feedback-processed.txt`
   (check with `grep -F '<messageId>' <state file>`). Do NOT use Outlook
   labels/categories — the connector's label-write tools return
   permission_error for this account. If nothing new: log "no new feedback"
   and exit — that's the normal case.

2. **Triage each feedback email** (process at most 2 per run, oldest first) into:
   - (a) legitimate bug/UX issue → code fix
   - (b) tester misunderstanding or the app is actually correct → reply only,
     explaining kindly and precisely (this happens: verify the claim against the
     actual YAML/flow before assuming the tester is right — e.g. Roxanne's
     July "already listed" assumption was inverted)
   - (c) needs attorney/legal sign-off → reply only, flag for attorney

3. **For (a) — implement the fix:**
   - `git fetch origin && git switch -c feedback/<short-slug> origin/main`
   - Follow CLAUDE.md interview-flow rules (deterministic seeking, show-if
     mirroring, one generator per variable, etc.).
   - If interview flow/order changed, mirror it in `tests/navigation-helpers.ts`.
   - Add or extend a Playwright spec that drives the ACTUAL failing branch the
     tester hit (not the happy path) and runs through PDF assembly
     (`finishAndAssertAllPdfs`).

4. **Test:**
   - `npm run lint` (all burn-down gates must pass).
   - `./deploy.sh` to the local container, then run the new/affected specs:
     `BASE_URL=http://localhost:8080 npx playwright test <specs> --workers=1 --reporter=line`
   - Any failure → guardrail above (draft PR, no deploy, no fixed-reply).

5. **Ship for re-verification:**
   - Commit (end message with the Claude Code co-author trailer), push the branch.
   - `gh pr create` with a summary of the feedback, the fix, and test evidence.
   - `./scripts/deploy-prod.sh` to deploy to https://docassemble2.metatheria.solutions
     so the tester can re-check.

6. **Draft the reply as a file:** write plain text to
   `~/bankruptcyclinic-replies/<YYYY-MM-DD>-<short-slug>.txt` with a header
   block (`To:`, `Subject:` — Re: the original subject — and the original
   message's webLink so Alex can open the thread in one click), a blank line,
   then the reply body: thank them, state in one or two sentences what was
   wrong and what changed (or why no change / attorney flag), note it's live
   on the test site, and ask them to re-verify. Plain text only; Alex
   copies it into Outlook and sends.

7. **Mark processed:** append a line to
   `~/.config/bankruptcyclinic/feedback-processed.txt`:
   `<messageId><TAB><received date><TAB><sender><TAB><one-line outcome>`
   (via `echo ... >> ...`). Do this for every triaged message, including
   reply-only and already-handled ones.

8. **Notify Alex if the run produced anything needing his attention** —
   `./scripts/notify.sh "BC feedback loop" "<one-or-two-sentence summary>"`
   whenever the run created a PR, deployed to UAT, wrote a reply file, or hit
   a failure (test failure, deploy error). Include the PR URL and reply-file
   path in the body. Do NOT notify on clean no-op runs (no new feedback,
   skipped preconditions) — those stay log-only.

9. **Log a run summary to stdout** (cron captures it): messages triaged,
   branch/PR URLs, deploy result, reply files written. Then switch back to
   the branch recorded in Preconditions.

# Notes

- If a `feedback/<slug>` branch or open PR already exists for a message's issue,
  skip that message (a prior run has it in flight) — do not duplicate work.
- Keep test scope targeted (lint gates + the specs touching the change), not the
  full 136-spec suite; cron cadence is 30 minutes.
