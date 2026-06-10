/**
 * Shared page-driving primitives for the interview walkers:
 *
 *  - strict-validator-walker.spec.ts — deterministic "No"-path walk that
 *    detects silently-blocking pages (validator bugs).
 *  - fuzz-walker.spec.ts — seeded-random walk that explores the branches no
 *    fixture covers (the gross_wages2 class: crashes living on paths nobody
 *    thought to test).
 *
 * All fill functions accept an optional `rng` (a () => number in [0,1)).
 * Without it, behavior is the original deterministic walker behavior
 * (No on yes/no, first option on selects, fixed text defaults). With it,
 * choices randomize — reproducibly, since callers seed the rng.
 */
import { Page } from '@playwright/test';
import { waitForDaPageLoad } from './helpers';

export async function getHeading(p: Page) {
  return ((await p.locator('h1').first().textContent({ timeout: 5000 }).catch(() => '')) || '').trim();
}

/**
 * Fill every visible empty required form input with a safe (or seeded-random)
 * default. Returns true if at least one field was touched.
 *
 * `yesBias` is the probability a random yes/no radio answers Yes (only used
 * when rngValue is provided). Callers damp it per-heading to guarantee list
 * gates terminate.
 */
export async function fillVisibleRequiredFields(
  p: Page,
  opts: { rngValue?: number; yesBias?: number } = {},
): Promise<boolean> {
  return await p.evaluate(({ rngValue, yesBias }) => {
    // Tiny deterministic PRNG seeded from the caller-provided value so every
    // field on the page gets a different (but reproducible) draw.
    let s = rngValue === undefined ? 0 : Math.floor(rngValue * 0xffffffff) >>> 0;
    const rnd = () => {
      if (rngValue === undefined) return 0; // deterministic mode: always "first/no"
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const random = rngValue !== undefined;
    let touched = false;

    // 1) selects (dropdowns) — pick first non-empty option (or a random one).
    //    Includes combobox-backed selects: `datatype: combobox` hides the
    //    original <select> behind a bootstrap-combobox text input, and typing
    //    into that input does NOT commit a value — the validator checks the
    //    hidden select ("You need to select one or type in a new value").
    document.querySelectorAll('select').forEach((sel) => {
      const sl = sel as HTMLSelectElement;
      if (sl.offsetParent === null) {
        const comboboxBacked = !!(sl.closest('.combobox-container')
          || sl.parentElement?.querySelector('input.combobox')
          || (sl.nextElementSibling as HTMLElement | null)?.querySelector?.('input.combobox'));
        if (!comboboxBacked) return;
      }
      if (sl.value && sl.value !== '') return;
      const opts2 = Array.from(sl.options).filter(o => o.value && o.value !== '');
      if (opts2.length === 0) return;
      const pick = random ? opts2[Math.floor(rnd() * opts2.length)] : opts2[0];
      sl.value = pick.value;
      sl.dispatchEvent(new Event('change', { bubbles: true }));
      touched = true;
    });

    // 2) radio groups — pick No (or a biased-random choice). CRITICAL: check
    //    the LABEL's visibility (not the input): docassemble uses Bootstrap's
    //    `btn-check` pattern where the input is intentionally hidden and the
    //    label carries the click target. Setting .checked directly leaves the
    //    form in a state the jQuery validator rejects on submit.
    const seenGroups = new Set<string>();
    document.querySelectorAll('input[type="radio"]').forEach((r) => {
      const radio = r as HTMLInputElement;
      const name = radio.name;
      if (!name || seenGroups.has(name)) return;
      seenGroups.add(name);
      const group = Array.from(
        document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)
      ) as HTMLInputElement[];
      if (group.some((g) => g.checked)) return;
      const visibleByLabel = group.filter((g) => {
        if (!g.id) return false;
        const lab = document.querySelector(`label[for="${CSS.escape(g.id)}"]`) as HTMLElement | null;
        return !!lab && lab.offsetParent !== null;
      });
      if (visibleByLabel.length === 0) return;
      const noOne = visibleByLabel.find((g) => {
        const v = g.value;
        return v === 'False' || v === 'No' || v === 'false' || v === '0';
      });
      const yesOne = visibleByLabel.find((g) => {
        const v = g.value;
        return v === 'True' || v === 'Yes' || v === 'true' || v === '1';
      });
      let target: HTMLInputElement;
      if (random && yesOne && noOne) {
        target = rnd() < (yesBias ?? 0.3) ? yesOne : noOne;
      } else if (random && !noOne && !yesOne) {
        target = visibleByLabel[Math.floor(rnd() * visibleByLabel.length)];
      } else {
        target = noOne || visibleByLabel[0];
      }
      const lab = document.querySelector(`label[for="${CSS.escape(target.id)}"]`) as HTMLElement;
      lab.click();
      touched = true;
    });

    // 3) text/number/currency/date inputs — fill safe defaults
    document.querySelectorAll('input').forEach((el) => {
      const i = el as HTMLInputElement;
      if (i.offsetParent === null) return;
      if (i.value) return;
      const t = (i.type || '').toLowerCase();
      if (['hidden', 'submit', 'button', 'reset', 'file', 'radio', 'checkbox'].includes(t)) return;
      const label = i.id ? document.querySelector(`label[for="${i.id}"]`) : null;
      const labelText = (label?.textContent || '').toLowerCase();
      // Currency fields (datatype: currency) render as type=text inside an
      // input-group showing a `$`; an 'N/A' default fails currency validation
      // and silently blocks Continue (e.g. "Total Claim"). Detect + fill 0.
      const grp = i.closest('.input-group');
      const isCurrency = !!(grp && /[$]/.test(grp.textContent || ''));
      const money = () => random ? String(Math.floor(rnd() * 5000)) : '0';
      let v = 'N/A';
      // Date checks FIRST: "Payment Date 1" matches the money branch's 'pay'
      // and a numeric value in a date field fails validation (silent block).
      if (t === 'date') v = '2024-01-01';
      else if (labelText.includes('date')) v = '01/01/2024';
      else if (isCurrency || t === 'number' || t === 'tel') v = money();
      else if (labelText.includes('zip')) v = '68508';
      // "Schedule A/B line" is number-validated ('N/A' silently blocks)
      else if (labelText.includes('line')) v = random ? String(1 + Math.floor(rnd() * 50)) : '1';
      else if (
        labelText.includes('amount') || labelText.includes('income') ||
        labelText.includes('value') || labelText.includes('pay') ||
        labelText.includes('expense') || labelText.includes('count') ||
        labelText.includes('mileage') || labelText.includes('milage')
      ) v = money();
      else if (t === 'email') v = 'test@example.com';
      else if (labelText.includes('year')) v = '2020';
      else if (labelText.includes('name')) v = 'Test Person';
      else if (labelText.includes('street') || labelText.includes('address')) v = '123 Test St';
      else if (labelText.includes('city')) v = 'Lincoln';
      // datatype: combobox renders a text input with a JS dropdown; a value
      // that isn't committed through the widget fails its "select one or
      // type in a new value" rule. Prefer a real option when one is exposed
      // (datalist or the combobox menu), and always blur to commit.
      const dl = (i as HTMLInputElement).list;
      if (dl && dl.options.length > 0) {
        const pick = random ? dl.options[Math.floor(rnd() * dl.options.length)] : dl.options[0];
        v = pick.value || pick.textContent || v;
      } else if (i.classList.contains('combobox') || i.closest('.combobox-container')) {
        const menuOpt = i.closest('.combobox-container, .da-field-container')
          ?.querySelector('.dropdown-menu li a, .dropdown-menu .dropdown-item');
        if (menuOpt?.textContent?.trim()) v = menuOpt.textContent.trim();
      }
      i.value = v;
      i.dispatchEvent(new Event('input', { bubbles: true }));
      i.dispatchEvent(new Event('change', { bubbles: true }));
      i.dispatchEvent(new Event('blur', { bubbles: true }));
      touched = true;
    });

    // 4) checkbox GROUPS (datatype: checkboxes) — untouched groups fail the
    //    "check at least one option, or check None of the above" validator
    //    (e.g. 107 "Business Connections"). Only groups (>=2 visible boxes):
    //    a lone checkbox is a yesno whose unchecked state is a valid False,
    //    and flipping it would change the strict walker's deterministic path.
    const cbs = (Array.from(document.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[])
      .filter((cb) => {
        if (!cb.id) return false;
        const lab = document.querySelector(`label[for="${CSS.escape(cb.id)}"]`) as HTMLElement | null;
        return !!lab && lab.offsetParent !== null;
      });
    if (cbs.length >= 2 && !cbs.some((c) => c.checked)) {
      const labelOf = (c: HTMLInputElement) =>
        (document.querySelector(`label[for="${CSS.escape(c.id)}"]`)?.textContent || '');
      const nota = cbs.find((c) => /none of the above/i.test(labelOf(c)));
      let target: HTMLInputElement;
      if (random) {
        target = rnd() < (yesBias ?? 0.3) || !nota ? cbs[Math.floor(rnd() * cbs.length)] : nota;
      } else {
        target = nota || cbs[0];
      }
      (document.querySelector(`label[for="${CSS.escape(target.id)}"]`) as HTMLElement).click();
      touched = true;
    }

    // 5) textareas (docassemble `input type: area`) — the insider-payment and
    //    contract-details pages have REQUIRED textareas; leaving them empty
    //    fails validation and reads as a silent block.
    document.querySelectorAll('textarea').forEach((el) => {
      const ta = el as HTMLTextAreaElement;
      if (ta.offsetParent === null) return;
      if (ta.value) return;
      ta.value = 'Test details provided by the fuzz walker.';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true }));
      touched = true;
    });

    return touched;
  }, { rngValue: opts.rngValue, yesBias: opts.yesBias }).catch(() => false);
}

