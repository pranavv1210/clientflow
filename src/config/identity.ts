/**
 * Fixed sender identity.
 *
 * This is the one place these details live. Every screen and all four PDF
 * templates read from here, so they are never re-typed and cannot drift.
 */

export const IDENTITY = {
  /** Shown as the text wordmark on every document. */
  wordmark: 'Pranav V',
  legalName: 'Pranav V',
  discipline: 'Web & App Developer',
  email: 'pranavv736@gmail.com',
  phone: '+91 76768 58328',
} as const;

export const PRODUCT = {
  name: 'ClientFlow',
  /** Small credit line in the PDF footer. */
  credit: 'Generated with ClientFlow',
} as const;

/**
 * Optional logo. Drop a PNG at `public/logo.png` and set this to '/logo.png'
 * to replace the text wordmark on documents. Left empty, documents use the
 * typeset wordmark above, which is sharper than a low-resolution image.
 */
export const LOGO_URL = '';

export const CURRENCY = {
  /** Used in the app UI, where the browser font has the glyph. */
  uiSymbol: '₹',
  /**
   * Used in PDFs. @react-pdf/renderer's built-in Helvetica is WinAnsi-encoded
   * and has no U+20B9 rupee glyph, so '₹' would render as a blank box.
   * See "Showing ₹ in PDFs" in README.md to switch to a Unicode font.
   */
  pdfPrefix: 'INR',
  code: 'INR',
} as const;
