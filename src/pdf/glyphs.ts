/**
 * Characters that are safe in PDF text.
 *
 * The built-in Helvetica used by all four documents is WinAnsi-encoded.
 * Anything outside that set renders as a blank box rather than raising an
 * error, so it fails silently and only shows up in the client's inbox.
 * Punctuation goes through here so there is one audited list.
 *
 * Deliberately absent, because WinAnsi does not have them: the rupee sign
 * (U+20B9), arrows, check marks, and the mathematical minus.
 */

export const GLYPH = {
  /** U+2022, WinAnsi 149 */
  bullet: '•',
  /** U+2013, WinAnsi 150 */
  enDash: '–',
  /** U+2014, WinAnsi 151 */
  emDash: '—',
  /** U+00B7, WinAnsi 183 */
  middot: '·',
  /** U+2019, WinAnsi 146 */
  apostrophe: '’',
} as const;

/** Joins fragments with a middle dot, skipping empties. */
export function joinDot(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => (part ?? '').trim())
    .filter((part) => part.length > 0)
    .join(` ${GLYPH.middot} `);
}

/** Falls back to an em dash so a table cell is never blank. */
export function orDash(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : GLYPH.emDash;
}
