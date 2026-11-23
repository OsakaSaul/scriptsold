import { resurrect } from './engine/resurrect.js';
import { fieldRows } from './engine/fieldtable.js';

const $ = (id) => document.getElementById(id);
let registry;
let catalog;
let links;

// The only network requests this page makes are the GETs below, for its own
// static files, when the page opens or an example button is pressed. They carry
// no pasted text. The Resurrect button runs the engine on the text in memory
// and makes no request at all (tests/privacy.test.js checks this).
async function load() {
  const [r, c, l] = await Promise.all([fetch('engine/registry.json'), fetch('engine/catalog.snapshot.json'), fetch('engine/foxapis-links.json')]);
  registry = await r.json();
  catalog = await c.json();
  links = await l.json();
  yard();
}

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else e.setAttribute(k, v);
  }
  for (const k of kids) e.append(k);
  return e;
}

// Text with identifiers that contain underscores: show those in code elements.
function rich(text) {
  const nodes = [];
  let last = 0;
  for (const m of String(text).matchAll(/[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+/g)) {
    if (m.index > last) nodes.push(document.createTextNode(text.slice(last, m.index)));
    nodes.push(el('code', {}, m[0]));
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(document.createTextNode(text.slice(last)));
  return nodes;
}

// Every control gets both a tooltip and an accessible name.
function btn(label, tip, { name, ...attrs } = {}) {
  return el('button', { type: 'button', title: tip, 'aria-label': name || tip, ...attrs }, label);
}

function extLink(url, text, tip) {
  return el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', title: `${tip} (opens in a new tab)`, 'aria-label': `${tip}, opens in a new tab` }, text);
}

function endpointLink(path) {
  const hit = links && links.endpoints.find((e) => e.path === path);
  return hit ? extLink(hit.url, hit.label, hit.label) : null;
}

function altLink(apiId) {
  const hit = links && links.alternatives.find((e) => e.api === apiId);
  return hit ? extLink(hit.url, hit.label, hit.label) : null;
}

function mappedPath(m) {
  const api = registry.apis.find((a) => a.id === m.api);
  const ep = api && api.endpoints.find((e) => e.id === m.endpoint);
  return ep && ep.mapping ? ep.mapping.foxapis.path : null;
}

function yard() {
  const list = $('yard-list');
  if (!list) return;
  list.replaceChildren();
  for (const a of registry.apis) {
    const when = a.status === 'ended' ? `ended ${a.date}` : a.status === 'scheduled' ? `ending ${a.date}` : 'no end date published';
    list.append(el('li', {}, el('span', { class: 'nm' }, a.name), el('span', { class: `badge ${a.status}` }, a.status), `${when}. `, extLink(a.source.url, 'Vendor notice', `Vendor notice for ${a.name}`)));
  }
}

function card(m, reduced) {
  const state = m.mapped ? 'alive' : m.status === 'ended' ? 'dead' : 'buried';
  const c = el('article', { class: `card ${state}${m.mapped && !reduced ? ' rise' : ''}` });
  const stamp = m.mapped ? 'Resurrected' : m.status === 'ended' ? 'R.I.P.' : m.status === 'scheduled' ? 'Ending soon' : 'Moved';
  c.append(el('span', { class: 'stamp' }, stamp));
  c.append(el('h3', {}, `${m.apiName}${m.endpointName ? ': ' + m.endpointName : ''}`));
  c.append(el('p', {}, `Line ${m.line}. ${m.label}. `, extLink(m.source, 'Source notice', `Vendor notice for ${m.apiName}`)));
  const path = m.mapped ? mappedPath(m) : null;
  const target = path ? endpointLink(path) : null;
  const small = el('p', { class: 'small' }, m.mapped ? 'A matching FoxAPIs endpoint exists. Replacement code is below. ' : 'Stays buried: no FoxAPIs equivalent. Your code is left as it is.');
  if (target) small.append(target);
  c.append(small);
  c.append(el('div', { class: 'beam', 'aria-hidden': 'true' }));
  return c;
}

function copyButton(text) {
  const b = btn('Copy', 'Copy this code to the clipboard', { class: 'ghost copy', name: 'Copy this code' });
  b.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      b.textContent = 'Copied';
    } catch {
      b.textContent = 'Select the code and copy it';
    }
    setTimeout(() => (b.textContent = 'Copy'), 2000);
  });
  return b;
}

