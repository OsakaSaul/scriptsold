// The engine: detect, map, generate. Pure, no I/O, no network, no dependencies.
// Works in Node and in the browser.

import { detect } from './detect.js';
import { redact } from './redact.js';
import { findBlock, extractParam } from './blocks.js';
import { detectLanguage, commentLine, leadingWhitespace } from './util.js';
import { emitSplice, emitStandalone, statusPhrase } from './emit.js';
import { fieldRows } from './fieldtable.js';
import { creditsText } from './registry.js';

export const MAX_INPUT_BYTES = 100 * 1024;
export const MARKER = 'RESURRECT: no FoxAPIs equivalent';
const SPLICEABLE = new Set(['js', 'ts', 'py', 'curl']);

export function statusLabel(api) {
  if (api.status === 'ended') return `shut down on ${api.date}`;
  if (api.status === 'scheduled') return `ending on ${api.date}`;
  return 'moved into another product (no end date published)';
}

function collectInputs(mapping, blockText, language) {
  const inputs = {};
  for (const b of mapping.body) {
    if (!b.fromOld) continue;
    const hit = extractParam(blockText, b.fromOld);
    if (!hit) continue;
    if (hit.kind === 'literal') inputs[b.inputs[0]] = hit;
    else inputs[b.inputs[0]] = { ...hit, sameLanguage: language === 'js' || language === 'ts' || language === 'py' };
  }
  return inputs;
}

