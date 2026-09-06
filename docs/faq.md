---
layout: default
title: "BankruptcyClinic FAQ — support, cost, scope, and data"
description: "Where to ask for help, what it costs, which states and chapters it covers, where client data lives, and how to report a bug or a security problem."
permalink: /faq/
---

<section class="sheet" markdown="1">

# Questions people actually ask

<p class="lede">If your question is not here, <a href="mailto:alex@clarkmanagementconsulting.com?subject=BankruptcyClinic">email me</a> and I will answer it and add it to this page.</p>

</section>

<section class="sheet" markdown="1">

<div class="band">Getting help</div>

### How do I get support?

It depends on what is wrong, because different people are best placed to answer.

**Getting the server up and running.** If someone hosts it for you, ask them — that is
what you are paying them for, and they can see the server. If you host it yourself, the
best room in the world for this is the docassemble community Slack, where the people who
build and run docassemble answer setup questions:
[docassemble.org/docs/support.html#slack](https://docassemble.org/docs/support.html#slack).
Installation, Docker, certificates, backups, and upgrades are all docassemble questions
rather than BankruptcyClinic questions.

**The interview itself.** Feedback, questions, bug reports, and ideas for how it should
work all go in the same place:
[open an issue](https://github.com/amsclark/docassemble-BankruptcyClinic/issues/new).
Apply the **`bug`** label if something is wrong, or the **`enhancement`** label if you are
asking for something new. Issues are public, so keep client details out of them.

**Security problems.** Please do not open a public issue. Use responsible disclosure as
described in
[SECURITY.md](https://github.com/amsclark/docassemble-BankruptcyClinic/blob/main/SECURITY.md),
which explains how to report privately and what happens next.

**Paid help.** If you would rather someone did the work than filed a ticket about it, that
is what the [support page]({{ '/support/' | relative_url }}) is for: new states, custom
forms, maintenance, setup, and training.

### What makes a bug report useful?

The screen you were on, what you entered, what you expected, and what happened instead. If
a produced PDF is wrong, say which form and which line number. If you saw an error page,
copy its text.

Use invented data in the report. Never paste a real client's details into a public issue.

### Is there a guarantee that anyone answers?

Not on the free path. This is an open-source project maintained by one person, and issues
get attention as time allows. If you need a response you can rely on, that is a
[maintenance arrangement]({{ '/support/' | relative_url }}), not an issue tracker.

</section>

<section class="sheet" markdown="1">

<div class="band">Cost and licence</div>

### What does it cost?

Nothing. There is no paid tier, no per-seat charge, no case limit, and no feature held
back. You pay for whatever server you run it on, and that is the whole bill.

I sell my time for state tables, custom work, maintenance, and training. That is optional
and the software does not change if you never buy any of it.

### What does the AGPL licence require of me?

If you run it as shipped, nothing beyond leaving the notices alone. Preparing petitions
with it, including for paying clients, asks nothing of you either.

The one condition worth knowing: if you **change** the software and let other people use
your changed version over a network, you owe those users your modified source.
[The details, with a table]({{ '/install/' | relative_url }}#licence).

### Can I charge clients for work I do with it?

Yes. Charging for your legal work is not distributing software, and the licence has
nothing to say about your fees.

</section>

<section class="sheet" markdown="1">

<div class="band">What it does and does not do</div>

### Which states does it work for?

Nebraska and South Dakota today. Those are the states whose exemption tables, districts,
counties, and means-test data are encoded and attorney-verified.

The rest of the interview is not state-specific, so adding a state is a known piece of
work rather than a rewrite: research the exemption statutes and caps, have an attorney
licensed there verify them, encode the table, add the courts and counties, and wire in the
means-test figures. I quote that as a fixed fee, and the result is contributed back so the
next clinic in your state gets it free.

### Does it do Chapter 13?

No. This is Chapter 7 for individuals. The forms it produces are the Chapter 7 petition
packet, and the means test it runs is the Chapter 7 one.

### Does it file the case with the court?

No. It produces filled, filing-ready PDFs of the Official Forms. You file them the way you
file today, through CM/ECF or however your district works. Nothing in the interview talks
to a court.

### Is it a substitute for a lawyer?

No, and it is not built to be. It assumes a lawyer, a supervised student, or a trained
paralegal is involved. It applies exemption caps and flags conflicts, but the person who
signs the petition is responsible for it, and plenty of the judgment in a bankruptcy is
not something software can make.

If you are an individual filer with no lawyer, [Upsolve]({{ '/compare/' | relative_url }})
is built for exactly that and is a better fit.

### Can a client fill it in on their own?

They can answer the questions, and clinics do use it that way to gather information before
an appointment. What they should not do is take the assembled packet and file it without
anyone reviewing it.

### What happens when the courts revise a form?

Someone has to update the template. A revised Official Form usually renames or moves its
fields, and docassemble fills PDFs by exact field name, so a renamed field prints blank
rather than raising an error — the failure is silent, which is why the package carries a
static check that compares every value the software writes against the fields the template
actually has.

The same is true of the US Trustee Program income and expense tables, which are
republished roughly every six months, and of statutory dollar amounts, which adjust on
their own cycles. Watch the repository to hear about updates, do it yourself, or put it on
[a maintenance arrangement]({{ '/support/' | relative_url }}) and I will.

</section>

<section class="sheet" markdown="1">

<div class="band">Running it</div>

### Where does client data go? Can you see it?

It stays on the server you run. There is no account to create, no licence check, no
telemetry, and no call home; the package makes no outbound network requests. I have no
access to your installation and no copy of anything in it.

If you use a hosting company, then of course the data sits on their infrastructure, and
the questions to ask them are on the
[support page]({{ '/support/' | relative_url }}#hosting).

### Do I need to know Python or docassemble to run it?

No. Installing it is Docker plus one package install, and the
[install guide]({{ '/install/' | relative_url }}) is written for someone who has not used
docassemble before. It takes about half an hour, most of it waiting for a download.

You need Python and docassemble knowledge only to change how the interview behaves.

### Can I try it before installing anything?

There is no hosted demo — a public server with this interview on it would collect real
people's financial details, and I am not running that. The
[videos on the overview page]({{ '/' | relative_url }}) show complete runs end to end, and
the quickstart install gives you a throwaway test server in about half an hour.

### Can I use the quickstart install for real clients?

No. The quickstart stands up a test server with a default password on plain HTTP. Before
any real client data goes near it, read
[running it for real]({{ '/install/' | relative_url }}#running-it-for-real), which covers
HTTPS, per-person accounts, backups you have actually restored, persistent storage, and
deciding how long you keep completed interviews.

### How do I update it?

Reinstall the package from `main`. There are no maintained older branches, so the current
version is the supported one. Test an update on a server that is not the one your
volunteers are using that afternoon.

</section>

<section class="sheet" markdown="1">

<div class="band">Contributing</div>

### Can I add my own state?

Yes, please. Pull requests are welcome and state exemption tables are the most useful kind.
Say in the pull request who verified the statutes and caps, because a dollar figure on a
court filing needs a name behind it rather than a citation someone found online.

### How do I know a change did not break something else?

The package carries end-to-end tests that drive the interview in a browser and then read
values back out of the produced PDFs, plus static checks that catch a form field the
software writes to that no longer exists in the template. They run before anything ships.
[More about how that works]({{ '/' | relative_url }}#built-to-be-checked).

### Is this project actually maintained?

Yes, and it is in production use at a Nebraska bankruptcy clinic. Every bug reported so far
has a fix and a test that fails without it; the
[resolved issues page]({{ '/RESOLVED.html' | relative_url }}) lists them with videos.

It is still one person's project, which is the honest thing to weigh when you decide
whether to depend on it. The mitigation is that you have the source and the licence to
keep using it whatever happens to me.

</section>
