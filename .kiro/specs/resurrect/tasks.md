# Implementation Plan: Resurrect

State on 2026-11-25. Ticked tasks were built BEFORE Kiro was used here, by another AI coding agent (see submission/kiro-usage.md). They are ticked so Kiro does not rebuild them. Unticked tasks are the remaining work, for Kiro. Each is sized for one Kiro run. Read .kiro/steering/tech.md first: plain JavaScript, node --test, no runtime dependencies.

## Done (not by Kiro)

- [x] 1. Project layout, MIT licence, README, .kiro tracked
  - _Requirements: 9.2, 9.3_
- [x] 2. Dead-API registry (22 entries, dated sources) and catalog snapshot with integrity checks (P5, P12)
  - _Requirements: 1.1, 1.5, 3.4, 3.5, 8.3_
- [x] 3. Recorded FoxAPIs sample responses used by the tests
  - _Requirements: 5.1_
- [x] 4. Secret redaction and dead-call detection (P2, P3, P10)
  - _Requirements: 1.2, 1.3, 2.5, 6.2_
- [x] 5. Rewrite engine: in-place replacement for JavaScript, TypeScript, Python and curl, standalone code, unmapped marker (P1, P4, P11)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 3.1, 3.2, 3.3_
- [x] 6. Field translation generated into replacement code, with tests (P6 to P9)
  - _Requirements: 4.3, 4.4, 4.5_
- [x] 7. Static page: paste box, tombstone cards, resurrection animation with reduced motion, disclaimer, content security policy; examples page
  - _Requirements: 1.1, 2.8, 7.1, 7.2, 7.3, 7.7, 8.1, 8.2, 8.4, 8.5_
- [x] 8. Command line tool (src/cli.js) and three worked examples in docs/examples
- [x] 9. Deploy script, npm run deploy and wrangler.toml (not deployed yet)

## Remaining (Kiro does these, one per run, in order)

- [ ] 10. Kiro setup: add .kiro/settings/mcp.json with one MCP server that is really used while building, and a second hook in .kiro/hooks/ that checks saved files for secret-looking strings
  - _Requirements: 9.1_
- [ ] 11. Graveyard page: public/graveyard.html built by scripts/build-site.mjs from data/registry.json, one tombstone per entry with status word (ended, scheduled, moved), date and source link, linked from the home page; add a test that the page lists every registry entry
  - _Requirements: 1.1, 1.5, 7.1, 7.7, 8.3_
- [ ] 12. Pure translate module src/compat/translate.js for the Proxycurl person profile, driven by the registry field map: absent values null, `_resurrect.unfilled` with reasons, `_resurrect.derived`; property tests P6 to P9 against this module
  - _Requirements: 4.3, 4.4, 4.5, 4.10_
- [ ] 13. Compat route functions/compat/[[path]].js, sample mode only: header X-Resurrect-Sample: 1 answers from the recorded fixture, labelled sample; Cache-Control no-store; no network call; tests call the handler directly
  - _Requirements: 4.1, 4.10, 5.1, 5.2, 6.4, 6.5_
- [ ] 14. Compat route live path: forward the caller's bearer key to https://api.foxapis.com only; 401, 422 (without calling), 404 and 502 in the old error shape; never log headers or bodies; tests use a fake fetch, no real calls
  - _Requirements: 4.2, 4.6, 4.7, 4.8, 4.9, 6.1_
- [ ] 15. Compat route limits: request size limit 100 KB (413) and a simple per-IP rate limit (429 with Retry-After); say in the README that an in-memory limit is per server instance
  - _Requirements: 1.4, 6.3_
- [ ] 16. Home page section "Keep your old code": how to try the compat route in sample mode, what comes back null and why; the copy tests still pass
  - _Requirements: 4.4, 8.1, 8.2, 8.4_
- [ ] 17. Detection of a URL built from string pieces held in variables in the same file (JavaScript and Python), with tests; never report a match when unsure
  - _Requirements: 1.2, 1.3_
- [ ] 18. Accessibility pass on all pages: keyboard order, live region, contrast in dark and light, 360 px width; write down what was checked by hand
  - _Requirements: 7.4, 7.5, 7.6_
- [ ] 19. Script scripts/check-links.mjs that requests every registry source link and reports status; run it, and fix or flag dead links with the read date
  - _Requirements: 8.3_
- [ ] 20. Kiro evidence: update submission/kiro-usage.md and the Kiro section of submission/devpost.md to say exactly what Kiro wrote (tasks, commits, hooks seen firing, MCP used); update tests/submission.test.js only where the old sentences are no longer true
  - _Requirements: 9.1, 9.4_
