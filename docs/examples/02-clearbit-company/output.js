import { pathToFileURL } from "node:url";

// RESURRECT: replaces the Clearbit Enrichment "Company enrichment (by domain)" call (moved into another product, no end date published). It now calls FoxAPIs POST /v1/get_company_snapshot.
// Needs FOXAPIS_KEY in the environment. A free key: https://foxapis.com/trial
// PARTIAL. get_company_snapshot answers with a written due-diligence snapshot (async: 202, then poll), not company fields. The generated code returns that snapshot unchanged. Almost no old field can be filled; the table says which.
const asResponse = (data, status = 200) => ({ ok: status < 400, status, data, json: async () => data, text: async () => JSON.stringify(data) });
async function waitForJob(jobId, headers) {
  for (let i = 0; i < 90; i += 1) {
    const res = await fetch("https://api.foxapis.com" + "/v1/jobs/" + encodeURIComponent(jobId), { headers });
    if (!res.ok) throw new Error("FoxAPIs job poll answered " + res.status);
    const job = await res.json();
    if (job.status === "done") return job;
    if (job.status === "failed" || job.status === "error") throw new Error("FoxAPIs job " + job.status);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("FoxAPIs job did not finish in time; poll " + jobId + " again later");
}
export async function resurrectedCompanyFind({ domain } = {}) {
  if (!domain) throw new Error("domain is required by FoxAPIs: company website domain");
  const key = process.env.FOXAPIS_KEY;
  if (!key) throw new Error("Set FOXAPIS_KEY (free key: https://foxapis.com/trial)");
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const body = {};
  if (domain) body.domain = domain;
  const res = await fetch("https://api.foxapis.com/v1/get_company_snapshot", { method: "POST", headers, body: JSON.stringify(body) });
  if (res.status === 401 || res.status === 403) throw new Error("FoxAPIs rejected the key (status " + res.status + ")");
  if (res.status !== 202 && !res.ok) throw new Error("FoxAPIs answered " + res.status);
  const first = await res.json();
  const job = res.status === 202 ? await waitForJob(first.job_id, headers) : first;
  return job.result ?? null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv[2] ? JSON.parse(process.argv[2]) : {};
  console.log(JSON.stringify(await resurrectedCompanyFind(arg), null, 2));
}
