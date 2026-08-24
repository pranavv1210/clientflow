/**
 * Invoice.
 *
 * Amounts come from the same pricing the Proposal and Agreement printed, less
 * anything already received, so the balance due cannot disagree with them.
 */

import { Text, View } from '@react-pdf/renderer';
import type { ClientWorkspace } from '../types/client';
import {
  FactList,
  Parties,
  Paragraphs,
  Section,
  Sheet,
  Shell,
  Table,
  Totals,
} from './primitives';
import type { Fact, TotalLine } from './primitives';
import { styles } from './theme';
import { formatDate, isOverdue } from '../lib/dates';
import { balanceDue, formatMoneyPdf, receivedAmount, rupeesInWords } from '../lib/money';
import { DOCUMENT_META, documentDate } from '../lib/documents';
import { displayName } from '../lib/workspace';
import { billableItems, lineItemColumns, pricingTotalLines } from './ProposalDoc';

export function InvoiceDoc({ workspace }: { workspace: ClientWorkspace }) {
  const { client, project, pricing, invoice } = workspace;
  const issued = documentDate('invoice', workspace);
  const items = billableItems(pricing.lineItems);
  const received = receivedAmount(workspace);
  const due = balanceDue(workspace);

  // The same subtotal / discount / total block the Proposal and Agreement
  // print, so the client cannot be billed against a table that differs from the
  // one they approved. Only the 'Received' deduction is specific to an invoice.
  const lines: TotalLine[] = pricingTotalLines(workspace);
  if (received > 0) {
    lines.push({ label: 'Received', value: `- ${formatMoneyPdf(received)}` });
  }

  const meta: Fact[] = [
    { label: 'Invoice number', value: invoice.number },
    { label: 'Issue date', value: formatDate(issued) },
    { label: 'Due date', value: invoice.dueDate ? formatDate(invoice.dueDate) : '' },
    { label: 'Project', value: project.title },
  ];

  const overdue = Boolean(invoice.dueDate) && due > 0 && isOverdue(invoice.dueDate);

  return (
    <Shell title={`Invoice ${invoice.number} — ${displayName(workspace)}`} subject={project.title}>
      <Sheet
        documentTitle="Invoice"
        date={issued}
        reference={invoice.number ? invoice.number : undefined}
      >
        <Parties client={client} recipientLabel="Billed to" />

        <Section heading="Invoice details">
          <FactList facts={meta} />
        </Section>

        <Section heading="Work billed">
          {items.length > 0 ? <Table columns={lineItemColumns} rows={items} /> : null}
          <Totals
            lines={lines}
            balance={{
              label: received > 0 ? 'Balance due' : 'Amount due',
              value: formatMoneyPdf(due),
            }}
          />
          <View style={{ marginTop: 10 }}>
            <Text style={styles.small}>
              <Text style={styles.strong}>Amount in words: </Text>
              {rupeesInWords(due)}
            </Text>
          </View>
        </Section>

        <Section heading="How to pay">
          <FactList facts={[{ label: 'Method', value: pricing.paymentMethod }]} />
          {pricing.paymentDetails ? (
            <View style={{ marginTop: 8 }}>
              <Paragraphs text={pricing.paymentDetails} />
            </View>
          ) : null}
          {invoice.dueDate ? (
            <Text style={styles.small}>
              {overdue
                ? `This invoice was due on ${formatDate(invoice.dueDate)}.`
                : `Please settle this invoice by ${formatDate(invoice.dueDate)}.`}
            </Text>
          ) : null}
        </Section>

        {invoice.notes ? (
          <Section heading="Notes">
            <Paragraphs text={invoice.notes} />
          </Section>
        ) : null}

        <View style={{ marginTop: 18 }}>
          <Text style={[styles.small, { fontSize: 7.5 }]}>
            Please quote invoice number {invoice.number || DOCUMENT_META.invoice.label} with your
            payment. For any question about this invoice, use the contact details in the footer.
          </Text>
        </View>
      </Sheet>
    </Shell>
  );
}
