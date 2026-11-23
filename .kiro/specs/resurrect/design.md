# Design: Resurrect (scriptsold.com)

## Overview

Resurrect is a small website plus a few serverless routes. A visitor pastes old code. A rewrite engine (pure functions, no network) finds calls to dead APIs and returns code for FoxAPIs. A compat route lets old clients keep working by translating FoxAPIs responses into the old shape.

## Architecture options considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| A. Static site + Cloudflare Pages Functions (TypeScript), deterministic template engine | Free tier, one deploy, same repo, no servers, fast to build in about 7 days, easy to property-test (pure functions) | Request time limits for slow upstream calls | **CHOSEN** |
| B. Vercel (Next.js) | Familiar | The owner's Vercel is paid and busy; heavier framework; no gain | rejected |
| C. Railway/containers | No time limits | Costs money, more ops | rejected |
| D. AI rewrite of arbitrary code | Handles custom code | Needs a model call: cost, nondeterminism, hard to test, risk of invented endpoints | NOT in MVP |

### AI decision
The free path is 100 percent deterministic templates. No model is called. If a stretch task adds "custom code" help, it MUST call through a FoxAPIs gateway endpoint (we found no chat/completions route in the public catalog, so it stays out unless one is confirmed) and never use a direct provider key. Cost with no AI: zero.

## Components

```
Browser (static HTML/CSS/vanilla JS, no framework)
   |  POST /api/rewrite            -> functions/api/rewrite.ts
   |  GET  /api/registry           -> functions/api/registry.ts     (dead-API list, public JSON)
   |  ANY  /compat/proxycurl/...   -> functions/compat/[[path]].ts  (compat endpoint)
   v
src/lib (pure TypeScript, no I/O)
   registry.ts        dead-API registry (data + loader + validation)
   detect.ts          finds calls in pasted text
   redact.ts          strips secrets
   rewrite.ts         template rendering per language
   templates/         one file per (dead api, endpoint, language)
   mapping/           one file per dead API: endpoint map + field map
   compat/translate.ts   FoxAPIs response -> old shape
   compat/errors.ts      old error shapes
   limits.ts          rate limit (Cloudflare Rate Limiting binding or in-memory token bucket per isolate)
   catalog.snapshot.json  trimmed copy of the FoxAPIs catalog (path, method, credits, status)
fixtures/             recorded old-format and FoxAPIs responses (redacted)
```

### Hosting
- Cloudflare Pages project `scriptsold`, custom domain scriptsold.com (owner confirms DNS).
- Environment: no secrets needed on the server. The caller's FoxAPIs key arrives per request and is forwarded.
- Free-plan limits assumed: Pages Functions request limits and CPU time apply; the upstream `fetch` wait is not CPU time, but there is a wall-clock limit (verify on Day 2; see risk below).

## Mapping tables

FoxAPIs base URL: `https://api.foxapis.com`. Auth: `Authorization: Bearer <key>`. Endpoints below are present in the FoxAPIs catalog (153 endpoints, all status live on 2026-11-23) and listed in the public docs.

### Proxycurl (ended 2025-07-04)

Old auth: `Authorization: Bearer <proxycurl key>` against `https://nubela.co/proxycurl/api/...`.
Only `GET /proxycurl/api/v2/linkedin?url=` was confirmed from a documentation snippet. The other old paths below are from the 21-endpoint list on the Nubela guide (names read) and from memory for exact paths; **task T-2 verifies every old path and field against an archived copy of the Proxycurl docs before it is coded.**

