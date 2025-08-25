import { test, expect } from '@playwright/test';

// Minimal helpers for this spec only
function idFor(varName: string): string {
	// Docassemble element ids are base64 of the variable name without padding
	// Example: 'debtor[i].name.first' => '#ZGVidG9yW2ldLm5hbWUuZmlyc3Q'
	// Use Node Buffer; in browsers you'd use btoa()
	// Ensure no trailing '=' padding
	// eslint-disable-next-line no-undef
	const b64 = Buffer.from(varName).toString('base64').replace(/=+$/, '');
	return `#${b64}`;
}
function nameFor(varName: string): string {
	// base64 of variable name without padding
	// eslint-disable-next-line no-undef
	return Buffer.from(varName).toString('base64').replace(/=+$/, '');
}
async function gotoInterview(page: any) {
	await page.goto('https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml&reset=1#page1');
	await page.waitForLoadState('networkidle');
}

async function selectFirstRadioOrByLabel(page: any, label: string) {
	const byRole = page.getByRole('radio', { name: label }).first();
	if (await byRole.count()) {
		try {
			await byRole.scrollIntoViewIfNeeded();
			await byRole.click({ trial: true }).catch(() => {});
			await byRole.click({ timeout: 2000 });
			return;
		} catch {}
		// Fallback: click the associated label via 'for'
		const input = await byRole.elementHandle();
		if (input) {
			const id = await input.getAttribute('id');
			if (id) {
				await page.locator(`label[for="${id}"]`).click({ force: true }).catch(() => {});
				return;
			}
		}
	}
	const first = page.locator('input[type="radio"]').first();
	if (await first.count()) {
		const id = await first.getAttribute('id');
		if (id) {
			await page.click(`label[for="${id}"]`).catch(() => {});
			return;
		}
		await first.evaluate((el: HTMLInputElement) => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
	}
}

async function backIfPresent(page: any) {
	const back = page.locator('#da-back-button, button[name="_back"], button:has-text("Back"), a#da-back-button, a:has-text("Back")').first();
	if (await back.count()) {
		try {
			await back.scrollIntoViewIfNeeded();
			await back.click();
			await page.waitForLoadState('networkidle');
		} catch {}
	}
}

async function continueIfPresent(page: any) {
	const btn = page.locator('button[type="submit"]').first();
	if (await btn.count()) {
		try {
			await btn.scrollIntoViewIfNeeded();
			await btn.click();
		} catch {
			// Fallback: click programmatically by id
			await page.evaluate(() => {
				// Prefer submitting the form directly
				const frm = document.querySelector('form');
				if (frm && (frm as any).requestSubmit) {
					(frm as HTMLFormElement).requestSubmit();
					return;
				}
				const b = document.getElementById('da-continue-button') as HTMLButtonElement | null;
				if (b) { b.disabled = false; b.click(); }
			});
		}
		await page.waitForLoadState('networkidle');
	}
}

async function selectFirstRealOptionByLabel(page: any, labelRe: RegExp, fallbackLabel?: string) {
    const sel = page.getByLabel(labelRe).first();
    if (await sel.count()) {
        if (fallbackLabel) {
            try { await sel.selectOption({ label: fallbackLabel }); return; } catch {}
            try { await sel.selectOption(fallbackLabel); return; } catch {}
        }
        // Pick first non-placeholder
        const opts: string[] = await sel.locator('option').allTextContents().catch(() => [] as string[]);
        const firstReal = opts.find((o: string) => (o || '').trim() && !/^select\.{3}|select\s*\.\.\./i.test((o || '').trim()));
        if (firstReal) {
            try { await sel.selectOption({ label: firstReal }); } catch { await sel.selectOption(firstReal); }
        }
    }
}

async function fillOrSelectByLabel(page: any, labelRe: RegExp, value: string) {
	const ctrl = page.getByLabel(labelRe).first();
	if (!(await ctrl.count())) return;
	// Detect element type
	const handle = await ctrl.elementHandle();
	if (!handle) return;
	const tag = await handle.evaluate((n: Element) => (n as HTMLElement).tagName.toLowerCase());
	if (tag === 'select') {
		try { await ctrl.selectOption({ label: value }); return; } catch {}
		try { await ctrl.selectOption(value); return; } catch {}
		// fallback to first real option
		await selectFirstRealOptionByLabel(page, labelRe);
	} else {
		await ctrl.fill(value).catch(() => {});
	}
}

async function fillTextboxByName(page: any, nameRe: RegExp, value: string) {
	const tb = page.getByRole('textbox', { name: nameRe }).first();
	if (await tb.count()) {
		await tb.scrollIntoViewIfNeeded().catch(() => {});
		await tb.fill(value).catch(() => {});
	}
}

async function setFieldByLabel(page: any, labelText: RegExp, value: string) {
	await page.evaluate((args: [string, string]) => {
		const [labelSrc, val] = args;
		const labelRe = new RegExp(labelSrc, 'i');
		const labels = Array.from(document.querySelectorAll('label')) as HTMLLabelElement[];
		const target = labels.find(l => labelRe.test((l.textContent || '').trim()));
		if (!target) return false;
		const forId = target.getAttribute('for');
		if (!forId) return false;
		const el = document.getElementById(forId) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
		if (!el) return false;
		(el as any).value = val;
		el.dispatchEvent(new Event('input', { bubbles: true }));
		el.dispatchEvent(new Event('change', { bubbles: true }));
		return true;
	}, [labelText.source, value]);
}

async function setRadioAnswerByQuestion(page: any, questionRe: RegExp, answerRe: RegExp) {
    await page.evaluate((args: [string, string]) => {
        const [q, a] = args;
        const questionRegex = new RegExp(q, 'i');
        const answerRegex = new RegExp(a, 'i');
        const containers = Array.from(document.querySelectorAll('form, fieldset, div')) as HTMLElement[];
        const group = containers.find(el => questionRegex.test((el.textContent || '').trim()));
        if (!group) return false;
        // Prefer label[for] to fetch input id
        const labels = Array.from(group.querySelectorAll('label')) as HTMLLabelElement[];
        const targetLabel = labels.find(l => answerRegex.test((l.textContent || '').trim()));
        if (targetLabel) {
            const forId = targetLabel.getAttribute('for');
            if (forId) {
                const inp = document.getElementById(forId) as HTMLInputElement | null;
                if (inp) {
                    inp.checked = true;
                    inp.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }
            }
        }
        // Fallback: direct radio input
        const radios = Array.from(group.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
        const fallback = radios.find(r => {
            const id = r.getAttribute('id');
            const lab = id ? (group.querySelector(`label[for="${id}"]`) as HTMLLabelElement | null) : null;
            const text = lab ? (lab.textContent || '') : '';
            return answerRegex.test(text) || answerRegex.test(r.value || '');
        }) || radios[0];
        if (fallback) {
            fallback.checked = true;
            fallback.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        }
        return false;
    }, [questionRe.source, answerRe.source]);
}

// Click a Docassemble yesno button pair by matching the question text and then the Yes/No button label
async function clickYesNoByQuestion(page: any, questionRe: RegExp, yesOrNo: 'Yes' | 'No') {
	await page.evaluate((args: [string, string]) => {
		const [qSrc, answer] = args;
		const q = new RegExp(qSrc, 'i');
		// Find a nearby container that includes the question text
		const all = Array.from(document.querySelectorAll('form, fieldset, div, section')) as HTMLElement[];
		const container = all.find(el => q.test((el.textContent || '').trim()));
		if (!container) return false;
		// Prefer explicit buttons; fallback to any button-like elements
		const buttons = Array.from(container.querySelectorAll('button, input[type="button"], a.btn')) as HTMLElement[];
		const target = buttons.find(b => new RegExp(`^\n*\s*${answer}([\n\s,.!?:].*)?$`, 'i').test((b.textContent || '').trim()));
		if (target) {
			// Ensure it's enabled then click
			(target as HTMLButtonElement).disabled = false;
			(target as HTMLElement).click();
			return true;
		}
		// Global fallback if not found in the container
		const global = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
		const g = global.find(b => new RegExp(`^\n*\s*${answer}([\n\s,.!?:].*)?$`, 'i').test((b.textContent || '').trim()));
		if (g) { g.disabled = false; g.click(); return true; }
		return false;
	}, [questionRe.source, yesOrNo]);
}

async function fillMinimalRealPropertyDetails(page: any, state: string) {
	// Fill just enough to proceed from the Real Property details page
	// Street/City/Zip
	// Prefer base64 ids; fallback to label if missing
	const streetId = idFor('prop.interests[i].street');
	if (await page.locator(streetId).count()) await page.fill(streetId, '123 Main St');
	else {
		const street = page.getByLabel(/^Street\*?/).first();
		if (await street.count()) await street.fill('123 Main St');
	}
	const cityIdSel = idFor('prop.interests[i].city');
	if (await page.locator(cityIdSel).count()) await page.fill(cityIdSel, 'Test City');
	else {
		const city = page.getByLabel(/^City\*?/).first();
		if (await city.count()) await city.fill('Test City');
	}
	// State/County are textboxes here; fill by accessible name
	// Prefer label-base64 approach for DA ids
	const stateIdSel = idFor('prop.interests[i].state');
	if (await page.locator(stateIdSel).count()) {
		await page.fill(stateIdSel, state).catch(() => {});
		await page.evaluate((sel: string) => {
			const el = document.querySelector(sel) as HTMLInputElement | null;
			if (el) {
				el.dispatchEvent(new Event('input', { bubbles: true }));
				el.dispatchEvent(new Event('change', { bubbles: true }));
			}
		}, stateIdSel).catch(() => {});
	} else {
		await setFieldByLabel(page, /^State\b/i, state);
	}
	const countyVal = /south dakota/i.test(state) ? 'Minnehaha County' : 'Douglas County';
	const countyIdSel = idFor('prop.interests[i].county');
	if (await page.locator(countyIdSel).count()) {
		await page.fill(countyIdSel, countyVal).catch(() => {});
		await page.evaluate((sel: string) => {
			const el = document.querySelector(sel) as HTMLInputElement | null;
			if (el) {
				el.dispatchEvent(new Event('input', { bubbles: true }));
				el.dispatchEvent(new Event('change', { bubbles: true }));
			}
		}, countyIdSel).catch(() => {});
	} else {
		await setFieldByLabel(page, /^County\b/i, countyVal);
	}
	const zipIdSel = idFor('prop.interests[i].zip');
	if (await page.locator(zipIdSel).count()) await page.fill(zipIdSel, '68102');
	else {
		const zip = page.getByLabel(/^Zip\*?/).first();
		if (await zip.count()) await zip.fill('68102');
	}
	// What is the property checkbox
	const typeName = nameFor('prop.interests[i].type["Single-family home"]');
	const typeSfh = page.locator(`input[name="${typeName}"]`).first();
	if (await typeSfh.count()) await typeSfh.check({ force: true }).catch(() => {});
	else {
		const sfh = page.getByRole('checkbox', { name: /Single-family home/i }).first();
		if (await sfh.count()) await sfh.check().catch(() => {});
	}
	// Who has an interest radio
	// Prefer base64 radio by value to avoid label flakiness
	const whoName = nameFor('prop.interests[i].who');
	const whoRadio = page.locator(`input[name="${whoName}"][value="Debtor 1 only"]`).first();
	if (await whoRadio.count()) await whoRadio.check({ force: true }).catch(() => {});
	else {
		const who = page.getByRole('radio', { name: /Debtor 1 only/i }).first();
		if (await who.count()) await who.click().catch(() => {});
	}
	// Current property value
	const curValId = idFor('prop.interests[i].current_value');
	if (await page.locator(curValId).count()) {
		try {
			await page.locator(curValId).scrollIntoViewIfNeeded();
			await page.click(curValId, { force: true });
			await page.fill(curValId, '100000');
			await page.locator(curValId).press('Tab').catch(() => {});
		} catch {
			await page.evaluate((sel: string, val: string) => {
				const el = document.querySelector(sel) as HTMLInputElement | null;
				if (el) {
					el.value = val;
					el.dispatchEvent(new Event('input', { bubbles: true }));
					el.dispatchEvent(new Event('change', { bubbles: true }));
				}
			}, curValId, '100000').catch(() => {});
		}
	}
	else {
		const curVal = page.getByLabel(/^Current property value/i).first();
		if (await curVal.count()) await curVal.fill('100000');
	}
	// Mortgage/loan? No
	// This field is datatype: yesno (buttons), so target the button by question text
	await clickYesNoByQuestion(page, /Do you have a mortgage\/loan on the property\?/i, 'No');
	await page.waitForTimeout(100);
	// Ownership interest
	const ownId = idFor('prop.interests[i].ownership_interest');
	if (await page.locator(ownId).count()) await page.fill(ownId, 'N/A');
	else {
		const own = page.getByLabel(/Describe the nature of.*ownership interest/i).first();
		if (await own.count()) await own.fill('N/A');
	}
	// Community property? No
	const commName = nameFor('prop.interests[i].is_community_property');
	const commNo = page.locator(`input[name="${commName}"][value="False"]`).first();
	if (await commNo.count()) await commNo.check({ force: true }).catch(() => {});
	// Other info
	const otherId = idFor('prop.interests[i].other_info');
	if (await page.locator(otherId).count()) await page.fill(otherId, 'N/A');
	else {
		const other = page.getByLabel(/^Other information/i).first();
		if (await other.count()) await other.fill('N/A');
	}
	// Claiming Exemption? No
	const claimName = nameFor('prop.interests[i].is_claiming_exemption');
	const claimNo = page.locator(`input[name="${claimName}"][value="False"]`).first();
	if (await claimNo.count()) await claimNo.check({ force: true }).catch(() => {});
	// Fill any remaining visible required controls defensively
	try {
		const requiredSelectors = 'input[required]:not([disabled]), textarea[required]:not([disabled]), select[required]:not([disabled])';
		const reqCount = await page.locator(requiredSelectors).count();
		for (let i = 0; i < reqCount; i++) {
			const el = page.locator(requiredSelectors).nth(i);
			const visible = await el.isVisible().catch(() => false);
			if (!visible) continue;
			const tag = await el.evaluate((n: Element) => (n as HTMLElement).tagName.toLowerCase());
			if (tag === 'input') {
				const type = await el.getAttribute('type');
				const val = await el.inputValue().catch(() => '');
				if (!val) await el.fill(type === 'number' ? '0' : 'N/A').catch(() => {});
			} else if (tag === 'textarea') {
				const val = await el.inputValue().catch(() => '');
				if (!val) await el.fill('N/A').catch(() => {});
			} else if (tag === 'select') {
				const cur = await el.inputValue().catch(() => '');
				if (!cur) {
					const opts = await el.locator('option').allTextContents();
					const firstReal = opts.find((o: string) => o.trim() && !/^select\s*\.\.\./i.test(o.trim()));
					if (firstReal) {
						try { await el.selectOption({ label: firstReal }); } catch { await el.selectOption(firstReal).catch(() => {}); }
					}
				}
			}
		}
	} catch {}
	await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
	await continueIfPresent(page);
	// Small wait and a second nudge submit if we remained on the same page
	await page.waitForTimeout(200);
	const header = await readHeader(page);
	if (/details about .*interest/i.test(header) || header.toLowerCase().includes('details about the interest')) {
		await page.evaluate(() => {
			const frm = document.querySelector('form');
			if (frm && (frm as any).requestSubmit) (frm as HTMLFormElement).requestSubmit();
		}).catch(() => {});
		await page.waitForLoadState('networkidle').catch(() => {});
	}
}

async function readHeader(page: any): Promise<string> {
	// Prefer h1#daMainQuestion, fall back to visible h1 or h2
	const primary = page.locator('h1#daMainQuestion');
	if (await primary.count()) {
		const t = (await primary.textContent())?.trim();
		if (t) return t;
	}
	const anyH1 = page.locator('h1:visible').first();
	if (await anyH1.count()) {
		const t = (await anyH1.textContent())?.trim();
		if (t) return t;
	}
	const anyH2 = page.locator('h2:visible').first();
	if (await anyH2.count()) {
		const t = (await anyH2.textContent())?.trim();
		if (t) return t;
	}
	return '';
}

async function navigateToBasicIdentity(page: any, districtLabel: string) {
	// Intro
	await page.waitForTimeout(200);
	const introHeader = await readHeader(page);
	expect(introHeader).toMatch(/Voluntary Petition/i);
	await continueIfPresent(page);
	// Step through until we reach Basic Identity
	for (let i = 0; i < 15; i++) {
	const h1 = await readHeader(page);
		if (h1.includes('Basic Identity and Contact Information')) return;

		if (h1.includes('What district are you filing your bankruptcy case in?') || h1.includes('What district are you filing')) {
			// Select district by label or value
			let selected = false;
			const selects = page.getByRole('combobox');
			const count = await selects.count();
			for (let s = 0; s < count; s++) {
				const sel = selects.nth(s);
				try { await sel.selectOption({ label: districtLabel }); selected = true; break; } catch {}
				try { await sel.selectOption(districtLabel); selected = true; break; } catch {}
			}
			if (!selected) {
				// Fallback: pick first non-placeholder option on the first select
				const sel = selects.first();
				if (await sel.count()) {
					const opts = await sel.locator('option').allTextContents();
					const firstReal = opts.find((o: string) => o.trim() && !/^select\.\.\./i.test(o.trim()));
					if (firstReal) {
						try { await sel.selectOption({ label: firstReal }); } catch { await sel.selectOption(firstReal); }
					}
				}
			}
			await continueIfPresent(page);
			continue;
		}

		if (h1.toLowerCase().includes('updating a bankruptcy filing') || h1.toLowerCase().includes('are you updating')) {
			await selectFirstRadioOrByLabel(page, 'No');
			await continueIfPresent(page);
			continue;
		}

		if (h1.includes('District Details')) {
			await continueIfPresent(page);
			continue;
		}

		if (h1.toLowerCase().includes('filing individually or with a spouse') || h1.toLowerCase().includes('are you filing individually')) {
			const indiv = page.getByRole('radio', { name: 'Filing individually' }).first();
			if (await indiv.count()) {
				await indiv.click();
			} else {
				// fallback to first radio
				await selectFirstRadioOrByLabel(page, 'Filing individually');
			}
			await continueIfPresent(page);
			continue;
		}

		// Default: try to continue
		await continueIfPresent(page);
		// safety: in case no obvious continue target, click first submit-ish button
		const btn = page.locator('button:has-text("Continue"), button[type="submit"]').first();
		if (await btn.count()) {
			const enabled = await btn.isEnabled().catch(() => false);
			if (enabled) await btn.click().catch(() => {});
		}
	}
	throw new Error('Did not reach Basic Identity and Contact Information');
}

async function fillBasicIdentityForState(page: any, state: string, county: string) {
	// Expect basic identity page
	await expect(page.locator('h1#daMainQuestion')).toContainText('Basic Identity and Contact Information');

	// Base64-encoded element IDs used by docassemble for debtor[0]
	const firstId = '#ZGVidG9yW2ldLm5hbWUuZmlyc3Q';
	const lastId = '#ZGVidG9yW2ldLm5hbWUubGFzdA';
	const addrId = '#ZGVidG9yW2ldLmFkZHJlc3MuYWRkcmVzcw';
	const cityId = '#ZGVidG9yW2ldLmFkZHJlc3MuY2l0eQ';
	const stateId = '#ZGVidG9yW2ldLmFkZHJlc3Muc3RhdGU';
	const countyId = '#ZGVidG9yW2ldLmFkZHJlc3MuY291bnR5';
	const zipId = '#ZGVidG9yW2ldLmFkZHJlc3Muemlw';

	await page.fill(firstId, 'StateAware');
	await page.fill(lastId, 'Test');
	await page.fill(addrId, '123 Main St');
	await page.fill(cityId, 'Test City');
	await page.selectOption(stateId, state).catch(async () => {
		await page.selectOption(stateId, { label: state });
	});
	// Trigger change and wait for counties to populate
	try {
		await page.evaluate((sel: string) => {
			const el = document.querySelector(sel) as HTMLSelectElement | null;
			if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
		}, stateId);
	} catch {}
	await page.waitForFunction((sel: string) => {
		const el = document.querySelector(sel) as HTMLSelectElement | null;
		if (!el) return false;
		const opts = Array.from(el.options).map(o => (o.textContent || '').trim());
		return opts.length > 1 || (opts[0] && opts[0] !== 'Select...');
	}, countyId, { timeout: 20000 });

	// County selection (options may be slow to populate or named without the word "County")
	const countySelect = page.locator(countyId);
	await countySelect.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
	let options: string[] = await countySelect.locator('option').allTextContents();
	// Refresh once in case options are still loading
	await page.waitForTimeout(200);
	options = await countySelect.locator('option').allTextContents();
	const normalizedTarget = county;
	const simplifiedTarget = county.replace(/\s*County$/i, '').trim();
	const match = options.find((o: string) => {
		const t = o.trim();
		return t === normalizedTarget || t === simplifiedTarget || t.includes(simplifiedTarget);
	});
	if (match) {
		await countySelect.selectOption({ label: match }).catch(async () => {
			await countySelect.selectOption(match);
		});
	} else {
		// Fallback: pick the first real option programmatically
		await page.evaluate((sel: string) => {
			const el = document.querySelector(sel) as HTMLSelectElement | null;
			if (el && el.options.length > 1) {
				// choose first non-placeholder
				let idx = 1;
				for (let i = 1; i < el.options.length; i++) {
					const txt = (el.options[i].textContent || '').trim();
					if (txt && !/^select\.+/i.test(txt)) { idx = i; break; }
				}
				el.selectedIndex = idx;
				el.dispatchEvent(new Event('change', { bubbles: true }));
			}
		}, countyId);
	}

	await page.fill(zipId, '68102');

	// Has separate mailing address? No
	await selectFirstRadioOrByLabel(page, 'No');

	// Tax ID type: SSN (value '1'), then fill a value
	const taxTypeName = 'ZGVidG9yW2ldLnRheF9pZC50YXhfaWRfdHlwZQ';
	const ssnRadio = page.locator(`input[name="${taxTypeName}"][value="1"]`).first();
	if (await ssnRadio.count()) {
		const id = await ssnRadio.getAttribute('id');
		if (id) await page.click(`label[for="${id}"]`); else await ssnRadio.click({ force: true });
	}
	const ssnInput = page.getByLabel('SSN');
	if (await ssnInput.count()) await ssnInput.fill('123-45-6789');

		// Autofill any visible required fields we didn't set yet
		try {
			const requiredSelectors = 'input[required]:not([disabled]), textarea[required]:not([disabled]), select[required]:not([disabled])';
			const reqCount = await page.locator(requiredSelectors).count();
			for (let i = 0; i < reqCount; i++) {
				const el = page.locator(requiredSelectors).nth(i);
				const visible = await el.isVisible().catch(() => false);
				if (!visible) continue;
				const tag = await el.evaluate((n: Element) => (n as HTMLElement).tagName.toLowerCase());
				if (tag === 'input') {
					const type = await el.getAttribute('type');
					const val = await el.inputValue().catch(() => '');
					if (!val) await el.fill(type === 'number' ? '0' : 'N/A');
				} else if (tag === 'textarea') {
					const val = await el.inputValue().catch(() => '');
					if (!val) await el.fill('N/A');
				} else if (tag === 'select') {
					const cur = await el.inputValue().catch(() => '');
					if (!cur) {
						const opts = await el.locator('option').allTextContents();
						const firstReal = opts.find((o: string) => o.trim() && !/^select\.\.\./i.test(o.trim()));
						if (firstReal) {
							try { await el.selectOption({ label: firstReal }); } catch { await el.selectOption(firstReal); }
						}
					}
				}
			}
		} catch {}

		await continueIfPresent(page);
}

async function goToRealPropertyDetails(page: any) {
	// Walk forward until we arrive on the property details page, handling variants
	for (let i = 0; i < 80; i++) {
	const h1 = await readHeader(page);
		console.log(`[nav ${i}] h1: ${h1}`);
		// Already on details page
		if (/details about .*interest/i.test(h1) || h1.toLowerCase().includes('details about the interest')) {
			return;
		}
		// Property intro
		if (h1.toLowerCase().includes('tell the court') && h1.toLowerCase().includes('property')) {
			await continueIfPresent(page);
			continue;
		}
		// First property question
			if (h1.toLowerCase().includes('do you own') && h1.toLowerCase().includes('residence')) {
				// Prefer radios if present
				const yesRadio = page.getByRole('radio', { name: /^Yes\b/i }).first();
				if (await yesRadio.count()) {
					await yesRadio.click().catch(() => {});
					await continueIfPresent(page);
				} else {
					const yesBtn = page.getByRole('button', { name: /^Yes\b/i }).first();
					if (await yesBtn.count()) {
						// Wait for it to be enabled, retrying briefly
						const start = Date.now();
						while (Date.now() - start < 3000) {
							const enabled = await yesBtn.isEnabled().catch(() => false);
							const visible = await yesBtn.isVisible().catch(() => false);
							if (visible && enabled) break;
							await page.waitForTimeout(50);
						}
						try {
							await yesBtn.click({ timeout: 2000 });
						} catch {
							// Fallback: force-enable and click programmatically
							await page.evaluate(() => {
								const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
								const target = buttons.find(b => (b.textContent || '').trim().match(/^Yes\b/i));
								if (target) {
									target.disabled = false;
									target.click();
								}
							});
						}
					} else {
						// Last resort: click first radio then continue
						await selectFirstRadioOrByLabel(page, 'Yes');
						await continueIfPresent(page);
					}
				}
				// Wait for header to change away from the same question
				await page.waitForTimeout(150);
				await page.waitForFunction((prev: string) => {
					const h = document.querySelector('h1#daMainQuestion')?.textContent?.trim()
						|| document.querySelector('h1:visible')?.textContent?.trim()
						|| document.querySelector('h2:visible')?.textContent?.trim() || '';
					return (h && h !== prev);
				}, h1, { timeout: 3000 }).catch(() => {});
				// loop will verify details page
				continue;
			}
		// Pre-property steps
		if (h1.toLowerCase().includes('lived in the specified district')) {
			await selectFirstRadioOrByLabel(page, 'Yes');
		} else if (h1.toLowerCase().includes('other names')) {
			await selectFirstRadioOrByLabel(page, 'No');
		} else if (h1.toLowerCase().includes('are there more debtors to add')) {
			await selectFirstRadioOrByLabel(page, 'No');
		}
	await continueIfPresent(page);
	// extra nudge
	const cont = page.getByRole('button', { name: /Continue|Next/i }).first();
	if (await cont.count()) await cont.click().catch(() => {});
	}
	throw new Error('Could not reach real property details page');
}

async function getExemptionLawOptions(page: any): Promise<string[]> {
	// Collect options from all selects associated with labels matching the text, even if hidden/disabled
	return await page.evaluate(() => {
		const labels = Array.from(document.querySelectorAll('label')) as HTMLLabelElement[];
		const matches = labels.filter(l => /Specific\s+laws\s+that\s+allow\s+exemption/i.test(l.textContent || ''));
		const texts: string[] = [];
		for (const lab of matches) {
			const forId = lab.getAttribute('for');
			if (!forId) continue;
			const sel = document.getElementById(forId) as HTMLSelectElement | null;
			if (!sel) continue;
			for (const opt of Array.from(sel.options)) {
				const t = (opt.textContent || '').trim();
				if (t) texts.push(t);
			}
		}
		// de-duplicate
		return Array.from(new Set(texts));
	});
}

async function goToVehicleDetails(page: any, state: string) {
	// From wherever we are after Basic Identity, advance to Vehicles details
	for (let i = 0; i < 80; i++) {
	const h1 = await readHeader(page);
	console.log(`[veh ${i}] h1: ${h1}`);
		// Skip real property entirely to reach vehicles (scope button click to the question container)
		if (h1.toLowerCase().includes('do you own or have any legal or equitable interest in any residence')) {
			await clickYesNoByQuestion(page, /Do you own or have any legal or equitable interest in any residence, building, land, or similar property\?/i, 'No');
			await page.waitForFunction((prev: string) => {
				const el = document.querySelector('h1#daMainQuestion') || document.querySelector('h1:visible') || document.querySelector('h2:visible');
				const h = (el?.textContent || '').trim();
				return h && h !== prev;
			}, h1, { timeout: 4000 }).catch(() => {});
			continue;
		}
		if (h1.toLowerCase().includes('do you have more interests to add')) {
			await selectFirstRadioOrByLabel(page, 'No');
			await continueIfPresent(page);
			continue;
		}
		// If we landed on real property details, attempt to skip property section first
		if (/details about .*interest/i.test(h1) || h1.toLowerCase().includes('details about the interest')) {
			// First, try going back to the Yes/No question and answer No deterministically
			await backIfPresent(page);
			let h2 = await readHeader(page);
			if (h2.toLowerCase().includes('do you own or have any legal or equitable interest in any residence')) {
				const varName = 'prop.interests.there_are_any';
				const nameB64 = Buffer.from(varName).toString('base64').replace(/=+$/, '');
				const radioNo = page.locator(`input[name="${nameB64}"][value="False"]`).first();
				if (await radioNo.count()) {
					await radioNo.check({ force: true }).catch(() => {});
					await continueIfPresent(page);
					await page.waitForTimeout(150);
					continue;
				}
			}
			// Try to set there_are_any to No by navigating back to that variable id if present
			try {
				const anyName = 'prop.interests.there_are_any';
				const anyYes = page.locator(`input[name="${Buffer.from(anyName).toString('base64').replace(/=+$/, '')}"][value="True"]`).first();
				const anyNo = page.locator(`input[name="${Buffer.from(anyName).toString('base64').replace(/=+$/, '')}"][value="False"]`).first();
				if (await anyNo.count()) {
					await anyNo.check({ force: true }).catch(() => {});
					await continueIfPresent(page);
				}
			} catch {}
			// Fall back to filling minimal details if skipping not possible
			await fillMinimalRealPropertyDetails(page, state);
			continue;
		}
		// Vehicles any exist question (broadened match)
		if (
			h1.toLowerCase().includes('do you own, lease, or have legal or equitable interest in any vehicles') ||
			(h1.toLowerCase().includes('vehicles') && h1.toLowerCase().includes('legal or equitable'))
		) {
			await clickYesNoByQuestion(page, /Do you own, lease, or have legal or equitable interest in any vehicles/i, 'Yes');
			await page.waitForFunction((prev: string) => {
				const el = document.querySelector('h1#daMainQuestion') || document.querySelector('h1:visible') || document.querySelector('h2:visible');
				const h = (el?.textContent || '').trim();
				return h && h !== prev;
			}, h1, { timeout: 4000 }).catch(() => {});
			continue;
		}
		// Vehicle details page reached
		if (h1.toLowerCase().includes('tell the court about one of your vehicles')) {
			return;
		}
		// Property intro
		if (h1.toLowerCase().includes('tell the court') && h1.toLowerCase().includes('property')) {
			await continueIfPresent(page);
			continue;
		}
		// Real property add another
		if (h1.toLowerCase().includes('do you have more interests to add')) {
			await clickYesNoByQuestion(page, /Do you have more interests to add\?/i, 'No');
			await page.waitForFunction((prev: string) => {
				const el = document.querySelector('h1#daMainQuestion') || document.querySelector('h1:visible') || document.querySelector('h2:visible');
				const h = (el?.textContent || '').trim();
				return h && h !== prev;
			}, h1, { timeout: 4000 }).catch(() => {});
			continue;
		}
		// Pre-property miscellany
		if (h1.toLowerCase().includes('lived in the specified district')) {
			await selectFirstRadioOrByLabel(page, 'Yes');
		} else if (h1.toLowerCase().includes('other names')) {
			await selectFirstRadioOrByLabel(page, 'No');
		} else if (h1.toLowerCase().includes('are there more debtors to add')) {
			await selectFirstRadioOrByLabel(page, 'No');
		}
	await continueIfPresent(page);
		const cont = page.getByRole('button', { name: /Continue|Next/i }).first();
		if (await cont.count()) await cont.click().catch(() => {});
	}
	throw new Error('Could not reach vehicle details page');
}

async function setPropertyStateOnDetails(page: any, state: string) {
	// Ensure we're on the details page
	await expect(page.locator('h1#daMainQuestion')).toContainText(/details about .*interest/i);
	const ctrl = page.getByLabel(/^State:?$/).first();
	if (!(await ctrl.count())) return;
	// Try as a select first
	try {
		await ctrl.selectOption({ label: state });
	} catch {
		try { await ctrl.selectOption(state); } catch {}
	}
	// If it's not a select or select failed, try filling
	try {
		await ctrl.fill(state);
		// trigger change
		await page.evaluate((el: HTMLElement) => {
			el.dispatchEvent(new Event('input', { bubbles: true }));
			el.dispatchEvent(new Event('change', { bubbles: true }));
		}, await ctrl.elementHandle());
	} catch {}
}

test('State-aware exemptions (Nebraska) - homestead laws present', async ({ page }) => {
	test.setTimeout(120000);
	await gotoInterview(page);
	await navigateToBasicIdentity(page, 'District of Nebraska');
	await fillBasicIdentityForState(page, 'Nebraska', 'Douglas County');
		await goToRealPropertyDetails(page);

	// Ensure property state is correct
	await setPropertyStateOnDetails(page, 'Nebraska');

	// Enable claiming exemption to reveal the laws select (may remain disabled/hidden; we read options regardless)
	const claimGroup = page.getByRole('group', { name: 'Claiming Exemption?' });
	if (await claimGroup.count()) await claimGroup.getByRole('radio', { name: 'Yes' }).first().click().catch(() => {});

	const options = await getExemptionLawOptions(page);

	// Expect Nebraska-specific statutes in options
	console.log('NE options:', options);
	const hasNeb = options.some((o: string) => /Neb\.|Nebraska/i.test(o));
	const hasHomestead = options.some((o: string) => /Homestead/i.test(o));
	expect(hasNeb, 'Expected Nebraska exemptions in dropdown').toBe(true);
	expect(hasHomestead, 'Expected Homestead-related exemption').toBe(true);
});

test('State-aware exemptions (South Dakota) - SDCL laws present', async ({ page }) => {
	test.setTimeout(120000);
	await gotoInterview(page);
	// District label may vary; Nebraska works too, exemptions key off debtor state
	await navigateToBasicIdentity(page, 'District of Nebraska');
	await fillBasicIdentityForState(page, 'South Dakota', 'Minnehaha County');
		await goToRealPropertyDetails(page);

	// Set property state to South Dakota so dynamic options update
	await setPropertyStateOnDetails(page, 'South Dakota');
	// Wait for options to update to SDCL
	await page.waitForFunction(async () => {
		const labels = Array.from(document.querySelectorAll('label')) as HTMLLabelElement[];
		const match = labels.find(l => /Specific\s+laws\s+that\s+allow\s+exemption/i.test(l.textContent || ''));
		if (!match) return false;
		const forId = match.getAttribute('for');
		if (!forId) return false;
		const sel = document.getElementById(forId) as HTMLSelectElement | null;
		if (!sel) return false;
		return Array.from(sel.options).some(o => /SDCL/i.test(o.textContent || ''));
	}, { timeout: 8000 }).catch(() => {});

	const claimGroup = page.getByRole('group', { name: 'Claiming Exemption?' });
	if (await claimGroup.count()) await claimGroup.getByRole('radio', { name: 'Yes' }).first().click().catch(() => {});

	const options = await getExemptionLawOptions(page);

	// Expect SDCL statutes
	console.log('SD options:', options);
	const hasSDCL = options.some((o: string) => /SDCL/i.test(o));
	const hasHomestead = options.some((o: string) => /Homestead/i.test(o));
	expect(hasSDCL, 'Expected South Dakota SDCL exemptions').toBe(true);
	expect(hasHomestead, 'Expected Homestead-related exemption').toBe(true);
});

test('Vehicle exemptions (Nebraska) include motor vehicle statute', async ({ page }) => {
	test.setTimeout(120000);
	await gotoInterview(page);
	await navigateToBasicIdentity(page, 'District of Nebraska');
	await fillBasicIdentityForState(page, 'Nebraska', 'Douglas County');
	await goToVehicleDetails(page, 'Nebraska');

	// Do not change the vehicle state field; rely on debtor address to avoid render loops
	const claimGroup = page.getByRole('group', { name: 'Claiming Exemption?' });
	if (await claimGroup.count()) await claimGroup.getByRole('radio', { name: 'Yes' }).first().click().catch(() => {});

	const options = await getExemptionLawOptions(page);
	const hasMotorVeh = options.some(o => /Motor\s+vehicle\s*\(Neb\./i.test(o));
	expect(hasMotorVeh, 'Expected Nebraska motor vehicle exemption in dropdown').toBe(true);
});

test('Vehicle exemptions (South Dakota) show SDCL wildcard and omit Nebraska motor vehicle', async ({ page }) => {
	test.setTimeout(120000);
	await gotoInterview(page);
	await navigateToBasicIdentity(page, 'District of Nebraska');
	await fillBasicIdentityForState(page, 'South Dakota', 'Minnehaha County');
	await goToVehicleDetails(page, 'South Dakota');

	const claimGroup = page.getByRole('group', { name: 'Claiming Exemption?' });
	if (await claimGroup.count()) await claimGroup.getByRole('radio', { name: 'Yes' }).first().click().catch(() => {});

	const options = await getExemptionLawOptions(page);
	const hasSDCL = options.some(o => /SDCL/i.test(o));
	const hasNebMotorVeh = options.some(o => /Motor\s+vehicle\s*\(Neb\./i.test(o));
	expect(hasSDCL, 'Expected SDCL exemptions').toBe(true);
	expect(hasNebMotorVeh, 'Did not expect Nebraska motor vehicle exemption under SD').toBe(false);
});

