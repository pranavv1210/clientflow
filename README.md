# ClientFlow

A single-purpose tool for running freelance client work: one workspace per client,
and four client-facing PDFs generated from it.

Every document is built from the same workspace record, so the project title you
type once is the project title on the proposal, the agreement, the invoice and the
handover sheet. There is no second place to keep in sync and nothing to re-type.

## What it generates

Each client workspace produces four PDFs, on demand, in the browser:

**Proposal & Scope of Work** — what you will build, what is explicitly not
included, the fee breakdown and the timeline. This is the document that goes out
first.

**Project Agreement** — the same scope and fees, plus fourteen numbered
plain-language clauses covering ownership, revisions, payment schedule,
termination and liability, with signature blocks for both sides.

**Invoice** — the same line items, less anything already received, with the
balance due in figures and in words, and how to pay.

**Handover Document** — where the live site, admin panel and source code live,
which third-party accounts exist and who holds them, what is included in the
handover, and how long free support runs.

All four share one header, one type scale and one set of table styles, so a client
receiving all four over the life of a project receives four documents that look
like they came from the same place.

## Running it locally

Requires Node 18 or newer.

```bash
npm install
npm run dev
```

The dev server binds to your network as well as localhost, so the address Vite
prints under **Network** will open on your phone if it is on the same Wi-Fi. That
matters here: the interface is built phone-first, and it is worth checking it
there.

Two other scripts are worth knowing:

```bash
npm run typecheck   # tsc --noEmit; run this first, before anything else
npm run build       # production build into dist/
```

## Environment variables

None are required. Client data lives in your browser and PDFs are generated
locally, so the app is fully functional with no configuration at all.

`.env.example` documents the two optional variables, both of which only pre-fill
the Google Sheet settings for a fresh browser:

- `VITE_SHEETS_WEBHOOK_URL` — your Apps Script Web App `/exec` URL
- `VITE_SHEETS_SYNC_TOKEN` — the shared secret you invent

Copy it to `.env` if you want those defaults baked into a build. `.env` is
gitignored and must stay that way. Anything you set in the app's Settings screen
overrides these, so you never actually need the file.

There is deliberately no service-account key anywhere in this project. The Sheets
integration uses a Web App you deploy from your own Google account, which means
there is no private key to store, no key to leak through the frontend bundle, and
no server to keep running.

## Google Sheets sync (optional)

This pushes the full workspace data into a spreadsheet you own and can save PDFs
into Google Drive. It is genuinely optional: switch it off, or never configure
it, and everything else works exactly the same.

The script maintains three tabs:

- `Dashboard` — live counts, value, balance due, and saved PDF totals
- `Clients` — one rich row per client, including scope, pricing, handover, PDF
  links, and a raw workspace JSON backup column
- `Documents` — one row per PDF saved to Drive

1. Create a Google Sheet. Name the first tab `Clients`.
2. In that sheet, choose **Extensions → Apps Script**.
3. Delete the placeholder code and paste in the contents of
   `google-apps-script/Code.gs` from this repo.
4. At the top of that file, change `SYNC_TOKEN` to a long random string you
   invent. This is what stops anyone who discovers your Web App URL from writing
   rows into your sheet.
5. Choose **Deploy → New deployment → Web app**. Set *Execute as* to **Me** and
   *Who has access* to **Anyone**. Google will ask you to authorise Spreadsheet
   access, and Drive access if you use PDF saving.
6. Copy the deployment URL. It must end in `/exec` — the `/dev` URL only works
   while you are signed in and will fail from the app.
7. In ClientFlow, open **Settings**, paste the URL and the same secret, and press
   **Test connection**.

The script upserts by client id, so saving the same client twice updates its row
instead of appending a duplicate. The PDF buttons on a workspace include a
`Drive` action; that generates the PDF in the browser, sends it to Apps Script,
saves it in `ClientFlow PDFs/<client name>/` in Google Drive, writes one row in
`Documents`, and writes the Drive link back onto the same client row.

After editing `Code.gs`, use **Deploy → Manage deployments**, edit the Web App,
select **New version**, and deploy again. Saving the script alone does not update
the live `/exec` URL.

