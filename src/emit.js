// Code generation. Turns one registry mapping into JavaScript, Python or curl.
// Everything the output says comes from the registry entry and the catalog
// snapshot; nothing is invented here.

import { jsString, pyString } from './util.js';

const BASE = 'https://api.foxapis.com';
const NL = String.fromCharCode(10);

export function pascal(id) {
  return id.split(/[_-]/).map((p) => p[0].toUpperCase() + p.slice(1)).join('');
}

export function functionName(ep, language) {
  return language === 'py' ? `resurrected_${ep.id}` : `resurrected${pascal(ep.id)}`;
}

export function statusPhrase(api) {
  if (api.status === 'ended') return `ended ${api.date}`;
  if (api.status === 'scheduled') return `ending ${api.date}`;
  return 'moved into another product, no end date published';
}

function inputNames(mapping) {
  const names = [];
  for (const b of mapping.body) for (const i of b.inputs) if (!names.includes(i)) names.push(i);
  return names;
}

function usedTransforms(mapping) {
  return [...new Set(mapping.result.fieldMap.filter((r) => r.rule === 'derived').map((r) => r.transform))];
}

const JS_TRANSFORMS = {
  firstName: `  firstName: (p) => { const t = String(p.full_name || "").trim().split(/\\s+/); return t.length === 2 ? t[0] : null; },`,
  lastName: `  lastName: (p) => { const t = String(p.full_name || "").trim().split(/\\s+/); return t.length === 2 ? t[1] : null; },`,
  slugFromLinkedin: `  slugFromLinkedin: (p) => { const m = /linkedin\\.com\\/in\\/([^\\/?#]+)/.exec(p.linkedin_url || ""); return m ? m[1] : null; },`,
  titleAtEmployer: `  titleAtEmployer: (p) => (p.title && p.employer ? \`\${p.title} at \${p.employer}\` : null),`,
};

const PY_TRANSFORMS = {
  firstName: `    "firstName": lambda p: (str(p.get("full_name") or "").split()[0] if len(str(p.get("full_name") or "").split()) == 2 else None),`,
  lastName: `    "lastName": lambda p: (str(p.get("full_name") or "").split()[1] if len(str(p.get("full_name") or "").split()) == 2 else None),`,
  slugFromLinkedin: `    "slugFromLinkedin": lambda p: (lambda m: m.group(1) if m else None)(re.search(r"linkedin\\.com/in/([^/?#]+)", p.get("linkedin_url") or "")),`,
  titleAtEmployer: `    "titleAtEmployer": lambda p: (f"{p['title']} at {p['employer']}" if p.get("title") and p.get("employer") else None),`,
};

function rulesLiteral(mapping, language) {
  const rows = mapping.result.fieldMap.map((r) => {
    const o = { old: r.old, rule: r.rule };
    if (r.rule === 'null') o.reason = r.reason;
    else o.from = r.from;
    if (r.transform) o.transform = r.transform;
    return o;
  });
  if (language === 'py') {
    return '[\n' + rows.map((o) => '    ' + pyDict(o) + ',').join('\n') + '\n]';
  }
  return '[\n' + rows.map((o) => '  ' + JSON.stringify(o) + ',').join('\n') + '\n]';
}

function pyDict(o) {
  return '{' + Object.entries(o).map(([k, v]) => `${pyString(k)}: ${pyString(v)}`).join(', ') + '}';
}

function headerLines(api, ep, mapping, comment) {
  const t = mapping.foxapis;
  return [
    comment(`RESURRECT: replaces the ${api.name} "${ep.name}" call (${statusPhrase(api)}). It now calls FoxAPIs ${t.method} ${t.path}.`),
    comment('Needs FOXAPIS_KEY in the environment. A free key: https://foxapis.com/trial'),
  ];
}

// ---------------------------------------------------------------- JavaScript

