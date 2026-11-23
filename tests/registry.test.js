import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistry, catalogAgeDays, indexCatalog } from '../src/registry.js';
import { data } from './helpers.js';

test('registry passes its integrity checks (P12)', () => {
  assert.deepEqual(validateRegistry(data.registry, data.catalog), []);
});

test('every mapped endpoint exists in the catalog snapshot and is live (P5)', () => {
  const cat = indexCatalog(data.catalog);
  let mapped = 0;
  for (const api of data.registry.apis) {
    for (const ep of api.endpoints) {
      if (!ep.mapping) continue;
      mapped += 1;
      const t = ep.mapping.foxapis;
      const hit = cat.get(`${t.method} ${t.path}`);
      assert.ok(hit, `${api.id}/${ep.id} -> ${t.path} missing`);
      assert.equal(hit.status, 'live');
    }
  }
  assert.ok(mapped >= 5);
});

test('an endpoint that is not in the catalog is rejected', () => {
  const bad = structuredClone(data.registry);
  bad.apis[0].endpoints[0].mapping.foxapis.path = '/v1/does_not_exist';
  const problems = validateRegistry(bad, data.catalog);
  assert.ok(problems.some((p) => p.includes('/v1/does_not_exist')));
});

test('an entry without a source url is rejected', () => {
  const bad = structuredClone(data.registry);
  bad.apis[1].source.url = '';
  assert.ok(validateRegistry(bad, data.catalog).some((p) => p.includes('no source url')));
});

test('an ended entry dated in the future is rejected', () => {
  const bad = structuredClone(data.registry);
  bad.apis[0].date = '2999-01-01';
  assert.ok(validateRegistry(bad, data.catalog).some((p) => p.includes('future')));
});

test('moved status is never labelled as shut down', async () => {
  const { statusLabel } = await import('../src/resurrect.js');
  const clearbit = data.registry.apis.find((a) => a.id === 'clearbit-enrichment');
  assert.equal(clearbit.status, 'moved');
  assert.ok(!/shut down/.test(statusLabel(clearbit)));
  const lusha = data.registry.apis.find((a) => a.id === 'lusha-person-v2');
  assert.match(statusLabel(lusha), /^ending on /);
});

test('catalog snapshot age is computed in days', () => {
  assert.equal(catalogAgeDays({ generated_on: '2026-11-01' }, new Date('2026-11-23')), 22);
  assert.equal(catalogAgeDays({ generated_on: 'x' }), Infinity);
});
