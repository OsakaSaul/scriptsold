// Registry and catalog helpers. Pure functions.

export function indexCatalog(catalog) {
  const map = new Map();
  for (const e of catalog.endpoints) map.set(`${e.method} ${e.path}`, e);
  return map;
}

export function catalogAgeDays(catalog, now = new Date()) {
  const t = Date.parse(catalog.generated_on);
  if (Number.isNaN(t)) return Infinity;
  return Math.floor((now.getTime() - t) / 86400000);
}

// Returns a list of problems. Empty list means the registry is sound.
export function validateRegistry(registry, catalog, now = new Date()) {
  const problems = [];
  const cat = indexCatalog(catalog);
  const ids = new Set();
  for (const api of registry.apis) {
    if (ids.has(api.id)) problems.push(`duplicate id ${api.id}`);
    ids.add(api.id);
    if (!api.source || !api.source.url) problems.push(`${api.id}: no source url`);
    else {
      try {
        const u = new URL(api.source.url);
        if (u.protocol !== 'https:') problems.push(`${api.id}: source url is not https`);
      } catch {
        problems.push(`${api.id}: source url does not parse`);
      }
    }
    if (!api.source || !api.source.read_on || Number.isNaN(Date.parse(api.source.read_on))) problems.push(`${api.id}: no read date`);
    if (!['ended', 'scheduled', 'moved'].includes(api.status)) problems.push(`${api.id}: bad status ${api.status}`);
    if (api.status === 'ended') {
      if (!api.date || Number.isNaN(Date.parse(api.date))) problems.push(`${api.id}: ended without a date`);
      else if (Date.parse(api.date) > now.getTime()) problems.push(`${api.id}: ended date is in the future`);
    }
    if (api.status === 'scheduled') {
      if (!api.date || Number.isNaN(Date.parse(api.date))) problems.push(`${api.id}: scheduled without a date`);
    }
    if (!api.hosts || !api.hosts.length) problems.push(`${api.id}: no hosts`);
    for (const ep of api.endpoints || []) {
      const where = `${api.id}/${ep.id}`;
      try {
        new RegExp(ep.pathPattern);
      } catch {
        problems.push(`${where}: bad pathPattern`);
      }
      if (!ep.mapping && !ep.noEquivalentReason) problems.push(`${where}: no mapping and no reason`);
      if (ep.mapping) {
        const t = ep.mapping.foxapis;
        const hit = cat.get(`${t.method} ${t.path}`);
        if (!hit) problems.push(`${where}: ${t.method} ${t.path} is not in the catalog`);
        else if (hit.status !== 'live') problems.push(`${where}: ${t.path} is not live`);
        for (const r of ep.mapping.result.fieldMap) {
          if (!['copy', 'derived', 'passthrough', 'null'].includes(r.rule)) problems.push(`${where}: bad rule ${r.rule}`);
          if (r.rule === 'null' && !r.reason) problems.push(`${where}: null rule for ${r.old} has no reason`);
          if (r.rule !== 'null' && !r.from) problems.push(`${where}: rule for ${r.old} has no source`);
        }
      }
    }
  }
  return problems;
}

export function creditsText(target, catalog) {
  const hit = indexCatalog(catalog).get(`${target.method} ${target.path}`);
  if (hit && typeof hit.credits === 'number') return `${hit.credits} credits per call (catalog snapshot, ${hit.credits_source})`;
  return 'credits per call: see https://foxapis.com/pricing (not in the catalog snapshot)';
}
