// Copies path, method, credits and status from a local FoxAPIs catalog.json
// into data/catalog.snapshot.json. No network. Usage:
//   node scripts/snapshot-catalog.mjs <catalog.json> [endpoint-credits.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const [, , catalogPath, creditsPath] = process.argv;
if (!catalogPath) {
  console.error('usage: node scripts/snapshot-catalog.mjs <catalog.json> [endpoint-credits.json]');
  process.exit(2);
}
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
let measured = {};
if (creditsPath) {
  const raw = JSON.parse(readFileSync(creditsPath, 'utf8'));
  for (const group of Object.values(raw)) {
    if (group && typeof group === 'object') {
      for (const [k, v] of Object.entries(group)) {
        if (v && typeof v === 'object' && typeof v.credits === 'number') measured[k] = v;
      }
    }
  }
}
const endpoints = catalog.endpoints.map((e) => {
  const key = `${e.method} ${e.path}`;
  const m = measured[key];
  return {
    path: e.path,
    method: e.method,
    status: e.status,
    credits: m ? m.credits : e.credits ?? null,
    credits_source: m ? m.source || 'measured' : e.credits != null ? 'catalog' : null,
  };
});
const out = {
  generated_by: 'scripts/snapshot-catalog.mjs',
  generated_on: new Date().toISOString().slice(0, 10),
  source: 'FoxAPIs catalog.json (route list) and, where given, its endpoint credit table',
  total: endpoints.length,
  live: endpoints.filter((e) => e.status === 'live').length,
  endpoints,
};
const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, '..', 'data', 'catalog.snapshot.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`snapshot: ${out.total} endpoints, ${out.live} live`);
