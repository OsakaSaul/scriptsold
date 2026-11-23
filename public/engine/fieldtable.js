// Field-mapping tables. Every row carries its basis, so a reader can see what
// each claim rests on. Rows with rule null are old fields FoxAPIs cannot fill.

import { creditsText } from './registry.js';
import { statusPhrase } from './emit.js';

export function fieldRows(ep) {
  const m = ep.mapping;
  if (!m) return [];
  const root = m.result.root ? `${m.result.root}.` : '';
  return m.result.fieldMap.map((r) => {
    if (r.rule === 'null') return { old: r.old, new: null, rule: 'null', note: r.reason, basis: r.basis };
    if (r.rule === 'derived') {
      const src = [r.from, r.also].filter(Boolean).map((x) => root + x).join(' + ');
      return { old: r.old, new: `derived from ${src}`, rule: 'derived', note: r.basis, basis: r.basis };
    }
    if (r.rule === 'passthrough') return { old: r.old, new: root + r.from, rule: 'passthrough', note: r.basis, basis: r.basis };
    return { old: r.old, new: root + r.from, rule: 'copy', note: r.basis, basis: r.basis };
  });
}

export function fieldTableMarkdown(api, ep, catalog) {
  const lines = [];
  lines.push(`# ${api.name}: ${ep.name}`);
  lines.push('');
  lines.push(`Status: ${api.name} ${statusPhrase(api)}. Source: ${api.source.url} (read ${api.source.read_on}).`);
  lines.push('');
  if (!ep.mapping) {
    lines.push('No FoxAPIs equivalent. Nothing was mapped.');
    lines.push('');
    lines.push(`Reason: ${ep.noEquivalentReason}`);
    return lines.join('\n') + '\n';
  }
  const m = ep.mapping;
  lines.push(`Target: FoxAPIs ${m.foxapis.method} ${m.foxapis.path}. ${creditsText(m.foxapis, catalog)}.`);
  if (m.async) lines.push('This call is asynchronous: it answers 202 with a job id, and the generated code polls GET /v1/jobs/{job_id} until the job is done.');
  lines.push('');
  lines.push('Request: old parameter to new parameter');
  lines.push('');
  lines.push('| Old | New | Note |');
  lines.push('|---|---|---|');
  for (const p of m.paramNotes) lines.push(`| ${p.old} | ${p.new} | ${p.note} |`);
  lines.push('');
  lines.push('Response: old field to FoxAPIs field');
  lines.push('');
  if (m.result.kind === 'old-shape') {
    lines.push('The generated code returns the old field names. Where FoxAPIs has no value the field is null and the reason is listed in _resurrect.unfilled.');
  } else {
    lines.push(m.result.rawNote);
  }
  lines.push('');
  const rows = fieldRows(ep);
  if (rows.length) {
    lines.push('| Old field | FoxAPIs field | Rule | Basis |');
    lines.push('|---|---|---|---|');
    for (const r of rows) {
      const target = r.rule === 'null' ? `none (null: ${r.note})` : r.new;
      lines.push(`| ${r.old} | ${target} | ${r.rule} | ${r.basis} |`);
    }
    lines.push('');
    if (m.result.oursOnly) lines.push(`FoxAPIs returns more that the old call did not: ${m.result.oursOnly.join(', ')}.`);
    if (m.result.oldShapeNote) lines.push(`Caveat: ${m.result.oldShapeNote}`);
  } else {
    lines.push('No old-to-new field table is claimed for this call.');
  }
  return lines.join('\n') + '\n';
}
