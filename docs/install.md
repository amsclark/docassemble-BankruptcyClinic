---
layout: default
title: "Install BankruptcyClinic"
description: "Find the source, run a docassemble server, install the package, and open the interview. Roughly half an hour, most of it waiting on Docker."
permalink: /install/
---

<section class="sheet" markdown="1">

# Install it

<p class="lede">Roughly half an hour, and most of that is Docker pulling an image while you do something else.</p>

BankruptcyClinic is a package for [docassemble](https://docassemble.org/), the
open-source guided-interview platform. So there are two things to install: a docassemble
server, and this package on top of it.

<div class="band">Where to find it</div>

<div class="table-scroll" markdown="1">

| | |
|---|---|
| Source | [github.com/amsclark/docassemble-BankruptcyClinic](https://github.com/amsclark/docassemble-BankruptcyClinic) |
| Package name | `docassemble.BankruptcyClinic` |
| Entry interview | `docassemble.BankruptcyClinic:data/questions/voluntary-petition.yml` |
| License | [AGPL-3.0-or-later](#licence) |
| Bugs and requests | [GitHub issues](https://github.com/amsclark/docassemble-BankruptcyClinic/issues) |

</div>

<div class="caution" markdown="1">
**Before you put real client data in it.** Everything below stands up a *test* server with
a default password on plain HTTP. That is fine for kicking the tires and wrong for a live
case. Read [running it for real](#running-it-for-real) before anyone files anything.
</div>

</section>

<section class="sheet" markdown="1">

<div class="band">Standing it up</div>

<div class="step" markdown="1">

### <span class="step-n">1</span> Check you have what you need

Docker, and about 6 GB of free disk. Node 18 or newer only if you intend to run the test
suite. Nothing else — docassemble brings its own Python, database, and web server inside
the image.

</div>

<div class="step" markdown="1">

### <span class="step-n">2</span> Start a docassemble server

```bash
docker run -d --name docassemble -p 8080:80 --stop-timeout 600 \
  -e DA_ADMIN_EMAIL=admin@admin.com \
  -e DA_ADMIN_PASSWORD=password \
  -e DAHOSTNAME=localhost \
  jhpyle/docassemble
```

First start takes three to five minutes while it initialises the database and background
services. Watch it finish with `docker logs -f docassemble`, then open
<http://localhost:8080> and sign in with the email and password above.

</div>

<div class="step" markdown="1">

### <span class="step-n">3</span> Install the package

In the docassemble web interface, go to the menu at top right and choose
**Package Management**, then **Add an existing package**. Pick **GitHub** as the source
and give it:

```
https://github.com/amsclark/docassemble-BankruptcyClinic
```

Press **Update**. Installation logs stream into the page; it takes a couple of minutes
and ends with the server restarting itself.

If your server has no outbound internet — an air-gapped container, for example — clone
the repository somewhere with a network, then use `deploy.sh` in the repository root
instead. It zips the package, copies it into the container, installs it with
`--no-build-isolation` so pip does not try to fetch a build environment, and restarts
uwsgi:

```bash
git clone https://github.com/amsclark/docassemble-BankruptcyClinic.git
cd docassemble-BankruptcyClinic
bash deploy.sh
```

</div>

<div class="step" markdown="1">

### <span class="step-n">4</span> Open the interview

```
http://localhost:8080/interview?i=docassemble.BankruptcyClinic:data/questions/voluntary-petition.yml
```

That link is the whole product. Bookmark it, or add it to your server's dispatch list in
the docassemble configuration so it gets a short URL:

```yaml
dispatch:
  bankruptcy: docassemble.BankruptcyClinic:data/questions/voluntary-petition.yml
```

Then it answers at `http://localhost:8080/start/bankruptcy`.

</div>

<div class="step" markdown="1">

### <span class="step-n">5</span> Prove it works before you trust it

Run one throwaway petition end to end — pick Nebraska or South Dakota, invent a debtor,
add a house with a mortgage and a car with a loan, and download the packet at the end.
If Schedule A/B, Schedule C, Schedule D and Form 108 all describe the same car, the
install is good.

To run the automated suite against your own server instead:

```bash
npm install
npx playwright install chromium
npm run test:smoke        # server health
npm run test:scenarios    # five full personas, start to PDF
```

</div>

</section>

<section class="sheet" markdown="1">

<div class="band">Keeping it current</div>

Court forms get revised, and the US Trustee Program refreshes its median-income tables
roughly twice a year. Both change what a correct petition looks like.

To take an update, open **Package Management**, find `docassemble.BankruptcyClinic`, and
press **Update**. It pulls the current version from GitHub and restarts. Watch the
[releases page](https://github.com/amsclark/docassemble-BankruptcyClinic/releases) or the
commit history to know when something changed and why.

If tracking that is not a job anyone at your organisation wants,
[it can be mine]({{ '/support/' | relative_url }}).

</section>

<section class="sheet" markdown="1">

<a id="running-it-for-real"></a>

<div class="band">Running it for real</div>

The quickstart above is a test rig. A server holding client financial data needs more:

- **HTTPS with a real certificate**, and a real hostname in `DAHOSTNAME`. docassemble can
  get a Let's Encrypt certificate for itself, or sit behind your reverse proxy.
- **Passwords that are not `password`**, and accounts per person rather than a shared
  login, so the audit trail means something.
- **Backups you have restored at least once.** Interview answers live in the docassemble
  database and its storage volume; a backup you have never tested is a rumour.
- **Persistent storage.** Mount a volume or configure S3/Azure backup, or a container
  rebuild loses in-progress interviews.
- **A retention decision.** Chapter 7 answers are among the most sensitive data a client
  will ever hand you. Decide how long you keep completed interviews, and delete on
  schedule.

docassemble's own [installation documentation](https://docassemble.org/docs/docker.html)
covers the server side of all of this in detail. The
[configuration reference](https://docassemble.org/docs/config.html) covers authentication,
including LDAP and Google or Microsoft sign-in.

</section>

<section class="sheet" markdown="1">

<a id="licence"></a>

<div class="band">What the licence asks of you</div>

BankruptcyClinic is under the [GNU Affero General Public License, version 3 or
later](https://www.gnu.org/licenses/agpl-3.0.html). You may run it, read it, change it,
and share it, for any purpose, without paying anyone. Most people who install it owe
nothing beyond leaving the notices alone.

The AGPL differs from the ordinary GPL in one way, and it is the way that matters for a
web application: **running a modified version as a network service counts as
distributing it.** Normally you only owe source to people you hand a copy of the software
to. Under the AGPL you also owe it to people who merely *use* your server.

<div class="table-scroll" markdown="1">

| What you are doing | What you owe |
|---|---|
| Running it as shipped, for your own clinic or firm | Nothing. Keep the notices in place |
| Preparing petitions with it, including for paying clients | Nothing. Charging for your legal work is not distributing software |
| Changing it for yourself and never letting outsiders use that server | Nothing |
| Changing it and letting clients or the public use it over a network | Offer those users your modified source |
| Handing the modified package to another organisation | Ship it under the AGPL, source included |

</div>

The interview already carries the mechanism for the network case: an **About this
software** item in the menu on every screen, which names the licence and links to the
source. If you modify the package, keep that item working and repoint it at your own
repository. Deleting it does not remove the obligation, it just leaves you out of
compliance.

Two things the licence does **not** do. It does not reach your other software: a separate
system that merely talks to this one over an API is not a derivative work. And it does not
touch the petitions themselves. Documents this interview produces are your client's, with
no licence conditions of any kind.

<div class="caution" markdown="1">
**If you use a third-party host.** The obligation follows whoever operates the service. If
you are running an unmodified package on someone else's infrastructure, nothing changes.
If you had that host customise it for you, the modified source has to be available to the
people using the site. Settle that in writing before they start work, not after.
</div>

This is a plain-language summary to help you decide, not legal advice, and the
[licence text](https://github.com/amsclark/docassemble-BankruptcyClinic/blob/main/LICENSE)
governs. If the AGPL blocks something you need,
[get in touch]({{ '/support/' | relative_url }}) rather than quietly working around it.

</section>

<section class="sheet" markdown="1">

<div class="band">When it does not work</div>

**The interview URL 404s.** The package installed but the server did not reload. Restart
it: `docker exec docassemble supervisorctl restart uwsgi`.

**Package Management fails to fetch from GitHub.** The container has no outbound DNS or
network. Use the `deploy.sh` route in step 3.

**The server is unreachable right after `docker run`.** It is still initialising. First
boot genuinely takes three to five minutes; `docker logs -f docassemble` tells you when
it is ready.

**A question asks for something the client cannot answer, or a screen repeats.** That is
a bug worth reporting, not a thing to work around — the interview flow is meant to be
deterministic. [Open an issue](https://github.com/amsclark/docassemble-BankruptcyClinic/issues)
with the state, filing status, and the screen you were on.

</section>
