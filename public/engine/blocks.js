// Finds the statement (call block) that holds a detected URL, so the engine
// can replace that block and leave every other line alone.

import { leadingWhitespace } from './util.js';

const CALL_RE = /\b(fetch|axios(?:\.\w+)?|requests\.\w+|http\.\w+|https\.\w+|urlopen|urllib\.request\.\w+|got(?:\.\w+)?|request|HTTParty\.\w+|\$\.(?:get|ajax|getJSON))\s*\(/;
const ASSIGN_RE = /^\s*(?:export\s+)?(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?!=)/;
const STRING_ASSIGN_RE = /^\s*(?:export\s+)?(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*[`'"]/;
const BACKSLASH_END = /\\\s*$/;

function bracketDelta(line) {
  // crude: drop string literals and trailing comments first
  const s = line
    .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""')
    .replace(/\s(#|\/\/).*$/, '');
  let d = 0;
  for (const ch of s) {
    if ('(['.includes(ch)) d += 1;
    else if (')]'.includes(ch)) d -= 1;
  }
  return d;
}

function depthsAtLineStart(lines) {
  const out = [];
  let d = 0;
  for (const l of lines) {
    out.push(d);
    d += bracketDelta(l);
    if (d < 0) d = 0;
  }
  return out;
}

function statementRange(lines, depths, idx) {
  let start = idx;
  while (start > 0 && depths[start] > 0) start -= 1;
  let end = start;
  let d = 0;
  for (let i = start; i < lines.length; i += 1) {
    d += bracketDelta(lines[i]);
    end = i;
    if (d <= 0) {
      // follow method chains: .then(...) .catch(...) .json()
      while (end + 1 < lines.length && /^\s*\./.test(lines[end + 1])) {
        end += 1;
        let dd = 0;
        for (let k = end; k < lines.length; k += 1) {
          dd += bracketDelta(lines[k]);
          end = k;
          if (dd <= 0) break;
        }
      }
      break;
    }
  }
  return { start, end };
}

function assignedName(line) {
  const am = line.match(ASSIGN_RE);
  if (!am) return null;
  const kw = line.match(/^\s*(?:export\s+)?(const|let|var)\s/);
  return { name: am[1], kw: kw ? kw[1] : '' };
}

function flat(a) {
  return a ? { assignedTo: a.name, declKw: a.kw } : { assignedTo: null, declKw: '' };
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function findBlock(lines, idx, language) {
  if (language === 'curl') {
    let start = idx;
    while (start > 0 && BACKSLASH_END.test(lines[start - 1])) start -= 1;
    let end = idx;
    while (end < lines.length - 1 && BACKSLASH_END.test(lines[end])) end += 1;
    return { start, end, assignedTo: null, declKw: '', complete: /^\s*curl\b/.test(lines[start]) };
  }
  if (language === 'html') return { start: idx, end: idx, assignedTo: null, complete: false };
  const depths = depthsAtLineStart(lines);
  const first = statementRange(lines, depths, idx);
  const text = lines.slice(first.start, first.end + 1).join('\n');
  if (CALL_RE.test(text)) {
    return { ...first, ...flat(assignedName(lines[first.start])), complete: true };
  }
  // URL held in a variable: look ahead for the call that uses it
  const sm = lines[first.start].match(STRING_ASSIGN_RE);
  if (sm) {
    const nameRe = new RegExp(`(^|[^\\w$.])${escapeRe(sm[1])}(?![\\w$])`);
    for (let j = first.end + 1; j < Math.min(lines.length, first.end + 61); j += 1) {
      if (!CALL_RE.test(lines[j])) continue;
      const r = statementRange(lines, depths, j);
      if (nameRe.test(lines.slice(r.start, r.end + 1).join('\n'))) {
        return { start: r.start, end: r.end, ...flat(assignedName(lines[r.start])), complete: true, urlAssign: { start: first.start, end: first.end } };
      }
    }
  }
  return { ...first, assignedTo: null, complete: false };
}

// Pulls simple parameter values out of a block, by name. Returns
// { kind: 'literal', value } for a plain string, { kind: 'expr', expr } for an
// identifier or template, or null when the parameter is not found.
export function extractParam(blockText, names) {
  for (const n of names) {
    const q = blockText.match(new RegExp(`[?&]${n}=([^&\\s'"\`)]+)`));
    if (q) {
      const tpl = q[1].match(/^\$\{([A-Za-z_$][\w$.]*)\}$/);
      if (tpl) return { kind: 'expr', expr: tpl[1] };
      return { kind: 'literal', value: safeDecode(q[1]) };
    }
    const keyed = blockText.match(new RegExp(`['"]?\\b${n}['"]?\\s*[:=]\\s*('[^']*'|"[^"]*"|\`[^\`]*\`|[A-Za-z_$][\\w$.]*)`));
    if (keyed) return fromSource(keyed[1]);
    const d = blockText.match(new RegExp(`--data-urlencode\\s+['"]?${n}=([^'"\\s]+)`));
    if (d) return { kind: 'literal', value: safeDecode(d[1]) };
  }
  return null;
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function fromSource(src) {
  const q = src[0];
  if ('\'"`'.includes(q)) {
    const inner = src.slice(1, -1);
    if (q === '`' && inner.includes('${')) return { kind: 'expr', expr: src };
    return { kind: 'literal', value: inner };
  }
  return { kind: 'expr', expr: src };
}

export { leadingWhitespace };
