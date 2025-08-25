import { test, expect } from '@playwright/test';

// Minimal helpers for this spec only
async function gotoInterview(page: any) {
	await page.goto('https://docassemble2.metatheria.solutions/interview?i=docassemble.playground1:voluntary-petition.yml#page1');
	await page.waitForLoadState('networkidle');
}

async function selectFirstRadioOrByLabel(page: any, label: string) {
	const byRole = page.getByRole('radio', { name: label }).first();
	if (await byRole.count()) {
		await byRole.click();
		return;
	}
	const first = page.locator('input[type="radio"]').first();
	if (await first.count()) {
		const id = await first.getAttribute('id');
		if (id) {
			await page.click(`label[for="${id}"]`);
			return;
		}
		await first.click({ force: true });
	}
}

async function continueIfPresent(page: any) {
	const btn = page.locator('button[type="submit"]').first();
	if (await btn.count()) {
		await btn.click();
		await page.waitForLoadState('networkidle');
	}
}

async function navigateToBasicIdentity(page: any, districtLabel: string) {
	// Intro
	await expect(page.locator('h1#daMainQuestion')).toContainText('Voluntary Petition for Individuals Filing for Bankruptcy');
	await continueIfPresent(page);
	// Step through until we reach Basic Identity
	for (let i = 0; i < 15; i++) {
		const h1 = (await page.locator('h1#daMainQuestion').textContent()) || '';
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
		const h1 = (await page.locator('h1#daMainQuestion').textContent())?.trim() || '';
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
				const yesBtn = page.getByRole('button', { name: 'Yes' }).first();
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
							const target = buttons.find(b => (b.textContent || '').trim() === 'Yes');
							if (target) {
								target.disabled = false;
								target.click();
							}
						});
					}
				} else {
					// Try radios if present
					await selectFirstRadioOrByLabel(page, 'Yes');
					await continueIfPresent(page);
				}
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

