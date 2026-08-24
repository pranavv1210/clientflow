/** Id generation and string helpers. */

/**
 * Stable unique id. crypto.randomUUID needs a secure context, which excludes
 * plain-http access from a phone on the local network, so there is a fallback.
 */
export function newId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(16));
    let out = '';
    for (let i = 0; i < bytes.length; i += 1) {
      out += bytes[i].toString(16).padStart(2, '0');
    }
    return out;
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Filename-safe slug: 'Glam by Khushi!' -> 'Glam-by-Khushi'. */
export function slugify(input: string): string {
  const cleaned = input
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'untitled';
}

/** First letter of the first two words, for the list avatar. */
export function initials(input: string): string {
  const words = input.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Splits a textarea into trimmed non-empty lines. */
export function linesFromText(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
