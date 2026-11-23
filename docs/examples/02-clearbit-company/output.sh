# RESURRECT: replaces the Clearbit Enrichment "Company enrichment (by domain)" call (moved into another product, no end date published). It now calls FoxAPIs POST /v1/get_company_snapshot.
# Needs FOXAPIS_KEY in the environment. A free key: https://foxapis.com/trial
# This call answers 202 with a job_id. Poll GET https://api.foxapis.com/v1/jobs/<job_id> with the same header until status is done.
curl -X POST https://api.foxapis.com/v1/get_company_snapshot \
  -H "Authorization: Bearer $FOXAPIS_KEY" \
  -H "Content-Type: application/json" \
  -d '{"domain":"TODO: company website domain"}'
