import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { resurrect } from '../src/resurrect.js';
import { data, root, havePython, importCheck, pyCompile } from './helpers.js';
import { buildExamples, EXAMPLES } from '../scripts/build-examples.mjs';

const opts = { registry: data.registry, catalog: data.catalog };
const ex = (dir, file) => readFileSync(join(root, 'docs', 'examples', dir, file), 'utf8');

test('Proxycurl python example: call replaced, names kept, TODO inserted', () => {
  const r = resurrect(ex('01-proxycurl-person-profile', 'input.py'), opts);
  assert.equal(r.matches.length, 1);
  assert.equal(r.matches[0].mapped, true);
  assert.ok(r.code.includes('def load_profile(profile_url):'), 'function name kept');
  assert.ok(r.code.includes('url=profile_url'), 'variable kept');
  assert.ok(r.code.includes('TODO: full name of the person'));
  assert.ok(r.code.includes('response = ResurrectedResponse('), 'response variable kept');
  assert.ok(r.code.includes('return response.json()'), 'surrounding code untouched');
  assert.ok(!r.code.includes('requests.get'), 'old call gone');
  assert.ok(!r.code.includes('nubela.co'));
  assert.ok(r.changes.some((c) => c.includes('url -> linkedin_url')));
  assert.ok(r.unfilled.some((u) => u.field === 'city'));
});

test('Clearbit js example: declaration keyword and variable name kept, status is moved', () => {
  const r = resurrect(ex('02-clearbit-company', 'input.js'), opts);
  assert.equal(r.matches[0].status, 'moved');
  assert.match(r.matches[0].label, /moved/);
  assert.ok(r.code.includes('const res = _resurrected_1 !== null'));
  assert.ok(r.code.includes('if (!res.ok) return null;'));
  assert.ok(r.notes.some((n) => n.includes('PARTIAL')));
  assert.ok(!r.code.includes('clearbit.com'));
});

test('Bing example: no equivalent, code left alone, marker added, nothing invented', () => {
  for (const f of ['input.js', 'input.py']) {
    const input = ex('03-bing-search', f);
    const r = resurrect(input, opts);
    assert.equal(r.matches[0].mapped, false);
    assert.equal(r.unmapped.length, 1);
    assert.ok(r.code.includes('RESURRECT: no FoxAPIs equivalent'));
    assert.ok(!r.code.includes('api.foxapis.com'));
    const kept = r.code.split('\n').filter((l) => !l.includes('RESURRECT: no FoxAPIs equivalent')).join('\n');
    assert.equal(kept, input.replace(/\r\n/g, '\n'));
  }
});

test('curl input is replaced by a curl call to FoxAPIs', () => {
  const r = resurrect(`curl -H "Authorization: Bearer abcdefghijklmnopqrstuvwx" \\\n  "https://nubela.co/proxycurl/api/v2/linkedin?url=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fsatya"`, opts);
  assert.ok(r.code.includes('https://api.foxapis.com/v1/enrich_person'));
  assert.ok(r.code.includes('"linkedin_url":"https://www.linkedin.com/in/satya"'));
  assert.ok(r.code.includes('TODO: full name'));
  assert.ok(!r.code.includes('abcdefghijklmnopqrstuvwx'));
  assert.ok(!r.code.includes('nubela.co'));
});

test('secrets in pasted code are redacted and never echoed (R6.2)', () => {
  const secret = 'sk_' + 'live_ABCDEFGH12345678abcd';
  const r = resurrect(`const KEY = "${secret}";\nconsole.log(1)`, opts);
  assert.ok(!JSON.stringify(r).includes('ABCDEFGH12345678'));
  assert.ok(r.redactions >= 1);
});

test('committed examples are exactly what the engine produces', () => {
  const before = EXAMPLES.flatMap((e) => readdirSync(join(root, 'docs', 'examples', e.dir)).map((f) => [e.dir, f, ex(e.dir, f)]));
  buildExamples();
  for (const [dir, f, text] of before) assert.equal(ex(dir, f), text, `${dir}/${f} is stale: run npm run build`);
});

test('every example output file passes a syntax check', async () => {
  for (const e of EXAMPLES) {
    const dir = join(root, 'docs', 'examples', e.dir);
    for (const f of readdirSync(dir)) {
      if (f.startsWith('input') || !/\.(js|py)$/.test(f)) continue;
      const path = join(dir, f);
      if (f.endsWith('.js')) {
        // examples use top-level await and import syntax: check as a module
        const r = await importCheck(path);
        assert.ok(r.ok, `${e.dir}/${f}: ${r.error}`);
      } else if (havePython()) {
        const r = pyCompile(path);
        assert.equal(r.status, 0, `${e.dir}/${f}: ${r.stderr}`);
      }
    }
  }
});
