/**
 * Writes src/spike/expected.json: the spike checks as computed by Node (full ICU), the reference the
 * app compares Hermes against. Run from the repo root: npm run spike:expected -w @aurora/mobile
 * (npm runs workspace scripts with the package folder as the working directory).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runChecks } from '../src/spike/checks';

const out = join(process.cwd(), 'src', 'spike', 'expected.json');
writeFileSync(out, JSON.stringify(runChecks(), null, 2) + '\n');
console.log('wrote', out);
