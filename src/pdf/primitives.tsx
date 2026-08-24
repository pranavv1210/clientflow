/**
 * Building blocks shared by all four documents.
 *
 * Every document is composed from these, which is what keeps the header, the
 * footer, the section rhythm and the table styling identical across a Proposal,
 * an Agreement, an Invoice and a Handover.
 */

import type { ReactNode } from 'react';
import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import { COLOR, styles } from './theme';
import { GLYPH, joinDot, orDash } from './glyphs';
import { IDENTITY, LOGO_URL, PRODUCT } from '../config/identity';
import { formatDate } from '../lib/dates';
import type { ClientContact } from '../types/client';

/* -------------------------------------------------------------------------- */
/* Page shell                                                                 */
/* -------------------------------------------------------------------------- */

interface SheetProps {
  /** Printed at top right, e.g. 'Invoice'. */
  documentTitle: string;
  /** 'YYYY-MM-DD'. Printed under the title. */
  date: string;
  /** Optional second line at top right, e.g. an invoice number. */
  reference?: string;
  children: ReactNode;
}

/**
 * One A4 page with the repeating header and footer.
 *
 * The header and footer are absolutely positioned and marked `fixed`, so they
 * repeat on every page while the page's own padding keeps body text clear of
 * them. Page numbers use a render callback because the total is not known until
 * layout finishes.
 */
export function Sheet({ documentTitle, date, reference, children }: SheetProps) {
  return (
    <Page size="A4" style={styles.page}>
      <View fixed style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            {LOGO_URL ? (
              <Image src={LOGO_URL} style={styles.wordmarkLogo} />
            ) : (
              <Text style={styles.wordmark}>{IDENTITY.wordmark}</Text>
            )}
            <Text style={styles.discipline}>{IDENTITY.discipline}</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.docTitle}>{documentTitle}</Text>
            <Text style={styles.docDate}>{formatDate(date)}</Text>
            {reference ? <Text style={styles.docDate}>{reference}</Text> : null}
          </View>
        </View>
        <View style={styles.headerRule}>
          <View style={styles.headerRuleAccent} />
          <View style={styles.headerRuleRest} />
        </View>
      </View>

      <View fixed style={styles.footer}>
        <View style={styles.footerRule} />
        <View style={styles.footerRow}>
          <Text style={styles.footerContact}>
            {joinDot([IDENTITY.legalName, IDENTITY.email, IDENTITY.phone])}
          </Text>
          <Text
            style={styles.footerPage}
            fixed
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
        <Text style={styles.footerCredit}>{PRODUCT.credit}</Text>
      </View>

      {children}
    </Page>
  );
}

/** Wraps a single-page-shell document with sensible PDF metadata. */
export function Shell({
  title,
  subject,
  children,
}: {
  title: string;
  subject: string;
  children: ReactNode;
}) {
  return (
    <Document title={title} author={IDENTITY.legalName} subject={subject} creator={PRODUCT.name}>
      {children}
    </Document>
  );
}

/* -------------------------------------------------------------------------- */
/* Structure                                                                  */
/* -------------------------------------------------------------------------- */

export function Section({
  heading,
  first,
  children,
}: {
  heading: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={first ? styles.sectionFirst : styles.section}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      <View style={styles.sectionRule} />
      {children}
    </View>
  );
}