| Old endpoint (name; path to verify) | FoxAPIs endpoint | Cost | Notes |
|---|---|---|---|
| Person Profile; GET /api/v2/linkedin?url= | POST /v1/enrich_person | 100 credits (light), 150 (deep) | FoxAPIs needs `name` (required). A bare LinkedIn url cannot be resolved. Compat route accepts extra params `name`, `company`, `domain` (extension, documented); without `name` returns 422. `linkedin_url` is passed through as a hint. |
| Work Email Lookup; GET /api/linkedin/profile/email | POST /v1/find_email | 100 credits on a match, 0 when none | FoxAPIs needs `website` (company domain) and optional `name`. Old call sends a LinkedIn profile url: same 422 rule if domain/name missing. |
| Person Lookup (name + company -> profile url); GET /api/linkedin/profile/resolve | POST /v1/enrich_person | 100 credits | Returns only `linkedin_url` and `similarity_score` equivalents if present; score is null (FoxAPIs has no similarity score). |
| Company Profile; GET /api/linkedin/company | POST /v1/get_company_snapshot (async: 202 then poll GET /v1/jobs/{job_id}) | by pricing page | Returns a due-diligence snapshot, NOT firmographic fields. Almost every old company field is null. Marked "partial: mostly null" in the UI. May be left out of the MVP compat set and rewrite-only. |
| Person Profile Picture | none (photo_url inside enrich_person when present) | | Rewrite maps to `profile.photo_url`; often empty -> null. |
| Reverse Work Email, Personal Email, Personal Number, Disposable Email Check | none | | Unmapped. (`phones` in enrich_person are public-source business numbers, not "personal numbers": do NOT map.) |
| Employee Search / Listing / Count, Company Lookup, Role Lookup, Job Profile / Listing / Count, School Profile, Student Listing, Reveal, Company Profile Picture | none | | Unmapped; tombstone with reason. (FoxAPIs has talent job-posting endpoints for Indeed/Monster/ZipRecruiter by URL, which are not the same call; not mapped.) |

Person profile field map (old key -> source in `profile` of FoxAPIs enrich_person response; keys seen in a real response captured by FoxAPIs on 2026-11-22):

| Old field | Source | Rule |
|---|---|---|
| full_name | profile.full_name | copy |
| first_name, last_name | derived | split on whitespace only if exactly 2 tokens, listed in `_resurrect.derived`; else null |
| public_identifier | profile.linkedin_url | last path segment if url matches linkedin.com/in/...; else null |
| profile_pic_url | profile.photo_url | copy, empty string -> null |
| occupation, headline | profile.title + profile.employer | `"<title> at <employer>"` only when both non-empty; derived; else null |
| summary | profile.summary | copy (FoxAPIs summary is a one-line text; may differ in style: noted) |
| experiences | profile.employment_history | map after the Day-2 fixture shows the real item shape; item fields not present become null |
| education | profile.education | same rule |
| country, city, state, country_full_name | none | null, "FoxAPIs does not return location" |
| follower_count, connections, people_also_viewed, similarly_named_profiles, articles, groups, accomplishment_*, languages, interests, inferred_salary, gender, birth_date, industry, background_cover_image_url, personal_emails, personal_numbers, extra | none | null each, with reason "no equivalent in FoxAPIs" |
| (extension) `_resurrect` | new | `{unfilled:[{field,reason}], derived:[...], sample:bool, credits_used, source:"foxapis"}` |

Work email field map: old `{email, status}`-like body -> FoxAPIs `email` plus `email_status` (verified, risky, invalid, guess). Old shape to be verified in T-2; any old field with no source is null.

### Clearbit (not all dead; see requirements table)
| Old | Status | FoxAPIs | Result |
|---|---|---|---|
| Logo API (logo.clearbit.com/<domain>) | ended 2025-12-08 | none (no logo endpoint in the catalog) | tombstone only; suggest "use a logo service of your choice"; no vendor names recommended in copy |
| Free tools (Connect, Visitor Report, TAM calculator) | ended 2025-04-30 | none | tombstone only |
| Paid Enrichment (person/company) | no published end date | enrich_person partial | NOT in MVP; no "dead" claim |

