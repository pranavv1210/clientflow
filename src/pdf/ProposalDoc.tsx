/**
 * Proposal & Scope of Work — the document that goes out first.
 *
 * Reads entirely from the workspace, so the title, scope and price here are the
 * same ones the Agreement and Invoice will print.
 */

import { Text, View } from '@react-pdf/renderer';
import type { ClientWorkspace, LineItem } from '../types/client';
import {
  BulletList,
  Callout,
  Chips,
  FactList,
  Parties,
  Paragraphs,
  Section,
  Sheet,
  Shell,
  Table,
  Totals,
} from './primitives';
import type { Column, Fact, TotalLine } from './primitives';
import { styles } from './theme';
import { formatDate } from '../lib/dates';
import {
  advanceAmount,
  advancePercentUsed,
  balanceAfterAdvance,
  discountApplied,
  formatMoneyPdf,
  lineTotal,
  projectTotal,
  subtotal,
} from '../lib/money';
import { DOCUMENT_META, documentDate } from '../lib/documents';
import { displayName, revisionsPhrase } from '../lib/workspace';

/** Drops the blank row the pricing editor always keeps at the bottom. */
export function billableItems(items: LineItem[]): LineItem[] {
  return items.filter((item) => item.description.trim().length > 0 || lineTotal(item) > 0);
}

export const lineItemColumns: Array<Column<LineItem>> = [
  { header: 'Description', width: '52%', value: (item) => item.description },
  { header: 'Qty', width: '10%', align: 'right', value: (item) => String(item.quantity) },
  {
    header: 'Rate',
    width: '19%',
    align: 'right',
    value: (item) => formatMoneyPdf(item.unitPrice),
  },
  {
    header: 'Amount',
    width: '19%',
    align: 'right',
    value: (item) => formatMoneyPdf(lineTotal(item)),
  },
];

/**
 * Subtotal / discount / total, with the discount row hidden when zero.
 *
 * Shared by all three commercial documents, so the pricing table is not merely
 * similar across them — it is the same code. The discount printed is the one
 * that was actually applied, so the three lines always reconcile.
 */
export function pricingTotalLines(workspace: ClientWorkspace): TotalLine[] {
  const { pricing } = workspace;
  const discount = discountApplied(pricing);
  const lines: TotalLine[] = [
    { label: 'Subtotal', value: formatMoneyPdf(subtotal(pricing.lineItems)) },
  ];
  if (discount > 0) {
    lines.push({ label: 'Discount', value: `- ${formatMoneyPdf(discount)}` });
  }
  lines.push({ label: 'Project total', value: formatMoneyPdf(projectTotal(pricing)), grand: true });
  return lines;
}

export function ProposalDoc({ workspace }: { workspace: ClientWorkspace }) {
  const { client, project, scope, pricing } = workspace;
  const issued = documentDate('proposal', workspace);
  const items = billableItems(pricing.lineItems);
  const advance = advanceAmount(pricing);
  const onDelivery = balanceAfterAdvance(pricing);

  const terms: Fact[] = [
    { label: 'Timeline', value: pricing.timeline },
    { label: 'Start date', value: project.startDate ? formatDate(project.startDate) : '' },
    {
      label: 'Target delivery',
      value: project.deliveryDate ? formatDate(project.deliveryDate) : '',
    },
    { label: `Advance (${advancePercentUsed(pricing)}%)`, value: formatMoneyPdf(advance) },
    { label: 'Balance on delivery', value: formatMoneyPdf(onDelivery) },
    { label: 'Revisions included', value: revisionsPhrase(pricing) },
    { label: 'Payment method', value: pricing.paymentMethod },
  ];

  return (
    <Shell
      title={`${DOCUMENT_META.proposal.title} — ${displayName(workspace)}`}
      subject={project.title}
    >
      <Sheet documentTitle="Proposal" date={issued}>
        <Parties client={client} recipientLabel="Prepared for" />

        <View style={styles.section}>
          <Text style={styles.projectTitle}>{project.title || 'Untitled project'}</Text>
          {project.summary ? <Text style={styles.projectSummary}>{project.summary}</Text> : null}
        </View>

        {project.description ? (
          <Section heading="Overview">
            <Paragraphs text={project.description} />
          </Section>
        ) : null}

        {scope.included.length > 0 ? (
          <Section heading="What's included">
            <BulletList items={scope.included} />
          </Section>
        ) : null}

        {scope.excluded.length > 0 ? (
          <Section heading="Not included in this scope">
            <BulletList items={scope.excluded} />
            <Text style={[styles.small, { marginTop: 4 }]}>
              Anything here can be added later as a separate quote.
            </Text>
          </Section>
        ) : null}

        {project.techStack.length > 0 ? (
          <Section heading="Built with">
            <Chips items={project.techStack} />
          </Section>
        ) : null}

        {items.length > 0 ? (
          <Section heading="Investment">
            <Table columns={lineItemColumns} rows={items} />
            <Totals lines={pricingTotalLines(workspace)} />
          </Section>
        ) : null}

        <Section heading="Schedule and terms">
          <FactList facts={terms} />
        </Section>

        <Callout>
          <Text style={styles.strong}>Next step</Text>
          <Text style={styles.small}>
            Confirm this scope by reply and I will send the agreement and the advance invoice. Work
            begins once the advance is received.
          </Text>
        </Callout>
      </Sheet>
    </Shell>
  );
}