export async function clickContinueStrict(p: Page) {
  await waitForDaPageLoad(p);
  // Plain click — no validator override. Real-user click path.
  await p.locator('#da-continue-button').click({ timeout: 5000 }).catch(() => {});
  await p.waitForLoadState('networkidle').catch(() => {});
}

/**
 * Event-driven page-advance wait: returns as soon as the _tracker value or
 * the h1 text differs from the supplied pre-click snapshot, or after
 * timeoutMs (validation rejections legitimately leave both unchanged — the
 * caller's same-heading logic handles that case). Replaces fixed sleeps;
 * typical advance is detected in 100-300ms instead of a flat 800ms+.
 */
export async function waitForAdvance(
  p: Page, trackerBefore: string | null, headingBefore: string, timeoutMs = 3000,
): Promise<void> {
  await p.waitForFunction(
    ({ t0, h0 }) => {
      const t = (document.querySelector('input[name="_tracker"]') as HTMLInputElement | null)?.value ?? null;
      const h = document.querySelector('h1')?.textContent?.trim() ?? '';
      return (t0 !== null && t !== null && t !== t0) || (h !== '' && h !== h0);
    },
    { t0: trackerBefore, h0: headingBefore },
    { timeout: timeoutMs, polling: 100 },
  ).catch(() => {});
}

