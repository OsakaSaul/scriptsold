// Cloudflare Pages Function: compat route for Proxycurl-shaped requests.
// Path: /compat/proxycurl/<old-path>  (the [[path]] catch-all handles any sub-path)
//
// Task 13: sample mode — X-Resurrect-Sample: 1 returns a recorded fixture.
// Task 14: live path  — forwards bearer key to FoxAPIs, translates response.
//
// Security:
//   - Keys are forwarded and immediately discarded; never stored or logged.
//   - Only api.foxapis.com is ever contacted; no user-supplied URLs are fetched.
//   - Cache-Control: no-store on every response.
//   - Logs only: route matched, response status. No request bodies or headers.

import { loadData } from '../../src/node.js';
import { translate } from '../../src/compat/translate.js';
import { enrichPersonSample, findEmailNoMatch } from '../../src/compat/fixtures.js';

const FOXAPIS_BASE = 'https://api.foxapis.com';

// Map: old path pattern -> { endpoint registry id, sample fixture, params extractor }
const ROUTE_TABLE = [
  {
    id: 'person_profile',
    pattern: /^\/(compat\/)?(proxycurl\/)?api\/v2\/linkedin\/?$/,
    sampleBody: enrichPersonSample.response,
    creditsUsed: enrichPersonSample.run.credits,
    // Extract params from old-style request (query string for GET, body for POST)
    extractParams: async (request) => {
      const url = new URL(request.url);
      const q = url.searchParams;
      if (request.method === 'POST') {
        try {
          const b = await request.json();
          return { name: b.name, company: b.company, domain: b.domain, url: b.url || b.linkedin_url };
        } catch { return {}; }
      }
      return { name: q.get('name'), company: q.get('company'), domain: q.get('domain'), url: q.get('url') };
    },
    requiredParams: ['name'],
    // Build the FoxAPIs request body from old params
    toFoxBody: (params) => {
      const body = { name: params.name };
      if (params.company) body.company = params.company;
      if (params.domain) body.domain = params.domain;
      if (params.url) body.linkedin_url = params.url;
      return body;
    },
  },
  {
    id: 'work_email',
    pattern: /^\/(compat\/)?(proxycurl\/)?api\/linkedin\/profile\/email\/?$/,
    sampleBody: findEmailNoMatch.response,
    creditsUsed: findEmailNoMatch.response.credits_used,
    extractParams: async (request) => {
      const url = new URL(request.url);
      const q = url.searchParams;
      if (request.method === 'POST') {
        try {
          const b = await request.json();
          return { website: b.website, name: b.name };
        } catch { return {}; }
      }
      return { website: q.get('website'), name: q.get('name') };
    },
    requiredParams: ['website'],
    toFoxBody: (params) => {
      const body = { website: params.website };
      if (params.name) body.name = params.name;
      return body;
    },
  },
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Resurrect-Sample',
};

function jsonResponse(body, status, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Resurrect-Source': 'foxapis',
      ...CORS_HEADERS,
      ...extra,
    },
  });
}

// Proxycurl error shape: { detail: string }
function oldError(message) {
  return { detail: message, _resurrect: { source: 'foxapis', error: true } };
}

