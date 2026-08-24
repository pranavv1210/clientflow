/**
 * Project Agreement.
 *
 * Clauses are numbered because a signed agreement gets referred to by clause
 * number in later correspondence — the numbering carries information rather
 * than decorating the page.
 *
 * The wording is a plain-language starting template for small freelance
 * projects, not legal advice. See "About the Agreement wording" in README.md.
 */

import { Text, View } from '@react-pdf/renderer';
import type { ClientWorkspace } from '../types/client';
import {
  BulletList,
  FactList,
  Parties,
  Section,
  Sheet,
  Shell,
  Signatures,
  Table,
  Totals,
} from './primitives';
import type { Fact } from './primitives';
import { styles } from './theme';
import { formatDate, formatDateLong } from '../lib/dates';
import {
  advanceAmount,
  advancePercentUsed,
  balanceAfterAdvance,
  formatMoneyPdf,
  projectTotal,
} from '../lib/money';
import { DOCUMENT_META, documentDate } from '../lib/documents';
import { displayName, revisionRounds, revisionsPhrase, supportDays } from '../lib/workspace';
import { IDENTITY } from '../config/identity';
import { billableItems, lineItemColumns, pricingTotalLines } from './ProposalDoc';

interface Clause {
  heading: string;
  body: string;
}

function buildClauses(workspace: ClientWorkspace): Clause[] {
  const { pricing, project, scope } = workspace;
  const total = projectTotal(pricing);
  const advance = advanceAmount(pricing);
  const onDelivery = balanceAfterAdvance(pricing);
  const revisions = revisionRounds(pricing);
  const support = supportDays(workspace);

  const clauses: Clause[] = [
    {
      heading: 'Scope of work',
      body:
        'The Developer will deliver the work listed under Scope of work in this agreement. Anything not listed there is outside this agreement and will be quoted separately before it is started.',
    },
    {
      heading: 'Fees',
      body: `The total fee for the work in this agreement is ${formatMoneyPdf(
        total,
      )}. This fee covers the Developer's time and the deliverables listed. It does not include third-party costs such as domain registration, hosting, paid plugins, stock media or app store fees, which the Client pays directly.`,
    },
    {
      heading: 'Payment schedule',
      body: `${formatMoneyPdf(advance)} (${advancePercentUsed(
        pricing,
      )}%) is payable before work begins. The remaining ${formatMoneyPdf(
        onDelivery,
      )} is payable on delivery, before the project is deployed to the Client's live environment or final files are transferred. Payment is made by ${
        pricing.paymentMethod || 'the method agreed in writing'
      }.`,
    },
    {
      heading: 'Timeline',
      body: `The estimated timeline is ${
        pricing.timeline || 'as agreed in writing'
      }, running from the date the advance is received. Timelines assume the Client supplies content, access and feedback when requested. Delays in those items move the delivery date by the same amount.`,
    },
    {
      heading: 'Revisions',
      body:
        revisions > 0
          ? `${revisions} round${
              revisions === 1 ? '' : 's'
            } of revisions are included at each review stage. A revision means adjusting work already delivered against this scope. Further rounds, or changes that alter the agreed scope, are charged at a rate agreed in writing beforehand.`
          : 'Revisions are charged at a rate agreed in writing beforehand.',
    },
    {
      heading: 'Client responsibilities',
      body:
        'The Client will provide content, brand assets, and any account access the work needs, and will nominate one person to give consolidated feedback. The Developer is not responsible for delays caused by outstanding items on the Client side.',
    },
    {
      heading: 'Ownership',
      body:
        'On receipt of the final payment, the Client owns the deliverables produced for this project, along with the right to use, modify and host them. Until then, the Developer retains ownership. The Developer keeps ownership of any pre-existing tools, libraries or components used to build the work, and grants the Client an unlimited licence to use them as part of the delivered project.',
    },
    {
      heading: 'Third-party services',
      body:
        'The work may rely on third-party services and open-source components. These remain under their own licences and terms, and the Developer is not responsible for their availability, pricing changes, or the consequences of changes made to them.',
    },
    {
      heading: 'Confidentiality',
      body:
        'Each side will keep the other side’s non-public business information confidential, and will not share it with anyone else except as needed to carry out this project.',
    },
    {
      heading: 'Portfolio use',
      body:
        'The Developer may show the finished work, and describe the work done, as part of a portfolio or case study, unless the Client asks in writing not to.',
    },
    {
      heading: 'Support after delivery',
      // Reads the same support window the Handover document prints, with no
      // fallback: if it is zero, both documents say there is none. Inventing a
      // default here once made a signed agreement promise free support that the
      // handover sheet then denied.
      body:
        support > 0
          ? `Fixes for defects in the delivered work are covered for ${support} days after delivery at no charge. New features, content changes and third-party breakages after that period are charged separately.`
          : 'No free support period is included after delivery. Fixes, new features and content changes after delivery are quoted and charged separately.',
    },
    {
      heading: 'Termination',
      body:
        'Either side may end this agreement in writing. If the Client ends it, the advance is not refundable, and any work completed beyond the advance is invoiced on a pro-rata basis. If the Developer ends it, the Client is invoiced only for work completed and receives the files produced up to that point.',
    },
    {
      heading: 'Limitation of liability',
      body: `The Developer's total liability under this agreement is limited to the fees actually paid by the Client for the work. Neither side is liable for indirect or consequential losses, including lost profit or lost data.`,
    },
    {
      heading: 'Governing law',
      body:
        'This agreement is governed by the laws of India, and both sides will attempt to resolve any dispute by discussion before taking any other step.',
    },
  ];

  for (const term of pricing.extraTerms) {
    clauses.push({ heading: 'Additional term', body: term });
  }

  // Referenced in clause 1, so the scope list must exist in the document.
  if (scope.included.length === 0 && project.title) {
    clauses[0] = {
      heading: 'Scope of work',
      body: `The Developer will deliver the project titled "${project.title}" as described in the accompanying proposal. Anything not described there is outside this agreement and will be quoted separately.`,
    };
  }

  return clauses;
}

