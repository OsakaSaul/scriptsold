// One fixture per registry entry added in the 2026-11 batch (fixtures/dead/<id>.json).
// Each says which call must be detected, whether it is mapped, and a live call on the
// same host that must not be flagged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { detect } from '../src/detect.js';
import { resurrect, MARKER } from '../src/resurrect.js';
import { data, root } from './helpers.js';

const dir = join(root, 'fixtures', 'dead');
const fixtures = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
const opts = { registry: data.registry, catalog: data.catalog };

test('there are at least 13 dead-api fixtures and each names a registry entry', () => {
  assert.ok(fixtures.length >= 13);
  for (const f of fixtures) assert.ok(data.registry.apis.some((a) => a.id === f.id), f.id);
});

test('the registry holds at least 20 entries, each with a https source and a read date', () => {
  assert.ok(data.registry.apis.length >= 20);
  for (const a of data.registry.apis) {
    assert.match(a.source.url, /^https:\/\//, a.id);
    assert.ok(!Number.isNaN(Date.parse(a.source.read_on)), a.id);
    if (a.status !== 'moved') assert.ok(!Number.isNaN(Date.parse(a.date)), a.id);
  }
});

for (const f of fixtures) {
  test(`fixture ${f.id}: detected, mapped as recorded, rewritten or marked`, () => {
    const api = data.registry.apis.find((a) => a.id === f.id);
    assert.equal(api.status, f.status);
    assert.equal(api.source.url, f.sourceUrl);
    for (const code of [`curl "${f.deadUrl}"`, `const r = await fetch("${f.deadUrl}");`, `r = requests.get("${f.deadUrl}")`]) {
      const m = detect(code, data.registry);
      assert.ok(m.some((x) => x.apiId === f.id && x.endpointId === f.endpointId), `${f.id}: ${code}`);
    }
    const ep = api.endpoints.find((e) => e.id === f.endpointId);
    assert.equal(Boolean(ep.mapping), f.mapped);
    const res = resurrect(`const r = await fetch("${f.deadUrl}");\n`, opts);
    if (f.mapped) {
      assert.equal(res.unmapped.length, 0);
      assert.ok(res.code.includes('api.foxapis.com' + f.foxapis.path), f.id);
    } else {
      assert.ok(res.code.includes(MARKER), f.id);
      assert.ok(!res.code.includes('api.foxapis.com'), f.id);
    }
  });

  test(`fixture ${f.id}: a live call on the same host is not flagged as this entry`, () => {
    const m = detect(`curl "${f.liveUrlNotFlagged}"`, data.registry);
    assert.ok(!m.some((x) => x.apiId === f.id), f.id);
  });
}
