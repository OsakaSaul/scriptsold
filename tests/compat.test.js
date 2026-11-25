// Tests for the compat route (functions/compat/[[path]].js).
// All tests call the handler directly with a fake context — no real network calls.
// Task 13: sample mode. Task 14: live path.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { onRequest, limiter } from '../functions/compat/[[path]].js';
import { fixture } from './helpers.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

// Build a fake Cloudflare Pages Function context.
function ctx(path, { method = 'GET', headers = {}, body = null } = {}) {
  const url = `https://scriptsold.com${path}`;
  const req = new Request(url, {
    method,
    headers: new Headers(headers),
    body: body ? JSON.stringify(body) : undefined,
  });
  return { request: req };
}

async function call(path, opts = {}) {
  const res = await onRequest(ctx(path, opts));
  const json = await res.json();
  return { res, json };
}

// ---- sample mode: person profile ------------------------------------------------

test('sample person profile returns old shape with _resurrect.sample: true', async () => {
  const { res, json } = await call('/compat/api/v2/linkedin', {
    headers: { Authorization: 'Bearer test-key', 'X-Resurrect-Sample': '1' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  assert.equal(res.headers.get('X-Resurrect-Source'), 'foxapis');
  assert.equal(res.headers.get('X-Resurrect-Sample'), 'true');
  assert.ok('full_name' in json, 'full_name');
  assert.ok('first_name' in json, 'first_name');
  assert.ok('last_name' in json, 'last_name');
  assert.ok('summary' in json, 'summary');
  assert.ok('experiences' in json, 'experiences');
  assert.equal(json._resurrect.sample, true);
  assert.equal(json._resurrect.source, 'foxapis');
  assert.equal(typeof json._resurrect.credits_used, 'number');
  const fix = fixture('enrich_person.sample.json');
  assert.equal(json.full_name, fix.response.profile.full_name);
});

test('sample person profile: proxycurl path prefix also works', async () => {
  const { res } = await call('/compat/proxycurl/api/v2/linkedin', {
    headers: { Authorization: 'Bearer test-key', 'X-Resurrect-Sample': '1' },
  });
  assert.equal(res.status, 200);
});

// ---- sample mode: work email ----------------------------------------------------

test('sample work email returns fixture body with _resurrect.sample: true', async () => {
  const { res, json } = await call('/compat/api/linkedin/profile/email', {
    headers: { Authorization: 'Bearer test-key', 'X-Resurrect-Sample': '1' },
  });
  assert.equal(res.status, 200);
  assert.equal(json._resurrect.sample, true);
  const fix = fixture('find_email.no_match.json');
  assert.equal(json.email, fix.response.email);
  assert.equal(json.credits_used, fix.response.credits_used);
});

// ---- auth checks ----------------------------------------------------------------

test('missing Authorization returns 401 in old error shape', async () => {
  const { res, json } = await call('/compat/api/v2/linkedin', {
    headers: { 'X-Resurrect-Sample': '1' },
  });
  assert.equal(res.status, 401);
  assert.ok(json.detail, 'has detail');
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});

test('malformed Authorization (no Bearer) returns 401', async () => {
  const { res } = await call('/compat/api/v2/linkedin', {
    headers: { Authorization: 'Basic dXNlcjpwYXNz', 'X-Resurrect-Sample': '1' },
  });
  assert.equal(res.status, 401);
});

// ---- routing --------------------------------------------------------------------

test('unknown path returns 404 in old error shape', async () => {
  const { res, json } = await call('/compat/api/unknown/path', {
    headers: { Authorization: 'Bearer test-key', 'X-Resurrect-Sample': '1' },
  });
  assert.equal(res.status, 404);
  assert.ok(json.detail);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});

test('OPTIONS preflight returns 204 with CORS headers', async () => {
  const res = await onRequest(ctx('/compat/api/v2/linkedin', { method: 'OPTIONS' }));
  assert.equal(res.status, 204);
  assert.ok(res.headers.get('Access-Control-Allow-Origin'));
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});

// ---- every response has no-store ------------------------------------------------

test('every compat response sets Cache-Control: no-store', async () => {
  const cases = [
    ['/compat/api/v2/linkedin', { headers: { Authorization: 'Bearer k', 'X-Resurrect-Sample': '1' } }],
    ['/compat/api/v2/linkedin', { headers: {} }],
    ['/compat/api/unknown', { headers: { Authorization: 'Bearer k', 'X-Resurrect-Sample': '1' } }],
  ];
  for (const [path, opts] of cases) {
    const res = await onRequest(ctx(path, opts));
    assert.equal(res.headers.get('Cache-Control'), 'no-store', `${path} ${JSON.stringify(opts)}`);
  }
});

// ---- live path: fake fetch -------------------------------------------------------
// A mutable slot for the fake fetch; set before each live-path test.

let _fakeFetch = null;
const realFetch = globalThis.fetch;

before(() => {
  globalThis.fetch = async (url, init) => {
    if (!_fakeFetch) throw new Error('fakeFetch not set');
    return _fakeFetch(url, init);
  };
});

after(() => {
  globalThis.fetch = realFetch;
});

function setFake(status, body) {
  _fakeFetch = async () => ({ status, ok: status < 400, json: async () => body });
}

test('live person profile: 200 from FoxAPIs translates to old shape', async () => {
  const fox = fixture('enrich_person.sample.json');
  setFake(200, fox.response);
  const { res, json } = await call('/compat/api/v2/linkedin?name=Satya+Nadella', {
    headers: { Authorization: 'Bearer live-test-key' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  assert.equal(res.headers.get('X-Resurrect-Source'), 'foxapis');
  assert.ok('full_name' in json);
  assert.ok('_resurrect' in json);
  assert.equal(json._resurrect.source, 'foxapis');
  assert.equal(json._resurrect.sample, undefined, 'not flagged as sample');
  assert.equal(json.full_name, fox.response.profile.full_name);
});

test('live person profile: 422 when name param is missing (no FoxAPIs call made)', async () => {
  let called = false;
  _fakeFetch = async () => { called = true; return { status: 200, ok: true, json: async () => ({}) }; };
  const { res, json } = await call('/compat/api/v2/linkedin', {
    headers: { Authorization: 'Bearer live-test-key' },
  });
  assert.equal(res.status, 422);
  assert.equal(called, false, 'FoxAPIs must not be called');
  assert.ok(json.detail);
});

test('live work email: 200 from FoxAPIs returns body with _resurrect metadata', async () => {
  const fox = fixture('find_email.no_match.json');
  setFake(200, fox.response);
  const { res, json } = await call('/compat/api/linkedin/profile/email?website=example.com', {
    headers: { Authorization: 'Bearer live-test-key' },
  });
  assert.equal(res.status, 200);
  assert.equal(json.email, fox.response.email);
  assert.equal(json._resurrect.source, 'foxapis');
});

test('live work email: 422 when website param is missing', async () => {
  let called = false;
  _fakeFetch = async () => { called = true; return { status: 200, ok: true, json: async () => ({}) }; };
  const { res } = await call('/compat/api/linkedin/profile/email', {
    headers: { Authorization: 'Bearer live-test-key' },
  });
  assert.equal(res.status, 422);
  assert.equal(called, false);
});

test('live path: 401 from FoxAPIs returns 401 in old shape', async () => {
  setFake(401, { detail: 'bad key' });
  const { res, json } = await call('/compat/api/v2/linkedin?name=X', {
    headers: { Authorization: 'Bearer bad-key' },
  });
  assert.equal(res.status, 401);
  assert.ok(json.detail);
});

test('live path: 5xx from FoxAPIs returns 502 with Retry-After', async () => {
  setFake(500, { error: 'internal' });
  const { res } = await call('/compat/api/v2/linkedin?name=X', {
    headers: { Authorization: 'Bearer live-test-key' },
  });
  assert.equal(res.status, 502);
  assert.ok(res.headers.get('Retry-After'));
});

test('live path: empty FoxAPIs profile returns 404 in old shape', async () => {
  setFake(200, { success: false });
  const { res, json } = await call('/compat/api/v2/linkedin?name=X', {
    headers: { Authorization: 'Bearer live-test-key' },
  });
  assert.equal(res.status, 404);
  assert.ok(json.detail);
});

test('live path: FoxAPIs key is forwarded in Authorization header', async () => {
  const fox = fixture('enrich_person.sample.json');
  let captured = null;
  _fakeFetch = async (url, init) => { captured = init.headers; return { status: 200, ok: true, json: async () => fox.response }; };
  await call('/compat/api/v2/linkedin?name=Satya+Nadella', {
    headers: { Authorization: 'Bearer my-forwarded-key' },
  });
  assert.equal(captured.Authorization, 'Bearer my-forwarded-key');
  assert.ok(captured['Content-Type']);
});

test('live path: only api.foxapis.com is contacted', async () => {
  const fox = fixture('enrich_person.sample.json');
  let contactedUrl = null;
  _fakeFetch = async (url) => { contactedUrl = url; return { status: 200, ok: true, json: async () => fox.response }; };
  await call('/compat/api/v2/linkedin?name=Satya', {
    headers: { Authorization: 'Bearer live-test-key' },
  });
  assert.match(contactedUrl, /^https:\/\/api\.foxapis\.com\//);
});

// ---- limits (task 15) -----------------------------------------------------------

test('request body over 100 KB returns 413', async () => {
  limiter.reset();
  const bigBody = 'x'.repeat(100 * 1024 + 1);
  const req = new Request('https://scriptsold.com/compat/api/v2/linkedin', {
    method: 'POST',
    headers: new Headers({ Authorization: 'Bearer k', 'Content-Type': 'application/json' }),
    body: bigBody,
  });
  const res = await onRequest({ request: req });
  assert.equal(res.status, 413);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});

test('Content-Length over 100 KB returns 413 without reading body', async () => {
  limiter.reset();
  const req = new Request('https://scriptsold.com/compat/api/v2/linkedin', {
    method: 'POST',
    headers: new Headers({ Authorization: 'Bearer k', 'Content-Length': String(100 * 1024 + 1), 'Content-Type': 'application/json' }),
    body: '{}',
  });
  const res = await onRequest({ request: req });
  assert.equal(res.status, 413);
});

test('per-IP rate limit: 31st request returns 429 with Retry-After', async () => {
  // Use a unique IP so this test does not interfere with others.
  limiter.reset();
  const ip = '203.0.113.42';
  const headers = { Authorization: 'Bearer k', 'X-Resurrect-Sample': '1', 'CF-Connecting-IP': ip };
  for (let i = 0; i < 30; i += 1) {
    const res = await onRequest(ctx('/compat/api/v2/linkedin', { headers }));
    assert.equal(res.status, 200, `request ${i + 1} should pass`);
  }
  const res = await onRequest(ctx('/compat/api/v2/linkedin', { headers }));
  assert.equal(res.status, 429);
  assert.ok(res.headers.get('Retry-After'), 'Retry-After header present');
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  const json = await res.json();
  assert.ok(json.detail);
  limiter.reset();
});

test('rate limit: README mentions per-instance caveat', () => {
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  assert.match(readme, /per server instance/);
});
