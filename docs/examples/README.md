# Worked examples

Each folder holds the input, the generated JavaScript and Python output files, and the field-mapping table. Run `npm run build` to regenerate them; the tests check that the committed files match the engine.

Where an example maps to a FoxAPIs endpoint, `output.js`, `output.py` and `output.sh` are standalone replacements, and `output.in-place.*` is your own file with the old call spliced out. Where nothing maps, `output.js` and `output.py` are your code unchanged, plus the marker comment.

## Proxycurl person profile (Python)

A script that loads a person profile from a profile address. The service is gone. The engine finds the call, replaces it with a FoxAPIs person-enrichment call that returns the old field names, and says which fields it cannot fill.

- docs/examples/01-proxycurl-person-profile/input.py
- docs/examples/01-proxycurl-person-profile/mapping.md
- docs/examples/01-proxycurl-person-profile/output.in-place.py
- docs/examples/01-proxycurl-person-profile/output.js
- docs/examples/01-proxycurl-person-profile/output.py
- docs/examples/01-proxycurl-person-profile/output.sh

## Clearbit company enrichment (JavaScript)

A Node function that enriches a company from its domain. Clearbit has moved into another product and published no end date, so the engine labels it moved, not shut down. The closest FoxAPIs call returns a written snapshot, not company fields, so the mapping is marked partial and almost every old field is listed as not filled.

- docs/examples/02-clearbit-company/input.js
- docs/examples/02-clearbit-company/mapping.md
- docs/examples/02-clearbit-company/output.in-place.js
- docs/examples/02-clearbit-company/output.js
- docs/examples/02-clearbit-company/output.py
- docs/examples/02-clearbit-company/output.sh

## Bing Search API (JavaScript and Python)

Web search through the Bing Search API, retired 2025-08-11. FoxAPIs has no web search endpoint, so the engine says so, leaves the code alone and adds a marker comment. This is the honest case: nothing is invented.

- docs/examples/03-bing-search/input.js
- docs/examples/03-bing-search/input.py
- docs/examples/03-bing-search/mapping.md
- docs/examples/03-bing-search/output.js
- docs/examples/03-bing-search/output.py
