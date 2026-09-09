# Static file directory

Files here are served to the browser at
`/packagestatic/docassemble.BankruptcyClinic/<name>`.

- `bk-theme.css` — the interview theme. It restyles Bootstrap 5.3 through the
  `--bs-*` custom properties rather than replacing it, so docassemble's markup
  and JavaScript are untouched.
- `fonts/` — self-hosted Archivo. See `fonts/README.md`.
- `exemptions.js`, `exemption-tracker.js` — exemption caps and the usage panel.
  Exemption dollar amounts are duplicated in `objects.py`; `npm run
  lint:caps-sync` fails if the two drift.
- `ssn-itin-helper.png` — the SSN/ITIN illustration.

## Bump the version when you change a file here

docassemble serves these files with `?v=<version>` and
`Cache-Control: public, max-age=31536000`. That version string is the only
cache key, so a returning filer keeps the old copy for a **year** unless it
changes. Installing the package does not need a bump; changing a static file
does.

The version in the URL comes from `__version__` in
`docassemble/BankruptcyClinic/__init__.py`, **not** from `setup.py`. See
`get_version_parameter` in `docassemble/webapp/file_access.py`, which reads it
with `importlib.import_module(package).__version__`.

Bump **both** files together. They are easy to let drift, because the package
management page displays the `setup.py` version — so the table can read
correctly while every browser is still being handed a stale stylesheet. That
had already happened here once: `setup.py` reached 0.0.28 while `__init__.py`
sat at 0.0.24, and the server was serving `bootstrap-theme.css?v=0.0.24`.

To confirm a change actually reached the browser, check the emitted URL rather
than the page:

    curl -s '<server>/interview?i=docassemble.BankruptcyClinic:data/questions/voluntary-petition.yml' \
      | grep -o 'packagestatic[^"]*'
