/**
 * ClientFlow -> Google Sheets + Google Drive sync
 *
 * Tabs created/maintained:
 * - Dashboard: quick totals by status, revenue, and saved PDFs.
 * - Clients: one rich row per client workspace.
 * - Documents: one row per saved PDF, with a Drive link.
 *
 * PDFs are saved to Google Drive in:
 * ClientFlow PDFs / <Client or Business Name> / <document>.pdf
 */

var SYNC_TOKEN = 'change-me-to-a-long-random-string';

var CLIENTS_SHEET_NAME = 'Clients';
var DOCUMENTS_SHEET_NAME = 'Documents';
var DASHBOARD_SHEET_NAME = 'Dashboard';
var DRIVE_ROOT_FOLDER = 'ClientFlow PDFs';

var CLIENT_HEADERS = [
  'Client ID',
  'Client name',
  'Business',
  'Email',
  'Phone',
  'Address',
  'Project',
  'Project summary',
  'Project description',
  'Tech stack',
  'Start date',
  'Delivery date',
  'Included scope',
  'Excluded scope',
  'Status',
  'Line items',
  'Subtotal (INR)',
  'Discount (INR)',
  'Total (INR)',
  'Advance (INR)',
  'Balance after advance (INR)',
  'Balance due (INR)',
  'Advance %',
  'Revisions',
  'Timeline',
  'Payment method',
  'Payment details',
  'Extra terms',
  'Invoice no.',
  'Invoice issue date',
  'Invoice due date',
  'Amount received (INR)',
  'Invoice notes',
  'Handover completed on',
  'Live URL',
  'Admin URL',
  'Repo URL',
  'Hosting',
  'Domain registrar',
  'Credentials note',
  'Handover services',
  'Handover assets',
  'Support window days',
  'Handover notes',
  'Proposal date',
  'Agreement date',
  'Proposal PDF',
  'Agreement PDF',
  'Invoice PDF',
  'Handover PDF',
  'Workspace JSON',
  'Created',
  'Updated',
  'Last synced',
];

var DOCUMENT_HEADERS = [
  'Document ID',
  'Client ID',
  'Client name',
  'Business',
  'Project',
  'Document',
  'File name',
  'Drive URL',
  'Saved at',
];

