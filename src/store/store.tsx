/**
 * Application state.
 *
 * All workspaces and settings live here, are persisted to localStorage on every
 * change, and are the only source the screens read from. Sheet sync is fired
 * from `saveWorkspace` but deliberately not awaited: a failed sync must never
 * stop a client record from being saved.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { AppSettings, ClientWorkspace } from '../types/client';
import {
  createWorkspace,
  duplicateWorkspace as cloneWorkspace,
  nextInvoiceNumber,
  touchWorkspace,
} from '../lib/workspace';
import { createDemoWorkspace } from '../lib/demo';
import { loadState, saveState } from '../lib/storage';
import { isSyncConfigured, syncWorkspace } from '../lib/sheetsSync';
import type { SyncOutcome } from '../lib/sheetsSync';
import { useToast } from '../ui/Toast';

interface StoreApi {
  workspaces: ClientWorkspace[];
  settings: AppSettings;
  /** Set when saved data existed but could not be read on boot. */
  loadWarning: string;
  getWorkspace: (id: string) => ClientWorkspace | undefined;
  /** Creates, persists and returns a new draft workspace. */
  addWorkspace: () => ClientWorkspace;
  /** Creates, persists and returns a complete demo workspace. */
  addDemoWorkspace: () => ClientWorkspace;
  /** Upserts, stamps updatedAt, persists, and syncs in the background. */
  saveWorkspace: (workspace: ClientWorkspace) => void;
  removeWorkspace: (id: string) => void;
  /** Copies an engagement into a fresh draft. Returns the copy. */
  duplicate: (id: string) => ClientWorkspace | undefined;
  /** Replaces everything, for restoring a backup. */
  replaceWorkspaces: (workspaces: ClientWorkspace[]) => void;
  setSettings: (settings: AppSettings) => void;
  /** Explicit, awaited sync for the button on the detail screen. */
  syncNow: (workspace: ClientWorkspace) => Promise<SyncOutcome>;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const toast = useToast();

  // Lazy initialisers, so localStorage is read once on mount rather than on
  // every render.
  const [boot] = useState(loadState);
  const [workspaces, setWorkspaces] = useState<ClientWorkspace[]>(boot.state.workspaces);
  const [settings, setSettingsState] = useState<AppSettings>(boot.state.settings);
  const loadWarning = boot.warning ?? '';

  // One complaint per session if the browser refuses to store anything;
  // repeating it on every keystroke would be unusable.
  const warnedAboutStorage = useRef(false);

  useEffect(() => {
    const result = saveState({ version: 1, workspaces, settings });
    if (!result.ok && !warnedAboutStorage.current) {
      warnedAboutStorage.current = true;
      toast.show(result.error ?? 'Changes could not be saved in this browser.', 'error');
    }
  }, [workspaces, settings, toast]);

  useEffect(() => {
    if (loadWarning) toast.show(loadWarning, 'warn');
  }, [loadWarning, toast]);

  /** Fire-and-forget Sheet push. Reports only what the user can act on. */
  const backgroundSync = useCallback(
    (workspace: ClientWorkspace, currentSettings: AppSettings) => {
      if (!isSyncConfigured(currentSettings)) return;
      void syncWorkspace(workspace, currentSettings).then((outcome) => {
        if (outcome.status === 'error') {
          toast.show(`Sheet sync failed. ${outcome.message}`, 'warn');
        }
      });
    },
    [toast],
  );

  const getWorkspace = useCallback(
    (id: string) => workspaces.find((workspace) => workspace.id === id),
    [workspaces],
  );

  const addWorkspace = useCallback(() => {
    const fresh = createWorkspace();
    fresh.invoice.number = nextInvoiceNumber(workspaces, new Date().getFullYear());
    setWorkspaces((current) => [fresh, ...current]);
    return fresh;
  }, [workspaces]);

  const addDemoWorkspace = useCallback(() => {
    const demo = createDemoWorkspace();
    setWorkspaces((current) => [demo, ...current]);
    backgroundSync(demo, settings);
    return demo;
  }, [backgroundSync, settings]);

  const saveWorkspace = useCallback(
    (workspace: ClientWorkspace) => {
      const stamped = touchWorkspace(workspace);
      setWorkspaces((current) => {
        const index = current.findIndex((item) => item.id === stamped.id);
        if (index === -1) return [stamped, ...current];
        const next = current.slice();
        next[index] = stamped;
        return next;
      });
      backgroundSync(stamped, settings);
    },
    [backgroundSync, settings],
  );

  const removeWorkspace = useCallback((id: string) => {
    setWorkspaces((current) => current.filter((workspace) => workspace.id !== id));
  }, []);

  const duplicate = useCallback(
    (id: string) => {
      const source = workspaces.find((workspace) => workspace.id === id);
      if (!source) return undefined;
      const copy = cloneWorkspace(source);
      copy.invoice.number = nextInvoiceNumber(workspaces, new Date().getFullYear());
      setWorkspaces((current) => [copy, ...current]);
      return copy;
    },
    [workspaces],
  );

  const replaceWorkspaces = useCallback((next: ClientWorkspace[]) => {
    setWorkspaces(next);
  }, []);

  const setSettings = useCallback((next: AppSettings) => {
    setSettingsState(next);
  }, []);

  const syncNow = useCallback(
    (workspace: ClientWorkspace) => syncWorkspace(workspace, settings),
    [settings],
  );

  const api = useMemo<StoreApi>(
    () => ({
      workspaces,
      settings,
      loadWarning,
      getWorkspace,
      addWorkspace,
      addDemoWorkspace,
      saveWorkspace,
      removeWorkspace,
      duplicate,
      replaceWorkspaces,
      setSettings,
      syncNow,
    }),
    [
      workspaces,
      settings,
      loadWarning,
      getWorkspace,
      addWorkspace,
      addDemoWorkspace,
      saveWorkspace,
      removeWorkspace,
      duplicate,
      replaceWorkspaces,
      setSettings,
      syncNow,
    ],
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const api = useContext(StoreContext);
  if (!api) throw new Error('useStore must be used inside <StoreProvider>');
  return api;
}
