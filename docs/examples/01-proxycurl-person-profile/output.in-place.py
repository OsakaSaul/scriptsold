import os
import requests
import json
import os
import re
import time
import urllib.error
import urllib.request

# RESURRECT: replaces the Proxycurl "Person Profile" call (ended 2025-07-04). It now calls FoxAPIs POST /v1/enrich_person.
# Needs FOXAPIS_KEY in the environment. A free key: https://foxapis.com/trial
# Fields FoxAPIs cannot fill come back as None; the reasons are in _resurrect["unfilled"].

TRANSFORMS = {
    "firstName": lambda p: (str(p.get("full_name") or "").split()[0] if len(str(p.get("full_name") or "").split()) == 2 else None),
    "lastName": lambda p: (str(p.get("full_name") or "").split()[1] if len(str(p.get("full_name") or "").split()) == 2 else None),
    "slugFromLinkedin": lambda p: (lambda m: m.group(1) if m else None)(re.search(r"linkedin\.com/in/([^/?#]+)", p.get("linkedin_url") or "")),
    "titleAtEmployer": lambda p: (f"{p['title']} at {p['employer']}" if p.get("title") and p.get("employer") else None),
}
RULES = [
    {"old": "full_name", "rule": "copy", "from": "full_name"},
    {"old": "first_name", "rule": "derived", "from": "full_name", "transform": "firstName"},
    {"old": "last_name", "rule": "derived", "from": "full_name", "transform": "lastName"},
    {"old": "public_identifier", "rule": "derived", "from": "linkedin_url", "transform": "slugFromLinkedin"},
    {"old": "profile_pic_url", "rule": "copy", "from": "photo_url"},
    {"old": "occupation", "rule": "derived", "from": "title", "transform": "titleAtEmployer"},
    {"old": "headline", "rule": "derived", "from": "title", "transform": "titleAtEmployer"},
    {"old": "summary", "rule": "copy", "from": "summary"},
    {"old": "experiences", "rule": "passthrough", "from": "employment_history"},
    {"old": "education", "rule": "passthrough", "from": "education"},
    {"old": "country", "rule": "null", "reason": "FoxAPIs does not return a location"},
    {"old": "country_full_name", "rule": "null", "reason": "FoxAPIs does not return a location"},
    {"old": "city", "rule": "null", "reason": "FoxAPIs does not return a location"},
    {"old": "state", "rule": "null", "reason": "FoxAPIs does not return a location"},
    {"old": "follower_count", "rule": "null", "reason": "FoxAPIs does not return follower counts"},
    {"old": "connections", "rule": "null", "reason": "no equivalent in FoxAPIs"},
    {"old": "people_also_viewed", "rule": "null", "reason": "FoxAPIs does not return a similar-people list"},
    {"old": "similarly_named_profiles", "rule": "null", "reason": "no equivalent in FoxAPIs (same-name people are listed under a different field inside the FoxAPIs profile)"},
    {"old": "background_cover_image_url", "rule": "null", "reason": "no equivalent in FoxAPIs"},
    {"old": "languages", "rule": "null", "reason": "no equivalent in FoxAPIs"},
    {"old": "industry", "rule": "null", "reason": "no equivalent in FoxAPIs"},
    {"old": "gender", "rule": "null", "reason": "no equivalent in FoxAPIs"},
    {"old": "birth_date", "rule": "null", "reason": "no equivalent in FoxAPIs"},
    {"old": "inferred_salary", "rule": "null", "reason": "no equivalent in FoxAPIs"},
    {"old": "personal_emails", "rule": "null", "reason": "FoxAPIs returns email candidates labelled by source, not personal emails; not mapped"},
    {"old": "personal_numbers", "rule": "null", "reason": "FoxAPIs phones are business numbers found with a source address; not mapped"},
    {"old": "articles", "rule": "null", "reason": "no equivalent in FoxAPIs"},
    {"old": "groups", "rule": "null", "reason": "no equivalent in FoxAPIs"},
    {"old": "extra", "rule": "null", "reason": "no equivalent in FoxAPIs"},
]


def _blank(v):
    return None if v is None or v == "" else v


def to_old_shape(p):
    out, derived, unfilled = {}, [], []
    for r in RULES:
        if r["rule"] == "null":
            out[r["old"]] = None
            unfilled.append({"field": r["old"], "reason": r["reason"]})
            continue
        if r["rule"] == "passthrough":
            v = p.get(r["from"])
            out[r["old"]] = v if isinstance(v, list) else None
            if out[r["old"]] is None:
                unfilled.append({"field": r["old"], "reason": "FoxAPIs returned no list"})
            continue
        v = TRANSFORMS[r["transform"]](p) if r["rule"] == "derived" else _blank(p.get(r["from"]))
        out[r["old"]] = v
        if v is None:
            unfilled.append({"field": r["old"], "reason": "FoxAPIs returned no value to build it from" if r["rule"] == "derived" else "FoxAPIs returned an empty value"})
        elif r["rule"] == "derived":
            derived.append(r["old"])
    out["_resurrect"] = {"source": "foxapis", "unfilled": unfilled, "derived": derived}
    return out


class ResurrectedResponse:
    """Looks like a requests response: .json(), .status_code, .ok, .text, .raise_for_status()."""

    def __init__(self, data, status_code=200):
        self._data = data
        self.status_code = status_code
        self.ok = status_code < 400
        self.text = json.dumps(data)

    def json(self):
        return self._data

    def raise_for_status(self):
        if not self.ok:
            raise RuntimeError("FoxAPIs answered %s" % self.status_code)


def _foxapis(method, path, headers, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request("https://api.foxapis.com" + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            raw = r.read().decode() or "null"
            return r.status, json.loads(raw)
    except urllib.error.HTTPError as e:
        return e.code, None


def resurrected_person_profile(name=None, company=None, domain=None, url=None):
    if not name:
        raise ValueError("name is required by FoxAPIs: full name of the person (the old call only had a profile address)")
    key = os.environ.get("FOXAPIS_KEY")
    if not key:
        raise RuntimeError("Set FOXAPIS_KEY (free key: https://foxapis.com/trial)")
    headers = {"Authorization": "Bearer " + key, "Content-Type": "application/json", "User-Agent": "resurrect/0.1"}
    body = {}
    if name:
        body["name"] = name
    if company:
        body["company"] = company
    if domain:
        body["domain"] = domain
    if url:
        body["linkedin_url"] = url
    status, data = _foxapis("POST", "/v1/enrich_person", headers, body)
    if status in (401, 403):
        raise RuntimeError("FoxAPIs rejected the key (status %s)" % status)
    if status >= 400:
        raise RuntimeError("FoxAPIs answered %s" % status)
    p = (data or {}).get("profile")
    if not isinstance(p, dict):
        return None
    return to_old_shape(p)


api_key = os.environ["PROXYCURL_API_KEY"]
# RESURRECT: the old Proxycurl address that was here is replaced by the FoxAPIs call below.
headers = {"Authorization": "Bearer " + api_key}

def load_profile(profile_url):
    _resurrected_1 = resurrected_person_profile(
        name=None,  # TODO: full name of the person (the old call only had a profile address)
        url=profile_url,
    )
    response = ResurrectedResponse(_resurrected_1, 200) if _resurrected_1 is not None else ResurrectedResponse({"detail": "No match found by FoxAPIs"}, 404)
    return response.json()

if __name__ == "__main__":
    person = load_profile("https://www.linkedin.com/in/satyanadella/")
    print(person["full_name"], "-", person["headline"])
