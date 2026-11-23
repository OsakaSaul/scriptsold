// Strips anything that looks like a secret from pasted code before it is
// processed. The matched value is replaced with <redacted> and counted. The
// secret itself is never kept, returned or logged.

const RULES = [
  // Authorization: Bearer <token>, with or without quotes
  { re: /(\bBearer\s+)([A-Za-z0-9_\-.=+/]{16,})/g, keep: 1 },
  // key-like names assigned a long quoted literal
  { re: /((?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token|secret|client[_-]?secret|subscription[_-]?key|x-api-key|ocp-apim-subscription-key)['"]?\s*[:=]\s*['"])([^'"\s]{12,})(['"])/gi, keep: 1, tail: 3 },
  // query string key=value
  { re: /([?&](?:api[_-]?key|apikey|access[_-]?token|key|token)=)([A-Za-z0-9_\-.]{12,})/gi, keep: 1 },
  // header lines: x-api-key: value, Ocp-Apim-Subscription-Key: value
  { re: /((?:x-api-key|ocp-apim-subscription-key|api_key)\s*:\s*)([A-Za-z0-9_\-.]{12,})/gi, keep: 1 },
  // well-known token prefixes
  { re: /\b(sk_(?:live|test)_|pk_live_|ghp_|gho_|xox[baprs]-)([A-Za-z0-9_\-]{10,})/g, keep: 1 },
];

export function redact(code) {
  let count = 0;
  let out = code;
  for (const rule of RULES) {
    out = out.replace(rule.re, (...m) => {
      count += 1;
      const head = m[rule.keep];
      const tail = rule.tail ? m[rule.tail] : '';
      return `${head}<redacted>${tail}`;
    });
  }
  return { code: out, count };
}