var PDF_COLUMN_BY_KIND = {
  proposal: 'Proposal PDF',
  agreement: 'Agreement PDF',
  invoice: 'Invoice PDF',
  handover: 'Handover PDF',
};

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return jsonOut({ ok: false, error: 'Sheet was busy. Try again.' });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut({ ok: false, error: 'Empty request body.' });
    }

    var body = JSON.parse(e.postData.contents);

    if (SYNC_TOKEN && String(body.token || '') !== SYNC_TOKEN) {
      return jsonOut({
        ok: false,
        error: 'Sync token does not match the one in Code.gs.',
      });
    }

    ensureWorkbook_();

    if (body.action === 'ping') {
      return jsonOut({ ok: true, action: 'ping', sheet: CLIENTS_SHEET_NAME });
    }

    if (body.action === 'upsert') {
      var row = body.row || {};
      if (!row.clientId) return jsonOut({ ok: false, error: 'Row is missing clientId.' });
      upsertClient_(row, {});
      refreshDashboard_();
      return jsonOut({ ok: true, action: 'upserted', clientId: row.clientId });
    }

    if (body.action === 'uploadPdf') {
      var pdf = body.pdf || {};
      if (!pdf.clientId) return jsonOut({ ok: false, error: 'PDF payload is missing clientId.' });
      if (!pdf.base64) return jsonOut({ ok: false, error: 'PDF payload is missing file data.' });

      var saved = savePdf_(pdf);
      var links = {};
      links[String(pdf.documentKind || '')] = saved.url;
      if (pdf.workspace) upsertClient_(pdf.workspace, links);
      upsertDocument_(pdf, saved.url);
      refreshDashboard_();
      return jsonOut({
        ok: true,
        action: 'uploaded',
        clientId: pdf.clientId,
        documentKind: pdf.documentKind,
        url: saved.url,
      });
    }

    return jsonOut({ ok: false, error: 'Unknown action: ' + body.action });
  } catch (err) {
    return jsonOut({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  ensureWorkbook_();
  return jsonOut({
    ok: true,
    service: 'ClientFlow sync',
    note: 'This endpoint expects a POST from ClientFlow. Use Settings -> Test connection in the app.',
  });
}

function ensureWorkbook_() {
  ensureSheet_(CLIENTS_SHEET_NAME, CLIENT_HEADERS);
  ensureSheet_(DOCUMENTS_SHEET_NAME, DOCUMENT_HEADERS);
  ensureDashboardSheet_();
  formatClients_();
  formatDocuments_();
}

function ensureSheet_(name, headers) {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(name);
  if (!sheet) sheet = book.insertSheet(name);

  var existingWidth = Math.max(sheet.getLastColumn(), headers.length);
  var existingHeaders =
    sheet.getLastRow() > 0
      ? sheet.getRange(1, 1, 1, existingWidth).getValues()[0].map(String)
      : [];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    for (var i = 0; i < headers.length; i += 1) {
      if (existingHeaders.indexOf(headers[i]) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(headers[i]);
      }
    }
  }

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold');
  return sheet;
}

function upsertClient_(row, pdfLinksByKind) {
  var sheet = ensureSheet_(CLIENTS_SHEET_NAME, CLIENT_HEADERS);
  var headerMap = headerMap_(sheet);
  var existing = findRowByClientId_(sheet, row.clientId);
  var previous = existing > 0 ? sheet.getRange(existing, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
  var values = [];

  for (var i = 0; i < sheet.getLastColumn(); i += 1) {
    values.push(previous[i] || '');
  }

  setByHeader_(values, headerMap, 'Client ID', row.clientId);
  setByHeader_(values, headerMap, 'Client name', row.clientName);
  setByHeader_(values, headerMap, 'Business', row.businessName);
  setByHeader_(values, headerMap, 'Email', row.contactEmail);
  setByHeader_(values, headerMap, 'Phone', row.contactPhone);
  setByHeader_(values, headerMap, 'Address', row.address);
  setByHeader_(values, headerMap, 'Project', row.projectTitle);
  setByHeader_(values, headerMap, 'Project summary', row.projectSummary);
  setByHeader_(values, headerMap, 'Project description', row.projectDescription);
  setByHeader_(values, headerMap, 'Tech stack', row.techStack);
  setByHeader_(values, headerMap, 'Start date', row.startDate);
  setByHeader_(values, headerMap, 'Delivery date', row.deliveryDate);
  setByHeader_(values, headerMap, 'Included scope', row.includedScope);
  setByHeader_(values, headerMap, 'Excluded scope', row.excludedScope);
  setByHeader_(values, headerMap, 'Status', row.status);
  setByHeader_(values, headerMap, 'Line items', row.lineItems);
  setByHeader_(values, headerMap, 'Subtotal (INR)', number_(row.subtotal));
  setByHeader_(values, headerMap, 'Discount (INR)', number_(row.discount));
  setByHeader_(values, headerMap, 'Total (INR)', number_(row.total));
  setByHeader_(values, headerMap, 'Advance (INR)', number_(row.advance));
  setByHeader_(values, headerMap, 'Balance after advance (INR)', number_(row.balanceAfterAdvance));
  setByHeader_(values, headerMap, 'Balance due (INR)', number_(row.balanceDue));
  setByHeader_(values, headerMap, 'Advance %', number_(row.advancePercent));
  setByHeader_(values, headerMap, 'Revisions', number_(row.revisionsIncluded));
  setByHeader_(values, headerMap, 'Timeline', row.timeline);
  setByHeader_(values, headerMap, 'Payment method', row.paymentMethod);
  setByHeader_(values, headerMap, 'Payment details', row.paymentDetails);
  setByHeader_(values, headerMap, 'Extra terms', row.extraTerms);
  setByHeader_(values, headerMap, 'Invoice no.', row.invoiceNumber);
  setByHeader_(values, headerMap, 'Invoice issue date', row.invoiceIssueDate);
  setByHeader_(values, headerMap, 'Invoice due date', row.invoiceDueDate);
  setByHeader_(values, headerMap, 'Amount received (INR)', number_(row.amountReceived));
  setByHeader_(values, headerMap, 'Invoice notes', row.invoiceNotes);
  setByHeader_(values, headerMap, 'Handover completed on', row.handoverCompletedOn);
  setByHeader_(values, headerMap, 'Live URL', row.liveUrl);
  setByHeader_(values, headerMap, 'Admin URL', row.adminUrl);
  setByHeader_(values, headerMap, 'Repo URL', row.repoUrl);
  setByHeader_(values, headerMap, 'Hosting', row.hostingProvider);
  setByHeader_(values, headerMap, 'Domain registrar', row.domainRegistrar);
  setByHeader_(values, headerMap, 'Credentials note', row.credentialsNote);
  setByHeader_(values, headerMap, 'Handover services', row.handoverServices);
  setByHeader_(values, headerMap, 'Handover assets', row.handoverAssets);
  setByHeader_(values, headerMap, 'Support window days', number_(row.supportWindowDays));
  setByHeader_(values, headerMap, 'Handover notes', row.handoverNotes);
  setByHeader_(values, headerMap, 'Proposal date', row.proposalDate);
  setByHeader_(values, headerMap, 'Agreement date', row.agreementDate);
  setByHeader_(values, headerMap, 'Workspace JSON', row.workspaceJson);
  setByHeader_(values, headerMap, 'Created', row.createdAt);
  setByHeader_(values, headerMap, 'Updated', row.updatedAt);
  setByHeader_(values, headerMap, 'Last synced', new Date().toISOString());

  for (var kind in pdfLinksByKind) {
    if (pdfLinksByKind.hasOwnProperty(kind)) {
      var pdfHeader = PDF_COLUMN_BY_KIND[kind];
      if (pdfHeader) setByHeader_(values, headerMap, pdfHeader, pdfLinksByKind[kind]);
    }
  }

  if (existing > 0) {
    sheet.getRange(existing, 1, 1, values.length).setValues([values]);
  } else {
    sheet.appendRow(values);
  }

  formatClients_();
}

function savePdf_(pdf) {
  var root = getOrCreateFolder_(DriveApp, DRIVE_ROOT_FOLDER);
  var clientFolderName = sanitizeName_(pdf.businessName || pdf.clientName || pdf.clientId || 'Client');
  var clientFolder = getOrCreateFolder_(root, clientFolderName);
  var bytes = Utilities.base64Decode(pdf.base64);
  var blob = Utilities.newBlob(bytes, pdf.mimeType || 'application/pdf', sanitizeName_(pdf.fileName || 'ClientFlow.pdf'));
  var file = clientFolder.createFile(blob);
  return { url: file.getUrl(), id: file.getId() };
}

function upsertDocument_(pdf, url) {
  var sheet = ensureSheet_(DOCUMENTS_SHEET_NAME, DOCUMENT_HEADERS);
  var documentId = [pdf.clientId, pdf.documentKind, pdf.fileName].join('::');
  var existing = findDocumentRow_(sheet, documentId);
  var values = [
    documentId,
    pdf.clientId,
    pdf.clientName || '',
    pdf.businessName || '',
    pdf.projectTitle || '',
    pdf.documentLabel || pdf.documentKind || '',
    pdf.fileName || '',
    url,
    new Date().toISOString(),
  ];

  if (existing > 0) {
    sheet.getRange(existing, 1, 1, values.length).setValues([values]);
  } else {
    sheet.appendRow(values);
  }
  formatDocuments_();
}

function ensureDashboardSheet_() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(DASHBOARD_SHEET_NAME);
  if (!sheet) sheet = book.insertSheet(DASHBOARD_SHEET_NAME, 0);
  refreshDashboard_();
}

function refreshDashboard_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DASHBOARD_SHEET_NAME);
  if (!sheet) return;

  sheet.clear();
  sheet.getRange('A1:E2').breakApart();
  sheet.setHiddenGridlines(true);
  sheet.getRange('A1').setValue('ClientFlow Dashboard');
  sheet.getRange('A2').setValue('Live summary from the Clients and Documents tabs');

  var cards = [
    ['Clients', '=COUNTA(Clients!A2:A)'],
    ['Active value', '=SUMIF(Clients!O2:O,"<>Delivered",Clients!S2:S)'],
    ['Received', '=SUM(Clients!AF2:AF)'],
    ['Balance due', '=SUM(Clients!V2:V)'],
    ['Saved PDFs', '=COUNTA(Documents!A2:A)'],
  ];
  sheet.getRange(4, 1, cards.length, 2).setValues(cards);

  var statuses = [
    ['Status', 'Count'],
    ['Draft', '=COUNTIF(Clients!O2:O,"Draft")'],
    ['Proposal sent', '=COUNTIF(Clients!O2:O,"Proposal sent")'],
    ['Agreed', '=COUNTIF(Clients!O2:O,"Agreed")'],
    ['In progress', '=COUNTIF(Clients!O2:O,"In progress")'],
    ['Delivered', '=COUNTIF(Clients!O2:O,"Delivered")'],
  ];
  sheet.getRange(4, 4, statuses.length, 2).setValues(statuses);

  sheet.getRange('A1:E1').merge().setFontSize(18).setFontWeight('bold').setFontColor('#0F1117');
  sheet.getRange('A2:E2').merge().setFontColor('#5A6172');
  sheet.getRange('A4:B8').setBorder(true, true, true, true, true, true, '#E6E8EC', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange('D4:E9').setBorder(true, true, true, true, true, true, '#E6E8EC', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange('A4:A8').setFontWeight('bold').setBackground('#F7F8FA');
  sheet.getRange('D4:E4').setFontWeight('bold').setBackground('#EEF0FE');
  sheet.getRange('B5:B7').setNumberFormat('[$INR]#,##0');
  sheet.setColumnWidths(1, 5, 160);
}

function formatClients_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CLIENTS_SHEET_NAME);
  if (!sheet) return;
  var lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) return;
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(3);
  sheet.getRange(1, 1, 1, lastColumn).setBackground('#111827').setFontColor('#FFFFFF').setFontWeight('bold');
  sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), lastColumn).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  sheet.autoResizeColumns(1, Math.min(lastColumn, 12));
  applyFilter_(sheet);
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 17, sheet.getLastRow() - 1, 6).setNumberFormat('[$INR]#,##0');
    sheet.getRange(2, 23, sheet.getLastRow() - 1, 1).setNumberFormat('0"%"');
  }
}

