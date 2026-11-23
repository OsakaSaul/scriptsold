// Builds docs/examples from each example's input files. Deterministic; no network.
//   node scripts/build-examples.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, resolve } from 'node:path';
import { resurrect, statusLabel } from '../src/resurrect.js';
import { fieldTableMarkdown } from '../src/fieldtable.js';
import { loadData } from '../src/node.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const { registry, catalog } = loadData();

export const EXAMPLES = [
  {
    dir: '01-proxycurl-person-profile',
    title: 'Proxycurl person profile (Python)',
    story: 'A script that loads a person profile from a profile address. The service is gone. The engine finds the call, replaces it with a FoxAPIs person-enrichment call that returns the old field names, and says which fields it cannot fill.',
    inputs: ['input.py'],
  },
  {
    dir: '02-clearbit-company',
    title: 'Clearbit company enrichment (JavaScript)',
    story: 'A Node function that enriches a company from its domain. Clearbit has moved into another product and published no end date, so the engine labels it moved, not shut down. The closest FoxAPIs call returns a written snapshot, not company fields, so the mapping is marked partial and almost every old field is listed as not filled.',
    inputs: ['input.js'],
  },
  {
    dir: '03-bing-search',
    title: 'Bing Search API (JavaScript and Python)',
    story: 'Web search through the Bing Search API, retired 2025-08-11. FoxAPIs has no web search endpoint, so the engine says so, leaves the code alone and adds a marker comment. This is the honest case: nothing is invented.',
    inputs: ['input.js', 'input.py'],
  },
];

const EXT_LANG = { '.js': 'js', '.py': 'py', '.sh': 'curl', '.ts': 'ts' };

export function buildExamples() {
  const index = [];
  for (const ex of EXAMPLES) {
    const dir = join(root, 'docs', 'examples', ex.dir);
    const files = [];
    const mappingDocs = new Map();
    let snippet = null;
    for (const name of ex.inputs) {
      const ext = extname(name);
      const input = readFileSync(join(dir, name), 'utf8');
      const r = resurrect(input, { registry, catalog, language: EXT_LANG[ext] });
      files.push(name);
      const inPlace = r.snippets.length ? `output.in-place${ext}` : `output${ext}`;
      writeFileSync(join(dir, inPlace), r.code);
      files.push(inPlace);
      if (r.snippets.length && !snippet) snippet = r.snippets[0];
      for (const m of r.matches) {
        if (m.endpoint && !mappingDocs.has(m.endpoint)) {
          const api = registry.apis.find((a) => a.id === m.api);
          const ep = api.endpoints.find((e) => e.id === m.endpoint);
          mappingDocs.set(m.endpoint, fieldTableMarkdown(api, ep, catalog));
        }
      }
      const report = {
        input: name,
        language: r.language,
        matches: r.matches.map((m) => ({ api: m.apiName, endpoint: m.endpointName, line: m.line, status: m.label, source: m.source, mapped: m.mapped, evidence: m.evidence })),
        changes: r.changes,
        unfilled: r.unfilled,
        unmapped: r.unmapped,
        notes: r.notes,
      };
      writeFileSync(join(dir, `report${ex.inputs.length > 1 ? '.' + name.replace('input.', '') : ''}.json`), JSON.stringify(report, null, 2) + '\n');
    }
    if (snippet) {
      writeFileSync(join(dir, 'output.js'), snippet.js);
      writeFileSync(join(dir, 'output.py'), snippet.py);
      writeFileSync(join(dir, 'output.sh'), snippet.curl);
      files.push('output.js', 'output.py', 'output.sh');
    }
    writeFileSync(join(dir, 'mapping.md'), [...mappingDocs.values()].join('\n'));
    files.push('mapping.md');
    index.push({ ...ex, files: [...new Set(files)].sort() });
  }
  return index;
}

export function writeIndex(index) {
  const lines = [];
  lines.push('# Worked examples');
  lines.push('');
  lines.push('Each folder holds the input, the generated JavaScript and Python output files, and the field-mapping table. Run `npm run build` to regenerate them; the tests check that the committed files match the engine.');
  lines.push('');
  lines.push('Where an example maps to a FoxAPIs endpoint, `output.js`, `output.py` and `output.sh` are standalone replacements, and `output.in-place.*` is your own file with the old call spliced out. Where nothing maps, `output.js` and `output.py` are your code unchanged, plus the marker comment.');
  lines.push('');
  for (const ex of index) {
    lines.push(`## ${ex.title}`);
    lines.push('');
    lines.push(ex.story);
    lines.push('');
    for (const f of ex.files) lines.push(`- docs/examples/${ex.dir}/${f}`);
    lines.push('');
  }
  writeFileSync(join(root, 'docs', 'examples', 'README.md'), lines.join('\n'));
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  const index = buildExamples();
  writeIndex(index);
  console.log(`examples: ${index.length} built`);
}

export { existsSync, statusLabel };
