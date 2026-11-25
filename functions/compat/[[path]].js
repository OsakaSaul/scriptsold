// Cloudflare Pages Function: compat route for Proxycurl-shaped requests.
// Path: /compat/proxycurl/<old-path>  (the [[path]] catch-all handles any sub-path)
//
// Task 13: sample mode only.
//   Request header X-Resurrect-Sample: 1 -> answer from a recorded fixture,
//   body includes _resurrect.sample: true; Cache-Control: no-store.
//
// Task 14 (live path) will be added in the next task.
//
// Every dynamic response sets Cache-Control: no-store (R6.4).
// Keys are never logged or stored (R6.1, R6.2).

import { loadData } from '../../src/node.js';
import { translate } from '../../src/compat/translate.js';
import { enrichPersonSample, findEmailNoMatch } from '../../src/compat/fixtures.js';

// Map: old path pattern -> { endpoint registry id, sample fixture response }
// Patterns match the full pathname, which in tests is passed as /compat/<old-path>.
const ROUTE_TABLE = [
  {
    id: 'person_profile',
    pattern: /^\/(compat\/)?(proxycurl\/)?api\/v2\/linkedin\/?$/,
    sampleBody: enrichPersonSample.response,
    creditsUsed: enrichPersonSample.run.credits,
  },
  {
    id: 'work_email',
    pattern: /^\/(compat\/)?(proxycurl\/)?api\/linkedin\/profile\/email\/?$/,
    sampleBody: findEmailNoMatch.response,
    creditsUsed: findEmailNoMatch.response.credits_used,
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

function oldErrorBody(message) {
  // Proxycurl error shape: { detail: string }
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
    return jsonResponse(oldErrorBody('This path is not served by Resurrect. Check the docs for supported compat routes.'), 404);
  }

  // Load the registry endpoint definition.
  const { registry } = loadData();
  const api = registry.apis.find((a) => a.id === 'proxycurl');
  const ep = api.endpoints.find((e) => e.id === route.id);

  // Auth check: require Authorization: Bearer <anything>
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.trim()) {
    return jsonResponse(oldErrorBody('Authentication credentials were not provided.'), 401);
  }
  if (!/^Bearer\s+\S/.test(authHeader)) {
    return jsonResponse(oldErrorBody('Invalid authorization token.'), 401);
  }

  // Sample mode
  const isSample = request.headers.get('X-Resurrect-Sample') === '1';
  if (isSample) {
    let body;
    if (ep.mapping && ep.mapping.result.kind === 'old-shape') {
      body = translate(route.sampleBody, ep, { sample: true, creditsUsed: route.creditsUsed });
      if (body === null) {
        return jsonResponse({ ...oldErrorBody('No profile found in the sample response.'), _resurrect: { source: 'foxapis', sample: true } }, 404);
      }
    } else {
      // passthrough / raw mapping (work_email): return the fixture response with _resurrect metadata
      body = { ...route.sampleBody, _resurrect: { source: 'foxapis', sample: true, credits_used: route.creditsUsed } };
    }
    return jsonResponse(body, 200, { 'X-Resurrect-Sample': 'true' });
  }

  // Live path: not implemented yet (task 14).
  return jsonResponse(
    oldErrorBody('Live compat calls are not yet enabled. Send X-Resurrect-Sample: 1 to try the endpoint with a recorded response.'),
    503,
  );
}
