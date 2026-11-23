# Structure

```
.kiro/
  specs/resurrect/        requirements.md, design.md, tasks.md
  steering/               product.md, tech.md, structure.md
  hooks/                  JSON hooks (tests on save, secret scan)
  settings/mcp.json       MCP servers used while building
  logs/                   saved Kiro run transcripts (committed as evidence)
public/                   static site (index.html, styles.css, app.js, assets)
functions/
  api/rewrite.ts          POST /api/rewrite
  api/registry.ts         GET /api/registry
  compat/[[path]].ts      /compat/<dead-api>/...
src/lib/                  pure logic: registry, detect, redact, rewrite, templates/, mapping/, compat/
data/registry.json        dead-API registry (each entry has a source url)
fixtures/                 recorded, redacted samples and JSON Schemas (old shapes, FoxAPIs responses)
tests/
  unit/                   example tests
  properties/             property-based tests named p01-...ts to p12-...ts, matching design.md
  contract/               compat output vs old-shape schemas
scripts/                  snapshot-catalog.ts and similar tools
KIRO-USAGE.md             write-up source for the hackathon
README.md  LICENSE
```

## Conventions
- File names kebab-case; types PascalCase; one exported concern per file.
- Each template file is named `<api>.<endpoint>.<language>.ts`.
- Property test files start with the property id from design.md (`p07-old-schema-round-trip.test.ts`) and contain a comment linking the requirement ids.
- A new dead API needs: a registry entry with source, a mapping file or a `noEquivalentReason`, fixtures, and tests, in that order.
- Never add `.kiro` or any sub-folder to `.gitignore`.