### Others
| Dead API | FoxAPIs equivalent | Result |
|---|---|---|
| Bing Search APIs (ended 2025-08-11) | none (no web search endpoint in catalog) | tombstone with Microsoft's own replacement note quoted as a link, no recommendation |
| Instagram Basic Display (ended 2024-12-04) | POST /v1/social/instagram/post exists but takes a public post url, not a user's media list | tombstone; note the partial overlap, do not map |
| Reverse Contact legacy persons routes (410 since 2026-10-13) | enrich_person / find_email (stretch) | stretch adapter; rewrite-only first |
| Reverse Contact Activities (ended 2026-07-01) | none | tombstone |
| DataForSEO Pinterest / Social Media API (ended 2026-09-16) | POST /v1/visual/pinterest/pin (one pin by url, 2 credits) covers only a single-pin lookup | tombstone; single-pin overlap noted |

## Data models

No database. Everything is a request or a static JSON file.

```ts
type DeadApi = {
  id: string;                    // "proxycurl"
  name: string;                  // "Proxycurl"
  status: "ended" | "scheduled";
  date: string;                  // ISO date of end
  source: { url: string; read_on: string; quote?: string };
  hosts: string[];               // ["nubela.co"]
  pathPatterns: string[];        // regex strings
  endpoints: DeadEndpoint[];
};
type DeadEndpoint = {
  id: string;                    // "person_profile"
  oldPath: string;
  method: "GET" | "POST";
  oldParams: string[];
  mapping: null | { foxapis: { path: string; method: "POST" | "GET"; credits: number | null };
                    paramMap: Record<string, string>; requiredExtra: string[];
                    fieldMap: FieldRule[] };
  noEquivalentReason?: string;
};
type FieldRule = { old: string; from?: string; rule: "copy"|"derived"|"null"; reason?: string };

// POST /api/rewrite
type RewriteRequest  = { code: string; language?: "auto"|"js"|"ts"|"py"|"php"|"rb"|"go"|"curl" };
type RewriteResponse = {
  language: string;
  matches: { api: string; endpoint: string; line: number; mapped: boolean; ended: string; source: string }[];
  code: string;                  // rewritten code
  changes: string[];
  unfilled: { field: string; reason: string }[];
  unmapped: { api: string; reason: string }[];
  redactions: number;
};
```

Compat route table: `/compat/proxycurl/api/v2/linkedin` and `/compat/proxycurl/api/linkedin/profile/email` (paths verified in T-2). Host in the rewritten curl: `https://scriptsold.com/compat/proxycurl/...`.

## Request flow: compat

1. Read `Authorization`. Missing -> old-style 401.
2. Validate old params against the endpoint's `oldParams`; derive FoxAPIs body via `paramMap`; check `requiredExtra` (name, domain) -> else 422 (no upstream call).
3. If `X-Resurrect-Sample: 1`: return fixture.
4. `fetch("https://api.foxapis.com/v1/...", {method:"POST", headers:{Authorization: caller key, "Content-Type":"application/json"}, body})` with an AbortSignal timeout.
5. Map status: 200 -> translate; empty -> 404 old shape; 401/403 -> 401; 402 (no credits, to verify) -> 402; 429 -> 429 with Retry-After; 5xx/timeout -> 502.
6. Translate with `fieldMap`; attach `_resurrect`; set headers; `Cache-Control: no-store`.

## Error handling
Old-style error bodies per dead API in `compat/errors.ts` (shape verified in T-2; unknown shapes use `{"detail": "..."}` plus the explanation field). Rewrite route: 400 (bad JSON), 413 (too large), 429, 500 (never include stack traces).

## Security
- No storage of pasted code or keys. No KV, D1 or R2 in the MVP.
- Redaction pass before detection (regex for `Bearer [A-Za-z0-9_-]{16,}`, `api[_-]?key\s*[:=]`, long hex/base64 strings next to key-like names). Never echo detected secrets back.
- Compat key pass-through only to `api.foxapis.com` (host allow-list; no user-supplied URLs are ever fetched: no SSRF).
- Rate limits per IP (requirements 6.3). Body size limit 100 KB.
- Headers: strict CSP (no inline script except hashed), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.
- Logs: no bodies, no headers.

## Accessibility
Semantic landmarks; label for the textarea; result region `aria-live="polite"`; animation off under `prefers-reduced-motion`; focus moves to the result heading; tombstone information also in text; contrast 4.5:1; buttons at least 44 px.

