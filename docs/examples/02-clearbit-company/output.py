import json
import os
import re
import time
import urllib.error
import urllib.request

# RESURRECT: replaces the Clearbit Enrichment "Company enrichment (by domain)" call (moved into another product, no end date published). It now calls FoxAPIs POST /v1/get_company_snapshot.
# Needs FOXAPIS_KEY in the environment. A free key: https://foxapis.com/trial
# PARTIAL. get_company_snapshot answers with a written due-diligence snapshot (async: 202, then poll), not company fields. The generated code returns that snapshot unchanged. Almost no old field can be filled; the table says which.


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


def _wait_for_job(job_id, headers):
    for _ in range(90):
        status, job = _foxapis("GET", "/v1/jobs/" + job_id, headers)
        if status >= 400:
            raise RuntimeError("FoxAPIs job poll answered %s" % status)
        if job.get("status") == "done":
            return job
        if job.get("status") in ("failed", "error"):
            raise RuntimeError("FoxAPIs job " + job["status"])
        time.sleep(2)
    raise RuntimeError("FoxAPIs job did not finish in time; poll " + job_id + " again later")


def resurrected_company_find(domain=None):
    if not domain:
        raise ValueError("domain is required by FoxAPIs: company website domain")
    key = os.environ.get("FOXAPIS_KEY")
    if not key:
        raise RuntimeError("Set FOXAPIS_KEY (free key: https://foxapis.com/trial)")
    headers = {"Authorization": "Bearer " + key, "Content-Type": "application/json", "User-Agent": "resurrect/0.1"}
    body = {}
    if domain:
        body["domain"] = domain
    status, data = _foxapis("POST", "/v1/get_company_snapshot", headers, body)
    if status in (401, 403):
        raise RuntimeError("FoxAPIs rejected the key (status %s)" % status)
    if status not in (200, 202):
        raise RuntimeError("FoxAPIs answered %s" % status)
    job = _wait_for_job(data["job_id"], headers) if status == 202 else data
    return job.get("result")

if __name__ == "__main__":
    import sys

    arg = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    print(json.dumps(resurrected_company_find(**arg), indent=2))