function formatDocuments_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DOCUMENTS_SHEET_NAME);
  if (!sheet) return;
  var lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) return;
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, lastColumn).setBackground('#3730A3').setFontColor('#FFFFFF').setFontWeight('bold');
  sheet.autoResizeColumns(1, lastColumn);
  applyFilter_(sheet);
}

function applyFilter_(sheet) {
  var range = sheet.getDataRange();
  if (sheet.getFilter()) sheet.getFilter().remove();
  if (range.getNumRows() > 0 && range.getNumColumns() > 0) range.createFilter();
}

function getOrCreateFolder_(parent, name) {
  var folders = parent.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(name);
}

function headerMap_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i += 1) {
    map[String(headers[i])] = i;
  }
  return map;
}

function setByHeader_(values, headerMap, header, value) {
  if (headerMap[header] === undefined) return;
  values[headerMap[header]] = value === undefined || value === null ? '' : value;
}

function findRowByClientId_(sheet, clientId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i += 1) {
    if (String(ids[i][0]) === String(clientId)) return i + 2;
  }
  return -1;
}

function findDocumentRow_(sheet, documentId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i += 1) {
    if (String(ids[i][0]) === String(documentId)) return i + 2;
  }
  return -1;
}

function number_(value) {
  var parsed = Number(value || 0);
  return isFinite(parsed) ? parsed : 0;
}

function sanitizeName_(name) {
  return String(name || 'Untitled').replace(/[\\/:*?"<>|#%{}~&]/g, '-').slice(0, 160);
}

function jsonOut(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
