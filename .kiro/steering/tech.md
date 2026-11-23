# Tech

## Stack
- TypeScript (strict), Node 20 for tooling.
- Hosting: Cloudflare Pages with Pages Functions. Static front end in `public/` (vanilla HTML, CSS, JS; no framework, no build step for the UI beyond TypeScript compile).
- Tests: vitest for unit and contract tests; fast-check for property-based tests.
- Lint/format: ESLint + Prettier.
- No database, no KV, no R2 in the MVP.

## Rules
- Core logic (`src/lib`) is pure functions with no network or file access, so it can be property-tested.
- The only network call in the whole app is `fetch` to `https://api.foxapis.com` from the compat route. Host allow-list; never fetch a user-supplied URL.
- The caller's FoxAPIs key is read from the `Authorization` header, forwarded and forgotten. Never log headers or bodies.
- No AI/model calls in the MVP. If ever added, they must go through a FoxAPIs endpoint, never a direct provider key.
- Secrets: none are needed in the repo. Never commit keys; tests read `FOXAPIS_KEY` from the environment and skip when absent.
- Dependencies: keep to a minimum (vitest, fast-check, typescript, eslint, prettier, ajv for JSON Schema). Every dependency needs an OSI-approved licence.
- Every dynamic response sets `Cache-Control: no-store`.
- Accessibility: WCAG 2.1 AA, reduced-motion respected.

## Commands (create these npm scripts)
- `npm test` runs all tests including properties.
- `npm run test:props` runs `tests/properties` only.
- `npm run snapshot:catalog -- <path to catalog.json>` refreshes the catalog snapshot.
- `npm run dev` runs `wrangler pages dev`.

## Reference facts
- FoxAPIs base `https://api.foxapis.com`; auth `Authorization: Bearer <key>`; free trial key at https://foxapis.com/trial.
- Endpoints used: POST /v1/enrich_person (100 credits light), POST /v1/find_email (100 on a match, 0 otherwise), POST /v1/get_company_snapshot (async, poll GET /v1/jobs/{job_id}).

## Decision 2026-11-23 (first engine commit)
The core engine is plain JavaScript (ES modules, Node 20, zero runtime dependencies) and is tested with `node --test`, including seeded property-style tests in `tests/properties/`. This replaces the TypeScript, vitest and fast-check proposal above for the engine; the static page in `public/` runs the same modules in the browser. Pages Functions routes stay optional and are not part of this commit.
