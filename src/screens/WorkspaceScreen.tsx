/**
 * Workspace detail — the client's own page.
 *
 * The document rail is the point of this screen. Each of the four documents
 * shows whether it is ready to send, and if it is not, exactly which fields are
 * missing, so a half-filled invoice never reaches a client. Preview and download
 * both go through generate.tsx, so they can never render different PDFs.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/store';
import { useToast } from '../ui/Toast';
import { AppHeader, Screen } from '../ui/Shell';
import {
  Button,
  Card,
  ConfirmBar,
  DataRow,
  IconButton,
  Pill,
  Select,
} from '../ui/controls';
import {
  AlertIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '../ui/icons';
import { CLIENT_STATUSES, STATUS_LABELS } from '../types/client';
import type { ClientStatus, ClientWorkspace } from '../types/client';
import { displayName } from '../lib/workspace';
import { allReadiness } from '../lib/documents';
import type { DocumentKind } from '../lib/documents';
import { downloadDocument, previewUrl } from '../pdf/generate';
import {
  advanceAmount,
  advancePercentUsed,
  balanceDue,
  formatMoney,
  projectTotal,
  receivedAmount,
} from '../lib/money';
import { formatDate, relativeTime } from '../lib/dates';
import { isSyncConfigured } from '../lib/sheetsSync';

export function WorkspaceScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { getWorkspace, saveWorkspace, removeWorkspace, duplicate, settings, syncNow } =
    useStore();

  const workspace = getWorkspace(id);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [syncing, setSyncing] = useState(false);

  if (!workspace) {
    return (
      <>
        <AppHeader title="Not found" backTo="/" />
        <Screen>
          <Card className="p-6 text-center">
            <p className="text-sm font-medium">That client no longer exists.</p>
            <p className="mt-1 text-sm text-ink-muted">
              It may have been deleted on this device.
            </p>
            <div className="mt-5 flex justify-center">
              <Button onClick={() => navigate('/')}>Back to clients</Button>
            </div>
          </Card>
        </Screen>
      </>
    );
  }

  const name = displayName(workspace);
  const total = projectTotal(workspace.pricing);
  const due = balanceDue(workspace);

  const setStatus = (status: ClientStatus) => {
    saveWorkspace({ ...workspace, status });
  };

  const onDuplicate = () => {
    const copy = duplicate(workspace.id);
    if (copy) {
      toast.show('Copied into a new draft.', 'good');
      navigate(`/c/${copy.id}/edit`);
    }
  };

  const onDelete = () => {
    removeWorkspace(workspace.id);
    toast.show(`${name} deleted.`, 'info');
    navigate('/');
  };

  const onSync = async () => {
    setSyncing(true);
    const outcome = await syncNow(workspace);
    setSyncing(false);
    const tone =
      outcome.status === 'ok' ? 'good' : outcome.status === 'error' ? 'error' : 'warn';
    toast.show(outcome.message, tone);
  };

  return (
    <>
      <AppHeader
        title={name}
        subtitle={`Updated ${relativeTime(workspace.updatedAt)}`}
        backTo="/"
        backLabel="Back to clients"
        actions={
          <>
            <IconButton label="Duplicate as template" onClick={onDuplicate}>
              <CopyIcon size={18} />
            </IconButton>
            <Link
              to={`/c/${workspace.id}/edit`}
              aria-label="Edit details"
              title="Edit details"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-black/[0.05] hover:text-ink"
            >
              <PencilIcon size={18} />
            </Link>
          </>
        }
      />

      <Screen>
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-ink-muted">Status</p>
              <Pill tone="neutral">{STATUS_LABELS[workspace.status]}</Pill>
            </div>
            <div className="mt-2">
              <Select
                value={workspace.status}
                onChange={setStatus}
                options={CLIENT_STATUSES.map((status) => ({
                  value: status,
                  label: STATUS_LABELS[status],
                }))}
              />
            </div>
          </Card>

          <DocumentRail workspace={workspace} />

          <Card className="divide-y divide-hairline">
            <div className="px-4 py-3">
              <h2 className="text-sm font-semibold tracking-tight">Money</h2>
            </div>
            <div className="px-4 py-1">
              <DataRow
                label="Project total"
                value={<span className="num font-medium">{formatMoney(total)}</span>}
              />
              <DataRow
                label={`Advance (${advancePercentUsed(workspace.pricing)}%)`}
                value={
                  <span className="num">{formatMoney(advanceAmount(workspace.pricing))}</span>
                }
              />
              <DataRow
                label="Received"
                value={<span className="num">{formatMoney(receivedAmount(workspace))}</span>}
              />
              <DataRow
                label="Balance due"
                value={
                  <span className={`num font-semibold ${due > 0 ? 'text-ink' : 'text-emerald-700'}`}>
                    {formatMoney(due)}
                  </span>
                }
              />
            </div>
          </Card>

          <Card className="divide-y divide-hairline">
            <div className="px-4 py-3">
              <h2 className="text-sm font-semibold tracking-tight">Details</h2>
            </div>
            <div className="px-4 py-1">
              <DataRow label="Contact" value={workspace.client.name || '—'} />
              <DataRow label="Business" value={workspace.client.businessName || '—'} />
              <DataRow label="Email" value={workspace.client.email || '—'} />
              <DataRow label="Phone" value={workspace.client.phone || '—'} />
              <DataRow label="Project" value={workspace.project.title || '—'} />
              <DataRow label="Timeline" value={workspace.pricing.timeline || '—'} />
              <DataRow
                label="Target delivery"
                value={
                  workspace.project.deliveryDate
                    ? formatDate(workspace.project.deliveryDate)
                    : '—'
                }
              />
              <DataRow label="Invoice number" value={workspace.invoice.number || '—'} />
            </div>
          </Card>

          {isSyncConfigured(settings) ? (
            <Card className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Google Sheet</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  This client is pushed automatically on every save.
                </p>
              </div>
              <Button small busy={syncing} onClick={onSync}>
                Push now
              </Button>
            </Card>
          ) : null}

          {confirmingDelete ? (
            <ConfirmBar
              message={`Delete ${name}? The workspace and its document data are removed from this browser. This cannot be undone.`}
              confirmLabel="Delete client"
              onConfirm={onDelete}
              onCancel={() => setConfirmingDelete(false)}
            />
          ) : (
            <Button full variant="danger" onClick={() => setConfirmingDelete(true)}>
              <TrashIcon size={16} />
              Delete client
            </Button>
          )}
        </div>
      </Screen>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Document rail                                                              */
