#!/usr/bin/env node
// Usage: node src/cli.js <file> [--json]    (or pipe code on stdin)
import { readFileSync } from 'node:fs';
import { resurrect, statusLabel } from './resurrect.js';
import { loadData } from './node.js';

const args = process.argv.slice(2);
const json = args.includes('--json');
const file = args.find((a) => !a.startsWith('--'));
const input = file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8');
const { registry, catalog } = loadData();
let r;
try {
  r = resurrect(input, { registry, catalog });
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
if (json) {
  console.log(JSON.stringify(r, null, 2));
} else {
  if (!r.matches.length) console.error('No known dead API found.');
  for (const m of r.matches) console.error(`line ${m.line}: ${m.apiName}${m.endpointName ? ' / ' + m.endpointName : ''} ${statusLabel({ status: m.status, date: m.date })} ${m.mapped ? '(mapped)' : '(no FoxAPIs equivalent)'}`);
  for (const n of r.notes) console.error('note: ' + n);
  process.stdout.write(r.code);
}