function codePanel(text) {
  const wrap = el('div');
  wrap.append(copyButton(text), el('pre', {}, el('code', {}, text)));
  return wrap;
}

function table(headers, rows) {
  const t = el('table');
  const head = el('tr');
  for (const h of headers) head.append(el('th', { scope: 'col' }, h));
  t.append(head);
  for (const r of rows) {
    const tr = el('tr');
    for (const c of r) tr.append(el('td', {}, el('code', {}, String(c))));
    t.append(tr);
  }
  return t;
}

function render(r) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const out = $('out');
  const cards = $('cards');
  out.replaceChildren();
  cards.replaceChildren();
  const mapped = r.matches.filter((m) => m.mapped).length;
  const unmapped = r.matches.length - mapped;
  $('summary').textContent = r.matches.length
    ? `Found ${r.matches.length} call(s) to ended or ending APIs: ${mapped} with a FoxAPIs equivalent, ${unmapped} without.`
    : 'No known dead API found. Your code is returned unchanged.';
  for (const m of r.matches) cards.append(card(m, reduced));

  if (r.matches.length) {
    out.append(el('h3', {}, 'Your code, rewritten'), codePanel(r.code));
  }
  if (r.snippets.length) {
    const tabs = el('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Replacement language' });
    const panel = el('div', { role: 'tabpanel' });
    const snippet = r.snippets[0];
    const kinds = [['js', 'JavaScript'], ['py', 'Python'], ['curl', 'curl']];
    const show = (k) => {
      for (const b of tabs.children) b.setAttribute('aria-selected', String(b.dataset.k === k));
      panel.replaceChildren(codePanel(snippet[k]));
    };
    for (const [k, label] of kinds) {
      const b = btn(label, `Show the ${label} replacement`, { role: 'tab', 'data-k': k, 'aria-selected': 'false', name: `${label} replacement code` });
      b.addEventListener('click', () => show(k));
      tabs.append(b);
    }
    const tlink = endpointLink(snippet.target.split(' ')[1]);
    const alt = altLink(snippet.api);
    const heading = el('h3', {}, `Replacement for ${snippet.target}`);
    const refs = el('p', { class: 'small' });
    if (tlink) refs.append(tlink);
    if (alt) refs.append(tlink ? ' and ' : '', alt);
    out.append(heading, el('p', { class: 'small' }, ...rich(snippet.credits)));
    if (refs.childNodes.length) out.append(refs);
    out.append(tabs, panel);
    show('js');
    const api = registry.apis.find((a) => a.id === snippet.api);
    const ep = api.endpoints.find((e) => e.id === snippet.endpoint);
    const rows = fieldRows(ep);
    if (rows.length) {
      out.append(el('h3', {}, 'Field mapping'), table(['Old field', 'FoxAPIs field', 'Rule', 'Basis'], rows.map((x) => [x.old, x.rule === 'null' ? `none: ${x.note}` : x.new, x.rule, x.basis])));
    }
  }
  if (r.changes.length) {
    out.append(el('h3', {}, 'What changed'), el('ul', {}, ...r.changes.map((c) => el('li', {}, el('code', {}, c)))));
  }
  if (r.unmapped.length) {
    out.append(el('h3', {}, 'Stays buried'), el('ul', {}, ...r.unmapped.map((u) => el('li', {}, ...rich(u.reason)))));
  }
  if (r.notes.length) {
    out.append(el('h3', {}, 'Notes'), el('ul', { class: 'notes' }, ...r.notes.map((n) => el('li', {}, ...rich(n)))));
  }
  const res = $('result');
  res.hidden = false;
  res.focus();
}

$('clear').addEventListener('click', () => {
  $('paste').value = '';
  $('result').hidden = true;
  $('paste').focus();
});

$('go').addEventListener('click', () => {
  if (!registry) return;
  try {
    render(resurrect($('paste').value, { registry, catalog, language: $('lang').value }));
  } catch (e) {
    $('summary').textContent = e.status === 413 ? 'That is larger than 100 KB. Paste a smaller piece.' : 'Something went wrong. Try a smaller piece of code.';
    $('result').hidden = false;
  }
});

for (const b of document.querySelectorAll('[data-example]')) {
  b.addEventListener('click', async () => {
    const res = await fetch(`examples/${b.dataset.example}`);
    $('paste').value = await res.text();
    const ext = b.dataset.example.split('.').pop();
    $('lang').value = ext === 'py' ? 'py' : 'js';
    $('go').click();
  });
}

load();