/* -------------------------------------------------------------------------- */

function DocumentRail({ workspace }: { workspace: ClientWorkspace }) {
  const toast = useToast();
  const [busyKind, setBusyKind] = useState<DocumentKind | ''>('');
  const [preview, setPreview] = useState<{ kind: DocumentKind; url: string } | null>(null);

  // The object URL is owned by this component; without this the browser holds a
  // blob for every preview until the tab closes.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const closePreview = useCallback(() => {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }, []);

  const onDownload = async (kind: DocumentKind) => {
    setBusyKind(kind);
    try {
      await downloadDocument(kind, workspace);
    } catch (error) {
      toast.show(
        `That PDF could not be generated. ${error instanceof Error ? error.message : ''}`.trim(),
        'error',
      );
    } finally {
      setBusyKind('');
    }
  };

  const onPreview = async (kind: DocumentKind) => {
    setBusyKind(kind);
    try {
      const url = await previewUrl(kind, workspace);
      closePreview();
      setPreview({ kind, url });
    } catch (error) {
      toast.show(
        `That PDF could not be generated. ${error instanceof Error ? error.message : ''}`.trim(),
        'error',
      );
    } finally {
      setBusyKind('');
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-hairline px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">Documents</h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          All four are built from the details on this page.
        </p>
      </div>

      <ul className="divide-y divide-hairline">
        {allReadiness(workspace).map(({ kind, meta, readiness }) => (
          <li key={kind} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{meta.label}</p>
                  {readiness.ready ? (
                    <span className="text-emerald-600" title="Ready to send">
                      <CheckIcon size={14} />
                    </span>
                  ) : (
                    <span className="text-amber-600" title="Missing details">
                      <AlertIcon size={14} />
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{meta.blurb}</p>
              </div>
            </div>

            {readiness.ready ? (
              <div className="mt-3 flex gap-2">
                <Button small busy={busyKind === kind} onClick={() => onPreview(kind)}>
                  <EyeIcon size={15} />
                  Preview
                </Button>
                <Button
                  small
                  variant="primary"
                  busy={busyKind === kind}
                  onClick={() => onDownload(kind)}
                >
                  <DownloadIcon size={15} />
                  PDF
                </Button>
              </div>
            ) : (
              <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs leading-relaxed text-amber-800">
                Add {formatMissing(readiness.missing)} first.
              </p>
            )}
          </li>
        ))}
      </ul>

      {preview ? <PreviewOverlay url={preview.url} kind={preview.kind} onClose={closePreview} /> : null}
    </Card>
  );
}

/** "a, b and c" — reads better than a bullet list inside one short warning. */
function formatMissing(missing: string[]): string {
  const parts = missing.map((item) => item.toLowerCase());
  if (parts.length <= 1) return parts[0] ?? 'the missing details';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function PreviewOverlay({
  url,
  kind,
  onClose,
}: {
  url: string;
  kind: DocumentKind;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-ink/70 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="text-sm font-medium text-white">Preview</p>
        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/25"
          >
            Open in new tab
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-canvas"
          >
            Close
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 px-3 pb-3">
        {/* iOS Safari will not render a PDF in an iframe; the link above is the
            fallback, which is why it is always shown rather than hidden. */}
        <iframe
          src={url}
          title={`${kind} preview`}
          className="h-full w-full rounded-xl border-0 bg-white"
        />
      </div>
    </div>
  );
}
