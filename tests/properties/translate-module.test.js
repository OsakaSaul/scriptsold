// Property tests P6 to P9 against src/compat/translate.js directly.
// Mirrors translate.test.js but calls the pure module instead of running
// the generated code as a subprocess.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translate } from '../../src/compat/translate.js';
import { endpoint, fixture } from '../helpers.js';
import { fieldRows } from '../../src/fieldtable.js';
import { rng } from './gen.js';

const base = fixture('enrich_person.sample.json').response.profile;
const { ep } = endpoint('proxycurl', 'person_profile');
const rows = fieldRows(ep);
const RUNS = 40;

function call(profile, opts = {}) {
  return translate({ success: true, profile }, ep, opts);
}

function randomProfile(r) {
  const p = structuredClone(base);
  const maybe = (v) => (r.bool(0.3) ? undefined : r.bool(0.2) ? '' : v);
  p.full_name = maybe(r.pick(['Ada Lovelace', 'Grace Brewster Hopper', 'Linus', 'Jean Luc Picard Jr']));
  p.title = maybe(r.pick(['CEO', 'Engineer']));
  p.employer = maybe(r.pick(['Acme', 'Globex']));
  p.summary = maybe(`${r.word(5)} works at ${r.word(5)}.`);
  p.photo_url = maybe(`https://img.example/${r.word(5)}.png`);
  p.linkedin_url = maybe(r.pick(['https://www.linkedin.com/in/ada-l/', 'https://example.org/x', 'https://uk.linkedin.com/in/grace?trk=1']));
  p.employment_history = r.bool(0.5) ? [{ title: r.word(4), company: r.word(4) }] : undefined;
  p.education = r.bool(0.5) ? [] : undefined;
  return p;
}

test('P6 every mapped source field exists in the recorded FoxAPIs response (translate module)', () => {
  for (const r of rows) {
    if (r.rule === 'null') continue;
    const src = r.new.replace(/^derived from /, '').split(' + ');
    for (const s of src) {
      const key = s.replace(/^profile\./, '');
      assert.ok(key in base, `${r.old} reads ${key}, which is not in the recorded response`);
    }
  }
});

test('P7 old schema round trip: all old keys present, absent data is null, never undefined (translate module)', () => {
  for (let seed = 1; seed <= RUNS; seed += 1) {
    const out = call(randomProfile(rng(seed)));
    for (const r of rows) {
      assert.ok(r.old in out, `seed ${seed}: ${r.old} present`);
      assert.notEqual(out[r.old], undefined, `seed ${seed}: ${r.old} not undefined`);
    }
    assert.ok(Array.isArray(out._resurrect.unfilled) && Array.isArray(out._resurrect.derived));
  }
});

test('P8 null-with-reason completeness: the null fields are exactly the listed ones (translate module)', () => {
  for (let seed = 1; seed <= RUNS; seed += 1) {
    const out = call(randomProfile(rng(100 + seed)));
    const nulls = rows.map((r) => r.old).filter((k) => out[k] === null);
    const listed = out._resurrect.unfilled.map((u) => u.field);
    assert.deepEqual(new Set(listed), new Set(nulls), `seed ${seed}`);
    for (const u of out._resurrect.unfilled) assert.ok(u.reason && u.reason.length > 3, `seed ${seed}: reason for ${u.field}`);
  }
});

test('P9 no invention: every non-null field is a copy of a FoxAPIs value or listed as derived (translate module)', () => {
  for (let seed = 1; seed <= RUNS; seed += 1) {
    const p = randomProfile(rng(200 + seed));
    const out = call(p);
    const derived = new Set(out._resurrect.derived);
    for (const r of rows) {
      const v = out[r.old];
      if (v === null) continue;
      if (r.rule === 'derived') assert.ok(derived.has(r.old), `seed ${seed}: ${r.old} listed as derived`);
      else {
        const src = r.new.replace(/^profile\./, '');
        assert.deepEqual(v, p[src], `seed ${seed}: ${r.old} equals FoxAPIs ${src}`);
        assert.ok(!derived.has(r.old));
      }
    }
    const words = String(p.full_name || '').trim().split(/\s+/).filter(Boolean);
    assert.equal(out.first_name !== null, words.length === 2, `seed ${seed}: split only for two words`);
  }
});

test('translate returns null when FoxAPIs has no profile object', () => {
  assert.equal(call(null), null);
  assert.equal(call(undefined), null);
  assert.equal(translate({ success: false }, ep), null);
});

test('translate adds sample flag and credits_used when opts are given', () => {
  const out = call(base, { sample: true, creditsUsed: 100 });
  assert.equal(out._resurrect.sample, true);
  assert.equal(out._resurrect.credits_used, 100);
  const plain = call(base);
  assert.equal(plain._resurrect.sample, undefined);
  assert.equal(plain._resurrect.credits_used, undefined);
});