export function Paragraphs({ text }: { text: string }) {
  const blocks = text
    .split(/\n\s*\n|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return (
    <View>
      {blocks.map((block, index) => (
        <Text key={index} style={styles.paragraph}>
          {block}
        </Text>
      ))}
    </View>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, index) => (
        // wrap={false} stops a bullet from being orphaned from its text.
        <View key={index} style={styles.bulletRow} wrap={false}>
          <Text style={styles.bulletMark}>{GLYPH.bullet}</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function Chips({ items }: { items: string[] }) {
  return (
    <View style={styles.chipRow}>
      {items.map((item, index) => (
        <Text key={index} style={styles.chip}>
          {item}
        </Text>
      ))}
    </View>
  );
}

export function Callout({ children }: { children: ReactNode }) {
  return <View style={styles.callout}>{children}</View>;
}

/* -------------------------------------------------------------------------- */
/* Parties                                                                    */
/* -------------------------------------------------------------------------- */

function addressLines(address: string): string[] {
  return address
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** The from/to block that opens every document. */
export function Parties({
  client,
  recipientLabel = 'Prepared for',
}: {
  client: ClientContact;
  recipientLabel?: string;
}) {
  const businessFirst = client.businessName.trim().length > 0;
  const primary = businessFirst ? client.businessName : client.name || 'Client';
  const secondary = businessFirst && client.name ? client.name : '';

  return (
    <View style={styles.parties} wrap={false}>
      <View style={styles.partyColumn}>
        <Text style={styles.eyebrow}>From</Text>
        <Text style={styles.partyName}>{IDENTITY.legalName}</Text>
        <Text style={styles.partyLine}>{IDENTITY.discipline}</Text>
        <Text style={styles.partyLine}>{IDENTITY.email}</Text>
        <Text style={styles.partyLine}>{IDENTITY.phone}</Text>
      </View>
      <View style={styles.partySpacer} />
      <View style={styles.partyColumn}>
        <Text style={styles.eyebrow}>{recipientLabel}</Text>
        <Text style={styles.partyName}>{primary}</Text>
        {secondary ? <Text style={styles.partyLine}>{secondary}</Text> : null}
        {client.email ? <Text style={styles.partyLine}>{client.email}</Text> : null}
        {client.phone ? <Text style={styles.partyLine}>{client.phone}</Text> : null}
        {addressLines(client.address).map((line, index) => (
          <Text key={index} style={styles.partyLine}>
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Facts                                                                      */
/* -------------------------------------------------------------------------- */

export interface Fact {
  label: string;
  value: string;
}

/** Label/value rows for terms, schedules and handover locations. */
export function FactList({ facts }: { facts: Fact[] }) {
  const rows = facts.filter((fact) => fact.value.trim().length > 0);
  return (
    <View>
      {rows.map((fact, index) => (
        <View key={index} style={styles.factRow} wrap={false}>
          <Text style={styles.factLabel}>{fact.label}</Text>
          <Text style={styles.factValue}>{fact.value}</Text>
        </View>
      ))}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Table                                                                      */
/* -------------------------------------------------------------------------- */

export interface Column<T> {
  header: string;
  /** Percentage string, e.g. '46%'. Columns should add up to 100%. */
  width: string;
  align?: 'left' | 'right';
  muted?: boolean;
  value: (row: T) => string;
}

export function Table<T>({ columns, rows }: { columns: Array<Column<T>>; rows: T[] }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHead} fixed>
        {columns.map((column, index) => (
          <Text
            key={index}
            style={[
              styles.tableHeadCell,
              { width: column.width },
              column.align === 'right' ? styles.alignRight : {},
            ]}
          >
            {column.header}
          </Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.tableRow} wrap={false}>
          {columns.map((column, columnIndex) => (
            <Text
              key={columnIndex}
              style={[
                column.muted ? styles.tableCellMuted : styles.tableCell,
                { width: column.width },
                column.align === 'right' ? styles.alignRight : {},
              ]}
            >
              {orDash(column.value(row))}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Totals                                                                     */
/* -------------------------------------------------------------------------- */

export interface TotalLine {
  label: string;
  value: string;
  /** Renders with the heavier rule above and bold type. */
  grand?: boolean;
}

export function Totals({
  lines,
  balance,
}: {
  lines: TotalLine[];
  /** Optional highlighted balance-due row. */
  balance?: { label: string; value: string };
}) {
  return (
    <View style={styles.totals} wrap={false}>
      <View style={styles.totalsInner}>
        {lines.map((line, index) => (
          <View
            key={index}
            style={line.grand ? [styles.totalsRow, styles.totalsGrand] : styles.totalsRow}
          >
            <Text style={line.grand ? styles.totalsGrandLabel : styles.totalsLabel}>
              {line.label}
            </Text>
            <Text style={line.grand ? styles.totalsGrandValue : styles.totalsValue}>
              {line.value}
            </Text>
          </View>
        ))}
        {balance ? (
          <View style={styles.balanceBox}>
            <Text style={styles.balanceLabel}>{balance.label}</Text>
            <Text style={styles.balanceValue}>{balance.value}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Signatures                                                                 */
/* -------------------------------------------------------------------------- */

export function Signatures({ clientName }: { clientName: string }) {
  return (
    <View style={styles.signatures} wrap={false}>
      <View style={styles.signatureColumn}>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureName}>{IDENTITY.legalName}</Text>
        <Text style={styles.signatureRole}>Developer</Text>
        <Text style={styles.signatureRole}>Date:</Text>
      </View>
      <View style={styles.signatureSpacer} />
      <View style={styles.signatureColumn}>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureName}>{orDash(clientName)}</Text>
        <Text style={styles.signatureRole}>Client</Text>
        <Text style={styles.signatureRole}>Date:</Text>
      </View>
    </View>
  );
}

export { GLYPH, joinDot, orDash, COLOR };
