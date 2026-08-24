/**
 * Shared visual language for all four documents.
 *
 * Typeface: the PDF built-in Helvetica family. Registering a web font would
 * mean fetching a file at generation time, which fails offline and on a flaky
 * connection — the two moments you most want an invoice to work. The built-ins
 * are embedded in every PDF reader, so documents always render identically.
 *
 * Encoding: built-in fonts are WinAnsi-encoded. Any character outside that set
 * (the rupee sign, arrows, check marks) silently renders as a blank box, so
 * document text is restricted to Latin-1 plus the few punctuation marks WinAnsi
 * carries: bullet, en/em dash, middle dot and curly quotes.
 */

import { StyleSheet } from '@react-pdf/renderer';

export const FONT = {
  body: 'Helvetica',
  bold: 'Helvetica-Bold',
  italic: 'Helvetica-Oblique',
} as const;

export const COLOR = {
  ink: '#0F1117',
  muted: '#4A5162',
  faint: '#8A90A0',
  hairline: '#D9DCE3',
  rule: '#0F1117',
  accent: '#4F46E5',
  accentSoft: '#EEF0FE',
  paper: '#FFFFFF',
  zebra: '#FAFAFC',
} as const;

/** A4 in points, less the page padding below. */
export const PAGE = {
  paddingTop: 104,
  paddingBottom: 76,
  paddingHorizontal: 48,
  contentWidth: 595.28 - 96,
} as const;

