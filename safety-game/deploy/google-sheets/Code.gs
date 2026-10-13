/**
 * Site Life -> Google Sheets results adapter (Google Apps Script).
 *
 * Paste this whole file into Extensions -> Apps Script of a Google Sheet, then Deploy -> New deployment ->
 * Web app, Execute as "Me", Who has access "Anyone". Open the game with ?results=<the web app URL>.
 * See README.md in this folder for the step-by-step guide.
 *
 * The games send each result as JSON in a text/plain POST with mode "no-cors" (Apps Script cannot answer
 * CORS preflights), so the game never sees the reply: doPost must simply store what it gets.
 */
var SHEET_NAME = 'Results';
var COLUMNS = ['received', 'id', 'game', 'course', 'name', 'company', 'role', 'class', 'result', 'stars', 'hazards',
  'mistakes', 'where', 'missed', 'wrong', 'zoneTimes', 'room', 'lang', 'date'];
var MAX_BODY = 32 * 1024;

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLUMNS);
    sh.setFrozenRows(1);
  }
  return sh;
}

// Stop spreadsheet formula injection: a cell starting with = + - @ (or tab / CR) becomes plain text.
function safe_(v) {
  var s = String(v === null || v === undefined ? '' : v).replace(/[\r\n]+/g, ' ').slice(0, 300);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function list_(v, maxItems) {
  return Array.isArray(v) ? v.slice(0, maxItems).filter(function (x) { return typeof x === 'string' || typeof x === 'number'; }).join('; ') : '';
}

function zones_(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return '';
  return Object.keys(v).slice(0, 40).filter(function (k) { return typeof v[k] === 'number' && isFinite(v[k]); })
    .map(function (k) { return k + '=' + Math.round(v[k] * 10) / 10; }).join('; ');
}

function newId_() {
  var c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', s = '';
  for (var i = 0; i < 10; i++) s += c.charAt(Math.floor(Math.random() * c.length));
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var body = (e && e.postData && e.postData.contents) || '';
  if (body.length > MAX_BODY) return json_({ ok: false, error: 'too large' });
  var d;
  try { d = JSON.parse(body); } catch (err) { return json_({ ok: false, error: 'bad json' }); }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return json_({ ok: false, error: 'expected an object' });

  var limits = { game: 30, course: 80, name: 60, company: 80, role: 60, 'class': 40, result: 20, stars: 6, hazards: 10, mistakes: 6, room: 8, lang: 8, date: 40 };
  var row = {
    received: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    id: newId_(),
    where: list_(d.where, 20), missed: list_(d.missed, 40), wrong: list_(d.wrong, 40), zoneTimes: zones_(d.zoneTimes)
  };
  Object.keys(limits).forEach(function (k) {
    var v = d[k];
    row[k] = (v === null || v === undefined || typeof v === 'object') ? '' : String(v).slice(0, limits[k]);
  });
  if (!row.game) row.game = 'factory';

  var lock = LockService.getScriptLock();
  lock.waitLock(10000); // several players finishing at the same time
  try {
    sheet_().appendRow(COLUMNS.map(function (c) { return safe_(row[c]); }));
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true, id: row.id });
}

// Opening the web app URL in a browser shows how many results are stored (a quick "is it working?" check).
function doGet() {
  var n = Math.max(0, sheet_().getLastRow() - 1);
  return json_({ ok: true, results: n });
}
