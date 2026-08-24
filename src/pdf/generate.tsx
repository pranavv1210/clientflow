/**
 * Turns a workspace into a PDF.
 *
 * One place decides which template a document kind maps to, so the detail
 * screen, the preview pane and the download button can never render different
 * documents from the same button.
 */

import type { ReactElement } from 'react';
import { pdf } from '@react-pdf/renderer';
import type { ClientWorkspace } from '../types/client';
import type { DocumentKind } from '../lib/documents';
import { documentFileName } from '../lib/documents';
import { downloadBlob } from '../lib/storage';
import { ProposalDoc } from './ProposalDoc';
import { AgreementDoc } from './AgreementDoc';
import { InvoiceDoc } from './InvoiceDoc';
import { HandoverDoc } from './HandoverDoc';

export function documentElement(kind: DocumentKind, workspace: ClientWorkspace): ReactElement {
  switch (kind) {
    case 'proposal':
      return <ProposalDoc workspace={workspace} />;
    case 'agreement':
      return <AgreementDoc workspace={workspace} />;
    case 'invoice':
      return <InvoiceDoc workspace={workspace} />;
    case 'handover':
      return <HandoverDoc workspace={workspace} />;
  }
}

export async function generateBlob(
  kind: DocumentKind,
  workspace: ClientWorkspace,
): Promise<Blob> {
  return pdf(documentElement(kind, workspace)).toBlob();
}

/** Generates and saves the document. Resolves once the download has started. */
export async function downloadDocument(
  kind: DocumentKind,
  workspace: ClientWorkspace,
): Promise<void> {
  const blob = await generateBlob(kind, workspace);
  downloadBlob(documentFileName(kind, workspace), blob);
}

/**
 * Object URL for previewing in an iframe. The caller owns the URL and must
 * revoke it, otherwise every preview leaks a blob for the life of the tab.
 */
export async function previewUrl(
  kind: DocumentKind,
  workspace: ClientWorkspace,
): Promise<string> {
  const blob = await generateBlob(kind, workspace);
  return URL.createObjectURL(blob);
}
