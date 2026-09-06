---
layout: default
title: "BankruptcyClinic — open-source Chapter 7 petition assembly"
description: "One guided interview produces the whole Chapter 7 petition packet: 20 Official Forms, state exemptions with statutory caps, and the means test. Free and open source; customization and new states available."
---

<section class="sheet hero" markdown="1">

<div class="hero-head">
  <span>Free software for bankruptcy clinics and small firms</span>
  <span>AGPL-3.0 licensed</span>
</div>

# Your client answers once. Every form fills itself in.

<p class="lede">BankruptcyClinic is a guided interview that turns one sitting with a client into a complete, filing-ready Chapter 7 petition packet.</p>

<div class="caption">
  <div><span class="k">Official Forms produced</span><span class="v">20<small>101 through 2030</small></span></div>
  <div><span class="k">Exemption tables</span><span class="v">NE, SD<small>more on request</small></span></div>
  <div><span class="k">Where data lives</span><span class="v">Your server<small>self-hosted</small></span></div>
  <div><span class="k">Cost to run it</span><span class="v">$0<small>AGPL-3.0 license</small></span></div>
</div>

<div class="actions">
  <a class="btn btn-solid" href="{{ '/install/' | relative_url }}">Install it yourself</a>
  <a class="btn" href="{{ '/support/' | relative_url }}">Have me adapt it to your state</a>
</div>

</section>

<section class="sheet" markdown="1">

<figure>
<video src="{{ '/videos/04-complete-petition.mp4' | relative_url }}" controls muted playsinline width="900"></video>
<figcaption>A full petition assembled in one pass, ending in downloadable PDFs.</figcaption>
</figure>

<div class="band">What comes out</div>

You answer plain-English questions. It produces filled AcroForm PDFs of the official
United States Bankruptcy Court forms — the same files any clerk or attorney can reopen
and edit.

<div class="table-scroll" markdown="1">

| Form | What it is |
|---|---|
| B 101 | Voluntary Petition for Individuals Filing for Bankruptcy |
| B 101A | Initial Statement About an Eviction Judgment Against You |
| B 101B | Statement About Payment of an Eviction Judgment Against You |
| B 103A | Application for Individuals to Pay the Filing Fee in Installments |
| B 103B | Application to Have the Chapter 7 Filing Fee Waived |
| B 106A/B | Schedule A/B — Property |
| B 106C | Schedule C — The Property You Claim as Exempt |
| B 106D | Schedule D — Creditors Who Have Claims Secured by Property |
| B 106E/F | Schedule E/F — Creditors Who Have Unsecured Claims |
| B 106G | Schedule G — Executory Contracts and Unexpired Leases |
| B 106H | Schedule H — Your Codebtors |
| B 106I | Schedule I — Your Income |
| B 106J | Schedule J — Your Expenses |
| B 106Sum | Summary of Your Assets and Liabilities |
| B 106Dec | Declaration About an Individual Debtor's Schedules |
| B 107 | Statement of Financial Affairs, with continuation sheets |
| B 108 | Statement of Intention for Individuals Filing Under Chapter 7 |
| B 121 | Your Statement About Your Social Security Numbers |
| B 122A-1 | Chapter 7 Statement of Your Current Monthly Income |
| B 2030 | Disclosure of Compensation of Attorney for Debtor |

</div>

It also builds the **creditor mailing matrix**, and keeps a reusable creditor library so
the same local bank, hospital, or collection agency is entered correctly once and picked
from a list forever after.

</section>

<section class="sheet" markdown="1">

<div class="band">What it does that a stack of fillable PDFs cannot</div>

### One answer reaches every form that needs it

Enter the car once. It appears as property on Schedule A/B, as an exemption claim on
Schedule C, as the collateral for the lender's claim on Schedule D, as the surrender or
reaffirm decision on Form 108, and in the totals on the Summary. Nothing is retyped, so
nothing drifts out of sync between forms.

### Exemptions with the statutory caps applied

Nebraska and South Dakota exemptions are encoded as real tables — statute cite, cap, and
what it covers. A running tracker shows what is claimed against each statute and flags a
claim that exceeds its cap **before** the petition goes to the court, not after the
trustee objects.

### The means test off current DOJ tables

Form 122A-1 uses the US Trustee Program median-income figures for the debtor's state and
household size, including multi-job wage cases, non-filing spouse income, and Social
Security exclusions.

### Cross-section checks that catch court rejections

The interview compares your answers against each other and stops on conflicts:

- Schedule I income against what the fee-waiver application claims
- Schedule A/B property values against the fee-waiver real-estate page, within 10%
- The codebtor community-property answer against the same question on the SOFA
- The 730-day domicile rule for which state's exemptions actually apply
- Case-number format, ZIP digits, SSN and ITIN format, verified state dropdowns

</section>

<section class="sheet" markdown="1">

<div class="band">Built to be checked, because the output is a court filing</div>

A wrong number on a schedule is a real problem for a real person, so correctness is
enforced mechanically rather than by hoping:

- **168 end-to-end tests across 49 files**, driving the interview in a browser and then
  reading the field values back out of the produced PDFs. Every bug a user has reported
  has a test that fails without the fix.
- **A static form-variable audit** that proves every value a PDF reads is actually
  collected somewhere the user will reach — including values hidden behind a conditional
  question, which is where petition generators usually break.
- **A path-sensitive simulator** that replays the interview across 72 answer
  configurations (filing status × payment method × debt type × means-test shape × state)
  looking for dead ends, loops, and questions asked out of order. Its baseline is empty
  and the build fails if that changes.

Every bug reported so far, with a video of the fix, is on the
[resolved issues page]({{ '/RESOLVED.html' | relative_url }}).

</section>

<section class="sheet" markdown="1">

<div class="band">Who it is for</div>

<div class="cols" markdown="1">

**Bankruptcy clinics and legal aid** taking Chapter 7 pro bono. Volunteers and students
become useful on day one instead of week three, because the interview carries the form
knowledge.

**Solo and small-firm attorneys** who would rather spend the hour counselling the client
than retyping an address into fifteen PDFs.

**Law school clinics** where the point is teaching the legal reasoning, not the data
entry. Students see why an exemption cap matters because the tracker shows them.

**Any organisation that will not put client financial data on someone else's server.**
You run it. The data stays on your machine.

</div>

</section>

<section class="sheet" markdown="1">

<div class="band">Free software, paid help</div>

The software is licensed under the [GNU Affero General Public
License](https://www.gnu.org/licenses/agpl-3.0.html). There is no paid tier, no locked
feature, no seat count, and no "contact sales" wall in front of anything. Clone it, read
it, run it, change it, and never speak to me.

The AGPL adds one condition worth knowing before you adopt it: if you change the software
and run your changed version as a service other people use, you owe those users your
source. Running it as shipped asks nothing of you.
[What the licence means in practice]({{ '/install/' | relative_url }}#licence).

What I sell is my time:

- Adding your state's exemption tables, courts, and counties
- Custom forms, intake steps, and workflow changes for how your clinic actually works
- Keeping up with DOJ median-income refreshes and revised court forms
- Training your attorneys, paralegals, and students
- Setting it up correctly, once, on a server you or your host already own

I do not host it. [Other people do that well]({{ '/support/' | relative_url }}#hosting),
and the install guide covers doing it yourself.

<div class="actions">
  <a class="btn btn-solid" href="{{ '/support/' | relative_url }}">See what I do and get in touch</a>
  <a class="btn" href="https://github.com/amsclark/docassemble-BankruptcyClinic">Read the source on GitHub</a>
</div>

</section>
