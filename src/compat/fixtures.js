// Loads the recorded FoxAPIs fixture files for the compat route's sample mode.
// Using createRequire avoids the experimental JSON import-assertion warning on
// Node 20, while still working as an ES module.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const enrichPersonSample = require(join(root, 'fixtures', 'foxapis', 'enrich_person.sample.json'));
export const findEmailNoMatch = require(join(root, 'fixtures', 'foxapis', 'find_email.no_match.json'));