export async function onRequest(context) {
  const { request } = context;

  // Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store' } });
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  // Match to a known old endpoint.
  const route = ROUTE_TABLE.find((r) => r.pattern.test(pathname));
  if (!route) {
    return jsonResponse(oldError('This path is not served by Resurrect. Check the docs for supported compat routes.'), 404);
  }

  // Load registry endpoint definition once per request.
  const { registry } = loadData();
  const api = registry.apis.find((a) => a.id === 'proxycurl');
  const ep = api.endpoints.find((e) => e.id === route.id);

  // Auth check: require Authorization: Bearer <anything>
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.trim()) {
    return jsonResponse(oldError('Authentication credentials were not provided.'), 401);
  }
  if (!/^Bearer\s+\S/.test(authHeader)) {
    return jsonResponse(oldError('Invalid authorization token.'), 401);
  }

  // Extract the caller's key (never logged).
  const callerKey = authHeader.replace(/^Bearer\s+/i, '').trim();

  // ---- Sample mode -------------------------------------------------------
  const isSample = request.headers.get('X-Resurrect-Sample') === '1';
  if (isSample) {
    let body;
    if (ep.mapping && ep.mapping.result.kind === 'old-shape') {
      body = translate(route.sampleBody, ep, { sample: true, creditsUsed: route.creditsUsed });
      if (body === null) {
        return jsonResponse({ ...oldError('No profile found in the sample response.'), _resurrect: { source: 'foxapis', sample: true } }, 404);
      }
    } else {
      body = { ...route.sampleBody, _resurrect: { source: 'foxapis', sample: true, credits_used: route.creditsUsed } };
    }
    return jsonResponse(body, 200, { 'X-Resurrect-Sample': 'true' });
  }

  // ---- Live path ---------------------------------------------------------

  // Parse and validate old params before spending any credits (422).
  const params = await route.extractParams(request);
  for (const p of route.requiredParams) {
    if (!params[p]) {
      return jsonResponse(
        oldError(`${p} is required. The old Proxycurl call did not need it, but FoxAPIs does. Add it to your request.`),
        422,
      );
    }
  }

  const foxBody = route.toFoxBody(params);
  const foxHeaders = {
    Authorization: `Bearer ${callerKey}`,
    'Content-Type': 'application/json',
  };

  // Forward to FoxAPIs (only https://api.foxapis.com; never a user-supplied URL).
  let foxStatus, foxData;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    let foxRes;
    try {
      foxRes = await fetch(`${FOXAPIS_BASE}${ep.mapping.foxapis.path}`, {
        method: ep.mapping.foxapis.method,
        headers: foxHeaders,
        body: JSON.stringify(foxBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    foxStatus = foxRes.status;
    try { foxData = await foxRes.json(); } catch { foxData = null; }
  } catch (err) {
    // Timeout or network error -> 502
    return jsonResponse(
      oldError('FoxAPIs did not respond in time. Try again in a moment.'),
      502,
      { 'Retry-After': '5' },
    );
  }

  // Map FoxAPIs status to old API shape.
  if (foxStatus === 401 || foxStatus === 403) {
    return jsonResponse(oldError('The key was rejected by FoxAPIs. Check that FOXAPIS_KEY is correct.'), 401);
  }
  if (foxStatus === 429) {
    const retryAfter = (foxData && foxData.retry_after) ? String(foxData.retry_after) : '60';
    return jsonResponse(oldError('Rate limit reached. Try again later.'), 429, { 'Retry-After': retryAfter });
  }
  if (foxStatus >= 500) {
    return jsonResponse(oldError('FoxAPIs returned an error. Try again in a moment.'), 502, { 'Retry-After': '5' });
  }
  if (foxStatus >= 400) {
    return jsonResponse(oldError(`FoxAPIs returned status ${foxStatus}.`), 502);
  }

  // 200: translate to old shape.
  if (ep.mapping.result.kind === 'old-shape') {
    const creditsUsed = foxData && typeof foxData.credits_used === 'number' ? foxData.credits_used : undefined;
    const translated = translate(foxData, ep, { creditsUsed });
    if (translated === null) {
      // Empty result -> 404 in old shape (R4.9)
      return jsonResponse(oldError('No profile found.'), 404);
    }
    return jsonResponse(translated, 200);
  }

  // Raw / passthrough mapping (work_email): return FoxAPIs data directly with _resurrect metadata.
  const creditsUsed = foxData && typeof foxData.credits_used === 'number' ? foxData.credits_used : undefined;
  const body = { ...foxData, _resurrect: { source: 'foxapis', credits_used: creditsUsed } };
  return jsonResponse(body, 200);
}
