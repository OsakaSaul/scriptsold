# RESURRECT: replaces the Proxycurl "Person Profile" call (ended 2025-07-04). It now calls FoxAPIs POST /v1/enrich_person.
# Needs FOXAPIS_KEY in the environment. A free key: https://foxapis.com/trial
curl -X POST https://api.foxapis.com/v1/enrich_person \
  -H "Authorization: Bearer $FOXAPIS_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"TODO: full name of the person (the old call only had a profile address)"}'