export function resurrect(input, { registry, catalog, language = 'auto' } = {}) {
  const text = String(input ?? '');
  if (new TextEncoder().encode(text).length > MAX_INPUT_BYTES) {
    const e = new Error('Input is larger than 100 KB.');
    e.status = 413;
    throw e;
  }
  const red = redact(text);
  const code = red.code;
  const lang = detectLanguage(code, language);
  const lines = code.split('\n');
  const found = detect(code, registry);
  const apiById = new Map(registry.apis.map((a) => [a.id, a]));

  const result = {
    language: lang,
    matches: [],
    code,
    changes: [],
    unfilled: [],
    unmapped: [],
    snippets: [],
    notes: [],
    redactions: red.count,
  };
  if (red.count) result.notes.push(`${red.count} secret-looking value(s) were replaced with <redacted> before anything else ran.`);
  if (!found.length) {
    result.notes.push('no known dead API found');
    return result;
  }

  // one edit per block; applied bottom-up so earlier line numbers hold
  const edits = new Map();
  const helpers = new Set();
  const helperTexts = [];
  let seq = 0;
  const noted = new Set();
  const note = (s) => {
    if (!noted.has(s)) {
      noted.add(s);
      result.notes.push(s);
    }
  };
  for (const m of found) {
    const api = apiById.get(m.apiId);
    const ep = m.endpointId ? api.endpoints.find((e) => e.id === m.endpointId) : null;
    const entry = {
      api: api.id,
      apiName: api.name,
      endpoint: ep ? ep.id : null,
      endpointName: ep ? ep.name : null,
      line: m.line + 1,
      kind: m.kind,
      evidence: m.evidence,
      status: api.status,
      label: statusLabel(api),
      date: api.date,
      source: api.source.url,
      mapped: Boolean(ep && ep.mapping),
    };
    if (api.ambiguous) note(`${api.name}: the same hosts are also used by a live product, so check that your code really calls the ended one.`);
    result.matches.push(entry);

    if (m.kind === 'sdk') {
      entry.mapped = false;
      result.unmapped.push({ api: api.id, endpoint: null, reason: `${api.name} SDK import found. The SDK is not rewritten; replace its calls by hand, or use the URL-based call so the engine can map it.`, source: api.source.url });
      continue;
    }
    if (!ep) {
      result.unmapped.push({ api: api.id, endpoint: null, reason: `The path is not one the engine knows for ${api.name}, so nothing is mapped.`, source: api.source.url });
      markUnmapped(edits, lines, findBlock(lines, m.line, lang).start, lang);
      continue;
    }
    if (!ep.mapping) {
      result.unmapped.push({ api: api.id, endpoint: ep.id, reason: ep.noEquivalentReason, source: api.source.url });
      markUnmapped(edits, lines, findBlock(lines, m.line, lang).start, lang);
      continue;
    }

    const block = findBlock(lines, m.line, lang);
    const blockText = lines.slice(block.start, block.end + 1).join('\n');
    const inputs = collectInputs(ep.mapping, blockText, lang);
    result.snippets.push({
      api: api.id,
      endpoint: ep.id,
      target: `${ep.mapping.foxapis.method} ${ep.mapping.foxapis.path}`,
      credits: creditsText(ep.mapping.foxapis, catalog),
      js: emitStandalone(api, ep, 'js'),
      py: emitStandalone(api, ep, 'py'),
      curl: emitStandalone(api, ep, 'curl'),
    });
    for (const p of ep.mapping.paramNotes) result.changes.push(`${api.name} ${ep.name}: ${p.old} -> ${p.new} (${p.note})`);
    for (const r of fieldRows(ep)) if (r.rule === 'null') result.unfilled.push({ field: r.old, reason: r.note, api: api.id, endpoint: ep.id });
    if (ep.mapping.result.kind !== 'old-shape') note(`${api.name} ${ep.name}: ${ep.mapping.result.rawNote}`);
    if (api.status !== 'ended') note(`${api.name}: ${statusLabel(api)}.`);
    for (const b of ep.mapping.body) {
      if (b.required && !inputs[b.inputs[0]]) note(`${api.name} ${ep.name}: FoxAPIs needs ${b.to}; the old call did not have it, so a TODO placeholder was inserted. ${b.todo}.`);
    }

    if (SPLICEABLE.has(lang) && block.complete) {
      const indent = leadingWhitespace(lines[block.start]);
      seq += 1;
      const { helper, call } = emitSplice(api, ep, lang, inputs, block.assignedTo, indent, seq, helperTexts.length === 0, block.declKw);
      edits.set(block.start, { start: block.start, end: block.end, text: call, kind: 'splice' });
      if (block.urlAssign) {
        const ua = block.urlAssign;
        edits.set(ua.start, { start: ua.start, end: ua.end, kind: 'splice', text: commentLine(lang, `RESURRECT: the old ${api.name} address that was here is replaced by the FoxAPIs call below.`, leadingWhitespace(lines[ua.start])) });
      }
      if (helper && !helpers.has(`${api.id}/${ep.id}`)) {
        helpers.add(`${api.id}/${ep.id}`);
        helperTexts.push(helper);
      }
      entry.replaced = true;
    } else {
      entry.replaced = false;
      note(`${api.name} ${ep.name}: the whole call could not be located in ${lang} code, so it was left as it is. Use the generated snippet.`);
    }
  }

  if (helperTexts.length) {
    const at = helperInsertIndex(lines, lang);
    edits.set(`helper:${at}`, { start: at, end: at, kind: 'marker', text: helperTexts.join('\n\n') + '\n' });
  }
  const order = [...edits.values()].sort((a, b) => b.start - a.start || (a.kind === 'splice' ? -1 : 1));
  const out = lines.slice();
  for (const e of order) {
    if (e.kind === 'marker') out.splice(e.start, 0, ...e.text.split('\n'));
    else out.splice(e.start, e.end - e.start + 1, ...e.text.split('\n'));
  }
  result.code = out.join('\n');
  return result;
}

// Helpers go after the import lines at the top of the file, or at the very top.
function helperInsertIndex(lines, lang) {
  const importRe = lang === 'py' ? /^(import\s|from\s+\S+\s+import\s)/ : /^(import\s|(const|let|var)\s+.*=\s*require\()/;
  let last = -1;
  for (let i = 0; i < Math.min(lines.length, 60); i += 1) {
    if (importRe.test(lines[i])) last = i;
    else if (lines[i].trim() === '' || /^\s*(#|\/\/)/.test(lines[i])) continue;
    else if (last >= 0 || !/^#!/.test(lines[i])) break;
  }
  return last + 1;
}

function markUnmapped(edits, lines, lineIdx, lang) {
  const prev = lineIdx > 0 ? lines[lineIdx - 1] : '';
  if (prev.includes(MARKER)) return;
  if (edits.has(lineIdx)) return;
  const indent = leadingWhitespace(lines[lineIdx]);
  edits.set(lineIdx, { start: lineIdx, end: lineIdx, kind: 'marker', text: commentLine(lang, MARKER, indent) });
}

export { detectLanguage, statusPhrase };
