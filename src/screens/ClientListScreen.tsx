/**
 * Client list — the dashboard.
 *
 * Each row is a workspace, the way a chat list works: tap to open, everything
 * about that engagement is inside. Search covers business, contact and project
 * name because that is what you remember a client by.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';
import { AppHeader, Screen } from '../ui/Shell';
import { Button, EmptyState, Pill } from '../ui/controls';
import { PlusIcon, SearchIcon, SettingsIcon } from '../ui/icons';
import { CLIENT_STATUSES, STATUS_LABELS } from '../types/client';
import type { ClientStatus, ClientWorkspace } from '../types/client';
import { displayName, displaySubtitle } from '../lib/workspace';
import { formatMoneyCompact, projectTotal } from '../lib/money';
import { relativeTime } from '../lib/dates';
import { initials } from '../lib/ids';

const STATUS_TONE: Record<ClientStatus, 'neutral' | 'accent' | 'good' | 'warn'> = {
  draft: 'neutral',
  proposal_sent: 'accent',
  agreed: 'accent',
  in_progress: 'warn',
  delivered: 'good',
};

type Filter = 'all' | ClientStatus;

export function ClientListScreen() {
  const { workspaces, addWorkspace } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return workspaces
      .filter((workspace) => filter === 'all' || workspace.status === filter)
      .filter((workspace) => {
        if (!needle) return true;
        const haystack = [
          workspace.client.businessName,
          workspace.client.name,
          workspace.project.title,
          workspace.invoice.number,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      })
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [workspaces, query, filter]);

  const startNew = () => {
    const fresh = addWorkspace();
    navigate(`/c/${fresh.id}/edit`);
  };

  // Counts drive the filter chips, so a chip never promises rows it cannot show.
  const counts = useMemo(() => {
    const tally: Record<string, number> = { all: workspaces.length };
    for (const status of CLIENT_STATUSES) {
      tally[status] = workspaces.filter((workspace) => workspace.status === status).length;
    }
    return tally;
  }, [workspaces]);

  return (
    <>
      <AppHeader
        title="Clients"
        subtitle={
          workspaces.length === 1 ? '1 workspace' : `${workspaces.length} workspaces`
        }
        actions={
          <>
            <Link
              to="/settings"
              aria-label="Settings"
              title="Settings"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-black/[0.05] hover:text-ink"
            >
              <SettingsIcon size={18} />
            </Link>
            <Button small variant="primary" onClick={startNew}>
              <PlusIcon size={16} />
              New
            </Button>
          </>
        }
      />

      <Screen>
        {workspaces.length === 0 ? (
          <EmptyState
            title="No clients yet"
            body="A workspace holds one client's details, scope, pricing and handover notes — and generates all four documents from them."
            action={
              <Button variant="primary" onClick={startNew}>
                <PlusIcon size={16} />
                Create your first client
              </Button>
            }
          />
        ) : (
          <>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
                <SearchIcon size={16} />
              </span>
              <input
                type="search"
                value={query}
                placeholder="Search client or project"
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-lg border border-hairline bg-white py-2.5 pl-9 pr-3 placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>

            <div className="hide-scrollbar -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
              <FilterChip
                label="All"
                count={counts.all}
                active={filter === 'all'}
                onClick={() => setFilter('all')}
              />
              {CLIENT_STATUSES.filter((status) => counts[status] > 0).map((status) => (
                <FilterChip
                  key={status}
                  label={STATUS_LABELS[status]}
                  count={counts[status]}
                  active={filter === status}
                  onClick={() => setFilter(status)}
                />
              ))}
            </div>

            {visible.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Nothing matches"
                  body={
                    query.trim()
                      ? `No client matches "${query.trim()}".`
                      : 'No client has that status yet.'
                  }
                  action={
                    <Button
                      small
                      onClick={() => {
                        setQuery('');
                        setFilter('all');
                      }}
                    >
                      Clear filters
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="mt-4 overflow-hidden rounded-xl border border-hairline bg-white">
                {visible.map((workspace, index) => (
                  <li key={workspace.id}>
                    {index > 0 ? <div className="ml-16 h-px bg-hairline" /> : null}
                    <ClientRow workspace={workspace} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Screen>
    </>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-accent bg-accent text-white'
          : 'border-hairline bg-white text-ink-muted hover:border-ink-faint',
      ].join(' ')}
    >
      {label}
      <span className={active ? 'ml-1.5 text-white/70' : 'ml-1.5 text-ink-faint'}>{count}</span>
    </button>
  );
}

function ClientRow({ workspace }: { workspace: ClientWorkspace }) {
  const name = displayName(workspace);
  const subtitle = displaySubtitle(workspace);
  const total = projectTotal(workspace.pricing);

  return (
    <Link
      to={`/c/${workspace.id}`}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-canvas active:bg-canvas"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-deep">
        {initials(name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <Pill tone={STATUS_TONE[workspace.status]}>{STATUS_LABELS[workspace.status]}</Pill>
          {subtitle ? (
            <span className="truncate text-xs text-ink-muted">{subtitle}</span>
          ) : null}
        </span>
      </span>
      <span className="shrink-0 text-right">
        {total > 0 ? (
          <span className="num block text-sm font-medium">{formatMoneyCompact(total)}</span>
        ) : null}
        <span className="block text-2xs text-ink-faint">{relativeTime(workspace.updatedAt)}</span>
      </span>
    </Link>
  );
}
