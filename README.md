# Resurrect (scriptsold)

Paste code that calls an API that has been shut down. Resurrect finds the call, says when it ended with a link to the vendor's own notice, and writes the replacement for the matching FoxAPIs endpoint, in JavaScript and Python, with a field-mapping table. Where FoxAPIs has no matching endpoint, it says so, leaves your code alone and adds a marker comment. It never invents an endpoint, a parameter or a field.

Kiroween 2026, category Resurrection. License: MIT. Not affiliated with, endorsed by or sponsored by the services named here; names are used only to say which service your code calls.

## What it does

1. Input: a dead or deprecated API call (a curl command, or JavaScript, TypeScript or Python code).
2. Detection: matches the host, the path, the auth header style and SDK imports against a registry of dated, sourced shutdown notices (data/registry.json). A shared host is not enough: the live NinjaPear paths on the same host as Proxycurl are not flagged.
3. Mapping: maps a call to a FoxAPIs endpoint only if that endpoint is in the catalog snapshot (data/catalog.snapshot.json, copied from the FoxAPIs catalog) with status live.
4. Output: your file with the old call replaced (variable names kept, surrounding lines untouched), standalone JavaScript, Python and curl replacements, a list of what changed, and the field-mapping table. Fields FoxAPIs cannot fill come back as null with a reason.

Status words are exact: ended (the vendor's notice says it ended), scheduled (still live, end date announced) and moved (no end date published; never called shut down).

## Providers in the registry

Ended: Proxycurl, Clearbit Logo API, Bing Search APIs, Instagram Basic Display API, Reverse Contact legacy person routes and Activities, DataForSEO Pinterest and Social Media APIs. Scheduled: Lusha Person API v2. Moved: Clearbit Enrichment.

Mapped to FoxAPIs: Proxycurl person profile, work email and person lookup; Clearbit company and person enrichment (company is marked partial); Lusha person v2 (request side only). Everything else in the registry is reported honestly as having no equivalent.

## Run it

Needs Node 20 or later. No dependencies.

```
npm test
node src/cli.js docs/examples/01-proxycurl-person-profile/input.py
npm run build
```

`npm run build` copies the engine into public/ (a static site, open public/index.html through any static server), regenerates docs/examples and prints a warning if the catalog snapshot is older than 30 days. The paste box runs the engine in the browser; nothing is sent anywhere.

Replacement code needs a FoxAPIs key in the environment variable FOXAPIS_KEY. A free key: https://foxapis.com/trial. Keys are never written into generated code.

## Layout

```
.kiro/                  specs, steering and hooks (kept in the repo on purpose)
data/registry.json      dead-API registry: sources, dates, mappings, field maps
data/catalog.snapshot.json
src/                    detect, redact, blocks, emit, fieldtable, resurrect (pure ES modules)
public/                 static site (index.html, examples.html, engine copy)
docs/examples/          three worked examples with outputs and mapping tables
fixtures/foxapis/       recorded real FoxAPIs responses used by the tests
tests/                  node --test, including property-style tests in tests/properties
scripts/                snapshot-catalog, build-site, build-examples, check-snapshot
```

## Honest limits

- Old response field lists for some providers could not be re-read (Nubela's Person Profile reference is gone and Clearbit's is behind a login). Those tables say so; claims rest on the FoxAPIs sample responses captured 2026-11-22 and on FoxAPIs's own comparison pages.
- Experiences and education items are passed through as FoxAPIs items, not reshaped to the old item layout, because the recorded sample has none.
- The Person Profile call costs 100 credits, so it was checked against a recorded real response, not live. The work-email call was run live (no match, 0 credits) through both generated files.
- Only calls whose whole statement can be found are replaced in place (JavaScript, TypeScript, Python, curl). Other languages get the snippets and a note.
- Detection reads URLs, so a URL built from pieces in several variables may be missed.

## How it was built

The specs, steering and hook in .kiro/ are the Kiro inputs for the hackathon build. This first engine commit was written by an AI coding agent working from those specs, not by Kiro, and uses plain JavaScript with node --test instead of the TypeScript stack the steering file proposed. Later Kiro work is committed separately.
