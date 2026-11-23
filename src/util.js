// Small pure helpers shared by the engine. No I/O.

export const LANGUAGES = ['js', 'ts', 'py', 'php', 'rb', 'go', 'curl', 'html'];

const COMMENT = {
  js: ['// ', ''], ts: ['// ', ''], go: ['// ', ''], php: ['// ', ''],
  py: ['# ', ''], rb: ['# ', ''], curl: ['# ', ''], html: ['<!-- ', ' -->'],
};

export function commentLine(language, text, indent = '') {
  const [a, b] = COMMENT[language] || COMMENT.js;
  return `${indent}${a}${text}${b}`;
}

export function detectLanguage(code, hint) {
  if (hint && hint !== 'auto' && LANGUAGES.includes(hint)) return hint;
  const t = code.trim();
  if (/^\s*curl\s/m.test(t)) return 'curl';
  if (/^\s*<(!doctype|html|img|div|a|script)\b/im.test(t)) return 'html';
  if (/^\s*<\?php/m.test(t) || /\$[a-z_]+\s*=\s*curl_init|file_get_contents\(/i.test(t)) return 'php';
  if (/^\s*package\s+main\b/m.test(t) || /\bhttp\.(Get|NewRequest)\(/.test(t) || /:=/.test(t)) return 'go';
  if (/^\s*(require|require_relative)\s+['"]|\bNet::HTTP\b|\bHTTParty\b/m.test(t)) return 'rb';
  if (/^\s*(import\s+\w|from\s+\w+\s+import)|\brequests\.(get|post)\(|\bdef\s+\w+\(|\burllib\b/m.test(t) && !/\bconst\s|=>|\blet\s/.test(t)) return 'py';
  if (/:\s*(string|number|boolean|any)\b|\binterface\s+\w+|\bas\s+(string|any)\b/.test(t)) return 'ts';
  return 'js';
}

export function leadingWhitespace(line) {
  return line.match(/^[ \t]*/)[0];
}

export function jsString(s) {
  return JSON.stringify(String(s));
}

export function pyString(s) {
  return JSON.stringify(String(s));
}

// Small deterministic PRNG for the property tests and nothing else.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
