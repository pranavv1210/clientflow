/**
 * Optional Google Sheets mirror.
 *
 * Sync goes through an Apps Script Web App you deploy from your own Google
 * account (see google-apps-script/Code.gs), so there is no service-account key
 * to protect and no server to run.
 *
 * Two things shape the implementation:
 *
 * 1. The request is sent as text/plain. Apps Script cannot answer a CORS
 *    preflight, and application/json triggers one. Apps Script reads the raw
 *    body regardless, so text/plain costs nothing.
 * 2. Sync must never block the app. Every failure resolves to an outcome
 *    object; nothing here throws, and callers show a dismissible notice.
 */

import type { AppSettings, ClientWorkspace } from '../types/client';
import type { DocumentKind } from './documents';
import { DOCUMENT_META } from './documents';
import {
  advanceAmount,
  balanceDue,
  balanceAfterAdvance,
  projectTotal,
  subtotal,
} from './money';
import { displayName } from './workspace';
import { STATUS_LABELS } from '../types/client';

export type SyncStatus = 'off' | 'ok' | 'unconfirmed' | 'error';

export interface SyncOutcome {
  status: SyncStatus;
  message: string;
}

const TIMEOUT_MS = 10000;

/** The flat row that lands in the Sheet. Order is fixed by Code.gs. */
export interface SheetRow {
  clientId: string;
  clientName: string;
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  projectTitle: string;
  projectSummary: string;
  projectDescription: string;
  techStack: string;
  startDate: string;
  deliveryDate: string;
  includedScope: string;
  excludedScope: string;
  status: string;
  lineItems: string;
  subtotal: number;
  discount: number;
  total: number;
  advance: number;
  balanceAfterAdvance: number;
  balanceDue: number;
  advancePercent: number;
  revisionsIncluded: number;
  timeline: string;
  paymentMethod: string;
  paymentDetails: string;
  extraTerms: string;
  invoiceNumber: string;
  invoiceIssueDate: string;
  invoiceDueDate: string;
  amountReceived: number;
  invoiceNotes: string;
  handoverCompletedOn: string;
  liveUrl: string;
  adminUrl: string;
  repoUrl: string;
  hostingProvider: string;
  domainRegistrar: string;
  credentialsNote: string;
  handoverServices: string;
  handoverAssets: string;
  supportWindowDays: number;
  handoverNotes: string;
  proposalDate: string;
  agreementDate: string;
  proposalPdfUrl: string;
  agreementPdfUrl: string;
  invoicePdfUrl: string;
  handoverPdfUrl: string;
  workspaceJson: string;
  createdAt: string;
  updatedAt: string;
}

