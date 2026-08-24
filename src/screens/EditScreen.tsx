/**
 * Workspace editor.
 *
 * Every field in the four PDFs is entered exactly once, here. The form holds a
 * local draft so typing never re-renders the whole app, and commits on Save;
 * leaving with unsaved edits asks first, because a lost pricing table is worse
 * than an extra tap.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/store';
import { useToast } from '../ui/Toast';
import { AppHeader, BottomBar, Screen } from '../ui/Shell';
import {
  Button,
  Card,
  Field,
  FormSection,
  IconButton,
  NumberInput,
  Select,
  StringListEditor,
  TextArea,
  TextInput,
} from '../ui/controls';
import { CloseIcon, PlusIcon } from '../ui/icons';
import { CLIENT_STATUSES, STATUS_LABELS } from '../types/client';
import type {
  ClientContact,
  ClientStatus,
  ClientWorkspace,
  HandoverDetails,
  InvoiceDetails,
  LineItem,
  PricingTerms,
  ProjectDetails,
  ScopeDetails,
} from '../types/client';
import { emptyLineItem, emptyServiceRow, displayName } from '../lib/workspace';
import { CURRENCY } from '../config/identity';
import {
  advanceAmount,
  advancePercentUsed,
  balanceAfterAdvance,
  discountApplied,
  formatMoney,
  lineTotal,
  projectTotal,
  subtotal,
} from '../lib/money';

const SECTIONS = [
  { id: 'client', label: 'Client' },
  { id: 'project', label: 'Project' },
  { id: 'scope', label: 'Scope' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'dates', label: 'Dates' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'handover', label: 'Handover' },
];

export function EditScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { getWorkspace, saveWorkspace } = useStore();

  const stored = getWorkspace(id);
  const [draft, setDraft] = useState<ClientWorkspace | null>(stored ?? null);
  const [dirty, setDirty] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  // Which workspace the draft belongs to. Keyed by id rather than a boolean, so
  // opening the editor for a different client cannot keep the previous draft.
  const draftFor = useRef(stored ? id : '');

  // A workspace created on the list screen lands here one render later.
  useEffect(() => {
    if (draftFor.current !== id && stored) {
      draftFor.current = id;
      setDraft(stored);
      setDirty(false);
    }
  }, [id, stored]);

  // Warns on tab close or reload. In-app navigation is handled by confirmLeave.
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  if (!draft) {
    return (
      <>
        <AppHeader title="Not found" backTo="/" />
        <Screen>
          <Card className="p-6 text-center">
            <p className="text-sm font-medium">That client no longer exists.</p>
            <div className="mt-5 flex justify-center">
              <Button onClick={() => navigate('/')}>Back to clients</Button>
            </div>
          </Card>
        </Screen>
      </>
    );
  }

  const patch = (changes: Partial<ClientWorkspace>) => {
    setDraft((current) => (current ? { ...current, ...changes } : current));
    setDirty(true);
  };
  const patchClient = (changes: Partial<ClientContact>) =>
    patch({ client: { ...draft.client, ...changes } });
  const patchProject = (changes: Partial<ProjectDetails>) =>
    patch({ project: { ...draft.project, ...changes } });
  const patchScope = (changes: Partial<ScopeDetails>) =>
    patch({ scope: { ...draft.scope, ...changes } });
  const patchPricing = (changes: Partial<PricingTerms>) =>
    patch({ pricing: { ...draft.pricing, ...changes } });
  const patchInvoice = (changes: Partial<InvoiceDetails>) =>
    patch({ invoice: { ...draft.invoice, ...changes } });
  const patchHandover = (changes: Partial<HandoverDetails>) =>
    patch({ handover: { ...draft.handover, ...changes } });

  const onSave = () => {
    saveWorkspace(draft);
    setDirty(false);
    toast.show('Saved.', 'good');
    navigate(`/c/${draft.id}`);
  };

  const leave = () => {
    if (dirty) {
      setConfirmLeave(true);
      return;
    }
    navigate(`/c/${draft.id}`);
  };

  const total = projectTotal(draft.pricing);
  const discount = discountApplied(draft.pricing);
  const advance = advanceAmount(draft.pricing);

  return (
    <>
      <AppHeader
        title={displayName(draft)}
        subtitle={dirty ? 'Unsaved changes' : 'All changes saved'}
        actions={
          <Button small variant="ghost" onClick={leave}>
            Close
          </Button>
        }
      />

      <div className="sticky top-[57px] z-20 border-b border-hairline bg-canvas/85 backdrop-blur">
        <div className="hide-scrollbar mx-auto flex max-w-app gap-1.5 overflow-x-auto px-4 py-2">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="shrink-0 rounded-full border border-hairline bg-white px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-ink-faint hover:text-ink"
            >
              {section.label}
            </a>
          ))}
        </div>
      </div>

      <Screen bottomBar>
        {confirmLeave ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-900">
              You have unsaved changes. Save them before leaving?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button small variant="primary" onClick={onSave}>
                Save and close
              </Button>
              <Button small variant="danger" onClick={() => navigate(`/c/${draft.id}`)}>
                Discard changes
              </Button>
              <Button small variant="ghost" onClick={() => setConfirmLeave(false)}>
                Keep editing
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          {/* ---------------------------------------------------------------- */}
          <section id="client" className="scroll-mt-32">
            <FormSection
              title="Client"
              hint="Printed in the recipient block of every document."
            >
              <Field label="Contact person">
                <TextInput
                  value={draft.client.name}
                  onChange={(value) => patchClient({ name: value })}
                  placeholder="Khushi Sharma"
                />
              </Field>
              <Field
                label="Business or brand"
                hint="Used as the client's name in lists and filenames when present."
              >
                <TextInput
                  value={draft.client.businessName}
                  onChange={(value) => patchClient({ businessName: value })}
                  placeholder="Glam by Khushi"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email">
                  <TextInput
                    type="email"
                    inputMode="email"
                    value={draft.client.email}
                    onChange={(value) => patchClient({ email: value })}
                    placeholder="khushi@example.com"
                  />
                </Field>
                <Field label="Phone">
                  <TextInput
                    type="tel"
                    inputMode="tel"
                    value={draft.client.phone}
                    onChange={(value) => patchClient({ phone: value })}
                    placeholder="+91 90000 00000"
                  />
                </Field>
              </div>
              <Field label="Address" hint="One line per line. Optional.">
                <TextArea
                  rows={3}
                  value={draft.client.address}
                  onChange={(value) => patchClient({ address: value })}
                  placeholder={'Shop 4, MG Road\nBengaluru 560001'}
                />
              </Field>
              <Field label="Status">
                <Select
                  value={draft.status}
                  onChange={(value: ClientStatus) => patch({ status: value })}
                  options={CLIENT_STATUSES.map((status) => ({
                    value: status,
                    label: STATUS_LABELS[status],
                  }))}
                />
              </Field>
            </FormSection>
          </section>

          {/* ---------------------------------------------------------------- */}
          <section id="project" className="scroll-mt-32">
            <FormSection title="Project">
              <Field label="Project title">
                <TextInput
                  value={draft.project.title}
                  onChange={(value) => patchProject({ title: value })}
                  placeholder="Salon booking website"
                />
              </Field>
              <Field label="One-line summary" hint="Appears under the title on documents.">
                <TextInput
                  value={draft.project.summary}
                  onChange={(value) => patchProject({ summary: value })}
                  placeholder="A five-page site with online booking and WhatsApp enquiries."
                />
              </Field>
              <Field label="Description" hint="The longer explanation in the Proposal.">
                <TextArea
                  rows={5}
                  value={draft.project.description}
                  onChange={(value) => patchProject({ description: value })}
                  placeholder="Blank lines separate paragraphs."
                />
              </Field>
              <Field label="Tech stack">
                <StringListEditor
                  items={draft.project.techStack}
                  onChange={(items) => patchProject({ techStack: items })}
                  placeholder="React"
                  addLabel="+ Add technology"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start date">
                  <TextInput
                    type="date"
                    value={draft.project.startDate}
                    onChange={(value) => patchProject({ startDate: value })}
                  />
                </Field>
                <Field label="Target delivery">
                  <TextInput
                    type="date"
                    value={draft.project.deliveryDate}
                    onChange={(value) => patchProject({ deliveryDate: value })}
                  />
                </Field>
              </div>
            </FormSection>
          </section>

          {/* ---------------------------------------------------------------- */}
          <section id="scope" className="scroll-mt-32">
            <FormSection
              title="Scope"
              hint="What is excluded matters as much as what is included — it is what you point at when the extra request arrives."
            >
              <Field label="Included">
                <StringListEditor
                  items={draft.scope.included}
                  onChange={(items) => patchScope({ included: items })}
                  placeholder="Five responsive pages"
                  addLabel="+ Add included item"
                />
              </Field>
              <Field label="Not included">
                <StringListEditor
                  items={draft.scope.excluded}
                  onChange={(items) => patchScope({ excluded: items })}
                  placeholder="Logo design"
                  addLabel="+ Add excluded item"
                />
              </Field>
            </FormSection>
          </section>

          {/* ---------------------------------------------------------------- */}
          <section id="pricing" className="scroll-mt-32">
            <FormSection
              title="Pricing and terms"
              hint="This table is printed identically in the Proposal, Agreement and Invoice."
              action={
                <Button
                  small
                  variant="ghost"
                  onClick={() =>
                    patchPricing({ lineItems: [...draft.pricing.lineItems, emptyLineItem()] })
                  }
                >
                  <PlusIcon size={14} />
                  Row
                </Button>
              }
            >
              <div className="space-y-3">
                {draft.pricing.lineItems.map((item, index) => (
                  <LineItemEditor
                    key={item.id}
                    item={item}
                    canRemove={draft.pricing.lineItems.length > 1}
                    onChange={(next) => {
                      const items = draft.pricing.lineItems.slice();
                      items[index] = next;
                      patchPricing({ lineItems: items });
                    }}
                    onRemove={() =>
                      patchPricing({
                        lineItems: draft.pricing.lineItems.filter((_, at) => at !== index),
                      })
                    }
                  />
                ))}
              </div>

              <div className="rounded-lg border border-hairline bg-canvas px-3 py-2.5">
                <SummaryLine
                  label="Subtotal"
                  value={formatMoney(subtotal(draft.pricing.lineItems))}
                />
                {discount > 0 ? (
                  <SummaryLine label="Discount" value={`- ${formatMoney(discount)}`} />
                ) : null}
                <SummaryLine label="Total" value={formatMoney(total)} strong />
                <SummaryLine
                  label={`Advance (${advancePercentUsed(draft.pricing)}%)`}
                  value={formatMoney(advanceAmount(draft.pricing))}
                />
                <SummaryLine
                  label="On delivery"
                  value={formatMoney(balanceAfterAdvance(draft.pricing))}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Discount"
                  hint="A flat amount off the subtotal. 0 hides the row. Capped at the subtotal."
                >
                  <NumberInput
                    value={draft.pricing.discount}
                    onChange={(value) => patchPricing({ discount: value })}
                    min={0}
                    affix={CURRENCY.uiSymbol}
                  />
                </Field>
                <Field label="Advance">
                  <NumberInput
                    value={draft.pricing.advancePercent}
                    onChange={(value) => patchPricing({ advancePercent: value })}
                    min={0}
                    max={100}
                    affix="%"
                    affixSide="right"
                  />
                </Field>
                <Field label="Revisions included">
                  <NumberInput
                    value={draft.pricing.revisionsIncluded}
                    onChange={(value) => patchPricing({ revisionsIncluded: value })}
                    min={0}
                  />
                </Field>
                <Field label="Timeline">
                  <TextInput
                    value={draft.pricing.timeline}
                    onChange={(value) => patchPricing({ timeline: value })}
                    placeholder="4 weeks from advance"
                  />
                </Field>
              </div>

              <Field label="Payment method">
                <TextInput
                  value={draft.pricing.paymentMethod}
                  onChange={(value) => patchPricing({ paymentMethod: value })}
                  placeholder="UPI or bank transfer"
                />
              </Field>
              <Field
                label="Payment details"
                hint="Printed on the Invoice under How to pay. Your UPI id or account details."
              >
                <TextArea
                  rows={3}
                  value={draft.pricing.paymentDetails}
                  onChange={(value) => patchPricing({ paymentDetails: value })}
                  placeholder={'UPI: pranav@upi\nBank: ...'}
                />
              </Field>
              <Field
                label="Additional terms"
                hint="Each line becomes an extra numbered clause in the Agreement."
              >
                <StringListEditor
                  items={draft.pricing.extraTerms}
                  onChange={(items) => patchPricing({ extraTerms: items })}
                  placeholder="Content is supplied by the client in one batch."
                  addLabel="+ Add term"
                />
              </Field>
            </FormSection>
          </section>

          {/* ---------------------------------------------------------------- */}
          <section id="dates" className="scroll-mt-32">
            <FormSection
              title="Document dates"
              hint="Stored, not generated when the PDF is made — so re-exporting a document later reproduces it instead of re-dating it. Blank means today."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Proposal date">
                  <TextInput
                    type="date"
                    value={draft.documentDates.proposalDate}
                    onChange={(value) =>
                      patch({
                        documentDates: { ...draft.documentDates, proposalDate: value },
                      })
                    }
                  />
                </Field>
                <Field
                  label="Agreement signed on"
                  hint="Fill this in when it is actually signed."
                >
                  <TextInput
                    type="date"
                    value={draft.documentDates.agreementDate}
                    onChange={(value) =>
                      patch({
                        documentDates: { ...draft.documentDates, agreementDate: value },
                      })
                    }
                  />
                </Field>
              </div>
            </FormSection>
          </section>

          {/* ---------------------------------------------------------------- */}
          <section id="invoice" className="scroll-mt-32">
            <FormSection title="Invoice">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Invoice number">
                  <TextInput
                    value={draft.invoice.number}
                    onChange={(value) => patchInvoice({ number: value })}
                    placeholder="INV-2026-001"
                  />
                </Field>
                <div>
                  <Field label="Amount already received" hint="Usually the advance.">
                    <NumberInput
                      value={draft.invoice.amountReceived}
                      onChange={(value) => patchInvoice({ amountReceived: value })}
                      min={0}
                      max={total}
                      affix={CURRENCY.uiSymbol}
                    />
                  </Field>
                  {advance > 0 && draft.invoice.amountReceived !== advance ? (
                    <button
                      type="button"
                      onClick={() => patchInvoice({ amountReceived: advance })}
                      className="mt-1.5 text-xs font-medium text-accent underline underline-offset-2 hover:text-accent-deep"
                    >
                      Set to the agreed advance ({formatMoney(advance)})
                    </button>
                  ) : null}
                </div>
                <Field label="Issue date">
                  <TextInput
                    type="date"
                    value={draft.invoice.issueDate}
                    onChange={(value) => patchInvoice({ issueDate: value })}
                  />
                </Field>
                <Field label="Due date">
                  <TextInput
                    type="date"
                    value={draft.invoice.dueDate}
                    onChange={(value) => patchInvoice({ dueDate: value })}
                  />
                </Field>
              </div>
              <Field label="Invoice notes">
                <TextArea
                  rows={3}
                  value={draft.invoice.notes}
                  onChange={(value) => patchInvoice({ notes: value })}
                  placeholder="Optional."
                />
              </Field>
            </FormSection>
          </section>

          {/* ---------------------------------------------------------------- */}
          <section id="handover" className="scroll-mt-32">
            <FormSection
              title="Handover"
              hint="Filled in at the end of the project. Never put passwords here — this becomes a PDF."
              action={
                <Button
                  small
                  variant="ghost"
                  onClick={() =>
                    patchHandover({
                      services: [...draft.handover.services, emptyServiceRow()],
                    })
                  }
                >
                  <PlusIcon size={14} />
                  Service
                </Button>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Completed on">
                  <TextInput
                    type="date"
                    value={draft.handover.completedOn}
                    onChange={(value) => patchHandover({ completedOn: value })}
                  />
                </Field>
                <Field label="Support window (days)">
                  <NumberInput
                    value={draft.handover.supportWindowDays}
                    onChange={(value) => patchHandover({ supportWindowDays: value })}
                    min={0}
                  />
                </Field>
              </div>
              <Field label="Live site URL">
                <TextInput
                  type="url"
                  inputMode="url"
                  value={draft.handover.liveUrl}
                  onChange={(value) => patchHandover({ liveUrl: value })}
                  placeholder="https://example.com"
                />
              </Field>
              <Field label="Admin login URL">
                <TextInput
                  type="url"
                  inputMode="url"
                  value={draft.handover.adminUrl}
                  onChange={(value) => patchHandover({ adminUrl: value })}
                  placeholder="https://example.com/admin"
                />
              </Field>
              <Field label="Source code URL">
                <TextInput
                  type="url"
                  inputMode="url"
                  value={draft.handover.repoUrl}
                  onChange={(value) => patchHandover({ repoUrl: value })}
                  placeholder="https://github.com/..."
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Hosting">
                  <TextInput
                    value={draft.handover.hostingProvider}
                    onChange={(value) => patchHandover({ hostingProvider: value })}
                    placeholder="Vercel"
                  />
                </Field>
                <Field label="Domain registrar">
                  <TextInput
                    value={draft.handover.domainRegistrar}
                    onChange={(value) => patchHandover({ domainRegistrar: value })}
                    placeholder="GoDaddy"
                  />
                </Field>
              </div>

              {draft.handover.services.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-ink-muted">Accounts and services</p>
                  {draft.handover.services.map((service, index) => (
                    <div
                      key={service.id}
                      className="space-y-2 rounded-lg border border-hairline p-3"
                    >
                      <div className="flex items-center gap-2">
                        <TextInput
                          value={service.name}
                          onChange={(value) => {
                            const services = draft.handover.services.slice();
                            services[index] = { ...service, name: value };
                            patchHandover({ services });
                          }}
                          placeholder="Service name"
                        />
                        <IconButton
                          label="Remove service"
                          danger
                          onClick={() =>
                            patchHandover({
                              services: draft.handover.services.filter((_, at) => at !== index),
                            })
                          }
                        >
                          <CloseIcon size={16} />
                        </IconButton>
                      </div>
                      <TextInput
                        value={service.purpose}
                        onChange={(value) => {
                          const services = draft.handover.services.slice();
                          services[index] = { ...service, purpose: value };
                          patchHandover({ services });
                        }}
                        placeholder="What it does"
                      />
                      <TextInput
                        value={service.account}
                        onChange={(value) => {
                          const services = draft.handover.services.slice();
                          services[index] = { ...service, account: value };
                          patchHandover({ services });
                        }}
                        placeholder="Account holder after handover"
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              <Field label="What is included in the handover">
                <StringListEditor
                  items={draft.handover.assets}
                  onChange={(items) => patchHandover({ assets: items })}
                  placeholder="Full source code"
                  addLabel="+ Add item"
                />
              </Field>
              <Field
                label="Credentials note"
                hint="How the credentials were shared, not the credentials themselves."
              >
                <TextArea
                  rows={3}
                  value={draft.handover.credentialsNote}
                  onChange={(value) => patchHandover({ credentialsNote: value })}
                  placeholder="Sent separately over WhatsApp on the day of handover."
                />
              </Field>
              <Field label="Handover notes">
                <TextArea
                  rows={3}
                  value={draft.handover.notes}
                  onChange={(value) => patchHandover({ notes: value })}
                  placeholder="Optional."
                />
              </Field>
            </FormSection>
          </section>
        </div>
      </Screen>

      <BottomBar>
        <div className="min-w-0 flex-1">
          <p className="text-2xs text-ink-muted">Project total</p>
          <p className="num truncate text-sm font-semibold">{formatMoney(total)}</p>
        </div>
        <Button variant="secondary" onClick={leave}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onSave} disabled={!dirty}>
          {dirty ? 'Save' : 'Saved'}
        </Button>
      </BottomBar>
    </>
  );
}

function SummaryLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.5">
      <span className={`text-xs ${strong ? 'font-medium text-ink' : 'text-ink-muted'}`}>
        {label}
      </span>
      <span className={`num text-sm ${strong ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}

function LineItemEditor({
  item,
  onChange,
  onRemove,
  canRemove,
}: {
  item: LineItem;
  onChange: (item: LineItem) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const amount = useMemo(() => lineTotal(item), [item]);

  return (
    <div className="space-y-2 rounded-lg border border-hairline p-3">
      <div className="flex items-center gap-2">
        <TextInput
          value={item.description}
          onChange={(value) => onChange({ ...item, description: value })}
          placeholder="Design and build five pages"
        />
        {canRemove ? (
          <IconButton label="Remove line item" danger onClick={onRemove}>
            <CloseIcon size={16} />
          </IconButton>
        ) : null}
      </div>
      <div className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2">
        <NumberInput
          value={item.quantity}
          onChange={(value) => onChange({ ...item, quantity: value })}
          min={0}
          step={1}
        />
        <NumberInput
          value={item.unitPrice}
          onChange={(value) => onChange({ ...item, unitPrice: value })}
          min={0}
          affix={CURRENCY.uiSymbol}
        />
        <span className="num shrink-0 pl-1 text-right text-sm font-medium">
          {formatMoney(amount)}
        </span>
      </div>
    </div>
  );
}
