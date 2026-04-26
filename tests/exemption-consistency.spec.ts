/**
 * Regression guard for issue #37 — exemption-list inconsistency.
 *
 * Background: 106AB-question-blocks.yml previously had ~50 `choices:` blocks
 * that listed Nebraska law citations as YAML literals, which meant the SD
 * variants were missing on those pages while real-property/vehicle pages did
 * show both. Customer reported "sometimes SD exemptions are offered, sometimes
 * not." The fix routes every choice list through `get_exemption_choices_combined()`
 * in objects.py.
 *
 * This test reads the YAML from disk and asserts no hardcoded statute citation
 * appears under any `choices:` block — so any future regression that re-introduces
 * a static NE-only list will fail here instead of in production.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const QUESTIONS = [
  '106AB-question-blocks.yml',
  '106C-question-blocks.yml',
  '106D-question-blocks.yml',
];

const STATUTE_PATTERNS = [
  /Neb\.\s*Rev\.\s*Stat\./i,
  /\bSDCL\s+\d/i,
  /\bU\.S\.C\.\s*§/i,
];

test.describe('Exemption list consistency (issue #37)', () => {
  for (const file of QUESTIONS) {
    test(`${file} contains no hardcoded statute citations under choices:`, () => {
      const path = join(
        __dirname,
        '..',
        'docassemble',
        'BankruptcyClinic',
        'data',
        'questions',
        file,
      );
      const text = readFileSync(path, 'utf8');
      const lines = text.split('\n');

      // Walk top-down and track whether the next list of `- ` items belongs
      // to a `choices:` literal block. We flag a hardcoded statute only when
      // it appears as a YAML list item under `choices:` (not under `code:`).
      const offenders: Array<{ lineNo: number; line: string }> = [];
      let inChoicesLiteral = false;
      let choicesIndent = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const stripped = line.trimEnd();

        const choicesMatch = stripped.match(/^(\s*)choices:\s*$/);
        if (choicesMatch) {
          // Look ahead — if the next non-blank line is `code:` then this is a
          // computed choices block (the fix), not a literal list.
          let j = i + 1;
          while (j < lines.length && lines[j].trim() === '') j++;
          const next = lines[j] || '';
          if (/^\s*code:\s*[|>]?\s*$/.test(next)) {
            inChoicesLiteral = false;
          } else {
            inChoicesLiteral = true;
            choicesIndent = choicesMatch[1].length;
          }
          continue;
        }

        if (!inChoicesLiteral) continue;

        // Exit the literal block when indentation drops back to or below the
        // `choices:` key, or when we hit a different field key.
        const leading = line.match(/^(\s*)/)?.[1].length ?? 0;
        const isListItem = /^\s*-\s/.test(line);
        if (line.trim() !== '' && !isListItem && leading <= choicesIndent) {
          inChoicesLiteral = false;
          continue;
        }

        if (isListItem && STATUTE_PATTERNS.some((re) => re.test(line))) {
          offenders.push({ lineNo: i + 1, line: stripped });
        }
      }

      if (offenders.length > 0) {
        const sample = offenders
          .slice(0, 5)
          .map((o) => `  L${o.lineNo}: ${o.line}`)
          .join('\n');
        throw new Error(
          `${file}: ${offenders.length} hardcoded statute citation(s) found ` +
            `under choices: blocks. Replace with ` +
            `\`code: get_exemption_choices_combined('<category>')\` so both NE ` +
            `and SD options surface consistently.\n${sample}`,
        );
      }
      expect(offenders.length).toBe(0);
    });
  }
});
