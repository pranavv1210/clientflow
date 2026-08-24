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
import { advanceAmount, projectTotal } from './money';
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
  projectTitle: string;
  status: string;
  total: number;
  advance: number;
  invoiceNumber: string;
  email: string;
  phone: string;
  liveUrl: string;
  createdAt: string;
  updatedAt: string;
}

export function toSheetRow(workspace: ClientWorkspace): SheetRow {
  return {
    clientId: workspace.id,
    clientName: workspace.client.name || displayName(workspace),
    businessName: workspace.client.businessName,
    projectTitle: workspace.project.title,
    status: STATUS_LABELS[workspace.status],
    total: projectTotal(workspace.pricing),
    advance: advanceAmount(workspace.pricing),
    invoiceNumber: workspace.invoice.number,
    email: workspace.client.email,
    phone: workspace.client.phone,
    liveUrl: workspace.handover.liveUrl,
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
  action: 'upsert' | 'ping';
  row?: SheetRow;
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

    const result = parsed as { ok?: boolean; error?: string; action?: string };
    if (result?.ok) {
      return { status: 'ok', message: 'Synced to your Sheet.' };
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
