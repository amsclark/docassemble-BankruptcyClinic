---
layout: default
title: "Hosting and support for BankruptcyClinic"
description: "Hosted BankruptcyClinic, new state exemption tables, custom forms, and maintenance. The software stays free; what you are buying is my time."
permalink: /support/
---

<section class="sheet" markdown="1">

# Hosting and support

<p class="lede">The software is free and stays free. What I sell is not having to do any of this yourself.</p>

I am Alex Clark. I wrote BankruptcyClinic, I maintain it, and it is in production use at a
Nebraska bankruptcy clinic. If you want it running at yours without your organisation
taking on a server, a Python package, and a court-forms release calendar, that is the work
I do.

<div class="actions">
  <a class="btn btn-solid" href="mailto:alex@metatheria.solutions?subject=BankruptcyClinic">Email alex@metatheria.solutions</a>
  <a class="btn" href="https://github.com/amsclark/docassemble-BankruptcyClinic/issues">Report a bug instead</a>
</div>

</section>

<section class="sheet" markdown="1">

<div class="band">What I offer</div>

### Hosted, so nobody at your office runs a server

I stand up the docassemble server, deploy the package, put it behind your domain with a
real certificate, wire it to your sign-in (LDAP, Google, or Microsoft), configure backups,
and keep it patched. You get a URL and accounts for your people. Typical time from
kickoff to your staff using it: **two to three weeks**.

If you would rather host it yourself and just want it set up correctly once, that is a
smaller version of the same job.

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

The US Trustee Program refreshes median-income tables roughly every six months. Official
Forms get revised. Federal exemption caps adjust. On a maintenance contract I track those,
update the package, test it, and roll it out to your server, so a stale table is never the
reason a petition gets rejected.

### Training

Walk-throughs for attorneys, paralegals, and students, recorded so you can reuse them for
the next intake of volunteers instead of booking me again.

</section>

<section class="sheet" markdown="1">

<div class="band">Get in touch</div>

Email **[alex@metatheria.solutions](mailto:alex@metatheria.solutions?subject=BankruptcyClinic)**
and tell me:

- Your organisation, and whether you are a clinic, legal aid office, law school, or firm
- Which state or district you file in
- Roughly how many Chapter 7 cases a year
- Whether you want it hosted by me or set up on your own infrastructure
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
  <a class="btn" href="https://github.com/amsclark/docassemble-BankruptcyClinic">Source on GitHub</a>
  <a class="btn" href="https://github.com/amsclark/docassemble-BankruptcyClinic/issues">Issues and feature requests</a>
</div>

Pull requests are welcome, particularly new state exemption tables. If you add your state,
say so in the pull request and note who verified the statutes.

</section>
