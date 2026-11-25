# Tech

## Stack (as built; do not replace it)
- Plain JavaScript, ES modules, Node 22 (package.json allows 20 or later). No TypeScript, no runtime dependencies.
- Tests: node --test. Property-style tests live in tests/properties/ and use the seeded generator in tests/properties/gen.js.
- Engine in src/ is pure functions. scripts/build-site.mjs copies it into public/engine/, so never edit public/engine/ by hand.
- Hosting: Cloudflare Pages. Static site in public/. Compat routes, when added, are Pages Functions in functions/ (JavaScript).
- No database, KV or R2. No AI or model calls in the app.

## Rules
- The only network call the app may make is from the compat route to https://api.foxapis.com. Never fetch a user-supplied address. The paste box makes no network request.
- The caller's FoxAPIs key is forwarded and forgotten. Never log headers or bodies.
- Never commit keys. Tests make no real FoxAPIs calls.
- Every dynamic response sets Cache-Control: no-store.
- Accessibility: WCAG 2.1 AA, reduced motion respected.

## Commands
- npm test (all tests), npm run test:props (property tests only)
- npm run build (copies the engine, builds pages and examples, checks the catalog snapshot)
- npm run deploy (tests, build, deploy to Cloudflare Pages; needs a one-time wrangler login by the owner)

## Reference facts
- FoxAPIs base https://api.foxapis.com, auth Authorization: Bearer followed by the key. Free key: https://foxapis.com/trial.
- Endpoint paths, status and credits come from data/catalog.snapshot.json, not from memory.
