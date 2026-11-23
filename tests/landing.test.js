// Checks on the landing page and its claims (T2964): no network on the paste
// path, every link verified, no forbidden words, a tooltip on every control.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { root, data } from './helpers.js';

const read = (...p) => readFileSync(join(root, ...p), 'utf8');
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const indexHtml = read('public', 'index.html');
const appJs = read('public', 'app.js').split('\r\n').join('\n');
const ENGINE = readdirSync(join(root, 'public', 'engine')).filter((f) => f.endsWith('.js'));

// ---- no network on the paste path ------------------------------------------------

test('the engine makes no network request: every browser API that can send data throws if touched', async () => {
  const trap = (name) => () => {
    throw new Error(`network API used: ${name}`);
  };
  const saved = {};
  const names = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'Image'];
  for (const n of names) {
    saved[n] = globalThis[n];
    globalThis[n] = trap(n);
  }
  const hadNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: { sendBeacon: trap('sendBeacon') }, configurable: true });
  try {
    const { resurrect } = await import('../public/engine/resurrect.js');
    const inputs = [];
    for (const f of walk(join(root, 'docs', 'examples')).filter((p) => /input\./.test(p))) inputs.push(readFileSync(f, 'utf8'));
    inputs.push('curl -H "Authorization: Bearer abc" https://nubela.co/proxycurl/api/v2/linkedin?url=x', 'nothing to see here', '');
    for (const text of inputs) {
      resurrect(text, { registry: data.registry, catalog: data.catalog });
    }
  } finally {
    for (const n of names) {
      if (saved[n] === undefined) delete globalThis[n];
      else globalThis[n] = saved[n];
    }
    if (hadNav) Object.defineProperty(globalThis, 'navigator', hadNav);
    else delete globalThis.navigator;
  }
});

