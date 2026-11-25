# Requirements: Resurrect (scriptsold.com)

Status 2026-11-25: requirements 1 to 3, 7 and 8 are largely built (not by Kiro) as a browser-only rewrite. There is no server rewrite route, so the HTTP 413 wording in 1.4 and the limits in 6.3 apply to the compat route when it is built. Requirement 4 (compat endpoint), 5.1 and 5.2 (sample mode) and parts of 6 and 7 are open. tasks.md says which.

Category: Kiroween 2026, Resurrection. Draft written 2026-11-23 as input for Kiro. Kiro may refine these; keep requirement ids stable.

## Introduction

Resurrect takes code that calls an API that has been shut down and brings it back to life in two ways:
(1) it rewrites the code so it calls FoxAPIs instead, and
(2) it offers a compatibility endpoint that accepts the OLD request shape and returns the OLD response shape filled from FoxAPIs data.

Where FoxAPIs has no matching endpoint, Resurrect says so plainly and does not fake a result.

### Dead APIs in scope (each needs a dated, cited shutdown notice)

| Id | Dead API | What ended | Date | Primary source |
|---|---|---|---|---|
| proxycurl | Proxycurl (LinkedIn data API by Nubela) | whole service shut down, after a LinkedIn lawsuit settled | 2025-07-04 | https://nubela.co/blog/goodbye-proxycurl/ (read 2026-11-23); LinkedIn statement https://news.linkedin.com/2025/LinkedInWinsLegalBattleToProtectMemberData (seen in search, not opened) |
| clearbit-logo | Clearbit Logo API (public logo URL) | public URL no longer available | 2025-12-08 (earlier notice said 2025-12-01) | https://clearbit.com/changelog/2025-10-22 and /2025-02-13 (read 2026-11-23, notice dated 2025-11-24) |
| clearbit-free | Clearbit free tools (free platform, Clearbit Connect, Weekly Visitor Report, TAM calculator) | discontinued | 2025-04-30 | https://clearbit.com/changelog/2025-02-13 (read) |
| bing-search | Bing Search APIs (Search and Custom Search) | retired | 2025-08-11 | https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement (read) |
| instagram-basic-display | Instagram Basic Display API | ended | 2024-12-04 | https://developers.facebook.com/blog/post/2024/09/04/update-on-instagram-basic-display-api (read, announced 2024-09-04) |
| reversecontact-legacy | Reverse Contact legacy person routes (/v2/resolve/persons/email, /v2/resolve/persons/name, /v2/search/persons) | return 410 Gone | 2026-10-13 | https://docs.reversecontact.com/guides/july-2026-platform-update (read) |
| reversecontact-activities | Reverse Contact Activities (posts, comments, reactions) | discontinued | 2026-07-01 | same page (read) |
| dataforseo-pinterest | DataForSEO Pinterest API and Social Media API suite | support ended | 2026-09-16 | https://dataforseo.com/update/ending-support-pinterest-and-social-media-ap%D1%96 (read; the real address ends with a Cyrillic i, copy it from the DataForSEO update list) |

