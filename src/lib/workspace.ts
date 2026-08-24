/**
 * Workspace construction, duplication and repair.
 *
 * `normalizeWorkspace` is the gate every record passes through on the way in
 * from localStorage or an imported file. A workspace saved by an older build,
 * or hand-edited in a backup file, must never be able to crash a screen or a
 * PDF, so every field is defaulted rather than trusted.
 */

import type {
  AppSettings,
  ClientContact,
  ClientStatus,
  ClientWorkspace,
  DocumentDates,
  HandoverDetails,
  InvoiceDetails,
  LineItem,
  PricingTerms,
  ProjectDetails,
  ScopeDetails,
  ServiceRow,
} from '../types/client';
import { CLIENT_STATUSES } from '../types/client';
import { newId } from './ids';
import { addDays, todayIso } from './dates';
import { toNumber } from './money';

export function emptyLineItem(): LineItem {
  return { id: newId(), description: '', quantity: 1, unitPrice: 0 };
}

export function emptyServiceRow(): ServiceRow {
  return { id: newId(), name: '', purpose: '', account: '' };
}

export function defaultSettings(): AppSettings {
  return {
    sheetsWebhookUrl: import.meta.env?.VITE_SHEETS_WEBHOOK_URL ?? '',
    sheetsSyncToken: import.meta.env?.VITE_SHEETS_SYNC_TOKEN ?? '',
    sheetsSyncEnabled: true,
  };
}

/**
 * A new workspace, pre-filled with the terms a freelance project usually
 * carries so there is less to type. Everything here is editable.
 */
export function createWorkspace(): ClientWorkspace {
  const now = new Date().toISOString();
  const today = todayIso();
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    client: { name: '', businessName: '', email: '', phone: '', address: '' },
    project: {
      title: '',
      summary: '',
      description: '',
      techStack: [],
      startDate: '',
      deliveryDate: '',
    },
    scope: { included: [], excluded: [] },
    pricing: {
      lineItems: [emptyLineItem()],
      discount: 0,
      advancePercent: 40,
      revisionsIncluded: 2,
      timeline: '',
      paymentMethod: 'UPI or bank transfer',
      paymentDetails: '',
      extraTerms: [],
    },
    invoice: {
      // Assigned by the store on save, so numbering stays sequential.
      number: '',
      issueDate: today,
      dueDate: addDays(today, 7),
      amountReceived: 0,
      notes: '',
    },
    handover: {
      completedOn: '',
      liveUrl: '',
      repoUrl: '',
      hostingProvider: '',
      domainRegistrar: '',
      adminUrl: '',
      credentialsNote: 'Credentials shared separately over a private channel.',
      services: [],
      assets: [],
      supportWindowDays: 14,
      notes: '',
    },
    // The proposal is written the day you create the client. The agreement has
    // no date until it is signed, so it stays blank.
    documentDates: { proposalDate: today, agreementDate: '' },
  };
}

/**
 * Copies a finished engagement into a fresh draft to use as a template.
 * Pricing and scope carry over; anything specific to the old client's
 * timeline, invoice or handover is cleared so it cannot be sent by mistake.
 */
export function duplicateWorkspace(source: ClientWorkspace): ClientWorkspace {
  const fresh = createWorkspace();
  const copy = deepClone(source);
  const today = todayIso();

  return {
    ...copy,
    id: fresh.id,
    createdAt: fresh.createdAt,
    updatedAt: fresh.updatedAt,
    status: 'draft',
    project: {
      ...copy.project,
      title: copy.project.title ? `${copy.project.title} (copy)` : 'Untitled project',
      startDate: '',
      deliveryDate: '',
    },
    pricing: {
      ...copy.pricing,
      // Fresh ids, or React keys collide between the original and the copy.
      lineItems: copy.pricing.lineItems.map((item) => ({ ...item, id: newId() })),
    },
    invoice: {
      number: '',
      issueDate: today,
      dueDate: addDays(today, 7),
      amountReceived: 0,
      notes: '',
    },
    handover: fresh.handover,
    // A copy is a new engagement: it must not inherit the date the original
    // agreement was signed on.
    documentDates: { proposalDate: today, agreementDate: '' },
  };
}

