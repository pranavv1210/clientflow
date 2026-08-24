/**
 * Page chrome.
 *
 * A single sticky header and a centred column, shared by every screen so the
 * back affordance and title sit in exactly the same place each time. Sized for a
 * phone first: the column is full width until it has room to be 56rem.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon } from './icons';

interface HeaderProps {
  title: string;
  subtitle?: string;
  brandMark?: ReactNode;
  /** Route to go back to. Omit for a top-level screen. */
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  brandMark,
  backTo,
  backLabel = 'Back',
  actions,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex max-w-app items-center gap-3 px-4 py-3">
        {backTo ? (
          <Link
            to={backTo}
            aria-label={backLabel}
            className="-ml-1.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-black/[0.05] hover:text-ink"
          >
            <ChevronLeftIcon size={20} />
          </Link>
        ) : null}
        {!backTo && brandMark ? <div className="shrink-0">{brandMark}</div> : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold leading-tight tracking-tight">
            {title}
          </h1>
          {subtitle ? <p className="truncate text-xs text-ink-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>
    </header>
  );
}

/** Content column. `bottomBar` reserves room for a sticky action bar. */
export function Screen({
  children,
  bottomBar = false,
}: {
  children: ReactNode;
  bottomBar?: boolean;
}) {
  return (
    <main
      className={[
        'mx-auto w-full max-w-app px-4 pt-4',
        bottomBar ? 'pb-32' : 'pb-16',
      ].join(' ')}
    >
      {children}
    </main>
  );
}

/** Sticky footer for the primary action on a form. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 bg-white/95 pb-safe pt-3 shadow-bar backdrop-blur">
      <div className="mx-auto flex max-w-app items-center gap-2 px-4">{children}</div>
    </div>
  );
}