export async function pageHasContinueButton(p: Page): Promise<boolean> {
  return (await p.locator('#da-continue-button').count()) > 0;
}

/** Diagnostic snapshot of the form state when a walker records a silent
 *  block: every visible field (id/type/required/value/checked) plus any
 *  visible validation messages — enough to see WHICH field the validator
 *  rejected without reproducing under a debugger. */
export async function dumpPageState(p: Page): Promise<string> {
  return await p.evaluate(() => {
    const fields: string[] = [];
    document.querySelectorAll('input, select, textarea').forEach((el) => {
      const f = el as HTMLInputElement;
      if (['hidden', 'submit', 'button', 'reset'].includes(f.type)) return;
      if (f.offsetParent === null) return;
      const lab = f.id ? document.querySelector(`label[for="${CSS.escape(f.id)}"]`)?.textContent?.trim() : '';
      fields.push(`${f.tagName.toLowerCase()}[${f.type}] id=${f.id} req=${f.required} ` +
        (f.type === 'radio' || f.type === 'checkbox' ? `checked=${f.checked}` : `value=${JSON.stringify((f.value || '').slice(0, 30))}`) +
        (lab ? ` label=${JSON.stringify(lab.slice(0, 50))}` : ''));
    });
    const errs: string[] = [];
    document.querySelectorAll('.invalid-feedback, .da-has-error, .alert-danger, label.error').forEach((e) => {
      const el = e as HTMLElement;
      if (el.offsetParent !== null && el.textContent?.trim()) errs.push(el.textContent.trim().slice(0, 100));
    });
    const allInputs = document.querySelectorAll('input, select, textarea').length;
    const buttons = Array.from(document.querySelectorAll('button'))
      .filter((b) => (b as HTMLElement).offsetParent !== null)
      .map((b) => `${b.id || b.getAttribute('name') || '?'}:"${(b.textContent || '').trim().slice(0, 20)}"`);
    const form = document.querySelector('form#daform');
    return `VALIDATION: ${errs.length ? errs.join(' | ') : '(none visible)'}\n` +
      `inputs total=${allInputs} visible=${fields.length}; form html len=${form ? form.innerHTML.length : -1}\n` +
      `visible buttons: ${buttons.join(', ')}\n` + fields.join('\n');
  }).catch((e) => `dump failed: ${e}`);
}

/**
 * Pages whose ONLY field is a single yesno render Yes/No as docassemble
 * buttons (with a `name=<base64>` attribute) that auto-submit; there's no
 * Continue button. Match any non-Continue button by its text.
 */
export async function clickYesNoButtonPage(p: Page, yes = false): Promise<boolean> {
  const all = p.locator(`button[name]:has-text("${yes ? 'Yes' : 'No'}"):visible`);
  const n = await all.count();
  if (n === 0) return false;
  await all.first().click().catch(() => {});
  await p.waitForLoadState('networkidle').catch(() => {});
  return true;
}

/** mulberry32 — tiny seedable PRNG so fuzz runs are reproducible from a seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
