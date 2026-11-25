// Builds the static site in public/: copies the engine (browser-safe modules)
// and data, the example inputs, and writes the pre-rendered examples.html.
//   node scripts/build-site.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { EXAMPLES } from './build-examples.mjs';
import { fieldRows } from '../src/fieldtable.js';
import { statusPhrase } from '../src/emit.js';
import { loadData } from '../src/node.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const pub = join(root, 'public');
const ENGINE_FILES = ['util.js', 'redact.js', 'registry.js', 'detect.js', 'blocks.js', 'emit.js', 'fieldtable.js', 'resurrect.js'];

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Escapes text and puts identifiers that contain underscores into code elements.
export const rich = (s) => esc(s).replace(/[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+/g, (m) => `<code>${m}</code>`);

// The page only needs the catalog rows the registry maps to (existence, status
// and credits lookups). The full snapshot stays in data/ for the tests.
export function trimmedCatalog() {
  const { registry, catalog } = loadData();
  const want = new Set();
  for (const a of registry.apis) for (const e of a.endpoints) if (e.mapping) want.add(`${e.mapping.foxapis.method} ${e.mapping.foxapis.path}`);
  const endpoints = catalog.endpoints.filter((e) => want.has(`${e.method} ${e.path}`));
  return JSON.stringify({ ...catalog, trimmed_for_site: 'only the rows the registry maps to', endpoints }, null, 2) + '\n';
}

export function buildSite() {
  const eng = join(pub, 'engine');
  mkdirSync(eng, { recursive: true });
  for (const f of ENGINE_FILES) copyFileSync(join(root, 'src', f), join(eng, f));
  copyFileSync(join(root, 'data', 'registry.json'), join(eng, 'registry.json'));
  writeFileSync(join(eng, 'catalog.snapshot.json'), trimmedCatalog());
  copyFileSync(join(root, 'data', 'foxapis-links.json'), join(eng, 'foxapis-links.json'));
  for (const ex of EXAMPLES) {
    const d = join(pub, 'examples', ex.dir);
    mkdirSync(d, { recursive: true });
    for (const f of readdirSync(join(root, 'docs', 'examples', ex.dir))) {
      if (f.startsWith('input')) copyFileSync(join(root, 'docs', 'examples', ex.dir, f), join(d, f));
    }
  }
  writeFileSync(join(pub, 'examples.html'), examplesPage());
  writeFileSync(join(pub, 'graveyard.html'), graveyardPage());
}

export function graveyardPage() {
  const { registry } = loadData();
  const cards = registry.apis.map((api) => {
    const statusWord = api.status === 'ended' ? 'ended' : api.status === 'scheduled' ? 'scheduled' : 'moved';
    const dateText = api.date ? ` ${api.date}` : '';
    return `<li class="g-card">
<span class="nm">${esc(api.name)}</span>
<span class="badge ${esc(statusWord)}">${esc(statusWord)}${esc(dateText)}</span>
<p class="g-summary">${esc(api.summary)}</p>
<a href="${esc(api.source.url)}" target="_blank" rel="noopener noreferrer" title="Vendor notice for ${esc(api.name)} (opens in a new tab)" aria-label="Vendor notice for ${esc(api.name)}, opens in a new tab">Source notice, read ${esc(api.source.read_on)}</a>
</li>`;
  });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'">
<title>Resurrect: the graveyard</title>
<meta name="description" content="Every dead and ending API tracked by Resurrect. Each entry carries a dated shutdown notice from the vendor.">
<link rel="stylesheet" href="styles.css">
</head>
<body>
<header class="top">
<h1>The graveyard</h1>
<p class="lead">Every API tracked here carries a dated notice from the vendor. Status words are exact: ended (shut down), scheduled (still live, end date announced), moved (no end date published, never called shut down). <a href="index.html" title="Back to the paste box" aria-label="Back to the paste box">Back to the paste box</a>.</p>
</header>
<main>
<ul class="g-list" aria-label="Dead and ending APIs">
${cards.join('\n')}
</ul>
</main>
<footer>
<p class="disclaimer">Not affiliated with, endorsed by or sponsored by the services named here. Names are used only to say which service your code calls.</p>
<p>Built for Kiroween 2026. Source and licence (MIT): <a href="https://github.com/OsakaSaul/scriptsold" target="_blank" rel="noopener noreferrer" title="Source code on GitHub (opens in a new tab)" aria-label="Source code on GitHub, opens in a new tab">github.com/OsakaSaul/scriptsold</a>.</p>
</footer>
</body>
</html>
`;
}

function read(dir, f) {
  const p = join(root, 'docs', 'examples', dir, f);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

function examplesPage() {
  const { registry } = loadData();
  const parts = [];
  for (const ex of EXAMPLES) {
    parts.push(`<section aria-labelledby="h-${ex.dir}"><h2 id="h-${ex.dir}">${esc(ex.title)}</h2><p>${rich(ex.story)}</p>`);
    for (const f of ex.inputs) {
      parts.push(`<h3>Input: <code>${esc(f)}</code></h3><pre><code>${esc(read(ex.dir, f))}</code></pre>`);
    }
    const hasSnippets = read(ex.dir, 'output.in-place' + ex.inputs[0].replace('input', '')) !== null;
    if (hasSnippets) {
      parts.push(`<h3>Generated JavaScript</h3><pre><code>${esc(read(ex.dir, 'output.js'))}</code></pre>`);
      parts.push(`<h3>Generated Python</h3><pre><code>${esc(read(ex.dir, 'output.py'))}</code></pre>`);
    } else {
      for (const f of ex.inputs) {
        const out = f.replace('input', 'output');
        parts.push(`<h3>Output: <code>${esc(out)}</code> (your code, plus the marker)</h3><pre><code>${esc(read(ex.dir, out))}</code></pre>`);
      }
    }
    // field table for the first matched endpoint
    const report = JSON.parse(read(ex.dir, ex.inputs.length > 1 ? `report.${ex.inputs[0].replace('input.', '')}.json` : 'report.json'));
    const m = report.matches[0];
    const api = registry.apis.find((a) => a.name === m.api);
    const ep = api.endpoints.find((e) => e.name === m.endpoint);
    parts.push(`<h3>Field mapping</h3>`);
    parts.push(`<p>${esc(api.name)} ${esc(statusPhrase(api))}. <a href="${esc(api.source.url)}" target="_blank" rel="noopener noreferrer" title="Vendor notice for ${esc(api.name)} (opens in a new tab)" aria-label="Vendor notice for ${esc(api.name)}, opens in a new tab">Source notice</a>, read ${esc(api.source.read_on)}.</p>`);
    if (!ep.mapping) {
      parts.push(`<p>No FoxAPIs equivalent. ${rich(ep.noEquivalentReason)}</p>`);
    } else {
      const rows = fieldRows(ep);
      parts.push(`<p>Target: FoxAPIs <code>${esc(ep.mapping.foxapis.method)} ${esc(ep.mapping.foxapis.path)}</code>.</p>`);
      parts.push(`<table><tr><th scope="col">Old field</th><th scope="col">FoxAPIs field</th><th scope="col">Rule</th><th scope="col">Basis</th></tr>${rows.map((r) => `<tr><td><code>${esc(r.old)}</code></td><td>${r.rule === 'null' ? rich('none: ' + r.note) : '<code>' + esc(r.new) + '</code>'}</td><td>${esc(r.rule)}</td><td>${rich(r.basis)}</td></tr>`).join('')}</table>`);
      if (!rows.length) parts.push(`<p>${rich(ep.mapping.result.rawNote)}</p>`);
      if (ep.mapping.result.oldShapeNote) parts.push(`<p class="small">${rich(ep.mapping.result.oldShapeNote)}</p>`);
    }
    parts.push('</section>');
  }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'">
<title>Resurrect: worked examples</title>
<meta name="description" content="Three worked examples: input, generated JavaScript and Python, and the field-mapping table.">
<link rel="stylesheet" href="styles.css">
</head>
<body>
<header class="top"><h1>Worked examples</h1><p class="lead">Each example is pre-rendered by the same engine that runs on the front page. <a href="index.html" title="Back to the paste box" aria-label="Back to the paste box">Back to the paste box</a>.</p></header>
<main>
${parts.join('\n')}
</main>
<footer>
<p class="disclaimer">Not affiliated with, endorsed by or sponsored by the services named here. Names are used only to say which service your code calls.</p>
<p>Built for Kiroween 2026. Source and licence: <a href="https://github.com/OsakaSaul/scriptsold" target="_blank" rel="noopener noreferrer" title="Source code on GitHub (opens in a new tab)" aria-label="Source code on GitHub, opens in a new tab">github.com/OsakaSaul/scriptsold</a>.</p>
</footer>
</body>
</html>
`;
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  buildSite();
  console.log('site built in public/');
}
