// Finds calls to registry APIs in pasted text, by host, path, auth header and
// SDK import. Pure function; works on any language because it reads URLs.

const URL_RE = /(?:https?:\/\/)?((?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,})((?:\/[^\s'"`)<>\\]*)?)/g;

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
  return matches;
}
