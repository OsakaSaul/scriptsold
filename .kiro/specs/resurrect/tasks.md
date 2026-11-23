# Implementation Plan: Resurrect

Format note: checkbox list in the style Kiro generates (numbered tasks, sub-tasks, `_Requirements:` lines, optional test tasks marked with `*`). The Kiro docs page did not print this format, so Kiro may re-format it on its first pass; keep the ids.

- [ ] 1. Project scaffold
  - [ ] 1.1 Create a TypeScript project for Cloudflare Pages with Functions (`functions/`, `public/`, `src/lib/`, `tests/`, `fixtures/`), vitest, fast-check, ESLint
    - _Requirements: 9.3_
  - [ ] 1.2 Add MIT LICENSE, README with run steps, `.gitignore` that does NOT list `.kiro`
    - _Requirements: 9.2, 9.3_
  - [ ] 1.3 Add the hook files in `.kiro/hooks/` and `.kiro/settings/mcp.json` (if not present)
    - _Requirements: 9.1_

- [ ] 2. Registry and catalog snapshot
  - [ ] 2.1 Create `src/lib/registry.ts` and `data/registry.json` from the table in requirements.md (ids, dates, status, source url, read date)
    - _Requirements: 1.1, 1.5, 8.3_
  - [ ] 2.2 Create `scripts/snapshot-catalog.ts` that copies path, method, credits and status from a local FoxAPIs `catalog.json` into `src/lib/catalog.snapshot.json` (input path is an argument; no network)
    - _Requirements: 3.4, 3.5_
  - [ ] 2.3 Write registry integrity checks
    - _Requirements: 3.4_
  - [ ]* 2.4 Property test P12 (registry integrity) and P5 (mapped targets exist in the catalog)
    - _Requirements: 3.4_

- [ ] 3. Verify Proxycurl facts (input work, before coding templates)
  - [ ] 3.1 Record the old paths, parameters, response keys and error bodies from an archived Proxycurl docs copy into `fixtures/proxycurl/` as JSON Schemas plus 2 redacted sample responses
    - _Requirements: 4.3, 4.11_
  - [ ] 3.2 Record real FoxAPIs responses for `/v1/enrich_person` and `/v1/find_email` using the trial key from an environment variable (about 2 calls); redact personal data; save as fixtures and as schemas
    - _Requirements: 4.3, 5.1_

- [ ] 4. Redaction and detection
  - [ ] 4.1 Implement `redact.ts`
    - _Requirements: 6.2, 2.5_
  - [ ]* 4.2 Property test P2 (no secrets echoed)
    - _Requirements: 2.5, 6.2_
  - [ ] 4.3 Implement `detect.ts` for js, ts, py, php, rb, go and curl by host and path pattern, returning api id, endpoint id, line and params
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ]* 4.4 Property tests P3 and P10
    - _Requirements: 1.2, 1.3_

- [ ] 5. Rewrite engine
  - [ ] 5.1 Implement templates for Proxycurl person profile and work email in curl, js, ts, py (php, rb, go as simple generic HTTP templates)
    - _Requirements: 2.1, 2.2, 2.6_
  - [ ] 5.2 Implement `rewrite.ts`: replace the call span only, keep surrounding text, add TODO placeholders for required extra inputs, build `changes` and `unfilled` lists
    - _Requirements: 2.2, 2.3, 2.4, 2.6_
  - [ ]* 5.3 Property tests P1 (idempotent) and P11 (unrelated lines untouched)
    - _Requirements: 2.2, 2.7_
  - [ ] 5.4 Implement the unmapped path: leave call, add marker comment, return tombstone data with reason
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ]* 5.5 Property test P4 (unmapped never rewritten)
    - _Requirements: 3.1, 3.2_
  - [ ] 5.6 Add entries for the tombstone-only APIs (Clearbit Logo, Clearbit free tools, Bing Search, Instagram Basic Display, DataForSEO Pinterest, Reverse Contact Activities)
    - _Requirements: 3.1, 3.3_

- [ ] 6. Rewrite route
  - [ ] 6.1 Implement `functions/api/rewrite.ts` with size limit (413), JSON validation, no-store header, no body logging
    - _Requirements: 1.4, 2.8, 6.1, 6.4, 6.5_
  - [ ] 6.2 Implement `functions/api/registry.ts` (public JSON of the registry)
    - _Requirements: 1.1_
  - [ ] 6.3 Rate limiting for both routes
    - _Requirements: 6.3_
  - [ ]* 6.4 Example tests for 400, 413, 429
    - _Requirements: 1.4, 6.3_