test('the engine bundle in public/engine has no network calls and imports only its own files', () => {
  for (const f of ENGINE) {
    const text = read('public', 'engine', f);
    assert.ok(!/XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts|navigator\./.test(text), `${f} references a network API`);
    for (const m of text.matchAll(/^\s*import\s[^;]*?from\s+['"]([^'"]+)['"]/gm)) assert.match(m[1], /^\.\//, `${f} imports ${m[1]}`);
    assert.ok(!/import\s*\(/.test(text), `${f} uses dynamic import`);
    assert.ok(!/https?:\/\/(?!foxapis\.com|api\.foxapis\.com)/.test(text.replace(/^\s*\/\/.*$/gm, '')), `${f} mentions a URL outside FoxAPIs`);
    if (f === 'emit.js') continue; // the code generator: its fetch( lines are template text; the trap test above proves it never calls fetch
    for (const line of text.split('\n')) {
      const i = line.search(/\bfetch\s*\(/);
      if (i < 0) continue;
      // allowed only as text: inside a quote or template (generated code) or a regex source
      assert.ok(/['"`]/.test(line.slice(0, i)) || /\/.*\bfetch\b.*\/[a-z]*[;,]?\s*$/.test(line) || /\bCALL_RE\b|RE\s*=/.test(line), `${f}: fetch( outside a string: ${line.trim()}`);
    }
  }
});

test('the page script makes only same-site GETs, none on the paste path', () => {
  assert.ok(!/XMLHttpRequest|sendBeacon|WebSocket|EventSource|gtag|analytics|posthog|plausible|clarity|fbq|dataLayer/i.test(appJs));
  const fetches = [...appJs.matchAll(/fetch\(([^)]*)\)/g)].map((m) => m[1]);
  assert.ok(fetches.length >= 3);
  for (const a of fetches) assert.match(a, /^\s*(['`](engine|examples)\/)/, `fetch to ${a}`);
  const start = appJs.indexOf("$('go').addEventListener");
  const end = appJs.indexOf('for (const b of document.querySelectorAll', start);
  assert.ok(start > 0 && end > start);
  const goHandler = appJs.slice(start, end);
  assert.ok(!/fetch|XMLHttpRequest|sendBeacon/.test(goHandler), 'the Resurrect click handler makes a request');
  // render() and what it calls: no fetch inside the render function
  const rs = appJs.indexOf('function render(');
  const re = appJs.indexOf("$('clear')", rs);
  assert.ok(!/fetch\(/.test(appJs.slice(rs, re)));
});

test('the page loads nothing from another site and the policy forbids it', () => {
  for (const f of ['index.html', 'examples.html']) {
    const html = read('public', f);
    assert.match(html, /connect-src 'self'/.test(html) ? /./ : /default-src 'self'/);
    for (const m of html.matchAll(/<(script|img|link|iframe|source)\b[^>]*\b(src|href)="(https?:[^"]+)"/g)) {
      assert.ok(m[1] === 'a', `${f} loads ${m[3]} from another site`);
    }
  }
  assert.match(indexHtml, /connect-src 'self'/);
  assert.match(indexHtml, /script-src 'self'/);
  assert.ok(indexHtml.includes('Nothing you paste is sent anywhere: the rewrite runs in your browser.'));
});

// ---- links -----------------------------------------------------------------------

const links = JSON.parse(read('data', 'foxapis-links.json'));

test('every FoxAPIs link is on foxapis.com over https and was checked', () => {
  const all = [...links.endpoints, ...links.alternatives, ...links.general];
  for (const l of all) {
    const u = new URL(l.url);
    assert.equal(u.protocol, 'https:');
    assert.equal(u.hostname, 'foxapis.com', l.url);
    assert.ok(!/^https?:\/\/[^/]*(scriptsold\.com)/.test(l.url));
  }
  for (const l of [...links.endpoints, ...links.alternatives]) assert.match(l.check, /HTTP 200/, `${l.url} has no recorded check`);
  assert.match(links.verified_on, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(read('public', 'engine', 'foxapis-links.json'), read('data', 'foxapis-links.json'));
});

test('every mapped endpoint in the registry has a verified link, and the page script builds no link of its own', () => {
  const have = new Set(links.endpoints.map((e) => e.path));
  for (const api of data.registry.apis) {
    for (const ep of api.endpoints) {
      if (ep.mapping) assert.ok(have.has(ep.mapping.foxapis.path), `${ep.mapping.foxapis.path} has no verified FoxAPIs link`);
    }
  }
  assert.ok(!/foxapis\.com/.test(appJs), 'app.js must take FoxAPIs links from foxapis-links.json only');
});

test('every http link in the page is either in the verified list, the repository, or a vendor notice from the registry', () => {
  const allowed = new Set([...links.endpoints, ...links.alternatives, ...links.general].map((l) => l.url));
  allowed.add('https://github.com/OsakaSaul/scriptsold');
  for (const m of indexHtml.matchAll(/href="(https?:[^"]+)"/g)) assert.ok(allowed.has(m[1]), `${m[1]} is not a verified link`);
  for (const a of data.registry.apis) assert.match(a.source.url, /^https:\/\//);
});

test('links that open another site use a new tab with noopener noreferrer', () => {
  const tags = [...indexHtml.matchAll(/<a\b[^>]*href="https?:[^>]*>/g)].map((m) => m[0]);
  assert.ok(tags.length >= 3);
  for (const t of tags) {
    assert.match(t, /target="_blank"/, t);
    assert.match(t, /rel="noopener noreferrer"/, t);
  }
  assert.ok(/target: '_blank', rel: 'noopener noreferrer'/.test(appJs));
  assert.ok(!/rel: 'noopener'/.test(appJs));
});

// ---- forbidden words ---------------------------------------------------------------

const BANNED = [/openai/i, /anthropic/i, /\bclaude\b/i, /\bgemini\b/i, /deepseek/i, /\bgroq\b/i, /\bscrap(e|ed|es|ing|er|ers)\b/i, /public data/i];

test('no model names and no scraping or public-data wording in public/ or submission/', () => {
  const files = [
    ...walk(join(root, 'public')).filter((f) => /\.(html|js|css|json|md|txt)$/.test(f)),
    ...walk(join(root, 'submission')),
  ];
  assert.ok(files.length > 5);
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    for (const re of BANNED) assert.ok(!re.test(text), `${f} matches ${re}`);
  }
});

// ---- tooltips ------------------------------------------------------------------------

function tags(html, names) {
  const out = [];
  for (const m of html.matchAll(/<(button|select|textarea|input|a)\b([^>]*)>/gi)) {
    if (names.includes(m[1].toLowerCase())) out.push({ name: m[1].toLowerCase(), attrs: m[2] });
  }
  return out;
}
const attr = (a, k) => (a.match(new RegExp(`\\b${k}="([^"]*)"`)) || [])[1];

test('every control and link in the page has a title and an aria-label', () => {
  for (const f of ['index.html', 'examples.html']) {
    const found = tags(read('public', f), ['button', 'select', 'textarea', 'input', 'a']);
    assert.ok(found.length >= 3);
    for (const t of found) {
      if (t.name === 'input' && /type="hidden"/.test(t.attrs)) continue;
      assert.ok((attr(t.attrs, 'title') || '').length >= 5, `${f}: <${t.name} ${t.attrs.trim()}> has no title`);
      assert.ok((attr(t.attrs, 'aria-label') || '').length >= 3, `${f}: <${t.name} ${t.attrs.trim()}> has no aria-label`);
    }
  }
  const html = indexHtml;
  for (const id of ['lang', 'paste', 'go', 'clear']) assert.ok(new RegExp(`id="${id}"[^>]*title=`).test(html), id);
  assert.equal([...html.matchAll(/data-example=/g)].length, 3);
});

test('visible text of a control is part of its accessible name', () => {
  for (const m of indexHtml.matchAll(/<(button|a)\b([^>]*)>([^<]+)<\/\1>/g)) {
    const label = attr(m[2], 'aria-label');
    if (!label) continue;
    const vis = m[3].trim().toLowerCase();
    assert.ok(label.toLowerCase().includes(vis) || /^[a-z0-9.\/-]+$/.test(vis) && label.toLowerCase().includes(vis.split('.')[0]), `aria-label "${label}" lacks visible text "${m[3].trim()}"`);
  }
});

test('controls the script creates all go through btn() or extLink(), which set a title and an aria-label', () => {
  assert.ok(!/el\('(button|a|select|textarea|input)'/.test(appJs.replace(/function (btn|extLink)[\s\S]*?\n}\n/g, '')), 'a control is built without btn() or extLink()');
  const btnFn = appJs.match(/function btn\([\s\S]*?\n}\n/)[0];
  assert.ok(btnFn.includes('title:') && btnFn.includes("'aria-label'"));
  const linkFn = appJs.match(/function extLink\([\s\S]*?\n}\n/)[0];
  assert.ok(linkFn.includes('title:') && linkFn.includes("'aria-label'"));
});

// ---- look and honesty ------------------------------------------------------------------

test('the page respects reduced motion and has a mobile layout', () => {
  const css = read('public', 'styles.css');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.ok(!/<script(?![^>]*\bsrc=)/.test(indexHtml));
});

test('the page types no prices and no counts: those come from data at run time', () => {
  const text = indexHtml.replace(/<[^>]+>/g, ' ');
  assert.ok(!/[$£€]\s?\d/.test(text), 'a price is typed in the page');
  assert.ok(!/\b\d+\s+(dead|APIs|endpoints|providers|calls|credits)\b/i.test(text), 'a count is typed in the page');
  assert.ok(indexHtml.includes('https://foxapis.com/pricing'));
});
