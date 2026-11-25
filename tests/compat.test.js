// Tests for the compat route (functions/compat/[[path]].js).
// All tests call the handler directly with a fake context — no real network calls.
// Task 13: sample mode. Task 14: live path.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/compat/[[path]].js';
import { fixture } from './helpers.js';

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
  // old shape fields present
  assert.ok('full_name' in json, 'full_name');
  assert.ok('first_name' in json, 'first_name');
  assert.ok('last_name' in json, 'last_name');
  assert.ok('summary' in json, 'summary');
  assert.ok('experiences' in json, 'experiences');
  // sample flag
  assert.equal(json._resurrect.sample, true);
  assert.equal(json._resurrect.source, 'foxapis');
  assert.equal(typeof json._resurrect.credits_used, 'number');
  // spot-check against fixture
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

// ---- live path not yet implemented ----------------------------------------------

test('without sample header returns 503 (live path not yet enabled)', async () => {
  const { res } = await call('/compat/api/v2/linkedin', {
    headers: { Authorization: 'Bearer test-key' },
  });
  assert.equal(res.status, 503);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});

// ---- every response has no-store ------------------------------------------------

test('every compat response sets Cache-Control: no-store', async () => {
  const cases = [
    ['/compat/api/v2/linkedin', { headers: { Authorization: 'Bearer k', 'X-Resurrect-Sample': '1' } }],
    ['/compat/api/v2/linkedin', { headers: { Authorization: 'Bearer k' } }],
    ['/compat/api/v2/linkedin', { headers: {} }],
    ['/compat/api/unknown', { headers: { Authorization: 'Bearer k', 'X-Resurrect-Sample': '1' } }],
  ];
  for (const [path, opts] of cases) {
    const res = await onRequest(ctx(path, opts));
    assert.equal(res.headers.get('Cache-Control'), 'no-store', `${path} ${JSON.stringify(opts)}`);
  }
});
