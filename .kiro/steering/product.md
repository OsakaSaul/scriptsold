# Product: Resurrect (scriptsold.com)

Resurrect is a free web tool for developers whose code calls an API that has been shut down. They paste the code. The tool shows which dead APIs it found (with dated, linked shutdown notices), rewrites the calls to FoxAPIs where an equivalent exists, and offers a compatibility endpoint that accepts the old request and returns the old response shape filled from FoxAPIs data.

Hackathon: Kiroween 2026, category Resurrection. Everything is new work started after 2026-10-30.

## Rules every change must respect
- Honest first: if FoxAPIs has no equivalent endpoint, say so and leave the code alone. Never invent an endpoint, parameter or field.
- Every dead API needs a dated source link. No source, no entry. Never call something shut down unless its own vendor notice says so.
- Names of dead services appear only to say which service the code calls. Every page carries the disclaimer: "Not affiliated with, endorsed by or sponsored by the services named here."
- No model or data vendor names in user-facing copy. No performance figures. Counts come from the catalog snapshot.
- Never claim data comes from LinkedIn. Say "public sources".
- Pasted code and API keys are never stored or logged.
- Free to use. The key-free path (rewrite, sample responses) must always work.

## Users
Developers and non-developer founders with an old script that stopped working.

## Tone
Plain words, a little spooky (tombstone, rest in peace, resurrected), never jokes about real people or companies.