- [ ] 7. Compatibility endpoint
  - [ ] 7.1 Implement `compat/translate.ts` from the field map for the Proxycurl person profile; derived-value rules; `_resurrect` object and `X-Resurrect-Unfilled` header
    - _Requirements: 4.3, 4.4, 4.5, 4.10_
  - [ ] 7.2 Implement work-email translation
    - _Requirements: 4.3, 4.4_
  - [ ] 7.3 Implement `functions/compat/[[path]].ts`: auth pass-through, param validation, 422 for missing required extras, host allow-list, timeout, status mapping (401, 404, 429, 502), sample mode
    - _Requirements: 4.1, 4.2, 4.6, 4.7, 4.8, 4.9, 5.1, 5.2_
  - [ ]* 7.4 Property tests P6, P7, P8, P9
    - _Requirements: 4.3, 4.4, 4.5_
  - [ ]* 7.5 Contract tests against the recorded old-shape schemas and fixtures
    - _Requirements: 4.3_
  - [ ] 7.6 Handle slow upstream: if the time limit is hit, return 202 or 502 with Retry-After as decided in design open question 3
    - _Requirements: 4.8_

- [ ] 8. User interface
  - [ ] 8.1 Build the static page: paste box, language auto-detect, Resurrect button, result area (matches, code with copy button, changes, fields you will not get, unmapped list)
    - _Requirements: 1.1, 2.3, 2.4, 3.3_
  - [ ] 8.2 Tombstone cards with dates and source links; "ending soon" style for scheduled entries
    - _Requirements: 7.1, 1.5_
  - [ ] 8.3 Resurrection animation (SVG crack, rising light, text flip) with reduced-motion fallback
    - _Requirements: 7.2, 7.3_
  - [ ] 8.4 Accessibility pass: labels, live region, focus management, keyboard, contrast in dark and light themes, 360 px layout
    - _Requirements: 7.4, 7.5, 7.6_
  - [ ] 8.5 Free-key box linking https://foxapis.com/trial with the calls-per-welcome-credit line computed from the catalog snapshot
    - _Requirements: 5.3, 8.2_
  - [ ] 8.6 Disclaimer on every page; copy check against the honest-claims rules
    - _Requirements: 7.7, 8.1, 8.2, 8.3, 8.4, 8.5_
  - [ ]* 8.7 Automated accessibility test (axe) and a copy-lint test that fails on vendor names, performance words ("fast", "accurate", "%"), "identical", "same data"
    - _Requirements: 7.5, 8.1, 8.2, 8.4_

- [ ] 9. Security and headers
  - [ ] 9.1 Add `_headers` with CSP, nosniff, referrer policy; check no inline script without hash
    - _Requirements: 6.4_
  - [ ] 9.2 Add a test that no request body or key appears in any log output
    - _Requirements: 6.1, 6.5, 4.2_

- [ ] 10. Deploy and live checks
  - [ ] 10.1 Deploy a Cloudflare Pages preview; run the live smoke test with the trial key (one profile call, one email call); confirm nulls and reasons look right
    - _Requirements: 4.3, 4.4_
  - [ ] 10.2 Attach the custom domain scriptsold.com (owner supplies DNS access) or keep the pages.dev address
    - _Requirements: 5.3_
  - [ ] 10.3 Re-check every source link in the registry returns 200 and update read dates
    - _Requirements: 8.3_

- [ ] 11. Kiro evidence and write-up
  - [ ] 11.1 Create `KIRO-USAGE.md` with sections from the plan (specs, steering, hooks, MCP, property tests, powers if used) and a table mapping each property P1 to P12 to its test file
    - _Requirements: 9.1, 9.4_
  - [ ] 11.2 Confirm `.kiro` is tracked: `git check-ignore -v .kiro/specs/resurrect/tasks.md` prints nothing
    - _Requirements: 9.2_

- [ ] 12. Stretch (only if everything above is green)
  - [ ] 12.1 Reverse Contact legacy `resolve/persons/email|name` rewrite-only mapping to find_email / enrich_person after verifying their old shapes from archived docs
    - _Requirements: 2.1, 3.3_
  - [ ] 12.2 Lusha Person v2 "ending soon" entry with a rewrite to enrich_person
    - _Requirements: 1.5, 2.1_
