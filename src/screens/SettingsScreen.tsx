/**
 * Settings.
 *
 * Two jobs: connect the optional Google Sheet, and get your data in and out of
 * this browser. The sender identity is shown read-only because it is fixed in
 * config/identity.ts — one place, so it can never differ between two documents.
 */

import { useRef, useState } from 'react';
import { useStore } from '../store/store';
import { useToast } from '../ui/Toast';
import { AppHeader, Screen } from '../ui/Shell';
import {
  Button,
  Card,
  ConfirmBar,
  DataRow,
  Field,
  FormSection,
  Pill,
  TextInput,
  Toggle,
} from '../ui/controls';
import { IDENTITY, PRODUCT } from '../config/identity';
import { describeUrlProblem, testConnection } from '../lib/sheetsSync';
import type { SyncStatus } from '../lib/sheetsSync';
import { downloadTextFile, fromBackupJson, toBackupJson } from '../lib/storage';
import { todayIso } from '../lib/dates';

export function SettingsScreen() {
  const toast = useToast();
  const { workspaces, settings, setSettings, replaceWorkspaces } = useStore();

  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ status: SyncStatus; message: string } | null>(null);
  const [confirmingImport, setConfirmingImport] = useState<{ count: number; json: string } | null>(
    null,
  );
  const fileInput = useRef<HTMLInputElement | null>(null);

  const urlProblem = settings.sheetsWebhookUrl.trim()
    ? describeUrlProblem(settings.sheetsWebhookUrl)
    : null;

  const onTest = async () => {
    setTesting(true);
    setResult(null);
    const outcome = await testConnection(settings);
    setResult(outcome);
    setTesting(false);
  };

  const onExport = () => {
    const json = toBackupJson(workspaces, settings);
    downloadTextFile(`clientflow-backup-${todayIso()}.json`, json);
    toast.show('Backup downloaded.', 'good');
  };

  const onPickFile = () => fileInput.current?.click();

  const onFileChosen = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const parsed = fromBackupJson(text);
    if (!parsed.ok) {
      toast.show(parsed.error ?? 'That backup could not be read.', 'error');
      return;
    }
    setConfirmingImport({ count: parsed.workspaces.length, json: text });
  };

  const onConfirmImport = () => {
    if (!confirmingImport) return;
    const parsed = fromBackupJson(confirmingImport.json);
    if (parsed.ok) {
      replaceWorkspaces(parsed.workspaces);
      toast.show(
        `Restored ${parsed.workspaces.length} ${
          parsed.workspaces.length === 1 ? 'client' : 'clients'
        }.`,
        'good',
      );
    }
    setConfirmingImport(null);
  };

  return (
    <>
      <AppHeader title="Settings" backTo="/" backLabel="Back to clients" />

      <Screen>
        <div className="space-y-4">
          <FormSection
            title="Your details"
            hint="Fixed in the code so every document uses the same sender. Edit src/config/identity.ts to change them."
          >
            <div className="-my-2">
              <DataRow label="Name" value={IDENTITY.legalName} />
              <DataRow label="Discipline" value={IDENTITY.discipline} />
              <DataRow label="Email" value={IDENTITY.email} />
              <DataRow label="Phone" value={<span className="num">{IDENTITY.phone}</span>} />
            </div>
          </FormSection>

          <FormSection
            title="Google Sheet"
            hint="Optional. Pushes one row per client to a Sheet you own, through an Apps Script Web App — so there is no key to leak and no server to run. The app works fully without it."
          >
            <Toggle
              checked={settings.sheetsSyncEnabled}
              onChange={(checked) => setSettings({ ...settings, sheetsSyncEnabled: checked })}
              label="Sync clients to my Sheet"
              hint="When off, nothing leaves this browser."
            />

            <Field
              label="Web App URL"
              hint="Deploy google-apps-script/Code.gs as a Web App and paste the /exec URL. See the README."
              error={urlProblem ?? undefined}
            >
              <TextInput
                type="url"
                inputMode="url"
                value={settings.sheetsWebhookUrl}
                onChange={(value) => {
                  setSettings({ ...settings, sheetsWebhookUrl: value });
                  setResult(null);
                }}
                placeholder="https://script.google.com/macros/s/AKfy.../exec"
              />
            </Field>

            <Field
              label="Shared secret"
              hint="Must match SYNC_TOKEN at the top of Code.gs. It stops anyone who finds your URL from writing rows."
            >
              <TextInput
                value={settings.sheetsSyncToken}
                onChange={(value) => {
                  setSettings({ ...settings, sheetsSyncToken: value });
                  setResult(null);
                }}
                placeholder="a long random string you invent"
              />
            </Field>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                small
                busy={testing}
                onClick={onTest}
                disabled={!settings.sheetsWebhookUrl.trim()}
              >
                Test connection
              </Button>
              {result ? <SyncResult status={result.status} message={result.message} /> : null}
            </div>

            <p className="rounded-lg bg-canvas px-3 py-2.5 text-xs leading-relaxed text-ink-muted">
              A failed sync never blocks anything. Clients are always saved in this browser first,
              and the Sheet is updated afterwards.
            </p>
          </FormSection>

          <FormSection
            title="Your data"
            hint={`${workspaces.length} ${
              workspaces.length === 1 ? 'client is' : 'clients are'
            } stored in this browser only. Export before clearing site data or switching devices.`}
          >
            {confirmingImport ? (
              <ConfirmBar
                message={`Restore ${confirmingImport.count} ${
                  confirmingImport.count === 1 ? 'client' : 'clients'
                } from this file? Everything currently in this browser will be replaced.`}
                confirmLabel="Replace and restore"
                onConfirm={onConfirmImport}
                onCancel={() => setConfirmingImport(null)}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button small onClick={onExport} disabled={workspaces.length === 0}>
                  Export backup
                </Button>
                <Button small onClick={onPickFile}>
                  Restore from backup
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(event) => {
                    void onFileChosen(event.target.files?.[0]);
                    // Lets the same file be picked twice in a row.
                    event.target.value = '';
                  }}
                />
              </div>
            )}
            <p className="text-xs leading-relaxed text-ink-faint">
              The backup contains your clients but not the Web App URL or secret, since those are
              write access to your Sheet.
            </p>
          </FormSection>

          <Card className="px-4 py-3">
            <p className="text-xs text-ink-faint">
              {PRODUCT.name} — built for {IDENTITY.legalName}. Documents are generated in this
              browser; nothing is uploaded unless you connect a Sheet.
            </p>
          </Card>
        </div>
      </Screen>
    </>
  );
}

function SyncResult({ status, message }: { status: SyncStatus; message: string }) {
  const label: Record<SyncStatus, string> = {
    ok: 'Connected',
    unconfirmed: 'No reply',
    error: 'Failed',
    off: 'Off',
  };
  const tone: Record<SyncStatus, 'good' | 'warn' | 'neutral'> = {
    ok: 'good',
    unconfirmed: 'warn',
    error: 'warn',
    off: 'neutral',
  };
  return (
    <span className="flex items-center gap-2">
      <Pill tone={tone[status]}>{label[status]}</Pill>
      <span className="text-xs text-ink-muted">{message}</span>
    </span>
  );
}
