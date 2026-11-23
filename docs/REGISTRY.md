# Registry, second batch (read 2026-11-23)

Entries: 9 before, 22 after. Mapped endpoints: 6 before, 10 after; endpoints with no FoxAPIs equivalent: 20 before, 29 after. Every mapped endpoint is in data/catalog.snapshot.json (153 endpoints, regenerated from the FoxAPIs catalog on 2026-11-23; no change from the earlier snapshot). A moved entry means the vendor published a deprecation or access change but no shutdown, so it has no end date; the effective date is shown instead.

| Entry | Status | Date | Source (read 2026-11-23) | Mapped endpoint |
|---|---|---|---|---|
| Google Custom Search JSON API | scheduled | 2027-01-01 | https://developers.google.com/custom-search/v1/overview | none (no equivalent) |
| Google+ API | ended | 2019-03-07 | https://developers.google.com/+/api-shutdown | none (no equivalent) |
| X API v1.1 search endpoints | moved | effective 2023-09-28 | https://docs.x.com/changelog | none (no equivalent) |
| X API v1.1 statuses/filter stream | moved | effective 2023-03-14 | https://docs.x.com/changelog | none (no equivalent) |
| X API v1.1 legacy Direct Message endpoints | ended | 2018-09-17 | https://docs.x.com/changelog | none (no equivalent) |
| X API v1.1 help/configuration | ended | 2021-06-18 | https://docs.x.com/changelog | none (no equivalent) |
| Instagram API Platform (legacy, api.instagram.com/v1) | ended | 2020-06-29 | https://developers.facebook.com/blog/post/2020/03/10/final-reminder-Instagram-legacy-api-platform-disabled-mar-31/ | none (no equivalent) |
| Crunchbase API v3.1 | ended | 2021-01-29 | https://data.crunchbase.com/docs/api-release-history | POST /v1/get_company_snapshot (partial, no field table) |
| Yahoo BOSS Search API | ended | 2016-03-31 | https://thenextweb.com/news/yahoo-killing-off-products-sidelining-search-access-developers | none (no equivalent) |
| Alexa Web Information Service and Top Sites APIs | ended | 2022-12-15 | https://www.securityweek.com/impact-alexa-ranking-service-shutdown-cybersecurity-industry | POST /v1/brand/similarweb/domain (partial, no field table) |
| FullContact v2 Company API | ended | 2022-06-30 | https://docs.fullcontact.com/docs/v2-company-domain-lookup-migration | POST /v1/get_company_snapshot (partial, no field table) |
| LinkedIn open APIs (v1 people and companies) | moved | effective 2015-05-12 | https://www.computerworld.com/article/1637984/linkedin-restricts-api-usage.html | POST /v1/enrich_person (partial, no field table) |
| Pinterest API v3 and v4 | moved | effective 2023-07 | https://community.pinterest.biz/t/pinterest-api-migration-required-by-june-2023/1374 | none (no equivalent) |

Not added, no dated vendor or news source could be read: Hunter v1 (no deprecation notice found), Indeed Publisher API, Glassdoor API, Product Hunt API v1, Pipl, Rapportive API, Mattermark API and Klout API (the closures were reported, but nothing about the API itself), Reddit free-tier limits and Pushshift (only mirrors or secondary pages), Facebook Graph search (removal is per object type, which a URL cannot show), FullContact v2 Person (no date), Clearbit free tools (no API surface).