/** What to call this client in lists and filenames. */
export function displayName(workspace: ClientWorkspace): string {
  return (
    firstNonEmpty([
      workspace.client.businessName,
      workspace.client.name,
      workspace.project.title,
    ]) || 'Untitled client'
  );
}

/** Secondary line in the client list. */
export function displaySubtitle(workspace: ClientWorkspace): string {
  const parts: string[] = [];
  if (workspace.client.businessName && workspace.client.name) {
    parts.push(workspace.client.name);
  }
  if (workspace.project.title) parts.push(workspace.project.title);
  return parts.join(' · ');
}

/**
 * Days of free support after delivery — a whole, non-negative number.
 *
 * The Agreement clause and the Handover fact list both read this, so they
 * cannot promise different support windows for the same project. Zero means
 * zero: no document invents a default.
 */
export function supportDays(workspace: ClientWorkspace): number {
  return Math.max(0, Math.round(toNumber(workspace.handover.supportWindowDays)));
}

/** Whole rounds of revisions included, non-negative. */
export function revisionRounds(pricing: PricingTerms): number {
  return Math.max(0, Math.round(toNumber(pricing.revisionsIncluded)));
}

/**
 * Revisions as a phrase for a fact list: '2 rounds', '1 round', 'None'.
 * Shared so the Proposal and Agreement word it identically — and so neither
 * can print "1 rounds".
 */
export function revisionsPhrase(pricing: PricingTerms): string {
  const rounds = revisionRounds(pricing);
  if (rounds === 0) return 'None';
  return `${rounds} ${rounds === 1 ? 'round' : 'rounds'}`;
}

const INVOICE_PATTERN = /^INV-(\d{4})-(\d+)$/;

/**
 * Next sequential invoice number for a year, e.g. 'INV-2026-008'.
 * Scans what already exists rather than counting workspaces, so deleting a
 * client never causes a number to be reused.
 */
export function nextInvoiceNumber(
  workspaces: Array<{ invoice: { number: string } }>,
  year: number,
): string {
  let highest = 0;
  for (const workspace of workspaces) {
    const match = INVOICE_PATTERN.exec(workspace?.invoice?.number ?? '');
    if (!match) continue;
    if (Number(match[1]) !== year) continue;
    highest = Math.max(highest, Number(match[2]));
  }
  return `INV-${year}-${String(highest + 1).padStart(3, '0')}`;
}

export function touchWorkspace(workspace: ClientWorkspace): ClientWorkspace {
  return { ...workspace, updatedAt: new Date().toISOString() };
}

/* -------------------------------------------------------------------------- */
/* Repair                                                                     */
/* -------------------------------------------------------------------------- */

