/**
 * Document catalogue, filenames, and readiness.
 *
 * Readiness is what makes the document rail on the client screen honest: a
 * document is offered only when the fields it actually prints are filled in,
 * and otherwise the rail names exactly what is missing instead of handing you a
 * PDF with holes in it that you might send.
 *
 * Every name in `missing` is worded to match the label on the field you need to
 * fill, so the instruction can be followed without hunting.
 */

import type { ClientWorkspace } from '../types/client';
import { slugify } from './ids';
import { subtotal } from './money';
import { displayName } from './workspace';
import { todayIso } from './dates';

export const DOCUMENT_KINDS = ['proposal', 'agreement', 'invoice', 'handover'] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export interface DocumentMeta {
  /** Printed as the document title. */
  title: string;
  /** Short label for tabs and buttons. */
  label: string;
  /** One line explaining when this document gets sent. */
  blurb: string;
  /** Filename fragment. */
  slug: string;
}

export const DOCUMENT_META: Record<DocumentKind, DocumentMeta> = {
  proposal: {
    title: 'Proposal & Scope of Work',
    label: 'Proposal',
    blurb: 'What you will build, what it costs, how long it takes.',
    slug: 'Proposal',
  },
  agreement: {
    title: 'Project Agreement',
    label: 'Agreement',
    blurb: 'The terms both sides sign before work starts.',
    slug: 'Agreement',
  },
  invoice: {
    title: 'Invoice',
    label: 'Invoice',
    blurb: 'What is owed, and where to send it.',
    slug: 'Invoice',
  },
  handover: {
    title: 'Handover Document',
    label: 'Handover',
    blurb: 'Where everything lives once the project ships.',
    slug: 'Handover',
  },
};

/**
 * The date a given document carries.
 *
 * Every document's date comes from a stored field, so re-exporting a document
 * months later reproduces it rather than re-dating it. This is also what the
 * filename is stamped with, so the name on disk and the date in the body always
 * agree — previously the Handover was named with the invoice's issue date.
 *
 * A blank field falls back to today, which is the right answer for a document
 * you have not sent yet.
 */
export function documentDate(kind: DocumentKind, workspace: ClientWorkspace): string {
  switch (kind) {
    case 'proposal':
      return workspace.documentDates.proposalDate || todayIso();
    case 'agreement':
      return workspace.documentDates.agreementDate || todayIso();
    case 'invoice':
      return workspace.invoice.issueDate || todayIso();
    case 'handover':
      return workspace.handover.completedOn || todayIso();
  }
}

/**
 * Client-safe filename, e.g. 'Glam-by-Khushi_Invoice_INV-2026-004.pdf'.
 * The client's own name comes first because that is how they will file it.
 */
export function documentFileName(kind: DocumentKind, workspace: ClientWorkspace): string {
  const who = slugify(displayName(workspace));
  const meta = DOCUMENT_META[kind];
  const stamp =
    kind === 'invoice' && workspace.invoice.number
      ? slugify(workspace.invoice.number)
      : documentDate(kind, workspace);
  return `${who}_${meta.slug}_${stamp}.pdf`;
}

export interface Readiness {
  ready: boolean;
  /** Plain-language field names, ready to show in the UI. */
  missing: string[];
}

export function documentReadiness(kind: DocumentKind, workspace: ClientWorkspace): Readiness {
  const missing: string[] = [];
  const { client, project, scope, pricing, invoice, handover } = workspace;

  const needClient = () => {
    if (!client.name.trim() && !client.businessName.trim()) missing.push('Contact person');
  };
  const needProjectTitle = () => {
    if (!project.title.trim()) missing.push('Project title');
  };
  /**
   * Two separate faults, reported separately. Checking the subtotal rather than
   * the project total means a fully discounted or pro-bono project still counts
   * as priced work, instead of being told it has no line items when it plainly
   * does.
   */
  const needPricing = () => {
    const described = pricing.lineItems.some((item) => item.description.trim().length > 0);
    if (!described) {
      missing.push('A description on at least one line item');
    } else if (subtotal(pricing.lineItems) <= 0) {
      missing.push('A price on at least one line item');
    }
  };

  switch (kind) {
    case 'proposal': {
      needClient();
      needProjectTitle();
      if (!project.description.trim()) missing.push('Description');
      if (scope.included.length === 0) missing.push('Included');
      needPricing();
      if (!pricing.timeline.trim()) missing.push('Timeline');
      break;
    }
    case 'agreement': {
      needClient();
      needProjectTitle();
      if (scope.included.length === 0) missing.push('Included');
      needPricing();
      if (!pricing.timeline.trim()) missing.push('Timeline');
      if (!pricing.paymentMethod.trim()) missing.push('Payment method');
      break;
    }
    case 'invoice': {
      needClient();
      needProjectTitle();
      needPricing();
      if (!invoice.number.trim()) missing.push('Invoice number');
      if (!invoice.issueDate.trim()) missing.push('Issue date');
      if (!pricing.paymentDetails.trim()) missing.push('Payment details');
      break;
    }
    case 'handover': {
      needClient();
      needProjectTitle();
      if (!handover.completedOn.trim()) missing.push('Completed on');
      if (!handover.liveUrl.trim()) missing.push('Live site URL');
      if (handover.assets.length === 0) missing.push('What is included in the handover');
      break;
    }
  }

  return { ready: missing.length === 0, missing };
}

/** Readiness for all four, in lifecycle order. */
export function allReadiness(
  workspace: ClientWorkspace,
): Array<{ kind: DocumentKind; meta: DocumentMeta; readiness: Readiness }> {
  return DOCUMENT_KINDS.map((kind) => ({
    kind,
    meta: DOCUMENT_META[kind],
    readiness: documentReadiness(kind, workspace),
  }));
}
