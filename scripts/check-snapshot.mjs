// Prints a warning when the catalog snapshot is older than 30 days (requirement 3.5).
import { loadData } from '../src/node.js';
import { catalogAgeDays, validateRegistry } from '../src/registry.js';

const { registry, catalog } = loadData();
const age = catalogAgeDays(catalog);
if (age > 30) console.warn(`WARNING: the FoxAPIs catalog snapshot is ${age} days old. Refresh it: npm run snapshot:catalog -- <path to catalog.json>`);
else console.log(`catalog snapshot is ${age} day(s) old: ${catalog.total} endpoints, ${catalog.live} live`);
const problems = validateRegistry(registry, catalog);
if (problems.length) {
  for (const p of problems) console.error('registry problem: ' + p);
  process.exit(1);
}
console.log(`registry ok: ${registry.apis.length} entries`);
