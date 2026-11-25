# Structure

```
.kiro/specs/resurrect/   requirements.md, design.md, tasks.md
.kiro/steering/          product.md, tech.md, structure.md
.kiro/hooks/             JSON hooks (tests on save)
data/                    registry.json (each entry has a source link), catalog.snapshot.json, foxapis-links.json
src/                     engine: detect, redact, blocks, emit, fieldtable, registry, resurrect, cli
public/                  static site; public/engine/ is generated
functions/               not there yet: compat routes (tasks 13 to 15)
fixtures/                recorded FoxAPIs samples and dead-API inputs
tests/                   node --test; tests/properties/ for property-style tests
scripts/                 build, snapshot, checks, deploy
submission/              Devpost text, demo script, Kiro usage record
```

## Conventions
- File names kebab-case.
- A new dead API needs, in order: a registry entry with a source, a mapping or a reason there is none, fixtures, tests.
- Never add .kiro or any sub-folder to .gitignore.
- design.md describes the first plan; where it names TypeScript, vitest or fast-check, tech.md wins.