export function emitJs(api, ep, opts = {}) {
  const mapping = ep.mapping;
  const t = mapping.foxapis;
  const fn = functionName(ep, 'js');
  const names = inputNames(mapping);
  const kind = mapping.result.kind;
  const c = (s) => `// ${s}`;
  const out = [...headerLines(api, ep, mapping, c)];

  if (kind === 'old-shape') {
    out.push(c('Fields FoxAPIs cannot fill come back as null; the reasons are in _resurrect.unfilled.'));
  } else {
    out.push(c(mapping.result.rawNote));
  }

  if (kind === 'old-shape') {
    const tr = usedTransforms(mapping);
    out.push(`const blank = (v) => (v === undefined || v === null || v === "" ? null : v);`);
    out.push(`const TRANSFORMS = {`);
    for (const n of tr) out.push(JS_TRANSFORMS[n]);
    out.push(`};`);
    out.push(`const RULES = ${rulesLiteral(mapping, 'js')};`);
    out.push(`function toOldShape(p) {
  const out = {};
  const derived = [];
  const unfilled = [];
  for (const r of RULES) {
    if (r.rule === "null") { out[r.old] = null; unfilled.push({ field: r.old, reason: r.reason }); continue; }
    if (r.rule === "passthrough") { out[r.old] = Array.isArray(p[r.from]) ? p[r.from] : null; if (out[r.old] === null) unfilled.push({ field: r.old, reason: "FoxAPIs returned no list" }); continue; }
    const v = r.rule === "derived" ? TRANSFORMS[r.transform](p) : blank(p[r.from]);
    out[r.old] = v;
    if (v === null) unfilled.push({ field: r.old, reason: r.rule === "derived" ? "FoxAPIs returned no value to build it from" : "FoxAPIs returned an empty value" });
    else if (r.rule === "derived") derived.push(r.old);
  }
  out._resurrect = { source: "foxapis", unfilled, derived };
  return out;
}`);
  }

  if (opts.asResponse !== false) out.push(`const asResponse = (data, status = 200) => ({ ok: status < 400, status, data, json: async () => data, text: async () => JSON.stringify(data) });`);

  if (mapping.async && opts.wait !== false || opts.wait === true) {
    out.push(`async function waitForJob(jobId, headers) {
  for (let i = 0; i < 90; i += 1) {
    const res = await fetch(${jsString(BASE)} + "/v1/jobs/" + encodeURIComponent(jobId), { headers });
    if (!res.ok) throw new Error("FoxAPIs job poll answered " + res.status);
    const job = await res.json();
    if (job.status === "done") return job;
    if (job.status === "failed" || job.status === "error") throw new Error("FoxAPIs job " + job.status);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("FoxAPIs job did not finish in time; poll " + jobId + " again later");
}`);
  }

  out.push(`export async function ${fn}({ ${names.join(', ')} } = {}) {`);
  for (const b of mapping.body.filter((x) => x.required)) {
    out.push(`  if (!${b.inputs[0]}) throw new Error("${b.to} is required by FoxAPIs: ${b.todo.replace(/"/g, "'")}");`);
  }
  out.push(`  const key = process.env.FOXAPIS_KEY;`);
  out.push(`  if (!key) throw new Error("Set FOXAPIS_KEY (free key: https://foxapis.com/trial)");`);
  out.push(`  const headers = { Authorization: \`Bearer \${key}\`, "Content-Type": "application/json" };`);
  out.push(`  const body = {};`);
  for (const b of mapping.body) {
    out.push(`  if (${b.inputs[0]}) body.${b.to} = ${b.inputs[0]};`);
  }
  out.push(`  const res = await fetch(${jsString(BASE + t.path)}, { method: ${jsString(t.method)}, headers, body: JSON.stringify(body) });`);
  out.push(`  if (res.status === 401 || res.status === 403) throw new Error("FoxAPIs rejected the key (status " + res.status + ")");`);
  if (mapping.async) {
    out.push(`  if (res.status !== 202 && !res.ok) throw new Error("FoxAPIs answered " + res.status);`);
    out.push(`  const first = await res.json();`);
    out.push(`  const job = res.status === 202 ? await waitForJob(first.job_id, headers) : first;`);
    out.push(`  return job.result ?? null;`);
  } else {
    out.push(`  if (!res.ok) throw new Error("FoxAPIs answered " + res.status);`);
    out.push(`  const data = await res.json();`);
    if (kind === 'old-shape') {
      out.push(`  const p = data && data.${mapping.result.root};`);
      out.push(`  if (!p || typeof p !== "object") return null;`);
      out.push(`  return toOldShape(p);`);
    } else {
      out.push(`  return data;`);
    }
  }
  out.push(`}`);
  return out.join('\n');
}

// -------------------------------------------------------------------- Python

