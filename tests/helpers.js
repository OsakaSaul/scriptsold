import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadData } from '../src/node.js';
import { emitStandalone } from '../src/emit.js';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const data = loadData();

export function endpoint(apiId, epId) {
  const api = data.registry.apis.find((a) => a.id === apiId);
  return { api, ep: api.endpoints.find((e) => e.id === epId) };
}

export function fixture(name) {
  return JSON.parse(readFileSync(join(root, 'fixtures', 'foxapis', name), 'utf8'));
}

let dir;
export function tmp() {
  if (!dir) dir = mkdtempSync(join(tmpdir(), 'scriptsold-test-'));
  return dir;
}
export function cleanup() {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
}

let n = 0;
// Loads the generated JavaScript for a mapping as a module.
export async function loadGeneratedJs(apiId, epId) {
  const { api, ep } = endpoint(apiId, epId);
  const file = join(tmp(), `gen-${(n += 1)}.mjs`);
  writeFileSync(file, emitStandalone(api, ep, 'js'));
  return import(pathToFileURL(file).href);
}

// Runs the generated JavaScript with a fake fetch that answers `answers` in order.
export async function runJs(apiId, epId, input, answers) {
  const mod = await loadGeneratedJs(apiId, epId);
  const { ep } = endpoint(apiId, epId);
  const fn = Object.values(mod).find((v) => typeof v === 'function');
  const calls = [];
  const realFetch = globalThis.fetch;
  const list = [...answers];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    const a = list.shift();
    return { status: a.status, ok: a.status < 400, json: async () => a.body };
  };
  process.env.FOXAPIS_KEY = 'test-key-not-real';
  try {
    return { result: await fn(input), calls, ep };
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.FOXAPIS_KEY;
  }
}

export function havePython() {
  const r = spawnSync('python', ['--version'], { encoding: 'utf8' });
  return r.status === 0;
}

// Runs the generated Python with a fake urlopen. Returns the parsed JSON it prints.
export function runPy(apiId, epId, kwargs, answers) {
  const { api, ep } = endpoint(apiId, epId);
  const d = tmp();
  const mod = join(d, `gen_${(n += 1)}.py`);
  writeFileSync(mod, emitStandalone(api, ep, 'py'));
  const fn = `resurrected_${ep.id}`;
  const harness = join(d, `harness_${n}.py`);
  writeFileSync(
    harness,
    `import importlib.util, io, json, os, sys, urllib.request
answers = json.loads(sys.argv[2])
seen = []
class FakeResp(io.BytesIO):
    def __init__(self, status, body):
        super().__init__(json.dumps(body).encode())
        self.status = status
    def __enter__(self): return self
    def __exit__(self, *a): return False
def fake_urlopen(req, timeout=None):
    seen.append({"url": req.full_url, "method": req.get_method(), "auth": req.get_header("Authorization"), "body": json.loads(req.data.decode()) if req.data else None})
    a = answers.pop(0)
    if a["status"] >= 400:
        import urllib.error
        raise urllib.error.HTTPError(req.full_url, a["status"], "x", {}, io.BytesIO(b"{}"))
    return FakeResp(a["status"], a["body"])
urllib.request.urlopen = fake_urlopen
os.environ["FOXAPIS_KEY"] = "test-key-not-real"
spec = importlib.util.spec_from_file_location("gen", sys.argv[1])
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
out = getattr(m, ${JSON.stringify(fn)})(**json.loads(sys.argv[3]))
print(json.dumps({"result": out, "calls": seen}))
`,
  );
  const r = spawnSync('python', ['-I', harness, mod, JSON.stringify(answers), JSON.stringify(kwargs)], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`python failed: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

// Syntax check for a JavaScript module: importing it parses it. The generated
// and example files define functions and have no side effects on import.
// (Spawning node from inside the test runner is not reliable on Windows.)
export async function importCheck(path) {
  try {
    await import(pathToFileURL(path).href);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e && e.message) };
  }
}

// Python syntax check that writes its bytecode to a temp file, not next to the source.
export function pyCompile(path) {
  const out = join(tmp(), 'check.pyc');
  return spawnSync('python', ['-I', '-c', 'import py_compile, sys; py_compile.compile(sys.argv[1], cfile=sys.argv[2], doraise=True)', path, out], { encoding: 'utf8' });
}