export const styles = StyleSheet.create({
  page: {
    backgroundColor: COLOR.paper,
    color: COLOR.ink,
    fontFamily: FONT.body,
    fontSize: 9.5,
    lineHeight: 1.5,
    paddingTop: PAGE.paddingTop,
    paddingBottom: PAGE.paddingBottom,
    paddingLeft: PAGE.paddingHorizontal,
    paddingRight: PAGE.paddingHorizontal,
  },

  /* ------------------------------- header ------------------------------- */
  header: {
    position: 'absolute',
    top: 40,
    left: PAGE.paddingHorizontal,
    right: PAGE.paddingHorizontal,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  wordmark: {
    fontFamily: FONT.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  wordmarkLogo: {
    height: 22,
    marginBottom: 3,
  },
  discipline: {
    fontSize: 6.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: COLOR.faint,
    marginTop: 2,
  },
  headerMeta: {
    alignItems: 'flex-end',
  },
  docTitle: {
    fontFamily: FONT.bold,
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLOR.ink,
  },
  docDate: {
    fontSize: 7.5,
    color: COLOR.faint,
    marginTop: 2,
  },
  /* The one piece of colour on the page: a short accent segment that starts the
     rule under the wordmark, with the hairline continuing across. */
  headerRule: {
    flexDirection: 'row',
    marginTop: 9,
  },
  headerRuleAccent: {
    width: 34,
    height: 1.6,
    backgroundColor: COLOR.accent,
  },
  headerRuleRest: {
    flexGrow: 1,
    height: 1.6,
    backgroundColor: COLOR.hairline,
  },

  /* ------------------------------- footer ------------------------------- */
  footer: {
    position: 'absolute',
    bottom: 34,
    left: PAGE.paddingHorizontal,
    right: PAGE.paddingHorizontal,
  },
  footerRule: {
    height: 0.6,
    backgroundColor: COLOR.hairline,
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  footerContact: {
    fontSize: 7,
    color: COLOR.muted,
  },
  footerPage: {
    fontSize: 7,
    color: COLOR.muted,
  },
  footerCredit: {
    fontSize: 6,
    color: COLOR.faint,
    marginTop: 3,
  },

  /* ------------------------------ structure ----------------------------- */
  section: {
    marginTop: 20,
  },
  sectionFirst: {
    marginTop: 4,
  },
  sectionHeading: {
    fontFamily: FONT.bold,
    fontSize: 8,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: COLOR.ink,
  },
  sectionRule: {
    height: 0.6,
    backgroundColor: COLOR.hairline,
    marginTop: 5,
    marginBottom: 10,
  },

  eyebrow: {
    fontSize: 6.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: COLOR.faint,
    marginBottom: 4,
  },

  /* ---------------------------- parties block --------------------------- */
  parties: {
    flexDirection: 'row',
    marginTop: 2,
  },
  partyColumn: {
    width: '48%',
  },
  partySpacer: {
    width: '4%',
  },
  partyName: {
    fontFamily: FONT.bold,
    fontSize: 10,
  },
  partyLine: {
    fontSize: 8.5,
    color: COLOR.muted,
  },

  /* -------------------------------- text -------------------------------- */
  projectTitle: {
    fontFamily: FONT.bold,
    fontSize: 16,
    lineHeight: 1.25,
  },
  projectSummary: {
    fontSize: 10,
    color: COLOR.muted,
    marginTop: 4,
  },
  paragraph: {
    fontSize: 9.5,
    lineHeight: 1.6,
    marginBottom: 6,
  },
  small: {
    fontSize: 8,
    color: COLOR.muted,
  },
  strong: {
    fontFamily: FONT.bold,
  },

  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bulletMark: {
    width: 12,
    fontSize: 9.5,
    color: COLOR.accent,
  },
  bulletText: {
    flexGrow: 1,
    flexBasis: 0,
    fontSize: 9.5,
    lineHeight: 1.5,
  },

  /* ------------------------------- clauses ------------------------------ */
  clause: {
    flexDirection: 'row',
    marginBottom: 9,
  },
  clauseNumber: {
    width: 20,
    fontFamily: FONT.bold,
    fontSize: 9,
  },
  clauseBody: {
    flexGrow: 1,
    flexBasis: 0,
  },
  clauseHeading: {
    fontFamily: FONT.bold,
    fontSize: 9,
    marginBottom: 2,
  },

  /* -------------------------------- table ------------------------------- */
  table: {
    marginTop: 2,
  },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLOR.rule,
    borderBottomStyle: 'solid',
    paddingBottom: 4,
  },
  tableHeadCell: {
    fontFamily: FONT.bold,
    fontSize: 7,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: COLOR.ink,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.6,
    borderBottomColor: COLOR.hairline,
    borderBottomStyle: 'solid',
    paddingTop: 6,
    paddingBottom: 6,
  },
  tableCell: {
    fontSize: 9,
  },
  tableCellMuted: {
    fontSize: 8.5,
    color: COLOR.muted,
  },
  alignRight: {
    textAlign: 'right',
  },

  /* -------------------------------- totals ------------------------------ */
  totals: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalsInner: {
    width: '58%',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 4,
  },
  totalsLabel: {
    fontSize: 9,
    color: COLOR.muted,
  },
  totalsValue: {
    fontSize: 9,
  },
  totalsGrand: {
    borderTopWidth: 1,
    borderTopColor: COLOR.rule,
    borderTopStyle: 'solid',
    marginTop: 4,
    paddingTop: 6,
  },
  totalsGrandLabel: {
    fontFamily: FONT.bold,
    fontSize: 10,
  },
  totalsGrandValue: {
    fontFamily: FONT.bold,
    fontSize: 10,
  },
  balanceBox: {
    marginTop: 8,
    backgroundColor: COLOR.accentSoft,
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontFamily: FONT.bold,
    fontSize: 9,
    color: COLOR.accent,
  },
  balanceValue: {
    fontFamily: FONT.bold,
    fontSize: 11,
    color: COLOR.accent,
  },

  /* ------------------------------ key values ---------------------------- */
  factRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.6,
    borderBottomColor: COLOR.hairline,
    borderBottomStyle: 'solid',
    paddingTop: 5,
    paddingBottom: 5,
  },
  factLabel: {
    width: '34%',
    fontSize: 8,
    letterSpacing: 0.3,
    color: COLOR.faint,
  },
  factValue: {
    flexGrow: 1,
    flexBasis: 0,
    fontSize: 9,
  },

  /* ------------------------------- callout ------------------------------ */
  callout: {
    marginTop: 16,
    borderLeftWidth: 2,
    borderLeftColor: COLOR.accent,
    borderLeftStyle: 'solid',
    paddingLeft: 10,
    paddingTop: 2,
    paddingBottom: 2,
  },

  /* ------------------------------ signatures ---------------------------- */
  signatures: {
    flexDirection: 'row',
    marginTop: 34,
  },
  signatureColumn: {
    width: '46%',
  },
  signatureSpacer: {
    width: '8%',
  },
  signatureLine: {
    height: 0.8,
    backgroundColor: COLOR.ink,
    marginBottom: 5,
    marginTop: 26,
  },
  signatureName: {
    fontFamily: FONT.bold,
    fontSize: 9,
  },
  signatureRole: {
    fontSize: 7.5,
    color: COLOR.faint,
    marginTop: 1,
  },

  /* -------------------------------- chips ------------------------------- */
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    fontSize: 8,
    color: COLOR.muted,
    borderWidth: 0.6,
    borderColor: COLOR.hairline,
    borderStyle: 'solid',
    borderRadius: 2,
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 6,
    paddingRight: 6,
    marginRight: 5,
    marginBottom: 5,
  },
});
