/**
 * ClientFlow → Google Sheets sync
 *
 * Paste this into the Apps Script editor attached to your Sheet, set SYNC_TOKEN
 * below, then deploy it as a Web App. Full step-by-step instructions are in the
 * "Google Sheets sync" section of README.md.
 *
 * What it does: keeps exactly one row per client. The client's id (column A) is
 * the key, so editing a client in ClientFlow updates that client's existing row
 * instead of appending a duplicate.
 */

/**
 * A shared secret you invent. Must match VITE_SHEETS_SYNC_TOKEN in your .env,
 * or whatever you paste into Settings in the app.
 *
 * A Web App deployed for "Anyone" is reachable by anyone who learns the URL.
 * This token is what stops a stray request from writing into your Sheet.
 */
var SYNC_TOKEN = 'change-me-to-a-long-random-string';

/** Tab the rows are written to. Created automatically if missing. */
var SHEET_NAME = 'Clients';

var HEADERS = [
  'Client ID',
  'Client name',
  'Business',
  'Project',
  'Status',
  'Total (INR)',
  'Advance (INR)',
  'Invoice no.',
  'Email',
  'Phone',
  'Live URL',
  'Created',
  'Updated',
  'Last synced',
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Two saves in quick succession must not both append a "new" row.
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

    if (body.action === 'ping') {
      return jsonOut({ ok: true, action: 'ping', sheet: SHEET_NAME });
    }

    if (body.action !== 'upsert') {
      return jsonOut({ ok: false, error: 'Unknown action: ' + body.action });
    }

    var row = body.row || {};
    if (!row.clientId) {
      return jsonOut({ ok: false, error: 'Row is missing clientId.' });
    }

    var sheet = getSheet_();
    var values = [
      row.clientId,
      row.clientName || '',
      row.businessName || '',
      row.projectTitle || '',
      row.status || '',
      Number(row.total || 0),
      Number(row.advance || 0),
      row.invoiceNumber || '',
      row.email || '',
      row.phone || '',
      row.liveUrl || '',
      row.createdAt || '',
      row.updatedAt || '',
      new Date().toISOString(),
    ];

    var existing = findRowByClientId_(sheet, row.clientId);
    var action;
    if (existing > 0) {
      sheet.getRange(existing, 1, 1, values.length).setValues([values]);
      action = 'updated';
    } else {
      sheet.appendRow(values);
      action = 'created';
    }

    return jsonOut({ ok: true, action: action, clientId: row.clientId });
  } catch (err) {
    return jsonOut({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

/** Visiting the URL in a browser should explain itself, not throw. */
function doGet() {
  return jsonOut({
    ok: true,
    service: 'ClientFlow sync',
    note: 'This endpoint expects a POST from ClientFlow. Use Settings → Test connection in the app.',
  });
}

function getSheet_() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function findRowByClientId_(sheet, clientId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i += 1) {
    if (String(ids[i][0]) === String(clientId)) {
      return i + 2; // +1 for the header, +1 because ranges are 1-based.
    }
  }
  return -1;
}

function jsonOut(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
