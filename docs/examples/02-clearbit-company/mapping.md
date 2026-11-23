# Clearbit Enrichment: Company enrichment (by domain)

Status: Clearbit Enrichment moved into another product, no end date published. Source: https://clearbit.com/ (read 2026-11-22).

Target: FoxAPIs POST /v1/get_company_snapshot. credits per call: see https://foxapis.com/pricing (not in the catalog snapshot).
This call is asynchronous: it answers 202 with a job id, and the generated code polls GET /v1/jobs/{job_id} until the job is done.

Request: old parameter to new parameter

| Old | New | Note |
|---|---|---|
| domain | domain | copied |

Response: old field to FoxAPIs field

PARTIAL. get_company_snapshot answers with a written due-diligence snapshot (async: 202, then poll), not company fields. The generated code returns that snapshot unchanged. Almost no old field can be filled; the table says which.

| Old field | FoxAPIs field | Rule | Basis |
|---|---|---|---|
| name | none (null: not claimed: a similar field (subject_name) appears in a FoxAPIs company report sample, but no snapshot sample was captured to confirm it) | null | company report sample 2026-11-23 |
| domain | none (null: FoxAPIs does not return a domain field; use the one you sent) | null | no field in the sample |
| legalName | none (null: no equivalent field) | null | no field in the sample |
| description | none (null: the snapshot has written sections, not one description field) | null | sample 2026-11-23 |
| foundedYear | none (null: no equivalent field) | null | no field in the sample |
| category (sector, industry) | none (null: no equivalent field) | null | no field in the sample |
| metrics (employees, raised, revenue) | none (null: no equivalent field; figures appear only inside written sections) | null | sample 2026-11-23 |
| location, geo | none (null: no equivalent field) | null | no field in the sample |
| logo | none (null: no equivalent field) | null | no field in the sample |
| linkedin, twitter, facebook, crunchbase handles | none (null: no equivalent field on the company call) | null | no field in the sample |
| tech, tags | none (null: no equivalent field) | null | no field in the sample |

Caveat: Clearbit's field reference could not be read (FoxAPIs alternatives page, 2026-11-22), so the old field names above are as remembered and not verified.
