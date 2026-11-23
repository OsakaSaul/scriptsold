# Proxycurl: Person Profile

Status: Proxycurl ended 2025-07-04. Source: https://nubela.co/blog/goodbye-proxycurl/ (read 2026-11-23).

Target: FoxAPIs POST /v1/enrich_person. 100 credits per call (catalog snapshot, measured).

Request: old parameter to new parameter

| Old | New | Note |
|---|---|---|
| url | linkedin_url | passed as a hint to narrow the match; it is not looked up on its own |
| (none) | name | required by FoxAPIs; the old call did not have it, so a TODO placeholder is inserted |
| fallback_to_cache, use_cache, skills, inferred_salary, personal_email, personal_contact_number, twitter_profile_id, facebook_profile_id, github_profile_id, extra | (dropped) | no FoxAPIs parameter does the same job |

Response: old field to FoxAPIs field

The generated code returns the old field names. Where FoxAPIs has no value the field is null and the reason is listed in _resurrect.unfilled.

| Old field | FoxAPIs field | Rule | Basis |
|---|---|---|---|
| full_name | profile.full_name | copy | real sample 2026-11-22 |
| first_name | derived from profile.full_name | derived | derived: first token, only when the name has exactly two words |
| last_name | derived from profile.full_name | derived | derived: second token, only when the name has exactly two words |
| public_identifier | derived from profile.linkedin_url | derived | derived: last path part of the profile address |
| profile_pic_url | profile.photo_url | copy | real sample 2026-11-22 (field present, empty in the sample) |
| occupation | derived from profile.title + profile.employer | derived | derived: title at employer, only when both are non-empty |
| headline | derived from profile.title + profile.employer | derived | derived: title at employer, only when both are non-empty |
| summary | profile.summary | copy | real sample 2026-11-22 (a one-line text; style differs from the old summary) |
| experiences | profile.employment_history | passthrough | field present in sample (empty list); items are returned as FoxAPIs items, NOT reshaped to the old item layout |
| education | profile.education | passthrough | field present in sample (empty list); items are returned as FoxAPIs items, NOT reshaped to the old item layout |
| country | none (null: FoxAPIs does not return a location) | null | alternatives page, 2026-11-22 |
| country_full_name | none (null: FoxAPIs does not return a location) | null | alternatives page, 2026-11-22 |
| city | none (null: FoxAPIs does not return a location) | null | alternatives page, 2026-11-22 |
| state | none (null: FoxAPIs does not return a location) | null | alternatives page, 2026-11-22 |
| follower_count | none (null: FoxAPIs does not return follower counts) | null | alternatives page, 2026-11-22 |
| connections | none (null: no equivalent in FoxAPIs) | null | no field in the sample |
| people_also_viewed | none (null: FoxAPIs does not return a similar-people list) | null | alternatives page, 2026-11-22 |
| similarly_named_profiles | none (null: no equivalent in FoxAPIs (same-name people are listed under a different field inside the FoxAPIs profile)) | null | no matching field in the sample |
| background_cover_image_url | none (null: no equivalent in FoxAPIs) | null | no field in the sample |
| languages | none (null: no equivalent in FoxAPIs) | null | no field in the sample |
| industry | none (null: no equivalent in FoxAPIs) | null | no field in the sample |
| gender | none (null: no equivalent in FoxAPIs) | null | no field in the sample |
| birth_date | none (null: no equivalent in FoxAPIs) | null | no field in the sample |
| inferred_salary | none (null: no equivalent in FoxAPIs) | null | no field in the sample |
| personal_emails | none (null: FoxAPIs returns email candidates labelled by source, not personal emails; not mapped) | null | alternatives page, 2026-11-22 |
| personal_numbers | none (null: FoxAPIs phones are business numbers found with a source address; not mapped) | null | sample 2026-11-22 |
| articles | none (null: no equivalent in FoxAPIs) | null | no field in the sample |
| groups | none (null: no equivalent in FoxAPIs) | null | no field in the sample |
| extra | none (null: no equivalent in FoxAPIs) | null | no field in the sample |

FoxAPIs returns more that the old call did not: emails, phones, github_url, twitter_url, twitter_handle, news_mentions, identity_verification, overall_confidence, deeper_dossier.
Caveat: The old field list is the one in the engine's design notes; Nubela's own Person Profile reference is no longer online, so old field names are not re-verified here.
