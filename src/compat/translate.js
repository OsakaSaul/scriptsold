// Pure translation module: turns a FoxAPIs response body into the old API
// response shape, driven by the endpoint's field map from the registry.
// No I/O, no network, no dependencies outside the standard library.
//
// translate(foxapisBody, endpoint, { sample, creditsUsed }) -> oldShapeObject
//
// Rules (each field rule comes from endpoint.mapping.result.fieldMap):
//   copy        - copy value from the FoxAPIs root object; empty string -> null
//   derived     - compute via the named transform; result null if inputs absent
//   passthrough - copy an array; non-array or absent -> null
//   null        - always null, reason listed in _resurrect.unfilled

const TRANSFORMS = {
  firstName(p) {
    const t = String(p.full_name || '').trim().split(/\s+/).filter(Boolean);
    return t.length === 2 ? t[0] : null;
  },
  lastName(p) {
    const t = String(p.full_name || '').trim().split(/\s+/).filter(Boolean);
    return t.length === 2 ? t[1] : null;
  },
  slugFromLinkedin(p) {
    const m = /linkedin\.com\/in\/([^/?#]+)/.exec(p.linkedin_url || '');
    return m ? m[1] : null;
  },
  titleAtEmployer(p) {
    return p.title && p.employer ? `${p.title} at ${p.employer}` : null;
  },
};

function blank(v) {
  return v === undefined || v === null || v === '' ? null : v;
}

/**
 * Translate a FoxAPIs response object to the old API shape.
 *
 * @param {object} foxapisBody - The full FoxAPIs response (e.g. { success, profile, credits_used }).
 * @param {object} endpoint    - Registry endpoint with endpoint.mapping.result.{root, fieldMap}.
 * @param {object} [opts]
 * @param {boolean} [opts.sample]       - If true, adds _resurrect.sample: true.
 * @param {number}  [opts.creditsUsed]  - If provided, adds _resurrect.credits_used.
 * @returns {object|null} Old-shape object, or null when FoxAPIs has no result.
 */
export function translate(foxapisBody, endpoint, opts = {}) {
  const mapping = endpoint.mapping;
  if (!mapping) throw new Error(`endpoint ${endpoint.id} has no mapping`);
  const { root, fieldMap } = mapping.result;

  // The root object (e.g. foxapisBody.profile for Proxycurl person profile).
  const p = foxapisBody && root ? foxapisBody[root] : foxapisBody;
  if (!p || typeof p !== 'object') return null;

  const out = {};
  const derived = [];
  const unfilled = [];

  for (const r of fieldMap) {
    if (r.rule === 'null') {
      out[r.old] = null;
      unfilled.push({ field: r.old, reason: r.reason });
      continue;
    }
    if (r.rule === 'passthrough') {
      const v = p[r.from];
      out[r.old] = Array.isArray(v) ? v : null;
      if (out[r.old] === null) unfilled.push({ field: r.old, reason: 'FoxAPIs returned no list' });
      continue;
    }
    if (r.rule === 'derived') {
      const fn = TRANSFORMS[r.transform];
      if (!fn) throw new Error(`unknown transform: ${r.transform}`);
      const v = fn(p);
      out[r.old] = v;
      if (v === null) unfilled.push({ field: r.old, reason: 'FoxAPIs returned no value to build it from' });
      else derived.push(r.old);
      continue;
    }
    // copy
    const v = blank(p[r.from]);
    out[r.old] = v;
    if (v === null) unfilled.push({ field: r.old, reason: 'FoxAPIs returned an empty value' });
  }

  out._resurrect = { source: 'foxapis', unfilled, derived };
  if (opts.sample) out._resurrect.sample = true;
  if (typeof opts.creditsUsed === 'number') out._resurrect.credits_used = opts.creditsUsed;

  return out;
}
