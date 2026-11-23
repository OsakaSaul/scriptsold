// Property tests P1 to P4, P10, P11 from .kiro/specs/resurrect/design.md.
// Randomised with a seeded generator, so a failure is reproducible from its seed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resurrect, MARKER } from '../../src/resurrect.js';
import { detect } from '../../src/detect.js';
import { data } from '../helpers.js';
import { rng, allCalls, mappedCalls, unmappedCalls, render, junkLines } from './gen.js';

const opts = { registry: data.registry, catalog: data.catalog };
const RUNS = 60;
const LANGS = ['js', 'py', 'curl'];

function randomProgram(r, calls) {
  const call = r.pick(calls);
  const lang = r.pick(LANGS);
  const before = junkLines(r, r.int(4)).filter((l) => !l.startsWith(lang === 'py' ? '//' : '#'));
  const after = junkLines(r, r.int(4)).filter((l) => !l.startsWith(lang === 'py' ? '//' : '#'));
  const body = render(call, lang, r);
  return { call, lang, before, after, body, code: [...before, body, ...after].join('\n') };
}

test('P1 idempotent rewrite (R2.7)', () => {
  for (let seed = 1; seed <= RUNS; seed += 1) {
    const r = rng(seed);
    const p = randomProgram(r, allCalls());
    const once = resurrect(p.code, { ...opts, language: p.lang });
    const twice = resurrect(once.code, { ...opts, language: p.lang });
    assert.equal(twice.code, once.code, `seed ${seed} (${p.call.api.id}/${p.call.ep.id}, ${p.lang})`);
  }
});

test('P2 no secrets echoed (R2.5, R6.2)', () => {
  const shapes = [
    (t) => `headers = {"Authorization": "Bearer ${t}"}`,
    (t) => `const url = "https://example.org/x?api_key=${t}";`,
    (t) => `curl -H "x-api-key: ${t}" https://example.org`,
    (t) => `const cfg = { apiKey: "${t}" };`,
    (t) => `OCP_APIM_SUBSCRIPTION_KEY = "${t}"`,
  ];
  for (let seed = 1; seed <= RUNS; seed += 1) {
    const r = rng(1000 + seed);
    const token = r.token(20 + r.int(20));
    const withCall = r.bool();
    const call = withCall ? r.pick(mappedCalls()) : null;
    const code = [r.pick(shapes)(token), call ? render(call, r.pick(LANGS), r) : 'console.log(1)'].join('\n');
    const res = resurrect(code, opts);
    assert.ok(!JSON.stringify(res).includes(token), `seed ${seed}`);
    assert.ok(res.redactions >= 1, `seed ${seed} redaction counted`);
  }
});

test('P3 untouched when nothing matches (R1.3)', () => {
  for (let seed = 1; seed <= RUNS; seed += 1) {
    const r = rng(2000 + seed);
    const text = [...junkLines(r, 1 + r.int(8)), `fetch("https://api.${r.word(6)}.org/v1/${r.word(4)}")`].join('\n');
    const res = resurrect(text, opts);
    assert.equal(res.code, text, `seed ${seed}`);
    assert.deepEqual(res.matches, []);
  }
});

test('P4 unmapped calls are never rewritten (R3.1, R3.2)', () => {
  for (let seed = 1; seed <= RUNS; seed += 1) {
    const r = rng(3000 + seed);
    const p = randomProgram(r, unmappedCalls());
    const res = resurrect(p.code, { ...opts, language: p.lang });
    assert.ok(res.matches.length >= 1, `seed ${seed} ${p.call.api.id}`);
    assert.ok(res.code.includes(MARKER), `seed ${seed} marker`);
    assert.ok(!res.code.includes('api.foxapis.com'), `seed ${seed} no foxapis url`);
    const without = res.code.split('\n').filter((l) => !l.includes(MARKER)).join('\n');
    assert.equal(without, p.code, `seed ${seed} every original line unchanged`);
  }
});

test('P10 detection finds the same api and endpoint in every language (R1.2)', () => {
  for (const call of allCalls()) {
    for (let k = 0; k < 5; k += 1) {
      const r = rng(4000 + k);
      const ids = LANGS.map((lang) => {
        const m = detect(render(call, lang, r), data.registry);
        assert.ok(m.length >= 1, `${call.api.id}/${call.ep.id} ${lang}`);
        return `${m[0].apiId}/${m[0].endpointId}`;
      });
      assert.equal(new Set(ids).size, 1, `${call.api.id}/${call.ep.id}: ${ids}`);
      assert.equal(ids[0], `${call.api.id}/${call.ep.id}`);
    }
  }
});

test('P11 rewrite never changes unrelated lines (R2.2)', () => {
  for (let seed = 1; seed <= RUNS; seed += 1) {
    const r = rng(5000 + seed);
    const p = randomProgram(r, mappedCalls());
    const res = resurrect(p.code, { ...opts, language: p.lang });
    assert.ok(res.code.includes('api.foxapis.com'), `seed ${seed}: the call was really replaced`);
    const out = res.code.split('\n');
    // lines after the call body keep their order at the end of the output
    if (p.after.length) assert.deepEqual(out.slice(out.length - p.after.length), p.after, `seed ${seed} tail`);
    // lines before the call stay, in order, as a subsequence at the start (helpers may be inserted after imports)
    let at = 0;
    for (const line of p.before) {
      const found = out.indexOf(line, at);
      assert.ok(found >= 0, `seed ${seed} before-line kept: ${line}`);
      at = found + 1;
    }
  }
});
