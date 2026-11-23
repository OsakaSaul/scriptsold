// Runs the generated JavaScript and Python against recorded real FoxAPIs responses
// and checks the output against the field-mapping table.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runJs, runPy, havePython, fixture, endpoint, cleanup, tmp, importCheck, pyCompile } from './helpers.js';
import { emitStandalone } from '../src/emit.js';
import { fieldRows } from '../src/fieldtable.js';

after(cleanup);
const person = fixture('enrich_person.sample.json');
const answers = [{ status: 200, body: person.response }];
const input = { name: 'Satya Nadella', company: 'Microsoft', url: 'https://www.linkedin.com/in/satyanadella/' };

function checkAgainstTable(out, profile) {
  const { ep } = endpoint('proxycurl', 'person_profile');
  const rows = fieldRows(ep);
  const unfilled = new Map(out._resurrect.unfilled.map((u) => [u.field, u.reason]));
  for (const r of rows) {
    assert.ok(r.old in out, `old field ${r.old} is present`);
    if (r.rule === 'null') {
      assert.equal(out[r.old], null, r.old);
      assert.ok(unfilled.get(r.old), `${r.old} is listed with a reason`);
    }
  }
  // copied fields equal the FoxAPIs value
  assert.equal(out.full_name, profile.full_name);
  assert.equal(out.summary, profile.summary);
  assert.equal(out.profile_pic_url, null, 'empty photo_url becomes null');
  assert.ok(unfilled.has('profile_pic_url'));
  // derived fields
  assert.equal(out.first_name, 'Satya');
  assert.equal(out.last_name, 'Nadella');
  assert.equal(out.public_identifier, 'satyanadella');
  assert.equal(out.occupation, null, 'title is empty in the sample, so nothing is built');
  assert.deepEqual(new Set(out._resurrect.derived), new Set(['first_name', 'last_name', 'public_identifier']));
  assert.deepEqual(out.experiences, []);
  assert.deepEqual(out.education, []);
  assert.equal(out._resurrect.source, 'foxapis');
}

test('generated JavaScript returns the old shape from a real recorded response', async () => {
  const { result, calls } = await runJs('proxycurl', 'person_profile', input, answers);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.foxapis.com/v1/enrich_person');
  assert.equal(calls[0].init.method, 'POST');
  assert.match(calls[0].init.headers.Authorization, /^Bearer /);
  assert.deepEqual(JSON.parse(calls[0].init.body), { name: 'Satya Nadella', company: 'Microsoft', linkedin_url: input.url });
  checkAgainstTable(result, person.response.profile);
});

test('generated Python returns the same result as the generated JavaScript', { skip: !havePython() }, async () => {
  const py = runPy('proxycurl', 'person_profile', input, answers);
  assert.equal(py.calls.length, 1);
  assert.equal(py.calls[0].url, 'https://api.foxapis.com/v1/enrich_person');
  assert.equal(py.calls[0].method, 'POST');
  assert.deepEqual(py.calls[0].body, { name: 'Satya Nadella', company: 'Microsoft', linkedin_url: input.url });
  checkAgainstTable(py.result, person.response.profile);
  const js = (await runJs('proxycurl', 'person_profile', input, answers)).result;
  assert.deepEqual(py.result, js);
});

test('person profile: a missing name stops before any call (nothing is spent)', async () => {
  await assert.rejects(() => runJs('proxycurl', 'person_profile', { url: input.url }, []), /name is required/);
});

test('person profile: no profile in the answer gives null (the old not-found case)', async () => {
  const { result } = await runJs('proxycurl', 'person_profile', input, [{ status: 200, body: { success: false } }]);
  assert.equal(result, null);
});

test('a rejected key is reported, not hidden', async () => {
  await assert.rejects(() => runJs('proxycurl', 'person_profile', input, [{ status: 401, body: {} }]), /rejected the key/);
});

test('work email: the real no-match answer comes back unchanged and costs nothing', async () => {
  const f = fixture('find_email.no_match.json');
  const { result, calls } = await runJs('proxycurl', 'work_email', f.request.body, [{ status: 200, body: f.response }]);
  assert.deepEqual(result, f.response);
  assert.equal(result.credits_used, 0);
  assert.equal(calls[0].url, 'https://api.foxapis.com/v1/find_email');
  assert.deepEqual(JSON.parse(calls[0].init.body), f.request.body);
});

test('work email in Python matches', { skip: !havePython() }, () => {
  const f = fixture('find_email.no_match.json');
  const py = runPy('proxycurl', 'work_email', f.request.body, [{ status: 200, body: f.response }]);
  assert.deepEqual(py.result, f.response);
});

test('company snapshot polls the job until it is done (JavaScript)', async () => {
  const { result, calls } = await runJs('clearbit-enrichment', 'company_find', { domain: 'stripe.com' }, [
    { status: 202, body: { job_id: 'j1', poll_url: '/v1/jobs/j1', status: 'pending' } },
    { status: 200, body: { status: 'done', result: { subject_name: 'Stripe' } } },
  ]);
  assert.deepEqual(result, { subject_name: 'Stripe' });
  assert.equal(calls[1].url, 'https://api.foxapis.com/v1/jobs/j1');
});

test('company snapshot polls the job until it is done (Python)', { skip: !havePython() }, () => {
  const py = runPy('clearbit-enrichment', 'company_find', { domain: 'stripe.com' }, [
    { status: 202, body: { job_id: 'j1', status: 'pending' } },
    { status: 200, body: { status: 'done', result: { subject_name: 'Stripe' } } },
  ]);
  assert.deepEqual(py.result, { subject_name: 'Stripe' });
  assert.equal(py.calls[1].url, 'https://api.foxapis.com/v1/jobs/j1');
});

test('generated JavaScript and Python pass a syntax check for every mapping', async () => {
  const d = tmp();
  let checked = 0;
  for (const [apiId, epId] of [['proxycurl', 'person_profile'], ['proxycurl', 'work_email'], ['proxycurl', 'person_lookup'], ['clearbit-enrichment', 'company_find'], ['clearbit-enrichment', 'person_find'], ['lusha-person-v2', 'person_v2']]) {
    const { api, ep } = endpoint(apiId, epId);
    const js = join(d, `syn-${apiId}-${epId}.mjs`);
    writeFileSync(js, emitStandalone(api, ep, 'js'));
    const rj = await importCheck(js);
    assert.ok(rj.ok, `${apiId}/${epId} js: ${rj.error}`);
    if (havePython()) {
      const py = join(d, `syn_${apiId.replace(/-/g, '_')}_${epId}.py`);
      writeFileSync(py, emitStandalone(api, ep, 'py'));
      const rp = pyCompile(py);
      assert.equal(rp.status, 0, `${apiId}/${epId} py: ${rp.stderr}`);
    }
    checked += 1;
  }
  assert.equal(checked, 6);
});

test('generated code never contains a key', () => {
  for (const [apiId, epId] of [['proxycurl', 'person_profile'], ['clearbit-enrichment', 'company_find']]) {
    const { api, ep } = endpoint(apiId, epId);
    for (const lang of ['js', 'py', 'curl']) {
      const code = emitStandalone(api, ep, lang);
      assert.ok(/FOXAPIS_KEY/.test(code));
      assert.ok(!/Bearer [A-Za-z0-9_\-]{16,}/.test(code));
    }
  }
});
