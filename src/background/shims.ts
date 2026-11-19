/**
 * Globals the shared code expects but the background runner's QuickJS lacks.
 * Only installed when missing, so the same bundle also runs under Node/browsers in tests.
 */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Standard base64 → binary string (used to unpack the AACGM grid). */
export function atobPolyfill(input: string): string {
  const s = input.replace(/[\s=]+/g, '');
  let out = '';
  let buf = 0;
  let bits = 0;
  for (let i = 0; i < s.length; i++) {
    const v = B64.indexOf(s[i]!);
    if (v < 0) throw new Error('invalid base64');
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((buf >> bits) & 0xff);
    }
  }
  return out;
}

const g = globalThis as { atob?: (s: string) => string };
if (typeof g.atob !== 'function') g.atob = atobPolyfill;