Scheduled but NOT yet dead on 2026-11-23 (shown as "ending soon", never as "dead"):
- Lusha Person API v2 (GET /v2/person): Sunset header since 2026-05-18, live until 2026-11-30. Source https://docs.lusha.com/tutorials/person-api-v1-deprecation (read).
- Buffer legacy REST API: retiring 2027-02-01 (search result, https://buffer.com/resources/legacy-rest-api-retired/, not opened). No FoxAPIs mapping.

NOT claimed dead (no primary source): Clearbit paid Enrichment, Reveal, Prospector, Autocomplete. A third-party article says access became HubSpot-only; Clearbit published no end date that we found. Resurrect must NOT say these are shut down.

Implementation note: the registry is data (a JSON file with id, name, ended date, status, source url, source read date). A dead API enters the registry only with a source url. Status is one of `ended`, `scheduled`.

### Glossary
- Dead API: an API in the registry with status `ended`.
- Old shape: the request path, query/body params, auth header style and response JSON of the dead API.
- FoxAPIs: the replacement gateway at https://api.foxapis.com, authenticated with `Authorization: Bearer <key>`.
- Mapped call: an old call with a matching public FoxAPIs endpoint.
- Unmapped call: an old call with no matching public FoxAPIs endpoint.
- Rewrite engine: deterministic code that turns old calls into FoxAPIs calls.
- Compat endpoint: Resurrect's server route that speaks the old shape.

## Requirement 1: Detect dead-API calls in pasted code

**User story:** As a developer with old code, I want to paste it and see which dead APIs it calls, so that I know what to fix.

#### Acceptance criteria
1.1 WHEN a user submits text containing a URL or host that matches a registry entry THE SYSTEM SHALL list each matched dead API with its shutdown date and source link.
1.2 WHEN the pasted code is JavaScript, TypeScript, Python, PHP, Ruby, Go or a curl command THE SYSTEM SHALL detect calls by host and path pattern, not by language parsing alone.
1.3 WHEN the pasted text matches no registry entry THE SYSTEM SHALL say "no known dead API found" and return the original text unchanged.
1.4 WHEN the input is larger than 100 KB THE SYSTEM SHALL reject it with HTTP 413 and a plain message.
1.5 IF a matched API has status `scheduled` THEN THE SYSTEM SHALL label it "ending on <date>" and not "shut down".

## Requirement 2: Rewrite mapped calls to FoxAPIs

**User story:** As a developer, I want my old call replaced with working code for the matching FoxAPIs endpoint.

#### Acceptance criteria
2.1 WHEN a detected call has a mapped FoxAPIs endpoint THE SYSTEM SHALL return rewritten code that calls that endpoint with `Authorization: Bearer $FOXAPIS_KEY` read from an environment variable.
2.2 THE SYSTEM SHALL keep the user's variable names, indentation and language where the template allows.
2.3 THE SYSTEM SHALL return, next to the code, a "what changed" list naming each old param and the new param it became.
2.4 THE SYSTEM SHALL return a "fields you will not get" list for every old response field that FoxAPIs cannot fill.
2.5 THE SYSTEM SHALL never write an API key into rewritten code; it SHALL use a placeholder environment variable.
2.6 WHEN the rewrite needs a value the old call did not have (for example a person name) THE SYSTEM SHALL insert a clearly marked TODO placeholder and say why in the notes.
2.7 WHEN a rewritten file is submitted again THE SYSTEM SHALL return it unchanged (rewriting is idempotent).
2.8 THE SYSTEM SHALL work without any key or sign-in (free path).

## Requirement 3: Be honest about unmapped calls

**User story:** As a developer, I want the tool to tell me when nothing equivalent exists, so that I do not trust fake output.

#### Acceptance criteria
3.1 WHEN a detected call has no mapped FoxAPIs endpoint THE SYSTEM SHALL leave that call in the code unchanged, add a comment `// RESURRECT: no FoxAPIs equivalent` and show a tombstone card with the reason.
3.2 THE SYSTEM SHALL NOT invent an endpoint, parameter or field that is not in the mapping table.
3.3 THE SYSTEM SHALL list unmapped dead APIs separately from mapped ones in the result.
3.4 THE SYSTEM SHALL only map to an endpoint present in the bundled FoxAPIs catalog snapshot with status `live`.
3.5 WHEN the catalog snapshot is older than 30 days at build time THE BUILD SHALL print a warning.

## Requirement 4: Compatibility endpoint (old request in, old response out)

**User story:** As a developer who cannot edit the old code, I want to change only the host and keep everything working.

#### Acceptance criteria
4.1 WHEN a request arrives at a compat route that mirrors a dead API path THE SYSTEM SHALL accept the old query params, body and `Authorization: Bearer` header style.
4.2 THE SYSTEM SHALL treat the bearer value as the caller's FoxAPIs key, forward it to FoxAPIs and never store or log it.
4.3 WHEN FoxAPIs returns data THE SYSTEM SHALL return JSON whose keys and types match the old response schema.
4.4 WHEN FoxAPIs cannot supply an old field THE SYSTEM SHALL return that field as `null` and list it, with a reason, in a response header `X-Resurrect-Unfilled` and in a top-level `_resurrect` object.
4.5 THE SYSTEM SHALL never fill an old field with a guess; a derived value (for example first name from a two-word full name) SHALL be listed in `_resurrect.derived`.
4.6 WHEN the caller key is missing or rejected THE SYSTEM SHALL return the old API's error shape with status 401.
4.7 WHEN a required input that FoxAPIs needs is missing from the old request (for example name when only a LinkedIn URL was sent) THE SYSTEM SHALL return 422 with an old-style error body and an explanation, without calling FoxAPIs and without spending credits.
4.8 WHEN FoxAPIs times out or returns 5xx THE SYSTEM SHALL return 502 with a retry hint and not charge a second call.
4.9 WHEN FoxAPIs returns an empty result THE SYSTEM SHALL return the old not-found shape (404) rather than an object of nulls.
4.10 Each compat response SHALL carry the header `X-Resurrect-Source: foxapis` and the body field `_resurrect.credits_used` when FoxAPIs reports it.
4.11 THE SYSTEM SHALL ship compat routes only for dead APIs with a written mapping in design.md (initially Proxycurl person profile and work email lookup).

## Requirement 5: Sample mode for judges and first-time visitors

**User story:** As a visitor with no key, I want to see a compat response without paying.

#### Acceptance criteria
5.1 WHEN a request carries the header `X-Resurrect-Sample: 1` THE SYSTEM SHALL answer from a recorded fixture and label the body `_resurrect.sample: true`.
5.2 THE SYSTEM SHALL never present a sample as live data.
5.3 THE UI SHALL link to https://foxapis.com/trial for a free key and say how many real calls the welcome credits cover, using the per-call credits from the catalog.

## Requirement 6: Input handling and privacy

#### Acceptance criteria
6.1 THE SYSTEM SHALL process pasted code in memory for the request only; it SHALL NOT write pasted code to disk, a database, KV, logs or analytics.
6.2 THE SYSTEM SHALL strip anything that looks like a secret (long tokens, `Bearer xxx`, `api_key=`) from pasted code before processing, replace it with `<redacted>` and tell the user.
6.3 THE SYSTEM SHALL rate-limit by IP to 30 rewrite requests and 60 compat requests per 10 minutes and answer 429 with `Retry-After`.
6.4 THE SYSTEM SHALL set `Cache-Control: no-store` on all dynamic responses.
6.5 THE SYSTEM SHALL log only: route, status, duration, dead-api id. No request bodies.

## Requirement 7: Halloween interface

**User story:** As a judge, I want a memorable spooky interface that is still easy to use.

#### Acceptance criteria
7.1 WHEN a dead API is detected THE UI SHALL show a tombstone card with the API name, the shutdown date and a link to the source.
7.2 WHEN the rewrite finishes THE UI SHALL play a short "rest in peace to resurrected" animation: the tombstone cracks, light rises, the card text changes from "R.I.P." to "Resurrected".
7.3 WHEN the user has `prefers-reduced-motion` set THE UI SHALL skip the animation and show the end state.
7.4 THE UI SHALL be fully usable by keyboard and screen reader (labels, focus order, live region announcing "Resurrected").
7.5 THE UI SHALL meet WCAG 2.1 AA colour contrast in dark and light themes.
7.6 THE UI SHALL work from 360 px wide with no horizontal scroll.
7.7 THE UI SHALL contain a one-line disclaimer on every page: "Not affiliated with, endorsed by or sponsored by the services named here. Names are used only to say which service your code calls."

## Requirement 8: Copy rules (honest claims)

#### Acceptance criteria
8.1 THE UI SHALL NOT name any model or data vendor behind FoxAPIs.
8.2 THE UI SHALL NOT show performance figures (speed, accuracy, uptime). Counts shown SHALL come from the catalog snapshot (for example "153 endpoints in the catalog").
8.3 THE UI SHALL state each shutdown as a dated fact with a link, and SHALL NOT characterise why a company shut down beyond what its own notice says.
8.4 THE UI SHALL say the compat endpoint returns "the old shape, filled from FoxAPIs data" and list unfilled fields; it SHALL NOT say "identical" or "same data".
8.5 THE UI SHALL NOT claim data is from LinkedIn; it SHALL say "public sources".

## Requirement 9: Repository and Kiro evidence (hackathon)

#### Acceptance criteria
9.1 THE REPOSITORY SHALL contain `.kiro/specs/resurrect/{requirements,design,tasks}.md`, `.kiro/steering/{product,tech,structure}.md`, at least one file in `.kiro/hooks/` and `.kiro/settings/mcp.json`.
9.2 THE REPOSITORY SHALL NOT list `.kiro` or any sub-folder in `.gitignore`.
9.3 THE REPOSITORY SHALL include an OSI licence file (MIT) and a README with run steps.
9.4 THE REPOSITORY SHALL include property-based tests mapped to the numbered correctness properties in design.md.

## Out of scope
Scraping any site; storing user code; accounts, payments, dashboards; AI code rewriting (see design.md option notes); compat routes beyond the mapped ones; any claim that a dead service is coming back.
