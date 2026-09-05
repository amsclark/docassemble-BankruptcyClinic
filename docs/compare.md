---
layout: default
title: "BankruptcyClinic compared to Upsolve"
description: "Upsolve is free self-help for people with simple Chapter 7 cases. BankruptcyClinic is a tool for the clinic or attorney handling the cases Upsolve has to turn away."
permalink: /compare/
---

<section class="sheet" markdown="1">

# Compared to Upsolve

<p class="lede">Upsolve is good, and it is not competing with this. It serves the filer. This serves the office representing the filer.</p>

[Upsolve](https://upsolve.org/) is a 501(c)(3) nonprofit with a free web app that helps a
person prepare their own Chapter 7 petition and file it without a lawyer. It has helped a
very large number of people who had no other option, and if the person in front of you
fits it, send them there.

The reason to look at something else is that Upsolve has to say no to a lot of people. It
is built for the simple pro se case, and it screens out the rest by design — sensibly,
because those cases need a lawyer. Those are exactly the cases that land on a clinic's
desk.

</section>

<section class="sheet" markdown="1">

<div class="band">Who Upsolve turns away, and what happens to them here</div>

These are Upsolve's own published eligibility limits, taken from
[their FAQ](https://upsolve.org/learn/frequently-asked-questions-about-upsolve/).

<div class="table-scroll verdicts" markdown="1">

| Situation | Upsolve | BankruptcyClinic |
|---|---|---|
| Client owns a home | Not supported | Supported — homestead exemption with the state's statutory cap, Schedule D mortgage, Form 108 intention |
| Married couple filing jointly | Not supported | Supported — Debtor 2 throughout, joint exemption logic, both signature blocks |
| Income above the state median | Not supported | Form 122A-1 computes it and tells you 122A-2 is required. It does not assemble 122A-2 |
| Client owns an LLC, corporation, or partnership | Not supported | Supported as property, business income, and SOFA business disclosures |
| Landlord has an eviction judgment | Not supported | Supported — Forms 101A and 101B |
| Pending personal injury claim | Not supported | Supported as a contingent asset on Schedule A/B with its exemption claim |
| Emergency filing | Not supported | Runs at whatever speed you type |
| Chapter 13 | Not supported | Not supported. Chapter 7 only |

</div>

<div class="caution" markdown="1">
**Be honest about the gap.** Above-median cases still need Form 122A-2 filled in by hand
or by other software. Everything else on that list is in the interview and covered by the
test suite.
</div>

</section>

<section class="sheet" markdown="1">

<div class="band">The structural differences</div>

### It is your software, on your server

Upsolve is a hosted service. Your client's answers go to their servers under their privacy
policy and their retention rules, which is a normal thing for a consumer service and an
awkward thing for a law office with its own duty of confidentiality and its own records
policy.

BankruptcyClinic installs on a machine you control. The client data never leaves it. If
your funder, your bar, or your insurer asks where client financial records live, the
answer is a server with your name on it.

### It assumes a lawyer is in the room

Upsolve is careful to say it is not a lawyer, not a petition preparer, and gives no legal
advice — it has to be, because it hands the tool directly to the filer.

BankruptcyClinic makes the opposite assumption. It is built for a clinic, a legal aid
office, or a firm, where someone licensed is reviewing the petition and signing off. So it
can do things a consumer tool cannot responsibly do: show which exemption statute a claim
is being made under, flag that a claim exceeds its cap, apply the 730-day domicile rule,
and produce Form 2030 disclosing attorney compensation.

### You can change it

MIT licensed, and the parts you would want to change are the parts that are easiest to
change. State exemptions are a plain Python dictionary of statute, cap, and description.
Courts and counties are lists. Adding a state is filling in a table, not rewriting the
engine. A hosted service, however good, is a thing you use as shipped.

### It produces the whole packet, not a subset

Twenty Official Forms, the continuation sheets, and the creditor mailing matrix, all from
one interview.

</section>

<section class="sheet" markdown="1">

<div class="band">Where each one fits</div>

<div class="cols" markdown="1">

<div markdown="1">

#### Send them to Upsolve

<ul class="checklist" markdown="1">
<li class="yes">The person is filing alone, without a lawyer</li>
<li class="yes">No house, no business entity, no lawsuit</li>
<li class="yes">Income below the state median</li>
<li class="yes">Filing individually, not with a spouse</li>
<li class="yes">Your clinic has no capacity to take the case at all</li>
</ul>

It is free, it works, and it is the right answer for that person.

</div>

<div markdown="1">

#### Run BankruptcyClinic

<ul class="checklist" markdown="1">
<li class="yes">You are the clinic, legal aid office, or firm doing the filing</li>
<li class="yes">The case has a house, a spouse, a business, or a judgment</li>
<li class="yes">Client data must stay on your infrastructure</li>
<li class="yes">You want volunteers and students productive quickly</li>
<li class="yes">You need the packet to be internally consistent before it is filed</li>
</ul>

</div>

</div>

<div class="actions">
  <a class="btn btn-solid" href="{{ '/install/' | relative_url }}">Install it and see</a>
  <a class="btn" href="{{ '/support/' | relative_url }}">Ask me about your jurisdiction</a>
</div>

</section>