## Halloween UI (described, not built here)
- Dark graveyard theme: near-black background, fog gradient, one accent colour (ember orange); light theme variant "morning mist".
- Paste box styled as a coffin lid. A button "Resurrect".
- Each detected dead API becomes a tombstone card: name, "R.I.P. <date>", a one-line cause from the vendor's own notice, a source link.
- Animation (about 1.8 s): stone cracks (SVG paths stroke), a vertical light beam rises, the card flips from grey to colour, text "R.I.P." changes to "Resurrected" and the rewritten code slides in. Unmapped cards stay grey with a small "stays buried: no equivalent" stamp.
- Footer: disclaimer, link to repo, "Built with Kiro".
- No fox logo unless taken from the brand folder; no generated fox art.

## Testing strategy
- Unit tests (vitest) per requirement.
- Contract tests: compat output validated against JSON Schemas for the old shape, using recorded fixtures.
- Property-based tests (fast-check) for the properties below.
- One live smoke test per deploy with a real trial key (counts credits; flagged as test traffic).

## Correctness Properties

Each property links to requirements and becomes a fast-check test in `tests/properties/`.

**P1 Idempotent rewrite (R2.7).** For any input code, `rewrite(rewrite(code).code).code === rewrite(code).code`.

**P2 No secrets echoed (R2.5, R6.2).** For any input containing generated secret-looking tokens (random strings after `Bearer`, `api_key=`, `x-api-key:`), neither `rewrite(code).code`, `changes`, nor any response header or body contains the token.

**P3 Untouched when nothing matches (R1.3).** For any text with no registry host or path, `rewrite(text).code === text` and `matches` is empty.

**P4 Unmapped calls are never rewritten (R3.1, R3.2).** For any code containing only unmapped dead-API calls, every unmapped call line appears unchanged in the output, plus the marker comment, and the output contains no `api.foxapis.com` URL.

**P5 Every mapped target exists (R3.4).** For every mapping in the registry, `foxapis.path` and `method` exist in `catalog.snapshot.json` with status live. (Enumerated, not random.)

**P6 Every mapped source field exists in the response schema (R4.3, R4.5).** For every `fieldMap` rule with `from`, the dotted path exists in the recorded FoxAPIs response schema (fixtures); and for random FoxAPIs responses generated from that schema, `translate` never throws.

**P7 Old schema round trip (R4.3).** For any random FoxAPIs response generated from the schema (with optional fields randomly missing or empty), `translate(resp)` validates against the old-shape JSON Schema: all old keys present, correct types, absent data is `null` (never undefined or missing).

**P8 Null-with-reason completeness (R4.4).** For any translated response, the set of keys whose value is null because of a no-source rule equals the set listed in `_resurrect.unfilled`, and each has a non-empty reason.

**P9 No invention (R4.5).** For any response, every non-null old field is either a copy of a FoxAPIs value (equal by deep compare), or is listed in `_resurrect.derived`.

**P10 Detection is language-independent for the same call (R1.2).** For a call rendered in any supported language by the templates, `detect` finds the same dead-API id and endpoint id.

**P11 Rewrite never changes unrelated lines (R2.2).** For any code with unrelated lines inserted before and after a dead-API call, those lines are byte-identical in the output.

**P12 Registry integrity (R requirements intro).** Every registry entry has a non-empty source url that parses as https and a date that parses; no entry with status `ended` has a date in the future relative to build time; scheduled entries have a future date or are flagged.

Limits of the properties (Kiro docs note PBT is evidence, not proof): P6 and P7 depend on the recorded fixtures being real; Day-2 live capture supplies them.

## Open questions for the build
1. Exact Proxycurl old paths, parameters and error bodies (verify via an archived docs copy).
2. FoxAPIs real response items for `employment_history` and `education` (the public sample was empty).
3. Time limit of Pages Functions for slow research calls; fallback: compat returns 202 with `Retry-After` and a stable `request_id`, which the rewritten client code handles.
4. Whether `find_email` accepts a LinkedIn url (not in its request model: `website`, `name` only).
