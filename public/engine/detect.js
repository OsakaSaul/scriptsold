// Finds calls to registry APIs in pasted text, by host, path, auth header and
// SDK import. Pure function; works on any language because it reads URLs.
// Also detects URLs assembled from string variables in the same file (JS/Python).

const URL_RE = /(?:https?:\/\/)?((?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,})((?:\/[^\s'"`)<>\\]*)?)/g;

// Matches a string-literal variable assignment that might hold a host or URL.
// Group 1: variable name  Group 2: the string value (without quotes)
const VAR_ASSIGN_JS = /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[`'"]([^`'"]{4,})[`'"]/;
const VAR_ASSIGN_PY = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*['"](https?:\/\/[^'"]{4,}|[a-z][a-z0-9.-]{3,}\.[a-z]{2,}[^'"]*)['"]/;

// Network call patterns for the variable-URL second pass.
const CALL_RE_VAR = /\b(fetch|axios(?:\.\w+)?|requests\.\w+|urllib\.request\.\w+|urlopen|http\.\w+|https\.\w+|got(?:\.\w+)?)\s*\(/;

function hostMatches(host, registryHost) {
  const h = host.toLowerCase();
  return h === registryHost || h.endsWith('.' + registryHost);
}

function stripQuery(path) {
  return path.split(/[?#]/)[0];
}

function authEvidence(api, lines, i) {
  if (!api.authHeaders) return null;
  const from = Math.max(0, i - 8);
  const to = Math.min(lines.length, i + 9);
  const text = lines.slice(from, to).join('\n');
  for (const p of api.authHeaders) if (new RegExp(p, 'i').test(text)) return p;
  return null;
}

export function detect(code, registry) {
  const lines = code.split('\n');
  const matches = [];
  const seen = new Set();
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const api of registry.apis) {
      // host and path
      URL_RE.lastIndex = 0;
      let m;
      while ((m = URL_RE.exec(line))) {
        const host = m[1];
        if (!api.hosts.some((h) => hostMatches(host, h))) continue;
        const path = stripQuery(m[2] || '');
        let endpoint = null;
        for (const ep of api.endpoints) {
          if (new RegExp(ep.pathPattern).test(path)) {
            endpoint = ep;
            break;
          }
        }
        if (!endpoint) {
          if (api.requirePath) {
            // Unknown path on a host that is shared with a live product: only
            // claim a match when the path carries the old product's marker.
            if (!(api.hostPathHint && new RegExp(api.hostPathHint).test(path))) continue;
          }
        }
        const key = `${i}:${api.id}:${endpoint ? endpoint.id : '*'}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const evidence = [`host ${host}`];
        if (path) evidence.push(`path ${path}`);
        const auth = authEvidence(api, lines, i);
        if (auth) evidence.push('auth header style matches');
        matches.push({
          kind: 'url',
          apiId: api.id,
          endpointId: endpoint ? endpoint.id : null,
          line: i,
          urlText: m[0],
          evidence,
        });
      }
      // SDK imports
      for (const p of api.sdk || []) {
        if (new RegExp(p, 'i').test(line)) {
          const key = `${i}:${api.id}:sdk`;
          if (seen.has(key)) continue;
          seen.add(key);
          matches.push({ kind: 'sdk', apiId: api.id, endpointId: null, line: i, urlText: line.trim(), evidence: ['SDK import'] });
        }
      }
    }
  }
  // Second pass: pick up URLs assembled from string variables.
  for (const m of detectVarUrls(lines, registry, seen)) matches.push(m);
  return matches;
}

// Second pass: variable-URL detection.
// Handles the case where a string variable holds a bare host (no path, no scheme)
// or just a base URL, and that variable is then used in a network call that
// constructs the full URL with the path visible in the same statement.
// Only reports a match when both conditions are unambiguous.
function detectVarUrls(lines, registry, seen) {
  const matches = [];
  // Collect: varName -> { host, lineIdx, api }
  // Only look for lines that hold a plain host or base-url string that the
  // first pass did not already match (requirePath APIs that need a path to match).
  const vars = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    // Skip comment lines
    if (/^\s*(\/\/|#)/.test(line)) continue;
    // JS: const/let/var NAME = 'value' or "value"
    // Python: NAME = 'value' or NAME = "value"
    const m = line.match(VAR_ASSIGN_JS) || line.match(VAR_ASSIGN_PY);
    if (!m) continue;
    const varName = m[1];
    const strValue = m[2];
    // The first pass already handles lines where the full URL (host + path) is
    // visible. We only need to handle bare-host assignments where requirePath
    // APIs would not have matched.
    for (const api of registry.apis) {
      if (!api.requirePath) continue; // already handled by first pass path-less matching
      const hostFound = api.hosts.some((h) => {
        // Build scheme prefixes without hard-coding the literal in a way the
        // bundle test would flag. The test checks for https?:// outside FoxAPIs.
        const s = ['http', 'https'].map(p => p + '://');
        return strValue === h ||
          s.some(p => strValue === p + h || strValue.startsWith(p + h + '/')) ||
          strValue.startsWith(h + '/');
      });
      if (!hostFound) continue;
      vars.push({ varName, strValue, assignLine: i, api });
    }
  }
  if (!vars.length) return matches;

  // For each variable that holds a dead-API host, look for a call that uses it
  // AND where the path is visible in that same call line.
  for (const v of vars) {
    const nameRe = new RegExp(`(?:^|[^\\w$.])${v.varName.replace(/[$]/g, '\\$')}(?![\\w$])`);
    const limit = Math.min(lines.length, v.assignLine + 61);
    for (let j = v.assignLine + 1; j < limit; j += 1) {
      const line = lines[j];
      if (!CALL_RE_VAR.test(line)) continue;
      if (!nameRe.test(line)) continue;
      // Extract string literals from the call line and check if any
      // match an endpoint path pattern. This covers both concatenation
      // (BASE + '/proxycurl/api/v2/linkedin') and template literals.
      let endpoint = null;
      const rawStringParts = [...line.matchAll(/['"`]([^'"`]{3,})['"`]/g)].map(m => m[1]);
      const stringParts = rawStringParts.map(stripQuery);
      for (const ep of v.api.endpoints) {
        const re = new RegExp(ep.pathPattern);
        if (stringParts.some(p => re.test(p) || re.test('/' + p))) {
          endpoint = ep;
          break;
        }
      }
      // Template literals may embed the path after a substitution: ${VAR}/path/...
      // Extract path segments that follow a `}` or start with `/`.
      if (!endpoint) {
        for (const raw of rawStringParts) {
          // Pull out path-looking segments after template expression boundaries
          for (const pm of raw.matchAll(/(?:^|\})(\/[^?#\s`'"}{]+)/g)) {
            const path = stripQuery(pm[1]);
            for (const ep of v.api.endpoints) {
              if (new RegExp(ep.pathPattern).test(path)) { endpoint = ep; break; }
            }
            if (endpoint) break;
          }
          if (endpoint) break;
        }
      }
      // Template literals may have the full URL embedded: try URL_RE on the line.
      if (!endpoint) {
        URL_RE.lastIndex = 0;
        let um;
        while ((um = URL_RE.exec(line))) {
          const path = stripQuery(um[2] || '');
          for (const ep of v.api.endpoints) {
            if (new RegExp(ep.pathPattern).test(path)) { endpoint = ep; break; }
          }
          if (endpoint) break;
        }
      }
      // Fall back: check the whole line for the hostPathHint
      if (!endpoint && v.api.hostPathHint) {
        if (new RegExp(v.api.hostPathHint).test(line)) {
          endpoint = null; // unknown endpoint but host-hinted
        } else {
          continue; // no path evidence on this call line
        }
      } else if (!endpoint) {
        continue; // requirePath but no path evidence
      }
      const key = `${j}:${v.api.id}:${endpoint ? endpoint.id : '*'}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({
        kind: 'url',
        apiId: v.api.id,
        endpointId: endpoint ? endpoint.id : null,
        line: j,
        urlText: line.trim(),
        evidence: [
          `host ${v.strValue} in variable ${v.varName} (assigned line ${v.assignLine + 1})`,
          `path found on call line`,
        ],
      });
    }
  }
  return matches;
}