export function toSheetRow(workspace: ClientWorkspace): SheetRow {
  const pricing = workspace.pricing;
  const handover = workspace.handover;
  return {
    clientId: workspace.id,
    clientName: workspace.client.name || displayName(workspace),
    businessName: workspace.client.businessName,
    contactEmail: workspace.client.email,
    contactPhone: workspace.client.phone,
    address: workspace.client.address,
    projectTitle: workspace.project.title,
    projectSummary: workspace.project.summary,
    projectDescription: workspace.project.description,
    techStack: workspace.project.techStack.join('\n'),
    startDate: workspace.project.startDate,
    deliveryDate: workspace.project.deliveryDate,
    includedScope: workspace.scope.included.join('\n'),
    excludedScope: workspace.scope.excluded.join('\n'),
    status: STATUS_LABELS[workspace.status],
    lineItems: pricing.lineItems
      .filter((item) => item.description.trim() || item.quantity > 0 || item.unitPrice > 0)
      .map((item) => `${item.description} - Qty ${item.quantity} x INR ${item.unitPrice}`)
      .join('\n'),
    subtotal: subtotal(pricing.lineItems),
    discount: pricing.discount,
    total: projectTotal(workspace.pricing),
    advance: advanceAmount(pricing),
    balanceAfterAdvance: balanceAfterAdvance(pricing),
    balanceDue: balanceDue(workspace),
    advancePercent: pricing.advancePercent,
    revisionsIncluded: pricing.revisionsIncluded,
    timeline: pricing.timeline,
    paymentMethod: pricing.paymentMethod,
    paymentDetails: pricing.paymentDetails,
    extraTerms: pricing.extraTerms.join('\n'),
    invoiceNumber: workspace.invoice.number,
    invoiceIssueDate: workspace.invoice.issueDate,
    invoiceDueDate: workspace.invoice.dueDate,
    amountReceived: workspace.invoice.amountReceived,
    invoiceNotes: workspace.invoice.notes,
    handoverCompletedOn: handover.completedOn,
    liveUrl: handover.liveUrl,
    adminUrl: handover.adminUrl,
    repoUrl: handover.repoUrl,
    hostingProvider: handover.hostingProvider,
    domainRegistrar: handover.domainRegistrar,
    credentialsNote: handover.credentialsNote,
    handoverServices: handover.services
      .map((service) =>
        [service.name, service.purpose, service.account].filter(Boolean).join(' - '),
      )
      .join('\n'),
    handoverAssets: handover.assets.join('\n'),
    supportWindowDays: handover.supportWindowDays,
    handoverNotes: handover.notes,
    proposalDate: workspace.documentDates.proposalDate,
    agreementDate: workspace.documentDates.agreementDate,
    proposalPdfUrl: '',
    agreementPdfUrl: '',
    invoicePdfUrl: '',
    handoverPdfUrl: '',
    workspaceJson: JSON.stringify(workspace),
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}

export function isSyncConfigured(settings: AppSettings): boolean {
  return settings.sheetsSyncEnabled && isLikelyWebAppUrl(settings.sheetsWebhookUrl);
}

/** Catches the commonest setup mistake: pasting the Sheet URL, not the Web App URL. */
export function isLikelyWebAppUrl(url: string): boolean {
  const trimmed = (url ?? '').trim();
  if (trimmed.length === 0) return false;
  return /^https:\/\/script\.google(usercontent)?\.com\/.*\/exec(\?.*)?$/.test(trimmed);
}

export function describeUrlProblem(url: string): string | null {
  const trimmed = (url ?? '').trim();
  if (trimmed.length === 0) return null;
  if (isLikelyWebAppUrl(trimmed)) return null;
  if (trimmed.includes('docs.google.com/spreadsheets')) {
    return 'That is the Sheet itself. ClientFlow needs the Apps Script Web App URL, which ends in /exec.';
  }
  if (trimmed.includes('/dev')) {
    return 'That is the test URL, which only works while you are signed in. Use the deployment URL ending in /exec.';
  }
  return 'That does not look like an Apps Script Web App URL. It should start with https://script.google.com/ and end in /exec.';
}

interface Envelope {
  token: string;
  action: 'upsert' | 'ping' | 'uploadPdf';
  row?: SheetRow;
  pdf?: PdfUploadPayload;
}

interface PdfUploadPayload {
  clientId: string;
  clientName: string;
  businessName: string;
  projectTitle: string;
  documentKind: DocumentKind;
  documentLabel: string;
  fileName: string;
  mimeType: string;
  base64: string;
  workspace: SheetRow;
}

async function post(settings: AppSettings, envelope: Envelope): Promise<SyncOutcome> {
  const url = settings.sheetsWebhookUrl.trim();
  const body = JSON.stringify(envelope);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      // text/plain keeps this a simple request, so there is no CORS preflight.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        status: 'error',
        message: `The Sheet rejected the update (HTTP ${response.status}). Check that the Web App is deployed with access set to "Anyone".`,
      };
    }

    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Apps Script returns an HTML sign-in page when access is restricted.
      return {
        status: 'error',
        message:
          'The Sheet returned a sign-in page instead of a result. Re-deploy the Web App with "Who has access" set to "Anyone".',
      };
    }

    const result = parsed as { ok?: boolean; error?: string; action?: string; url?: string };
    if (result?.ok) {
      return {
        status: 'ok',
        message:
          result.action === 'uploaded' && result.url
            ? `Saved to Drive: ${result.url}`
            : 'Synced to your Sheet.',
      };
    }
    return {
      status: 'error',
      message: result?.error
        ? `The Sheet reported: ${result.error}`
        : 'The Sheet reported an unknown problem.',
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        status: 'error',
        message: 'The Sheet did not respond in time. Your client is saved here regardless.',
      };
    }
    // A cross-origin block still delivers the request; we just cannot read the
    // reply. Re-send opaquely so the row lands, and say so honestly.
    const delivered = await postOpaque(url, body);
    return delivered
      ? {
          status: 'unconfirmed',
          message: 'Sent to your Sheet, but the reply was blocked, so this is unconfirmed. Check the Sheet.',
        }
      : {
          status: 'error',
          message: 'Could not reach your Sheet. Your client is saved here regardless.',
        };
  } finally {
    window.clearTimeout(timer);
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the PDF file.'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.readAsDataURL(blob);
  });
}