A note on what "Test connection" can tell you. Browsers will not let a page read
the response from a cross-origin request that Apps Script cannot answer with CORS
headers, so a successful write sometimes comes back as **No reply** rather than
**Connected**. That means the request left the browser but the answer was opaque;
check the sheet itself to confirm. A **Failed** result is a real, diagnosable
error — usually a `/dev` URL, a mistyped secret, or a deployment that was never
authorised.

Sync never blocks anything. Clients are written to local storage first, and the
sheet is updated afterwards. If the network is down, you lose the row, not the
client.

## Deploying to Vercel

The app is frontend-only, so this is a single deploy with no backend and no
environment variables needed.

Push this repo to GitHub, then in Vercel choose **Add New → Project** and import
it. Vercel detects Vite; the defaults (`npm run build`, output `dist`) are
correct. `vercel.json` already rewrites every path to `index.html`, which is what
lets `/c/<id>` survive a refresh.

If you want the Sheet settings pre-filled for a new browser, add
`VITE_SHEETS_WEBHOOK_URL` and `VITE_SHEETS_SYNC_TOKEN` as Vercel environment
variables. Otherwise skip them and use the Settings screen.

## Where your data lives

In your browser's local storage, on the device you entered it on. Nothing is
uploaded unless you connect a Sheet. This is the right trade for a personal tool —
no account, no backend, no monthly bill — but it has one consequence worth taking
seriously: clearing site data for this domain deletes your clients.

Settings has **Export backup**, which downloads a JSON file of every workspace,
and **Restore from backup**, which replaces what is in the browser with a file's
contents. Export before you clear site data, change browsers, or switch devices.
The backup deliberately excludes your Web App URL and secret, because those are
write access to your sheet and a backup file tends to end up in cloud storage.

## Project structure

```
src/
  config/identity.ts   your name, email and phone — the one place they exist
  types/client.ts      the shape of a workspace; every other file follows it
  lib/                 pure logic: money, dates, workspace defaults, storage,
                       document readiness, Sheets transport
  pdf/                 the four documents, plus the shared primitives and theme
                       they are all composed from
  ui/                  buttons, fields, toasts, page chrome
  screens/             client list, workspace detail, editor, settings
  store/store.tsx      all state, persisted on every change
google-apps-script/
  Code.gs              paste this into your own Sheet's Apps Script editor
```

Two conventions hold the PDF layer together. Money only ever comes from
`lib/money.ts`, so no two documents can compute a different total from the same
data. And the line-item table columns and total lines are defined once in
`pdf/ProposalDoc.tsx` and imported by the Agreement and Invoice, so the pricing
table is not merely similar across documents — it is the same code.

## Two things to know before you send a document

**About the currency symbol.** The PDFs print `INR 1,20,000` rather than
`₹1,20,000`. This is not a style choice. `@react-pdf/renderer`'s built-in
Helvetica is limited to the WinAnsi character set, which has no rupee sign, and
characters outside it render as a blank box with no warning — you would only find
out from a client. The app's own screens use `₹` freely, since the browser has
real fonts. If you want the symbol in the PDFs, register a Unicode font that
contains U+20B9 (Noto Sans and Inter both do) via `Font.register` in
`src/pdf/theme.ts`, set it as the family, then change `pdfPrefix` in
`src/config/identity.ts` to `'₹'`.

**About the Agreement wording.** The clauses are a plain-language starting point
for small freelance projects, written to be readable by a client who is not a
lawyer. They are not legal advice and they have not been reviewed by one. They
govern real money, so read them, edit them to match how you actually work, and if
a project is large enough to hurt, have a lawyer look at them. `buildClauses()` in
`src/pdf/AgreementDoc.tsx` is where the text lives, and the Additional terms field
on the pricing section appends per-client clauses without touching the code.

## Your details

Name, email and phone are fixed in `src/config/identity.ts` and used
automatically as the sender on every document. They are not editable from the UI
by design — one source, so two documents cannot disagree. Change that file to
change them everywhere.
