---
layout: default
title: "How BankruptcyClinic compares"
description: "Upsolve is free self-help for simple pro se cases. NextChapter and Best Case are paid petition software for firms, at $999 to $2,250 a year. Here is where BankruptcyClinic sits against both."
permalink: /compare/
---

<section class="sheet" markdown="1">

# How it compares

<p class="lede">Two different things get called the alternative. Upsolve serves the filer directly. NextChapter and Best Case sell petition software to the office. This page covers both, including what the paid ones cost.</p>

</section>

<section class="sheet" markdown="1">

<div class="band">Compared to Upsolve</div>

**Upsolve is good, and it is not competing with this.** It serves the filer. This serves
the office representing the filer.

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
| Income above the state median | Not supported | Supported — Form 122A-1 makes the median comparison, and when it comes out above, Form 122A-2 is collected and assembled with the IRS Collection Financial Standards for the filer's county |
| Client owns an LLC, corporation, or partnership | Not supported | Supported as property, business income, and SOFA business disclosures |
| Landlord has an eviction judgment | Not supported | Supported — Forms 101A and 101B |
| Pending personal injury claim | Not supported | Supported as a contingent asset on Schedule A/B with its exemption claim |
| Chapter 13 | Not supported | Not supported. Chapter 7 only |

</div>

<div class="caution" markdown="1">
**Everything on that list is in the interview and covered by the test suite.** The means
test is the newest part: Form 122A-2 uses the IRS National, Local, and out-of-pocket
health care Standards, so the figures are only as current as the tables shipped with it.
Check them against the U.S. Trustee Program's published standards before you file.
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

Licensed under the [AGPL-3.0]({{ '/install/' | relative_url }}#licence), and the parts you
would want to change are the parts that are easiest to change. State exemptions are a
plain Python dictionary of statute, cap, and description. Courts and counties are lists.
Adding a state is filling in a table, not rewriting the engine. A hosted service, however
good, is a thing you use as shipped.

The licence asks one thing back: if you change it and run your version as a service other
people use, publish your changes. Running it as shipped asks nothing.

### It produces the whole packet, not a subset

Twenty Official Forms, the continuation sheets, and the creditor mailing matrix, all from
one interview.

</section>

<section class="sheet" markdown="1">

<a id="pricing"></a>

<div class="band">What the paid packages cost</div>

The other thing a clinic compares this against is commercial petition software. The two
that matter are **NextChapter** and **Best Case**, which is owned by Stretto and has been
the incumbent for decades.

These are the vendors' own published list prices, read from their pricing pages on
**6 September 2026**. Both auto-renew. Check the current figures before you quote them to
a board.

<div class="table-scroll" markdown="1">

| | What you pay | Per year |
|---|---|---|
| **NextChapter** Pro Basic, unlimited cases | $999/yr | **$999** |
| **NextChapter** Pro+, unlimited cases | $1,599/yr | **$1,599** |
| **NextChapter** Whoa package | $1,999/yr | **$1,999** |
| **Best Case** Cloud | $99/mo per seat | **$1,188** per seat |
| **Best Case** Desktop, Chapter 7 | $1,750 year one, then $800 | **$1,750** then $800 |
| **Best Case** Desktop, all chapters | $2,250 year one, then $1,450 | **$2,250** then $1,450 |
| **BankruptcyClinic** | Server you already run, or ~$16/mo hosted | **$0 to ~$200** |

</div>

Neither vendor caps you at those numbers. NextChapter includes six users and charges $99
a year for each one after that, and prices its cheaper tiers by case count — $159 covers
four cases, $649 covers eleven. Its Chapter 13 module, document creator, client portal,
noticing, and texting are separate annual add-ons from $200 to $500 each. Best Case
charges $500 for each desktop seat past the third and $170 to $370 for a custom Chapter 13
plan per jurisdiction. Filing fees, credit counselling courses, credit reports, and
noticing are extra on both.

**Neither publishes a nonprofit, legal aid, or law school clinic rate.** We looked. A
discount may exist if you ask; nothing public tells you what to expect, which makes it
hard to put a number in a grant application.

<div class="caution" markdown="1">
**A price gap is not a feature gap, and this is where the comparison stops being
flattering.** Best Case covers Chapters 7, 11, 12, and 13 in every US district, pulls
credit reports, and files to CM/ECF. BankruptcyClinic does Chapter 7 only, in Nebraska and
South Dakota, and does not e-file — you upload the PDFs yourself. If you file Chapter 13,
or you file outside those two states today, a commercial package does a job this does not
do yet.

If you need that job done this month, buy one. If you have longer, the gap is a scope of
work rather than a permanent limit, and there are two ways to close it.

**Commission it.** Your state added, a local form your district requires, a rule change
worked in: that is normal paid work, quoted as a fixed fee.
[Tell me what you file]({{ '/support/' | relative_url }}) and you get back a scope and a
price. What I build is contributed to the project, so the next clinic that needs your
state gets it free.

**Or have someone else do it, or do it yourself.** This is AGPL software and the parts
worth extending are the parts built to be extended — state exemptions are a table of
statute, cap, and description, and courts and counties are lists. Any developer can take
it on, and pull requests are welcome, new state tables most of all. You are not waiting on
me and you are not locked to me. That is deliberate.
</div>

### When the free option is genuinely the better one

The money argument only works if the fit is real. It usually is when:

- **Chapter 7 is what you do.** A clinic that has never filed a 13 is paying a
  four-chapter price for a one-chapter need.
- **Your volunteer roster is larger than your case count.** Per-seat pricing punishes
  the exact staffing model a law school clinic uses: twenty students, forty cases a year.
  There are no seats here to count.
- **You need it to work the way your intake works.** A licence buys the software as
  shipped. This one you can change, and the changes you make are yours.
- **Someone will ask where the client data lives.** The answer is a server with your name
  on it, which is a shorter conversation with a funder than a vendor's privacy policy.

Where it stops working is a small firm that files across many states and chapters and
wants one vendor to call. That is what the commercial packages are for, and $1,750 a year
is not a lot of money to a firm billing for the work.

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
