/**
 * Handover Document — filled in at completion and sent with the final files.
 *
 * Deliberately never prints a password. The credentials note says how they were
 * shared instead, because a PDF ends up forwarded and stored in inboxes.
 */

import { Text, View } from '@react-pdf/renderer';
import type { ClientWorkspace, ServiceRow } from '../types/client';
import {
  BulletList,
  Callout,
  FactList,
  Parties,
  Paragraphs,
  Section,
  Sheet,
  Shell,
  Table,
} from './primitives';
import type { Column, Fact } from './primitives';
import { styles } from './theme';
import { addDays, formatDate } from '../lib/dates';
import { DOCUMENT_META, documentDate } from '../lib/documents';
import { displayName, supportDays } from '../lib/workspace';

const serviceColumns: Array<Column<ServiceRow>> = [
  { header: 'Service', width: '30%', value: (row) => row.name },
  { header: 'What it does', width: '42%', muted: true, value: (row) => row.purpose },
  { header: 'Account holder', width: '28%', muted: true, value: (row) => row.account },
];

export function HandoverDoc({ workspace }: { workspace: ClientWorkspace }) {
  const { client, project, handover } = workspace;
  const completed = documentDate('handover', workspace);
  // The same accessor the Agreement's support clause reads, so the two
  // documents cannot promise different windows.
  const support = supportDays(workspace);
  const supportEnds = support > 0 ? addDays(completed, support) : '';

  const locations: Fact[] = [
    { label: 'Live site', value: handover.liveUrl },
    { label: 'Admin login', value: handover.adminUrl },
    { label: 'Source code', value: handover.repoUrl },
    { label: 'Hosting', value: handover.hostingProvider },
    { label: 'Domain registrar', value: handover.domainRegistrar },
  ];

  const supportFacts: Fact[] = [
    { label: 'Completed on', value: formatDate(completed) },
    {
      label: 'Included support',
      value: support > 0 ? `${support} days from delivery` : 'None included',
    },
    { label: 'Support ends', value: supportEnds ? formatDate(supportEnds) : '' },
  ];

  const summary = project.summary || project.description;

  return (
    <Shell
      title={`${DOCUMENT_META.handover.title} — ${displayName(workspace)}`}
      subject={project.title}
    >
      <Sheet documentTitle="Handover" date={completed}>
        <Parties client={client} recipientLabel="Handed over to" />

        <View style={styles.section}>
          <Text style={styles.projectTitle}>{project.title || 'Untitled project'}</Text>
          <Text style={styles.projectSummary}>
            Delivered and handed over on {formatDate(completed)}.
          </Text>
        </View>

        {summary ? (
          <Section heading="What was built">
            <Paragraphs text={summary} />
          </Section>
        ) : null}

        <Section heading="Where everything lives">
          <FactList facts={locations} />
        </Section>

        {handover.services.length > 0 ? (
          <Section heading="Accounts and services">
            <Table columns={serviceColumns} rows={handover.services} />
            <Text style={[styles.small, { marginTop: 6 }]}>
              Any service billed to the Client renews on that provider’s own schedule. Keep the
              payment method on those accounts current to avoid interruption.
            </Text>
          </Section>
        ) : null}

        {handover.assets.length > 0 ? (
          <Section heading="What is included in this handover">
            <BulletList items={handover.assets} />
          </Section>
        ) : null}

        {handover.credentialsNote ? (
          <Section heading="Credentials">
            <Paragraphs text={handover.credentialsNote} />
            <Text style={styles.small}>
              Passwords are never printed in this document. Change them once you have taken over the
              accounts.
            </Text>
          </Section>
        ) : null}

        <Section heading="Support">
          <FactList facts={supportFacts} />
        </Section>

        {handover.notes ? (
          <Section heading="Notes">
            <Paragraphs text={handover.notes} />
          </Section>
        ) : null}

        <Callout>
          <Text style={styles.strong}>Thank you</Text>
          <Text style={styles.small}>
            It was a pleasure building this. If you need changes, new features or another project
            later, the contact details in the footer reach me directly.
          </Text>
        </Callout>
      </Sheet>
    </Shell>
  );
}