export function AgreementDoc({ workspace }: { workspace: ClientWorkspace }) {
  const { client, project, scope, pricing } = workspace;
  const signedOn = documentDate('agreement', workspace);
  const items = billableItems(pricing.lineItems);
  const clauses = buildClauses(workspace);
  const clientLabel = displayName(workspace);

  const facts: Fact[] = [
    { label: 'Project', value: project.title },
    { label: 'Timeline', value: pricing.timeline },
    { label: 'Start date', value: project.startDate ? formatDate(project.startDate) : '' },
    {
      label: 'Target delivery',
      value: project.deliveryDate ? formatDate(project.deliveryDate) : '',
    },
    { label: 'Total fee', value: formatMoneyPdf(projectTotal(pricing)) },
    {
      label: `Advance (${advancePercentUsed(pricing)}%)`,
      value: formatMoneyPdf(advanceAmount(pricing)),
    },
    { label: 'Balance on delivery', value: formatMoneyPdf(balanceAfterAdvance(pricing)) },
    { label: 'Revisions included', value: revisionsPhrase(pricing) },
    { label: 'Payment method', value: pricing.paymentMethod },
  ];

  return (
    <Shell
      title={`${DOCUMENT_META.agreement.title} — ${clientLabel}`}
      subject={project.title}
    >
      <Sheet documentTitle="Agreement" date={signedOn}>
        <Parties client={client} recipientLabel="Client" />

        <View style={styles.section}>
          <Text style={styles.projectTitle}>{project.title || 'Untitled project'}</Text>
          <Text style={[styles.paragraph, { marginTop: 8 }]}>
            This agreement is made on {formatDateLong(signedOn)} between{' '}
            <Text style={styles.strong}>{IDENTITY.legalName}</Text> (the Developer) and{' '}
            <Text style={styles.strong}>{clientLabel}</Text> (the Client), and covers the project
            described below.
          </Text>
        </View>

        <Section heading="Project and commercial terms">
          <FactList facts={facts} />
        </Section>

        {scope.included.length > 0 ? (
          <Section heading="Scope of work">
            <BulletList items={scope.included} />
            {scope.excluded.length > 0 ? (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.strong, { fontSize: 9, marginBottom: 5 }]}>
                  Not included
                </Text>
                <BulletList items={scope.excluded} />
              </View>
            ) : null}
          </Section>
        ) : null}

        {items.length > 0 ? (
          <Section heading="Fee breakdown">
            <Table columns={lineItemColumns} rows={items} />
            <Totals lines={pricingTotalLines(workspace)} />
          </Section>
        ) : null}

        <Section heading="Terms">
          {clauses.map((clause, index) => (
            <View key={index} style={styles.clause} wrap={false}>
              <Text style={styles.clauseNumber}>{index + 1}.</Text>
              <View style={styles.clauseBody}>
                <Text style={styles.clauseHeading}>{clause.heading}</Text>
                <Text style={styles.paragraph}>{clause.body}</Text>
              </View>
            </View>
          ))}
        </Section>

        <Section heading="Agreed and signed">
          <Text style={styles.small}>
            By signing below, both sides accept the scope, fees and terms set out in this agreement.
          </Text>
          <Signatures clientName={clientLabel} />
        </Section>
      </Sheet>
    </Shell>
  );
}
