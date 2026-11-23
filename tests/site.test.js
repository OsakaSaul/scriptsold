import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { root } from './helpers.js';

const SECRET_SHAPES = new RegExp(['s' + 'k_(live|test)_', 'gh[po]_[A-Za-z0-9]{20}', 'xox[baprs]-[A-Za-z0-9-]{10}', 'AK' + 'IA[0-9A-Z]{16}', '-----BEGIN [A-Z ]*PRIV' + 'ATE KEY'].join('|'));
const read = (...p) => readFileSync(join(root, ...p), 'utf8');

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

test('the browser copy of the engine matches src (run npm run build)', () => {
  for (const f of ['util.js', 'redact.js', 'registry.js', 'detect.js', 'blocks.js', 'emit.js', 'fieldtable.js', 'resurrect.js']) {
    assert.equal(read('public', 'engine', f), read('src', f), `public/engine/${f} is stale`);
  }
  assert.equal(read('public', 'engine', 'registry.json'), read('data', 'registry.json'));
  assert.equal(read('public', 'engine', 'catalog.snapshot.json'), read('data', 'catalog.snapshot.json'));
});

test('the engine in public/engine runs and gives the same answer as src', async () => {
  const pub = await import('../public/engine/resurrect.js');
  const src = await import('../src/resurrect.js');
  const registry = JSON.parse(read('public', 'engine', 'registry.json'));
  const catalog = JSON.parse(read('public', 'engine', 'catalog.snapshot.json'));
  const code = read('docs', 'examples', '01-proxycurl-person-profile', 'input.py');
  assert.equal(pub.resurrect(code, { registry, catalog }).code, src.resurrect(code, { registry, catalog }).code);
});

const FORBIDDEN = [
  /\bclaude\b/i, /\bgpt\b/i, /\bchatgpt\b/i, /\bopenai\b/i, /\banthropic\b/i, /\bgemini\b/i, /\bllama\b/i, /\bmistral\b/i,
  /\bscrap(ed|ing|er|e)\b/i, /public data/i,
];

test('copy rules: no model names, no scraping or public-data wording in pages, outputs or docs', () => {
  const files = [
    ...walk(join(root, 'public')).filter((f) => /\.(html|js|css)$/.test(f) && !f.includes(`${join('public', 'engine')}`)),
    ...walk(join(root, 'docs')).filter((f) => !/input\./.test(f)),
    join(root, 'README.md'),
    join(root, 'data', 'registry.json'),
  ];
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    for (const re of FORBIDDEN) assert.ok(!re.test(text), `${f} matches ${re}`);
  }
  // generated code from the engine too
  for (const f of walk(join(root, 'src'))) {
    const text = readFileSync(f, 'utf8');
    for (const re of FORBIDDEN) assert.ok(!re.test(text), `${f} matches ${re}`);
  }
});

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<pre[\s\S]*?<\/pre>/g, '')
    .replace(/<code[\s\S]*?<\/code>/g, '')
    .replace(/<[^>]+>/g, ' ');
}

test('copy rules: no markdown bold and no underscores in visible page copy', () => {
  for (const f of ['index.html', 'examples.html']) {
    const text = visibleText(read('public', f));
    assert.ok(!text.includes('**'), `${f} has markdown bold`);
    assert.ok(!text.includes('_'), `${f} has an underscore in visible copy: ${text.match(/.{20}_.{20}/)}`);
  }
  // the script puts underscores only inside code elements
  const js = read('public', 'app.js');
  assert.ok(!/textContent\s*=\s*[`'"][^`'"]*_/.test(js));
});

test('every page carries the disclaimer, a title and the language attribute', () => {
  for (const f of ['index.html', 'examples.html']) {
    const html = read('public', f);
    assert.ok(html.includes('Not affiliated with, endorsed by or sponsored by the services named here. Names are used only to say which service your code calls.'));
    assert.match(html, /<title>[^<]{5,}<\/title>/);
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<meta name="viewport"/);
    assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/.test(html), 'no inline script');
  }
});

test('the UI has no performance claims and does not name data vendors or say identical', () => {
  for (const f of ['index.html', 'examples.html']) {
    const text = visibleText(read('public', f));
    assert.ok(!/\b(fast|faster|instant|accurate|accuracy|uptime|identical|same data)\b/i.test(text), f);
    assert.ok(!/\d+\s?%/.test(text), f);
  }
});

test('.kiro is committed material: present and not ignored', () => {
  for (const p of ['specs/resurrect/requirements.md', 'specs/resurrect/design.md', 'specs/resurrect/tasks.md', 'steering/product.md', 'steering/tech.md', 'steering/structure.md']) {
    assert.ok(existsSync(join(root, '.kiro', p)), p);
  }
  assert.ok(readdirSync(join(root, '.kiro', 'hooks')).length >= 1);
  const ignore = read('.gitignore');
  assert.ok(!/(^|\n)\s*\/?\.kiro/.test(ignore));
  const r = spawnSync('git', ['check-ignore', '-v', '.kiro/specs/resurrect/tasks.md'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.stdout.trim(), '');
});

test('no secrets are committed: the tree has no keys, tokens or env files', () => {
  const files = walk(root).filter((f) => !f.includes(`${join(root, '.git')}`) && !f.includes('node_modules'));
  assert.ok(!files.some((f) => /(^|[\\/])\.env/.test(f)));
  for (const f of files) {
    if (!/\.(js|mjs|json|md|html|css|py|sh|yml|yaml|txt)$/.test(f) && !/LICENSE$/.test(f)) continue;
    const text = readFileSync(f, 'utf8');
    assert.ok(!SECRET_SHAPES.test(text), `${f} looks like it holds a secret`);
  }
});