export function emitPy(api, ep) {
  const mapping = ep.mapping;
  const t = mapping.foxapis;
  const fn = functionName(ep, 'py');
  const names = inputNames(mapping);
  const kind = mapping.result.kind;
  const c = (s) => `# ${s}`;
  const out = ['import json', 'import os', 'import re', 'import time', 'import urllib.error', 'import urllib.request', ''];
  out.push(...headerLines(api, ep, mapping, c));
  if (kind === 'old-shape') out.push(c('Fields FoxAPIs cannot fill come back as None; the reasons are in _resurrect["unfilled"].'));
  else out.push(c(mapping.result.rawNote));
  out.push('');

  if (kind === 'old-shape') {
    out.push('TRANSFORMS = {');
    for (const n of usedTransforms(mapping)) out.push(PY_TRANSFORMS[n]);
    out.push('}');
    out.push(`RULES = ${rulesLiteral(mapping, 'py')}`);
    out.push(`

def _blank(v):
    return None if v is None or v == "" else v


def to_old_shape(p):
    out, derived, unfilled = {}, [], []
    for r in RULES:
        if r["rule"] == "null":
            out[r["old"]] = None
            unfilled.append({"field": r["old"], "reason": r["reason"]})
            continue
        if r["rule"] == "passthrough":
            v = p.get(r["from"])
            out[r["old"]] = v if isinstance(v, list) else None
            if out[r["old"]] is None:
                unfilled.append({"field": r["old"], "reason": "FoxAPIs returned no list"})
            continue
        v = TRANSFORMS[r["transform"]](p) if r["rule"] == "derived" else _blank(p.get(r["from"]))
        out[r["old"]] = v
        if v is None:
            unfilled.append({"field": r["old"], "reason": "FoxAPIs returned no value to build it from" if r["rule"] == "derived" else "FoxAPIs returned an empty value"})
        elif r["rule"] == "derived":
            derived.append(r["old"])
    out["_resurrect"] = {"source": "foxapis", "unfilled": unfilled, "derived": derived}
    return out
`);
  }

  out.push(`
class ResurrectedResponse:
    """Looks like a requests response: .json(), .status_code, .ok, .text, .raise_for_status()."""

    def __init__(self, data, status_code=200):
        self._data = data
        self.status_code = status_code
        self.ok = status_code < 400
        self.text = json.dumps(data)

    def json(self):
        return self._data

    def raise_for_status(self):
        if not self.ok:
            raise RuntimeError("FoxAPIs answered %s" % self.status_code)


def _foxapis(method, path, headers, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(${pyString(BASE)} + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            raw = r.read().decode() or "null"
            return r.status, json.loads(raw)
    except urllib.error.HTTPError as e:
        return e.code, None
`);

  if (mapping.async) {
    out.push(`
def _wait_for_job(job_id, headers):
    for _ in range(90):
        status, job = _foxapis("GET", "/v1/jobs/" + job_id, headers)
        if status >= 400:
            raise RuntimeError("FoxAPIs job poll answered %s" % status)
        if job.get("status") == "done":
            return job
        if job.get("status") in ("failed", "error"):
            raise RuntimeError("FoxAPIs job " + job["status"])
        time.sleep(2)
    raise RuntimeError("FoxAPIs job did not finish in time; poll " + job_id + " again later")
`);
  }

  out.push(`
def ${fn}(${names.map((n) => `${n}=None`).join(', ')}):`);
  for (const b of mapping.body.filter((x) => x.required)) {
    out.push(`    if not ${b.inputs[0]}:`);
    out.push(`        raise ValueError(${pyString(`${b.to} is required by FoxAPIs: ${b.todo}`)})`);
  }
  out.push(`    key = os.environ.get("FOXAPIS_KEY")`);
  out.push(`    if not key:`);
  out.push(`        raise RuntimeError("Set FOXAPIS_KEY (free key: https://foxapis.com/trial)")`);
  out.push(`    headers = {"Authorization": "Bearer " + key, "Content-Type": "application/json", "User-Agent": "resurrect/0.1"}`);
  out.push(`    body = {}`);
  for (const b of mapping.body) {
    out.push(`    if ${b.inputs[0]}:`);
    out.push(`        body[${pyString(b.to)}] = ${b.inputs[0]}`);
  }
  out.push(`    status, data = _foxapis(${pyString(t.method)}, ${pyString(t.path)}, headers, body)`);
  out.push(`    if status in (401, 403):`);
  out.push(`        raise RuntimeError("FoxAPIs rejected the key (status %s)" % status)`);
  if (mapping.async) {
    out.push(`    if status not in (200, 202):`);
    out.push(`        raise RuntimeError("FoxAPIs answered %s" % status)`);
    out.push(`    job = _wait_for_job(data["job_id"], headers) if status == 202 else data`);
    out.push(`    return job.get("result")`);
  } else {
    out.push(`    if status >= 400:`);
    out.push(`        raise RuntimeError("FoxAPIs answered %s" % status)`);
    if (kind === 'old-shape') {
      out.push(`    p = (data or {}).get(${pyString(mapping.result.root)})`);
      out.push(`    if not isinstance(p, dict):`);
      out.push(`        return None`);
      out.push(`    return to_old_shape(p)`);
    } else {
      out.push(`    return data`);
    }
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------- curl

export function emitCurl(api, ep, inputs = {}) {
  const mapping = ep.mapping;
  const t = mapping.foxapis;
  const body = {};
  for (const b of mapping.body) {
    const v = inputs[b.inputs[0]];
    if (v && v.kind === 'literal') body[b.to] = v.value;
    else if (b.required) body[b.to] = `TODO: ${b.todo}`;
  }
  const lines = [
    `# RESURRECT: replaces the ${api.name} "${ep.name}" call (${statusPhrase(api)}). It now calls FoxAPIs ${t.method} ${t.path}.`,
    `# Needs FOXAPIS_KEY in the environment. A free key: https://foxapis.com/trial`,
  ];
  if (mapping.async) lines.push(`# This call answers 202 with a job_id. Poll GET ${BASE}/v1/jobs/<job_id> with the same header until status is done.`);
  const bodyJson = JSON.stringify(body).replace(/'/g, "'\\''");
  lines.push(`curl -X ${t.method} ${BASE}${t.path} \\`);
  lines.push(`  -H "Authorization: Bearer $FOXAPIS_KEY" \\`);
  lines.push(`  -H "Content-Type: application/json" \\`);
  lines.push(`  -d '${bodyJson}'`);
  return lines.join('\n');
}

// ------------------------------------------------- splice (inside user code)

function indentBlock(text, indent) {
  return text.split('\n').map((l) => (l.length ? indent + l : l)).join('\n');
}

function callArgLines(mapping, inputs, language) {
  const lines = [];
  const seen = new Set();
  for (const b of mapping.body) {
    const name = b.inputs[0];
    if (seen.has(name)) continue;
    seen.add(name);
    const v = inputs[name];
    const sep = language === 'py' ? '=' : ': ';
    const lit = (x) => (language === 'py' ? pyString(x) : jsString(x));
    if (v && v.kind === 'literal') lines.push(`${name}${sep}${lit(v.value)},`);
    else if (v && v.kind === 'expr' && v.sameLanguage) lines.push(`${name}${sep}${v.expr},`);
    else if (b.required) lines.push(`${name}${sep}${language === 'py' ? 'None' : 'undefined'},${language === 'py' ? '  #' : ' //'} TODO: ${b.todo}`);
  }
  return lines;
}

// Builds the text that replaces the old call block, in the user's language.
export function emitSplice(api, ep, language, inputs, assignedTo, indent, seq = 1, first = true, declKw = '') {
  const mapping = ep.mapping;
  if (language === 'curl') return { helper: null, call: indentBlock(emitCurl(api, ep, inputs), indent) };
  const v = assignedTo || 'response';
  const args = callArgLines(mapping, inputs, language);
  const tmp = `_resurrected_${seq}`;
  if (language === 'py') {
    const fn = functionName(ep, 'py');
    const call = [
      `${tmp} = ${fn}(`,
      ...args.map((a) => `    ${a}`),
      ')',
      `${v} = ResurrectedResponse(${tmp}, 200) if ${tmp} is not None else ResurrectedResponse({"detail": "No match found by FoxAPIs"}, 404)`,
    ].join(NL);
    return { helper: emitPy(api, ep), call: indentBlock(call, indent) };
  }
  const fn = functionName(ep, 'js');
  const lines = [];
  lines.push(`// RESURRECT: FoxAPIs call (${api.name} ${ep.name}). The value is shaped like a fetch or axios response: .ok, .status, .data and await .json() work.`);
  lines.push(`const ${tmp} = await ${fn}({`);
  for (const a of args) lines.push(`  ${a}`);
  lines.push('});');
  lines.push(`${assignedTo ? (declKw ? declKw + ' ' : '') : 'const '}${v} = ${tmp} !== null ? asResponse(${tmp}) : asResponse({ detail: "No match found by FoxAPIs" }, 404);`);
  return { helper: emitJs(api, ep, first ? { wait: true } : { asResponse: false, wait: false }).replace(/^export /m, ''), call: indentBlock(lines.join(NL), indent) };
}

// Standalone file, one per language, used for the examples and the web page.
export function emitStandalone(api, ep, language) {
  const fn = functionName(ep, language);
  if (language === 'py') {
    return emitPy(api, ep) + `

if __name__ == "__main__":
    import sys

    arg = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    print(json.dumps(${fn}(**arg), indent=2))
`;
  }
  if (language === 'js') {
    return `import { pathToFileURL } from "node:url";

` + emitJs(api, ep) + `

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv[2] ? JSON.parse(process.argv[2]) : {};
  console.log(JSON.stringify(await ${fn}(arg), null, 2));
}
`;
  }
  return emitCurl(api, ep) + '\n';
}