/** Rebuilds any input into a complete, safe workspace. Never throws. */
export function normalizeWorkspace(raw: unknown): ClientWorkspace {
  const base = createWorkspace();
  const input = isRecord(raw) ? raw : {};

  const client = isRecord(input.client) ? input.client : {};
  const project = isRecord(input.project) ? input.project : {};
  const scope = isRecord(input.scope) ? input.scope : {};
  const pricing = isRecord(input.pricing) ? input.pricing : {};
  const invoice = isRecord(input.invoice) ? input.invoice : {};
  const handover = isRecord(input.handover) ? input.handover : {};
  const documentDates = isRecord(input.documentDates) ? input.documentDates : {};

  const normalizedClient: ClientContact = {
    name: str(client.name),
    businessName: str(client.businessName),
    email: str(client.email),
    phone: str(client.phone),
    address: str(client.address),
  };

  const normalizedProject: ProjectDetails = {
    title: str(project.title),
    summary: str(project.summary),
    description: str(project.description),
    techStack: strArray(project.techStack),
    startDate: str(project.startDate),
    deliveryDate: str(project.deliveryDate),
  };

  const normalizedScope: ScopeDetails = {
    included: strArray(scope.included),
    excluded: strArray(scope.excluded),
  };

  const items = Array.isArray(pricing.lineItems) ? pricing.lineItems : [];
  const normalizedItems: LineItem[] = items.filter(isRecord).map((item) => ({
    id: str(item.id) || newId(),
    description: str(item.description),
    // A missing quantity means one of the thing, not zero of it.
    quantity: item.quantity === undefined || item.quantity === null ? 1 : toNumber(item.quantity),
    unitPrice: toNumber(item.unitPrice),
  }));

  const normalizedPricing: PricingTerms = {
    lineItems: normalizedItems.length > 0 ? normalizedItems : [emptyLineItem()],
    discount: toNumber(pricing.discount),
    advancePercent:
      pricing.advancePercent === undefined || pricing.advancePercent === null
        ? base.pricing.advancePercent
        : toNumber(pricing.advancePercent),
    revisionsIncluded:
      pricing.revisionsIncluded === undefined || pricing.revisionsIncluded === null
        ? base.pricing.revisionsIncluded
        : toNumber(pricing.revisionsIncluded),
    timeline: str(pricing.timeline),
    paymentMethod: str(pricing.paymentMethod) || base.pricing.paymentMethod,
    paymentDetails: str(pricing.paymentDetails),
    extraTerms: strArray(pricing.extraTerms),
  };

  const normalizedInvoice: InvoiceDetails = {
    number: str(invoice.number),
    issueDate: str(invoice.issueDate) || base.invoice.issueDate,
    dueDate: str(invoice.dueDate) || base.invoice.dueDate,
    amountReceived: toNumber(invoice.amountReceived),
    notes: str(invoice.notes),
  };

  const services = Array.isArray(handover.services) ? handover.services : [];
  const normalizedHandover: HandoverDetails = {
    completedOn: str(handover.completedOn),
    liveUrl: str(handover.liveUrl),
    repoUrl: str(handover.repoUrl),
    hostingProvider: str(handover.hostingProvider),
    domainRegistrar: str(handover.domainRegistrar),
    adminUrl: str(handover.adminUrl),
    credentialsNote: str(handover.credentialsNote),
    services: services.filter(isRecord).map((row) => ({
      id: str(row.id) || newId(),
      name: str(row.name),
      purpose: str(row.purpose),
      account: str(row.account),
    })),
    assets: strArray(handover.assets),
    supportWindowDays:
      handover.supportWindowDays === undefined || handover.supportWindowDays === null
        ? base.handover.supportWindowDays
        : toNumber(handover.supportWindowDays),
    notes: str(handover.notes),
  };

  const createdAt = str(input.createdAt) || base.createdAt;

  // Records written before document dates existed have no proposal date. The
  // day the workspace was created is a truer answer than today, which would
  // silently re-date an old proposal every time it was opened.
  const normalizedDocumentDates: DocumentDates = {
    proposalDate: str(documentDates.proposalDate) || isoDatePart(createdAt),
    agreementDate: str(documentDates.agreementDate),
  };

  return {
    id: str(input.id) || base.id,
    createdAt,
    updatedAt: str(input.updatedAt) || base.updatedAt,
    status: asStatus(input.status),
    client: normalizedClient,
    project: normalizedProject,
    scope: normalizedScope,
    pricing: normalizedPricing,
    invoice: normalizedInvoice,
    handover: normalizedHandover,
    documentDates: normalizedDocumentDates,
  };
}

export function normalizeSettings(raw: unknown): AppSettings {
  const base = defaultSettings();
  const input = isRecord(raw) ? raw : {};
  return {
    sheetsWebhookUrl: str(input.sheetsWebhookUrl) || base.sheetsWebhookUrl,
    sheetsSyncToken: str(input.sheetsSyncToken) || base.sheetsSyncToken,
    sheetsSyncEnabled:
      typeof input.sheetsSyncEnabled === 'boolean'
        ? input.sheetsSyncEnabled
        : base.sheetsSyncEnabled,
  };
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(str).filter((entry) => entry.length > 0);
}

/** '2026-08-24T10:11:12.000Z' -> '2026-08-24'. Returns '' if unrecognisable. */
function isoDatePart(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : '';
}

function asStatus(value: unknown): ClientStatus {
  const found = CLIENT_STATUSES.find((status) => status === value);
  return found ?? 'draft';
}

function firstNonEmpty(values: string[]): string {
  for (const value of values) {
    const trimmed = (value ?? '').trim();
    if (trimmed.length > 0) return trimmed;
  }
  return '';
}

function deepClone<T>(value: T): T {
  const structured = (globalThis as { structuredClone?: (input: T) => T }).structuredClone;
  if (typeof structured === 'function') return structured(value);
  return JSON.parse(JSON.stringify(value)) as T;
}
