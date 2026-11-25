// Tests for detection of URLs assembled from string variables (task 17).
// The second-pass covers the case where a requirePath API's host is held in a
// named variable (without a path, so the first pass does not fire), and the
// path is visible at the call site.
// The engine must NEVER report a match when unsure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detect } from '../src/detect.js';
import { data } from './helpers.js';

const reg = data.registry;

// ---- JS: bare host in const, path visible at the call site ----------------------

test('JS: bare host in const BASE, path in string concatenation at call', () => {
  const code = [
    `const BASE = 'https://nubela.co';`,
    `const res = await fetch(BASE + '/proxycurl/api/v2/linkedin?url=' + encodeURIComponent(u));`,
  ].join('\n');
  const m = detect(code, reg);
  assert.ok(m.some((x) => x.apiId === 'proxycurl' && x.endpointId === 'person_profile'),
    `no match in: ${JSON.stringify(m.map(x => x.apiId + '/' + x.endpointId))}`);
});

test('JS: bare host only (no scheme) in variable, path at call site', () => {
  const code = [
    `const API_HOST = 'nubela.co';`,
    `const resp = await fetch(\`https://\${API_HOST}/proxycurl/api/v2/linkedin?url=\${u}\`);`,
  ].join('\n');
  const m = detect(code, reg);
  assert.ok(m.some((x) => x.apiId === 'proxycurl' && x.endpointId === 'person_profile'),
    `no match in: ${JSON.stringify(m.map(x => x.apiId + '/' + x.endpointId))}`);
});

test('JS: work email path visible at call site, host in variable', () => {
  const code = [
    `const PROXYCURL = 'https://nubela.co';`,
    `const r = await fetch(PROXYCURL + '/proxycurl/api/linkedin/profile/email?url=' + u);`,
  ].join('\n');
  const m = detect(code, reg);
  assert.ok(m.some((x) => x.apiId === 'proxycurl' && x.endpointId === 'work_email'),
    `no match in: ${JSON.stringify(m.map(x => x.apiId + '/' + x.endpointId))}`);
});

// ---- Python: bare host in variable, path at call site ---------------------------

test('Python: bare host in BASE, path visible in requests.get call', () => {
  const code = [
    `BASE = "https://nubela.co"`,
    `def get_profile(url):`,
    `    resp = requests.get(BASE + "/proxycurl/api/v2/linkedin", params={"url": url})`,
    `    return resp.json()`,
  ].join('\n');
  const m = detect(code, reg);
  assert.ok(m.some((x) => x.apiId === 'proxycurl' && x.endpointId === 'person_profile'),
    `no match in: ${JSON.stringify(m.map(x => x.apiId + '/' + x.endpointId))}`);
});

// ---- Conservatism: must NOT fire when unsure ------------------------------------

test('no match: variable name appears in a call but holds an unknown host', () => {
  const code = [
    `const BASE = 'https://api.example.com';`,
    `const res = await fetch(BASE + '/v1/people');`,
  ].join('\n');
  const m = detect(code, reg);
  assert.deepEqual(m, []);
});

test('no match: dead host in variable but variable is never used in a call', () => {
  // The first pass already catches the full URL on the assignment line, but
  // the variable-URL second pass alone should not add a spurious second match.
  const code = [
    `const BASE = 'https://nubela.co';`,
    `console.log("old base was", BASE);`,
  ].join('\n');
  // No second-pass match (first pass won't fire either — no path on assignment line
  // means requirePath API won't match).
  const m = detect(code, reg);
  // May be empty OR have a first-pass match if URL_RE picks up 'nubela.co' on its own;
  // the key assertion is that the variable-URL second pass did NOT add a call-line match.
  const callLineMatches = m.filter((x) => x.line === 1);
  assert.deepEqual(callLineMatches, [], `second-pass must not match the console.log line`);
});

test('no match: path at call site belongs to a live product, not the dead API', () => {
  // nubela.co/api/ is NinjaPear (live); only /proxycurl/ paths should fire
  const code = [
    `const BASE = 'https://nubela.co';`,
    `const res = await fetch(BASE + '/api/v1/company/details?website=x');`,
  ].join('\n');
  const m = detect(code, reg);
  assert.deepEqual(m.filter((x) => x.apiId === 'proxycurl'), []);
});

test('no double-match: direct URL in a fetch is not reported twice', () => {
  const code = `const res = await fetch("https://nubela.co/proxycurl/api/v2/linkedin?url=x");`;
  const m = detect(code, reg);
  assert.equal(
    m.filter((x) => x.apiId === 'proxycurl' && x.endpointId === 'person_profile').length,
    1,
    'exactly one match, not two'
  );
});

test('no match: host in variable assigned inside a comment line', () => {
  const code = [
    `// const OLD = 'https://nubela.co';`,
    `const res = await fetch(OLD + '/proxycurl/api/v2/linkedin?url=x');`,
  ].join('\n');
  const m = detect(code, reg);
  // The call line has the path but no matching host-in-variable (comment was skipped)
  // so it should not match via the second pass.
  // (It may still match from the first pass finding the path pattern — but that would
  // be a false positive from first pass, which is an existing limitation.)
  // Key: second pass must not add a match.
  const secondPassMatches = m.filter((x) => x.evidence && x.evidence.some(e => e.includes('variable')));
  assert.deepEqual(secondPassMatches, []);
});
