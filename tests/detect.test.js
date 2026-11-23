import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detect } from '../src/detect.js';
import { resurrect } from '../src/resurrect.js';
import { data } from './helpers.js';

const opts = { registry: data.registry, catalog: data.catalog };

test('detects Proxycurl person profile in curl, js and python', () => {
  const samples = {
    curl: `curl -H "Authorization: Bearer abc" "https://nubela.co/proxycurl/api/v2/linkedin?url=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fx"`,
    js: `const r = await fetch("https://nubela.co/proxycurl/api/v2/linkedin?url=" + u);`,
    py: `requests.get("https://nubela.co/proxycurl/api/v2/linkedin", params={"url": u})`,
  };
  for (const [lang, code] of Object.entries(samples)) {
    const m = detect(code, data.registry);
    assert.equal(m.length, 1, lang);
    assert.equal(m[0].apiId, 'proxycurl');
    assert.equal(m[0].endpointId, 'person_profile');
  }
});

test('the live NinjaPear paths on the same host are not claimed as dead', () => {
  const code = `curl https://nubela.co/api/v1/company/details?website=stripe.com`;
  assert.deepEqual(detect(code, data.registry), []);
});

test('a bare Proxycurl-marked path on the shared host is reported as an unknown endpoint', () => {
  const m = detect(`fetch("https://nubela.co/proxycurl/api/brand-new-thing")`, data.registry);
  assert.equal(m.length, 1);
  assert.equal(m[0].endpointId, null);
  const r = resurrect(`fetch("https://nubela.co/proxycurl/api/brand-new-thing")`, opts);
  assert.equal(r.unmapped.length, 1);
  assert.ok(r.code.includes('RESURRECT: no FoxAPIs equivalent'));
});

test('detects SDK imports', () => {
  const m = detect(`from proxycurl.asyncio import Proxycurl`, data.registry);
  assert.equal(m[0].kind, 'sdk');
  assert.equal(m[0].apiId, 'proxycurl');
});

test('detects each host family in the registry', () => {
  const urls = {
    'clearbit-logo': 'https://logo.clearbit.com/stripe.com',
    'clearbit-enrichment': 'https://company.clearbit.com/v2/companies/find?domain=stripe.com',
    'bing-search': 'https://api.bing.microsoft.com/v7.0/search?q=x',
    'instagram-basic-display': 'https://graph.instagram.com/me/media?fields=id',
    'reversecontact-legacy': 'https://api.reversecontact.com/v2/resolve/persons/email?email=a@b.co',
    'dataforseo-pinterest': 'https://api.dataforseo.com/v3/business_data/social_media/pinterest/live',
    'lusha-person-v2': 'https://api.lusha.com/v2/person?firstName=a&lastName=b',
  };
  for (const [id, url] of Object.entries(urls)) {
    const m = detect(`const u = "${url}";`, data.registry);
    assert.ok(m.some((x) => x.apiId === id), id);
  }
});

test('Instagram hosts that are also used by a live product carry a warning', () => {
  const r = resurrect(`fetch("https://graph.instagram.com/me/media")`, opts);
  assert.ok(r.notes.some((n) => n.includes('also used by a live product')));
});

test('text with no registry host is returned unchanged with no matches (R1.3)', () => {
  const code = `fetch("https://api.example.org/v1/things");\nconsole.log("hi");`;
  const r = resurrect(code, opts);
  assert.equal(r.code, code);
  assert.deepEqual(r.matches, []);
  assert.ok(r.notes.includes('no known dead API found'));
});

test('input over 100 KB is rejected with status 413 (R1.4)', () => {
  assert.throws(() => resurrect('a'.repeat(100 * 1024 + 1), opts), (e) => e.status === 413);
});
