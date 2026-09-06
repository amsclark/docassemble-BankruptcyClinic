# Security policy

BankruptcyClinic assembles Chapter 7 bankruptcy petitions. A server running it holds
names, addresses, Social Security numbers, bank balances, debts, and income for people
who are already in financial trouble. That is close to the most sensitive record set a
legal aid office or a small firm will ever keep, so security reports here are welcome and
are taken seriously.

Please read the scope section first. Most reports about a running installation belong to
whoever runs that server, not to this repository.

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Use GitHub's private vulnerability reporting, which is enabled on this repository:

> [Report a vulnerability](https://github.com/amsclark/docassemble-BankruptcyClinic/security/advisories/new)

That opens a private advisory that only you and the maintainer can read. It is the
preferred route because it keeps the report, the fix, and the eventual disclosure in one
place.

If you cannot use GitHub, email **alex@clarkmanagementconsulting.com** with `SECURITY` in
the subject line.

### Do not send real client data

A report containing a real debtor's name, Social Security number, account number, or
assembled petition is itself a data breach, and it will be one that you caused. Reproduce
the problem with invented data and send that instead. If a bug can only be demonstrated
with a real record, describe it in words and say so, and we will work out a safe way to
confirm it.

If you have already sent real data, say so immediately in the report so it can be handled
rather than sitting in an inbox.

### What to put in a report

- What an attacker can do, and who they have to be to do it. "Any signed-in user can read
  another user's answers" is a very different report from "an administrator can read the
  database", and the difference decides how fast this moves.
- The steps to reproduce it, against your own instance.
- The version you tested: the commit SHA, or the output of `pip show
  docassemble.BankruptcyClinic` inside the container.
- Your docassemble version and how it is deployed, if it is relevant.
- Whether you have told anyone else, and whether you plan to publish.

## Scope

Three separate pieces of software have to work for a live installation, and they have
three different maintainers.

### In scope: this package

The interview logic, the Python modules, the PDF builders, the static data tables, and
the packaging in this repository. Examples of things worth reporting:

- One user's answers, documents, or assembled PDFs reaching another user.
- An assembled petition or an uploaded document reachable without authentication, or by a
  user who should not see it.
- Personally identifying information written into logs, error pages, or tracebacks.
- Injection through interview answers: into the produced PDFs, into generated markup, or
  into anything the package executes or evaluates.
- Credentials, API keys, or client data committed to this repository, including anywhere
  in its history.
- A dependency vulnerability that is actually reachable through this package. Please say
  how it is reached; a scanner's version match on its own is usually not a finding here.
- Access control that the interview claims to enforce and does not.

Wrong legal output is not a security issue, but it is still a serious bug and it is very
welcome as a normal
[issue](https://github.com/amsclark/docassemble-BankruptcyClinic/issues/new). A form that
prints the wrong exemption cap harms a real person just as effectively as a vulnerability
does.

### Out of scope here: docassemble itself

The interview runs on [docassemble](https://docassemble.org/), which is a separate
open-source project. Authentication, sessions, user accounts, file storage, the admin
interface, and the server runtime belong to it. Report those to the docassemble project
rather than here, and see its
[security documentation](https://docassemble.org/docs/security.html).

If a docassemble weakness is made materially worse by something this package does, that
part is in scope here. Send it and say which part is which.

### Out of scope here: somebody's deployment

This project ships no server. Anyone running it chose their own host, certificates,
passwords, network, and backups. A finding against a live installation is a report for
whoever runs that installation, and it is theirs to fix.

Not findings against this repository:

- Missing HTTPS, a weak or default administrator password, an exposed admin port, an
  unpatched host operating system, or an out-of-date docassemble on someone's server.
- Missing security headers, cookie flags, or rate limits that the operator configures.
- Denial of service, resource exhaustion, or load testing of any kind.
- Automated scanner output with no demonstrated path to exploitation.
- Social engineering, phishing, or physical access to anyone's office.
- Self-XSS that requires the victim to paste an attacker's payload into their own browser.

The [install guide](https://amsclark.github.io/docassemble-BankruptcyClinic/install/#running-it-for-real)
covers what a server holding this data actually needs. If you find an installation that
is exposing client data, please tell the organisation that runs it. If you cannot work out
who that is, tell the maintainer and it will be passed on.

## Testing rules

Test against an installation you own or have written permission to test.

Do not touch anyone else's server, do not attempt to reach real client records, and do
not run denial of service or automated load against a live legal aid installation. These
are production systems for people in the middle of a bankruptcy, and an outage is a real
harm to them.

Research that stays inside those rules will not be met with a legal complaint from this
project, and a good-faith report that turns out to be wrong is still a welcome report.
This promise covers only what the maintainer of this repository controls. It cannot bind
a hosting company, a court, or an organisation whose server you tested without asking.

## What happens after you report

One person maintains this project, so these are honest working targets rather than a
contractual service level:

| Stage | Target |
|---|---|
| Acknowledgement that the report arrived | 3 working days |
| First assessment, with a severity and a plan | 10 working days |
| Fix for a vulnerability that exposes client data | As fast as it can be done and tested |
| Fix for lower-severity issues | Alongside normal maintenance, and you will be told when |

If you have not heard anything in ten working days, send a reminder. Silence means a
message was missed, not that the report was dismissed.

You will be told what the assessment is, including when the conclusion is that it is not
a vulnerability, and why.

## Disclosure

The preference is coordinated disclosure. Once a fix is ready, a GitHub security advisory
is published describing the problem, which versions are affected, and what an operator has
to do. The advisory names you as the reporter unless you ask to stay anonymous.

Ninety days from the report is the default deadline for publishing, whether or not a fix
is ready by then, because operators need to be able to make their own decisions. If a
problem is being actively exploited, that timeline shortens and the disclosure says so. If
a fix needs longer for a good reason, that gets agreed with you rather than announced at
you.

No money is paid for reports. There is no bug bounty; this is an unfunded open-source
project.

## Supported versions

There are no maintained release branches. Fixes land on `main`, and upgrading means
reinstalling the package from `main` as described in the
[install guide](https://amsclark.github.io/docassemble-BankruptcyClinic/install/).

Nothing older is patched. If you are running an old copy, the answer to a security report
will be to update.

## For operators

If you run BankruptcyClinic and want to be told about security fixes, watch this
repository on GitHub: **Watch → Custom → Security alerts**. Advisories published here will
reach you that way.

A vulnerability in this package may create a notification obligation for you, under state
breach notification law, your bar's confidentiality rules, or your funder's terms. Those
duties are yours and depend on your jurisdiction and your facts. Published advisories try
to give you what such an assessment needs: what was exposed, to whom, and from which
versions. They are not legal advice about your obligations.
