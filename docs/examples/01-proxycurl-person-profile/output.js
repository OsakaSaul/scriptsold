import { pathToFileURL } from "node:url";

// RESURRECT: replaces the Proxycurl "Person Profile" call (ended 2025-07-04). It now calls FoxAPIs POST /v1/enrich_person.
// Needs FOXAPIS_KEY in the environment. A free key: https://foxapis.com/trial
// Fields FoxAPIs cannot fill come back as null; the reasons are in _resurrect.unfilled.
const blank = (v) => (v === undefined || v === null || v === "" ? null : v);
const TRANSFORMS = {
  firstName: (p) => { const t = String(p.full_name || "").trim().split(/\s+/); return t.length === 2 ? t[0] : null; },
  lastName: (p) => { const t = String(p.full_name || "").trim().split(/\s+/); return t.length === 2 ? t[1] : null; },
  slugFromLinkedin: (p) => { const m = /linkedin\.com\/in\/([^\/?#]+)/.exec(p.linkedin_url || ""); return m ? m[1] : null; },
  titleAtEmployer: (p) => (p.title && p.employer ? `${p.title} at ${p.employer}` : null),
};
const RULES = [
  {"old":"full_name","rule":"copy","from":"full_name"},
  {"old":"first_name","rule":"derived","from":"full_name","transform":"firstName"},
  {"old":"last_name","rule":"derived","from":"full_name","transform":"lastName"},
  {"old":"public_identifier","rule":"derived","from":"linkedin_url","transform":"slugFromLinkedin"},
  {"old":"profile_pic_url","rule":"copy","from":"photo_url"},
  {"old":"occupation","rule":"derived","from":"title","transform":"titleAtEmployer"},
  {"old":"headline","rule":"derived","from":"title","transform":"titleAtEmployer"},
  {"old":"summary","rule":"copy","from":"summary"},
  {"old":"experiences","rule":"passthrough","from":"employment_history"},
  {"old":"education","rule":"passthrough","from":"education"},
  {"old":"country","rule":"null","reason":"FoxAPIs does not return a location"},
  {"old":"country_full_name","rule":"null","reason":"FoxAPIs does not return a location"},
  {"old":"city","rule":"null","reason":"FoxAPIs does not return a location"},
  {"old":"state","rule":"null","reason":"FoxAPIs does not return a location"},
  {"old":"follower_count","rule":"null","reason":"FoxAPIs does not return follower counts"},
  {"old":"connections","rule":"null","reason":"no equivalent in FoxAPIs"},
  {"old":"people_also_viewed","rule":"null","reason":"FoxAPIs does not return a similar-people list"},
  {"old":"similarly_named_profiles","rule":"null","reason":"no equivalent in FoxAPIs (same-name people are listed under a different field inside the FoxAPIs profile)"},
  {"old":"background_cover_image_url","rule":"null","reason":"no equivalent in FoxAPIs"},
  {"old":"languages","rule":"null","reason":"no equivalent in FoxAPIs"},
  {"old":"industry","rule":"null","reason":"no equivalent in FoxAPIs"},
  {"old":"gender","rule":"null","reason":"no equivalent in FoxAPIs"},
  {"old":"birth_date","rule":"null","reason":"no equivalent in FoxAPIs"},
  {"old":"inferred_salary","rule":"null","reason":"no equivalent in FoxAPIs"},
  {"old":"personal_emails","rule":"null","reason":"FoxAPIs returns email candidates labelled by source, not personal emails; not mapped"},
  {"old":"personal_numbers","rule":"null","reason":"FoxAPIs phones are business numbers found with a source address; not mapped"},
  {"old":"articles","rule":"null","reason":"no equivalent in FoxAPIs"},
  {"old":"groups","rule":"null","reason":"no equivalent in FoxAPIs"},
  {"old":"extra","rule":"null","reason":"no equivalent in FoxAPIs"},
];
function toOldShape(p) {
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
}
const asResponse = (data, status = 200) => ({ ok: status < 400, status, data, json: async () => data, text: async () => JSON.stringify(data) });
export async function resurrectedPersonProfile({ name, company, domain, url } = {}) {
  if (!name) throw new Error("name is required by FoxAPIs: full name of the person (the old call only had a profile address)");
  const key = process.env.FOXAPIS_KEY;
  if (!key) throw new Error("Set FOXAPIS_KEY (free key: https://foxapis.com/trial)");
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const body = {};
  if (name) body.name = name;
  if (company) body.company = company;
  if (domain) body.domain = domain;
  if (url) body.linkedin_url = url;
  const res = await fetch("https://api.foxapis.com/v1/enrich_person", { method: "POST", headers, body: JSON.stringify(body) });
  if (res.status === 401 || res.status === 403) throw new Error("FoxAPIs rejected the key (status " + res.status + ")");
  if (!res.ok) throw new Error("FoxAPIs answered " + res.status);
  const data = await res.json();
  const p = data && data.profile;
  if (!p || typeof p !== "object") return null;
  return toOldShape(p);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv[2] ? JSON.parse(process.argv[2]) : {};
  console.log(JSON.stringify(await resurrectedPersonProfile(arg), null, 2));
}