async function postOpaque(url: string, body: string): Promise<boolean> {
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
    });
    return true;
  } catch {
    return false;
  }
}

/** Mirrors one workspace into the Sheet, creating or updating its row. */
export async function syncWorkspace(
  workspace: ClientWorkspace,
  settings: AppSettings,
): Promise<SyncOutcome> {
  if (!settings.sheetsSyncEnabled) {
    return { status: 'off', message: 'Sheet sync is turned off.' };
  }
  if (!settings.sheetsWebhookUrl.trim()) {
    return { status: 'off', message: 'No Sheet connected.' };
  }
  const problem = describeUrlProblem(settings.sheetsWebhookUrl);
  if (problem) return { status: 'error', message: problem };

  return post(settings, {
    token: settings.sheetsSyncToken,
    action: 'upsert',
    row: toSheetRow(workspace),
  });
}

/** Saves a generated PDF to Google Drive and records its link in the Sheet. */
export async function uploadPdfToDrive({
  kind,
  workspace,
  settings,
  blob,
  fileName,
}: {
  kind: DocumentKind;
  workspace: ClientWorkspace;
  settings: AppSettings;
  blob: Blob;
  fileName: string;
}): Promise<SyncOutcome> {
  if (!settings.sheetsSyncEnabled) {
    return { status: 'off', message: 'Sheet sync is turned off.' };
  }
  if (!settings.sheetsWebhookUrl.trim()) {
    return { status: 'off', message: 'No Sheet connected.' };
  }
  const problem = describeUrlProblem(settings.sheetsWebhookUrl);
  if (problem) return { status: 'error', message: problem };

  const row = toSheetRow(workspace);
  return post(settings, {
    token: settings.sheetsSyncToken,
    action: 'uploadPdf',
    pdf: {
      clientId: workspace.id,
      clientName: workspace.client.name || displayName(workspace),
      businessName: workspace.client.businessName,
      projectTitle: workspace.project.title,
      documentKind: kind,
      documentLabel: DOCUMENT_META[kind].label,
      fileName,
      mimeType: blob.type || 'application/pdf',
      base64: await blobToBase64(blob),
      workspace: row,
    },
  });
}

/** Settings-screen check that writes nothing. */
export async function testConnection(settings: AppSettings): Promise<SyncOutcome> {
  if (!settings.sheetsWebhookUrl.trim()) {
    return { status: 'off', message: 'Paste your Web App URL first.' };
  }
  const problem = describeUrlProblem(settings.sheetsWebhookUrl);
  if (problem) return { status: 'error', message: problem };

  const outcome = await post(settings, { token: settings.sheetsSyncToken, action: 'ping' });
  if (outcome.status === 'ok') {
    return { status: 'ok', message: 'Connected. Your Sheet answered.' };
  }
  return outcome;
}
