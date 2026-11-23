// Runs public/app.js against a tiny fake DOM, so the click handlers are really
// exercised: a mapped result links to a verified FoxAPIs page in a new tab, an
// unmapped one links to none, and nothing is fetched when Resurrect is pressed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from './helpers.js';

class Node_ {
  constructor(tag) { this.tag = tag; this.attrs = {}; this.children = []; this.listeners = {}; this.hidden = false; this.value = ''; this.className = ''; this._text = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  get dataset() { const o = {}; for (const [k, v] of Object.entries(this.attrs)) if (k.startsWith('data-')) o[k.slice(5)] = v; return o; }
  get childNodes() { return this.children; }
  append(...k) { for (const x of k) this.children.push(typeof x === 'string' ? { text: x } : x); }
  replaceChildren(...k) { this.children = []; this.append(...k); }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  click() { for (const f of this.listeners.click || []) f(); }
  focus() {}
  set textContent(v) { this._text = v; this.children = []; }
  get textContent() { return this._text + this.children.map((c) => (c.text ?? c.textContent ?? '')).join(''); }
  all(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.all) c.all(pred, out); return out; }
}

// the result is built into two containers, #cards and #out
function both(get) {
  const cards = get('cards');
  const out = get('out');
  return {
    all: (p) => [...cards.all(p), ...out.all(p)],
    get textContent() { return get('summary').textContent + cards.textContent + out.textContent; },
  };
}

async function boot() {
  const ids = {};
  const get = (id) => (ids[id] ||= new Node_('div'));
  for (const b of ['go', 'clear']) get(b);
  const lang = get('lang');
  lang.value = 'auto';
  const fetched = [];
  const files = (p) => readFileSync(join(root, 'public', p), 'utf8');
  globalThis.document = { getElementById: get, createElement: (t) => new Node_(t), createTextNode: (t) => ({ text: t }), querySelectorAll: () => [] };
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  globalThis.fetch = async (u) => {
    fetched.push(u);
    return { json: async () => JSON.parse(files(u)), text: async () => files(u) };
  };
  await import(`${pathToFileURL(join(root, 'public', 'app.js')).href}?t=${Math.random()}`);
  await new Promise((r) => setTimeout(r, 50));
  return { get, fetched };
}

test('the Resurrect click runs the engine with no request, and a mapped result links to a verified FoxAPIs page in a new tab', async () => {
  const { get, fetched } = await boot();
  const before = fetched.length;
  assert.ok(before >= 3, 'the page loads its own data files');
  assert.ok(fetched.every((u) => /^(engine|examples)\//.test(u)));
  get('paste').value = readFileSync(join(root, 'docs', 'examples', '01-proxycurl-person-profile', 'input.py'), 'utf8');
  get('go').click();
  assert.equal(fetched.length, before, 'pressing Resurrect made a request');
  const anchors = both(get).all((n) => n.tag === 'a');
  assert.equal(get('result').hidden, false);
  const fox = anchors.filter((a) => /^https:\/\/foxapis\.com\//.test(a.attrs.href));
  assert.ok(fox.length >= 1, 'a mapped result has a FoxAPIs link');
  const verified = JSON.parse(readFileSync(join(root, 'data', 'foxapis-links.json'), 'utf8'));
  const ok = new Set([...verified.endpoints, ...verified.alternatives].map((l) => l.url));
  for (const a of anchors) {
    assert.equal(a.attrs.target, '_blank');
    assert.equal(a.attrs.rel, 'noopener noreferrer');
    assert.ok(a.attrs.title && a.attrs['aria-label']);
    if (/foxapis\.com/.test(a.attrs.href)) assert.ok(ok.has(a.attrs.href), a.attrs.href);
  }
  const buttons = both(get).all((n) => n.tag === 'button');
  assert.ok(buttons.length >= 4);
  for (const b of buttons) assert.ok(b.attrs.title && b.attrs['aria-label'], 'a result button has no tooltip');
});

test('an ended API with no FoxAPIs equivalent shows no FoxAPIs link and says so', async () => {
  const { get } = await boot();
  get('paste').value = readFileSync(join(root, 'docs', 'examples', '03-bing-search', 'input.py'), 'utf8');
  get('go').click();
  const result = both(get);
  assert.equal(both(get).all((n) => n.tag === 'a' && /foxapis\.com/.test(n.attrs.href || '')).length, 0);
  assert.match(result.textContent, /no FoxAPIs equivalent/i);
  const vendor = both(get).all((n) => n.tag === 'a');
  assert.ok(vendor.length >= 1 && vendor.every((a) => a.attrs.target === '_blank'));
});

test('the graveyard list is built from the registry, one entry per API, each with its vendor notice', async () => {
  const { get } = await boot();
  const registry = JSON.parse(readFileSync(join(root, 'data', 'registry.json'), 'utf8'));
  const items = get('yard-list').all((n) => n.tag === 'li');
  assert.equal(items.length, registry.apis.length);
  const links = get('yard-list').all((n) => n.tag === 'a').map((a) => a.attrs.href);
  for (const a of registry.apis) assert.ok(links.includes(a.source.url));
});
