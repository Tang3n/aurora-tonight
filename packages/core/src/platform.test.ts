/**
 * packages/core must run in the browser and in React Native (ADR 13). TypeScript cannot enforce that
 * alone (core needs the DOM lib for fetch/timer types), so this test scans the sources for APIs that
 * exist only in one of the two.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = __dirname;
const sources = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));

const FORBIDDEN: [RegExp, string][] = [
  [/\bdocument\./, 'document'],
  [/\bwindow\./, 'window'],
  [/\bnavigator\./, 'navigator'],
  [/\blocalStorage\b/, 'localStorage'],
  [/\bsessionStorage\b/, 'sessionStorage'],
  [/\bHTML[A-Z]\w*Element\b/, 'HTML element types'],
  [/from ['"]react-dom/, 'react-dom'],
  [/from ['"]react-native/, 'react-native'],
];

describe('packages/core stays platform-neutral', () => {
  it('has sources to check', () => {
    expect(sources.length).toBeGreaterThan(0);
  });
  for (const file of sources) {
    it(`${file} uses no web-only or native-only API`, () => {
      // Ignore comments, which may name these APIs when explaining why they are not used.
      const code = readFileSync(join(dir, file), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      const hits = FORBIDDEN.filter(([re]) => re.test(code)).map(([, name]) => name);
      expect(hits).toEqual([]);
    });
  }
});
