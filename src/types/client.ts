/**
 * The shape of a client workspace.
 *
 * One workspace is one client engagement, and it is the single source of truth
 * for all four documents. Nothing in a PDF is typed twice: if the project title
 * changes here, it changes in the Proposal, Agreement, Invoice and Handover.
 */

export const CLIENT_STATUSES = [
  'draft',
  'proposal_sent',
  'agreed',
  'in_progress',
  'delivered',
] as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const STATUS_LABELS: Record<ClientStatus, string> = {
  draft: 'Draft',
  proposal_sent: 'Proposal sent',
  agreed: 'Agreed',
  in_progress: 'In progress',
  delivered: 'Delivered',
};

export interface ClientContact {
  /** Person you deal with. */
  name: string;
  /** Business or brand the work is for. */
  businessName: string;
  email: string;
  phone: string;
  /** Free text, one line per line. Printed in the recipient block. */
  address: string;
}

export interface ProjectDetails {
  title: string;
  /** One line, used as the subtitle on documents. */
  summary: string;
  /** Longer narrative for the Proposal. */
  description: string;
  techStack: string[];
  /** 'YYYY-MM-DD' or ''. */
  startDate: string;
  /** 'YYYY-MM-DD' or ''. */
  deliveryDate: string;
}

export interface ScopeDetails {
  included: string[];
  excluded: string[];
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface PricingTerms {
  lineItems: LineItem[];
  /** Absolute rupee discount applied to the subtotal. 0 to hide the row. */
  discount: number;
  /** Percentage of the total payable up front. */
  advancePercent: number;
  revisionsIncluded: number;
  /** e.g. '4 weeks from receipt of advance'. */
  timeline: string;
  /** e.g. 'UPI or bank transfer'. */
  paymentMethod: string;
  /** Where to actually send money — UPI id, account details. */
  paymentDetails: string;
  /** Extra clauses appended to the Agreement, one per entry. */
  extraTerms: string[];
}

export interface InvoiceDetails {
  number: string;
  /** 'YYYY-MM-DD' or ''. */
  issueDate: string;
  /** 'YYYY-MM-DD' or ''. */
  dueDate: string;
  /** Already-received amount, e.g. the advance. Drives 'balance due'. */
  amountReceived: number;
  notes: string;
}

export interface ServiceRow {
  id: string;
  name: string;
  purpose: string;
  /** Who holds the account after handover. */
  account: string;
}

export interface HandoverDetails {
  /** 'YYYY-MM-DD' or ''. */
  completedOn: string;
  liveUrl: string;
  repoUrl: string;
  hostingProvider: string;
  domainRegistrar: string;
  adminUrl: string;
  /** How credentials were shared. Never put passwords in a PDF. */
  credentialsNote: string;
  /** Third-party accounts the client now owns or needs to know about. */
  services: ServiceRow[];
  /** What is being handed over. */
  assets: string[];
  /** Days of free support after delivery. 0 to hide. */
  supportWindowDays: number;
  notes: string;
}

/**
 * The dates the Proposal and Agreement carry.
 *
 * Stored rather than generated when the PDF is rendered: an agreement that was
 * signed in March must still say March when it is re-exported in June. Blank
 * falls back to today, which is right for a document you have not sent yet.
 *
 * The Invoice and Handover already have their own dates — `invoice.issueDate`
 * and `handover.completedOn` — so they are not repeated here.
 */
export interface DocumentDates {
  /** 'YYYY-MM-DD' or ''. */
  proposalDate: string;
  /** 'YYYY-MM-DD' or ''. Set this when the agreement is actually signed. */
  agreementDate: string;
}

export interface ClientWorkspace {
  id: string;
  /** ISO datetime. */
  createdAt: string;
  /** ISO datetime. */
  updatedAt: string;
  status: ClientStatus;
  client: ClientContact;
  project: ProjectDetails;
  scope: ScopeDetails;
  pricing: PricingTerms;
  invoice: InvoiceDetails;
  handover: HandoverDetails;
  documentDates: DocumentDates;
}

export interface AppSettings {
  /** Apps Script /exec URL. Empty means sync is off. */
  sheetsWebhookUrl: string;
  /** Shared secret matching SYNC_TOKEN in google-apps-script/Code.gs. */
  sheetsSyncToken: string;
  /** Master switch, independent of whether a URL is present. */
  sheetsSyncEnabled: boolean;
}

/** What gets written to localStorage. Versioned so it can be migrated later. */
export interface StoredState {
  version: 1;
  workspaces: ClientWorkspace[];
  settings: AppSettings;
}
