// Seeded generators for the property tests. No dependencies.
import { mulberry32 } from '../../src/util.js';
import { data } from '../helpers.js';

export function rng(seed) {
  const r = mulberry32(seed);
  return {
    next: r,
    int: (n) => Math.floor(r() * n),
    pick: (a) => a[Math.floor(r() * a.length)],
    bool: (p = 0.5) => r() < p,
    word: (len = 6) => Array.from({ length: len }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(r() * 26)]).join(''),
    token: (len = 24) => Array.from({ length: len }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(r() * 62)]).join(''),
  };
}

// Example paths that match each endpoint pattern.
const SAMPLE_PATH = {
  'proxycurl/person_profile': '/proxycurl/api/v2/linkedin',
  'proxycurl/work_email': '/proxycurl/api/linkedin/profile/email',
  'proxycurl/person_lookup': '/proxycurl/api/linkedin/profile/resolve',
  'proxycurl/company_profile': '/proxycurl/api/linkedin/company',
  'clearbit-logo/logo': '/stripe.com',
  'clearbit-enrichment/company_find': '/v2/companies/find',
  'clearbit-enrichment/person_find': '/v2/people/find',
  'bing-search/search': '/v7.0/search',
  'instagram-basic-display/user_media': '/me/media',
  'reversecontact-legacy/resolve_email': '/v2/resolve/persons/email',
  'reversecontact-activities/activities': '/v2/activities',
  'dataforseo-pinterest/pinterest': '/v3/business_data/social_media/pinterest/live',
  'lusha-person-v2/person_v2': '/v2/person',
};

export function allCalls() {
  const out = [];
  for (const api of data.registry.apis) {
    for (const ep of api.endpoints) {
      const path = SAMPLE_PATH[`${api.id}/${ep.id}`];
      if (!path) continue;
      out.push({ api, ep, host: api.hosts[0], path, url: `https://${api.hosts[0]}${path}` });
    }
  }
  return out;
}

export function mappedCalls() {
  return allCalls().filter((c) => c.ep.mapping);
}
export function unmappedCalls() {
  return allCalls().filter((c) => !c.ep.mapping);
}

// Renders a call to `url` in the given language. `u` is the random value passed along.
export function render(call, lang, r) {
  const v = r.word(8);
  const fn = `${r.word(5)}Fn`;
  if (lang === 'js') {
    return [`export async function ${fn}(arg) {`, `  const res = await fetch("${call.url}?x=" + encodeURIComponent("${v}"), { headers: { Accept: "application/json" } });`, `  return res.json();`, `}`].join('\n');
  }
  if (lang === 'py') {
    return [`def ${fn}(arg):`, `    resp = requests.get(`, `        "${call.url}",`, `        params={"x": "${v}"},`, `    )`, `    return resp.json()`].join('\n');
  }
  return `curl "${call.url}?x=${v}"`;
}

export function junkLines(r, n) {
  const kinds = [
    () => `// ${r.word(7)} ${r.word(4)}`,
    () => `const ${r.word(5)} = ${r.int(1000)};`,
    () => `console.log("${r.word(6)}");`,
    () => ``,
    () => `# ${r.word(8)}`,
  ];
  return Array.from({ length: n }, () => r.pick(kinds)());
}
