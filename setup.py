import os
import sys
from setuptools import setup, find_namespace_packages
from fnmatch import fnmatchcase
from distutils.util import convert_path

standard_exclude = ('*.pyc', '*~', '.*', '*.bak', '*.swp*')
standard_exclude_directories = ('.*', 'CVS', '_darcs', './build', './dist', 'EGG-INFO', '*.egg-info')

def find_package_data(where='.', package='', exclude=standard_exclude, exclude_directories=standard_exclude_directories):
    out = {}
    stack = [(convert_path(where), '', package)]
    while stack:
        where, prefix, package = stack.pop(0)
        for name in os.listdir(where):
            fn = os.path.join(where, name)
            if os.path.isdir(fn):
                bad_name = False
                for pattern in exclude_directories:
                    if (fnmatchcase(name, pattern)
                        or fn.lower() == pattern.lower()):
                        bad_name = True
                        break
                if bad_name:
                    continue
                if os.path.isfile(os.path.join(fn, '__init__.py')):
                    if not package:
                        new_package = name
                    else:
                        new_package = package + '.' + name
                        stack.append((fn, '', new_package))
                else:
                    stack.append((fn, prefix + name + '/', package))
            else:
                bad_name = False
                for pattern in exclude:
                    if (fnmatchcase(name, pattern)
                        or fn.lower() == pattern.lower()):
                        bad_name = True
                        break
                if bad_name:
                    continue
                out.setdefault(package, []).append(prefix+name)
    return out

setup(name='docassemble.BankruptcyClinic',
      version='0.0.26',
      description=('A docassemble extension.'),
      long_description='# docassemble.BankruptcyClinic\r\n\r\nA docassemble extension for Chapter 7 bankruptcy petition preparation, generating official US Bankruptcy Court forms (101, 106A/B, 106C, 106D, 106E/F, 106G, 106H, 106I, 106J, 107, 108, 121, 122A, B2030, and Summary).\r\n\r\n## Prerequisites\r\n\r\n- Docker (for running the docassemble server)\r\n- Node.js 18+ and npm (for running tests)\r\n\r\n## Deployment\r\n\r\n### Start the docassemble container\r\n\r\n```bash\r\ndocker run -d --name docassemble -p 8080:80 --stop-timeout 600 \\\r\n  -e DA_ADMIN_EMAIL=admin@admin.com -e DA_ADMIN_PASSWORD=password \\\r\n  -e DA_ADMIN_API_KEY=testingkey123 -e DAHOSTNAME=localhost \\\r\n  jhpyle/docassemble\r\n```\r\n\r\nThe container takes 3-5 minutes to initialize after starting.\r\n\r\n### Deploy the package\r\n\r\n```bash\r\nbash deploy.sh\r\n```\r\n\r\nThis builds a zip, copies it into the container, installs it with `--no-build-isolation` (required for air-gapped Docker), and restarts uwsgi.\r\n\r\n## Testing\r\n\r\nTests use [Playwright](https://playwright.dev/) and target `http://localhost:8080` by default.\r\n\r\n### Install test dependencies\r\n\r\n```bash\r\nnpm install\r\nnpx playwright install chromium\r\n```\r\n\r\n### Test commands\r\n\r\n| Command | Description |\r\n|---------|-------------|\r\n| `npm run test:smoke` | Quick server health checks |\r\n| `npm run test:scenarios` | All 5 scenario tests (simple-single, homeowner-carloan, joint-couple, complex-case, stress-test) |\r\n| `npm run test:pdfs` | PDF field verification suite |\r\n| `npm run test:quick` | Smoke + data validation + edge cases |\r\n| `npx playwright test tests/maximalist.spec.ts --workers=1` | Maximalist end-to-end test (joint filing, 3 of every list item, full PDF verification) |\r\n\r\n### Test architecture\r\n\r\n- `tests/helpers.ts` - Low-level utilities (page interaction, field filling, base64 encoding)\r\n- `tests/navigation-helpers.ts` - Interview section navigation functions and `runFullInterview()` orchestrator\r\n- `tests/fixtures.ts` - TypeScript type definitions and 5 scenario persona data sets\r\n- `tests/pdf-helpers.ts` - PDF download and field extraction using pdf-lib\r\n- `tests/scenario-*.spec.ts` - 5 scenario-driven end-to-end tests\r\n- `tests/pdf-verification.spec.ts` - Exhaustive PDF field verification (11 sub-tests)\r\n- `tests/maximalist.spec.ts` - Comprehensive test exercising every form field and list\r\n\r\n## Author\r\n\r\nAlex Clark, alex@metatheria.solutions\r\n',
      long_description_content_type='text/markdown',
      author='Alex Clark',
      author_email='alex@clarkmanagementconsulting.com',
      license='',
      url='https://docassemble.org',
      packages=find_namespace_packages(),
      install_requires=[],
      zip_safe=False,
      package_data=find_package_data(where='docassemble/BankruptcyClinic/', package='docassemble.BankruptcyClinic'),
     )
