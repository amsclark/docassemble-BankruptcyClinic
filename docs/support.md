---
layout: default
title: "Customization and support for BankruptcyClinic"
description: "New state exemption tables, custom forms, maintenance, and training. The software stays free. I do not host it — here is who does."
permalink: /support/
---

<section class="sheet" markdown="1">

# Customization and support

<p class="lede">The software is free and stays free. What I sell is changing it to fit your jurisdiction and keeping it correct.</p>

I am Alex Clark. I wrote BankruptcyClinic, I maintain it, and it is in production use at a
Nebraska bankruptcy clinic.

**I do not offer hosting.** Other people do that well and it is not the part I am useful
for. See [who can host it for you](#hosting) below. My work starts once you have a server,
wherever it lives.

<div class="actions">
  <a class="btn btn-solid" href="mailto:alex@clarkmanagementconsulting.com?subject=BankruptcyClinic">Email me</a>
  <a class="btn" href="https://github.com/amsclark/docassemble-BankruptcyClinic/issues">Report a bug instead</a>
</div>

</section>

<section class="sheet" markdown="1">

<div class="band">What I offer</div>

### Your state added

Nebraska and South Dakota ship today. Adding a state means researching its exemption
statutes and caps, having an attorney in that state verify them, encoding the table,
adding the district courts and counties, and wiring the state into the means-test data.
Fixed fee, quoted per state.

The result is contributed back to the open-source project, so the next clinic in your
state gets it free. That is deliberate.

### Custom forms and workflow

Local forms your district requires, cover sheets, intake questions specific to your
screening process, changes to how the interview is sequenced for how your volunteers
actually work. The interview is built to extend; this is normal work rather than a rewrite.

### Maintenance

A petition generator rots quietly. Nothing breaks, no error appears, and the numbers it
prints are simply last year's. The three things that go stale are:

- **Median-income tables.** The US Trustee Program republishes them roughly every six
  months. A stale table puts the wrong figure on Form 122A-1 and can flip the
  presumption-of-abuse answer.
- **Official Forms.** The courts revise them. A revised PDF usually renames or moves form
  fields, and docassemble fills by exact field name — a renamed field silently prints
  blank rather than raising an error.
- **Statutory dollar amounts.** The federal figures adjust on a three-year cycle, and
  state legislatures change their own exemption caps on no schedule at all.

On a maintenance contract I watch those sources, make the change, and prove it did not
break anything before it reaches you. Proving it is the part that takes the time: the
package carries 168 end-to-end tests that drive the interview in a browser and read the
values back out of the produced PDFs, plus static checks that catch a builder key no
longer matching a template field — the failure mode that otherwise ships as a blank line
on a filed form. You get a versioned package update and a note saying what changed and
why.

Cap changes are the exception to "I just do it": a statutory amount goes to an attorney
licensed in that state for verification before it ships. I do not take an LLM's or my own
word for a number that appears on a court filing.

### Set up correctly, once

Not hosting — a one-time job on a server you or your host already own. I deploy the
package, wire it to your sign-in, run a test petition end to end, and hand it over. After
that the server is yours or your host's to run.

### Training

Walk-throughs for attorneys, paralegals, and students, recorded so you can reuse them for
the next intake of volunteers instead of booking me again.

</section>

<section class="sheet" markdown="1">

<a id="hosting"></a>

<div class="band">Who can host it for you</div>

BankruptcyClinic runs on [docassemble](https://docassemble.org/), so anyone who hosts
docassemble can host this. These three are worth a look. I have no arrangement with any of
them and I get nothing if you sign up — this is a starting list, not an endorsement, and
you should do your own diligence on anyone holding client financial data.

### [Suffolk LIT Lab — Document Assembly Line](https://assemblyline.suffolklitlab.org/)

A university legal-innovation lab, not a company. They describe offering "affordable
docassemble hosting and e-filing tools for courts and legal aid organizations" — their
words. If you are a legal aid office or a court, start here. Contact them at
`litlab@suffolk.edu`.

### [Lemma Legal Consulting](https://lemmalegal.com/)

A legal-technology consultancy that specialises in docassemble, run by Quinten Steenhuis,
who spent twelve years as a legal aid litigator before this. They host the interviews they
build and say they have special rates for nonprofits. The docassemble project's own
deployment page names them. Good fit if you want the host and the developer to be the same
people who already know this software.

### [Elestio](https://elest.io/open-source/docassemble)

General managed hosting for open-source applications, docassemble included. Not legal
specialists — this is infrastructure. They handle installation, updates, backups,
certificates, and monitoring, you pick the cloud and the region, and pricing starts around
$16 a month. They publish ISO 27001, SOC 2, and GDPR compliance claims, which your risk
reviewer may want to see.

<div class="caution" markdown="1">
**Ask before you sign.** Wherever it runs, the server holds your clients' complete
financial picture. Ask any host where the data physically sits, who on their side can read
it, what the backup and deletion schedule is, and whether they will sign whatever
confidentiality terms your bar or your funder requires. A host that cannot answer those in
writing is the wrong host for this.
</div>

Hosting it yourself is also completely reasonable — the
[install guide]({{ '/install/' | relative_url }}) covers it, including the hardening a live
server needs.

**One licence point before you sign with anyone.** BankruptcyClinic is under the AGPL, so
if your host modifies it for you and runs that version as your public service, the
modified source has to be available to the people using the site. Running it unchanged
asks nothing of you or them. Agree who publishes what before the work starts, not after —
[the details are here]({{ '/install/' | relative_url }}#licence).

</section>

<section class="sheet" markdown="1">

<div class="band">Get in touch</div>

Email **[alex@clarkmanagementconsulting.com](mailto:alex@clarkmanagementconsulting.com?subject=BankruptcyClinic)**
and tell me:

- Your organisation, and whether you are a clinic, legal aid office, law school, or firm
- Which state or district you file in
- Roughly how many Chapter 7 cases a year
- Where it will run — your own server, or a host from the list above
- Anything jurisdiction-specific you already know you need

I will come back with a scoping note and a price. If the honest answer is that you should
just install it yourself and not pay me anything, I will tell you that — the
[install guide]({{ '/install/' | relative_url }}) is complete on purpose.

<div class="caution" markdown="1">
**Not legal advice.** I build software; I am not your lawyer and this is not a substitute
for one. Exemption tables and form logic are reviewed by attorneys licensed in the
relevant state, and the person who signs the petition is still responsible for it.
</div>

</section>

<section class="sheet" markdown="1">

<div class="band">If you would rather not talk to anyone</div>

That is a supported path and it costs nothing.

<div class="actions">
  <a class="btn" href="{{ '/install/' | relative_url }}">Install guide</a>
  <a class="btn" href="{{ '/faq/' | relative_url }}">FAQ</a>
  <a class="btn" href="https://github.com/amsclark/docassemble-BankruptcyClinic">Source on GitHub</a>
  <a class="btn" href="https://github.com/amsclark/docassemble-BankruptcyClinic/issues">Issues and feature requests</a>
</div>

Pull requests are welcome, particularly new state exemption tables. If you add your state,
say so in the pull request and note who verified the statutes.

</section>
