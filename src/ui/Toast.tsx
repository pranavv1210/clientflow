/**
 * Toasts.
 *
 * Used for things that must not interrupt: a Sheet row that synced, a PDF that
 * failed to render, a save that localStorage refused. Nothing here ever blocks
 * the flow, which is the rule for Sheet sync in particular.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertIcon, CheckIcon, CloseIcon, CloudIcon } from './icons';

export type ToastTone = 'info' | 'good' | 'warn' | 'error';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const LIFETIME_MS = 4200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = nextId.current;
      nextId.current += 1;
      // Three is enough to read; more than that and they just stack up.
      setToasts((current) => [...current.slice(-2), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), LIFETIME_MS);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-6"
        aria-live="polite"
        role="status"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const TONE_STYLES: Record<ToastTone, string> = {
  info: 'border-hairline bg-white text-ink',
  good: 'border-emerald-200 bg-white text-emerald-900',
  warn: 'border-amber-200 bg-white text-amber-900',
  error: 'border-red-200 bg-white text-red-900',
};

const TONE_COLOR: Record<ToastTone, string> = {
  info: 'text-ink-faint',
  good: 'text-emerald-600',
  warn: 'text-amber-600',
  error: 'text-red-600',
};

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'good') return <CheckIcon size={16} />;
  if (tone === 'info') return <CloudIcon size={16} />;
  return <AlertIcon size={16} />;
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      className={[
        'pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-3.5 py-3',
        'shadow-pop',
        TONE_STYLES[toast.tone],
      ].join(' ')}
    >
      <span className={`mt-0.5 shrink-0 ${TONE_COLOR[toast.tone]}`}>
        <ToastIcon tone={toast.tone} />
      </span>
      <p className="min-w-0 flex-1 text-[13px] leading-relaxed">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-mr-1 shrink-0 rounded p-1 text-ink-faint transition-colors hover:text-ink"
      >
        <CloseIcon size={14} />
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}
