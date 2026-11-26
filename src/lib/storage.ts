/**
 * Persistence.
 *
 * localStorage is the source of truth for the app itself; the Google Sheet is a
 * mirror for reading outside the app, never the other way round. Storage can
 * fail for real reasons — private browsing, a full quota — so every call here
 * reports failure instead of throwing into a render.
 */

import type { AppSettings, ClientWorkspace, StoredState } from '../types/client';
import { defaultSettings, normalizeSettings, normalizeWorkspace } from './workspace';

const STORAGE_KEY = 'clientflow.state.v1';

export interface LoadResult {
  state: StoredState;
  /** Set when saved data existed but could not be read. */
  warning?: string;
}

function emptyState(): StoredState {
  return { version: 1, workspaces: [], settings: defaultSettings() };
}

function storage(): Storage | null {
  try {
    const probe = '__clientflow_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isStorageAvailable(): boolean {
  return storage() !== null;
}

export function loadState(): LoadResult {
  const store = storage();
  if (!store) {
    return {
      state: emptyState(),
      warning:
        'This browser is blocking local storage, so clients will not be saved when you close the tab. Private browsing is the usual cause.',
    };
  }

  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return { state: emptyState() };

  try {
    const parsed: unknown = JSON.parse(raw);
    return { state: hydrate(parsed) };
  } catch {
    return {
      state: emptyState(),
      warning:
        'Saved clients could not be read, so ClientFlow started empty. The old data is still in this browser and has not been overwritten yet.',
    };
  }
}

/** Turns anything JSON-shaped into a complete StoredState. */
export function hydrate(parsed: unknown): StoredState {
  const record =
    typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  const list = Array.isArray(record.workspaces) ? record.workspaces : [];
  return {
    version: 1,
    workspaces: list.map(normalizeWorkspace),
    settings: normalizeSettings(record.settings),
  };
}

export interface SaveResult {
  ok: boolean;
  error?: string;
}

export function saveState(state: StoredState): SaveResult {
  const store = storage();
  if (!store) {
    return { ok: false, error: 'This browser is blocking local storage, so nothing was saved.' };
  }
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (error) {
    const isQuota =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    return {
      ok: false,
      error: isQuota
        ? 'This browser is out of storage space, so the last change was not saved. Export a backup, then delete a client you no longer need.'
        : 'The last change could not be saved to this browser.',
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Backup files                                                               */
/* -------------------------------------------------------------------------- */

export function toBackupJson(workspaces: ClientWorkspace[], settings: AppSettings): string {
  const payload = {
    app: 'ClientFlow',
    version: 1,
    exportedAt: new Date().toISOString(),
    workspaces,
    // The webhook URL is a write endpoint for your Sheet, so it stays out of
    // backup files you might share or email to yourself.
    settings: { sheetsSyncEnabled: settings.sheetsSyncEnabled },
  };
  return JSON.stringify(payload, null, 2);
}

export interface ImportResult {
  ok: boolean;
  workspaces: ClientWorkspace[];
  settings?: Pick<AppSettings, 'sheetsSyncEnabled'>;
  error?: string;
}

export function fromBackupJson(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, workspaces: [], error: 'That file is not valid JSON.' };
  }

  const record =
    typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  if (!record) {
    return { ok: false, workspaces: [], error: 'That file does not contain a ClientFlow backup.' };
  }

  // Accepts a bare array too, in case you hand-edit an export.
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(record.workspaces)
      ? record.workspaces
      : null;

  if (!list) {
    return {
      ok: false,
      workspaces: [],
      error: 'That backup has no clients in it. Look for a "workspaces" list in the file.',
    };
  }

  const backupSettings =
    record && typeof record.settings === 'object' && record.settings !== null
      ? (record.settings as Record<string, unknown>)
      : null;
  const sheetsSyncEnabled =
    typeof backupSettings?.sheetsSyncEnabled === 'boolean'
      ? backupSettings.sheetsSyncEnabled
      : undefined;

  return {
    ok: true,
    workspaces: list.map(normalizeWorkspace),
    settings:
      sheetsSyncEnabled === undefined ? undefined : { sheetsSyncEnabled },
  };
}

/** Triggers a browser download for text content. */
export function downloadTextFile(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: mime });
  downloadBlob(filename, blob);
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
