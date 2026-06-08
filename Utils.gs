/**
 * Utils.gs — Helper dùng chung. Xem CLAUDE.md §6.
 * Mọi truy cập sheet đi qua đây; đọc/ghi theo batch; map cột theo header.
 */

function getSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function genId_() {
  return Utilities.getUuid();
}

function formatVND_(n) {
  n = Math.round(Number(n) || 0);
  // toLocaleString không ổn định trong V8 runtime — dùng regex
  const sign = n < 0 ? '-' : '';
  const abs = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return sign + abs + ' ₫';
}

function toDate_(v) {
  if (v instanceof Date) return v;
  if (v === '' || v === null || v === undefined) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate_(d) {
  d = toDate_(d);
  if (!d) return '';
  return Utilities.formatDate(d, CONFIG.TIMEZONE, 'dd/MM/yyyy');
}

/** Map {tênCột: chỉ_số_0_based} từ hàng header. */
function headerMap_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return {};
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  headers.forEach(function (h, i) { if (h !== '' && h !== null) map[String(h).trim()] = i; });
  return map;
}

/** Đọc toàn bộ data thành mảng object {tênCột: giá_trị, _row: số_dòng}. */
function readRows_(sheetName) {
  const sh = getSheet_(sheetName);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol === 0) return [];
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); });
  const values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return values.map(function (row, idx) {
    const obj = { _row: idx + 2 };
    headers.forEach(function (h, i) { if (h) obj[h] = row[i]; });
    return obj;
  });
}

/** Ghi 1 dòng mới theo header map. */
function appendRow_(sheetName, obj) {
  const sh = getSheet_(sheetName);
  const map = headerMap_(sh);
  const lastCol = sh.getLastColumn();
  const row = new Array(lastCol).fill('');
  Object.keys(obj).forEach(function (k) { if (k in map) row[map[k]] = obj[k]; });
  sh.appendRow(row);
  return sh.getLastRow();
}

/** Cập nhật dòng theo mã. Trả true nếu tìm thấy. */
function updateRowById_(sheetName, idCol, idVal, patch) {
  const sh = getSheet_(sheetName);
  const map = headerMap_(sh);
  if (!(idCol in map)) throw new Error('Không tìm thấy cột ' + idCol + ' trong ' + sheetName);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2) return false;
  const data = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
  for (let r = 0; r < data.length; r++) {
    if (String(data[r][map[idCol]]) === String(idVal)) {
      Object.keys(patch).forEach(function (k) { if (k in map) data[r][map[k]] = patch[k]; });
      sh.getRange(r + 2, 1, 1, lastCol).setValues([data[r]]);
      return true;
    }
  }
  return false;
}

function findById_(sheetName, idCol, idVal) {
  const found = readRows_(sheetName).filter(function (o) { return String(o[idCol]) === String(idVal); });
  return found.length ? found[0] : null;
}

/** Chạy từ Apps Script editor để kiểm tra readRows/appendRow/updateRowById. Xóa sheet _Test sau khi xong. */
function testUtils_() {
  const SHEET = '_Test';
  const sh = getSheet_(SHEET);
  sh.clearContents();
  sh.getRange(1, 1, 1, 3).setValues([['Id', 'Ten', 'SoTien']]);

  appendRow_(SHEET, { Id: 'T1', Ten: 'Alpha', SoTien: 1000000 });
  appendRow_(SHEET, { Id: 'T2', Ten: 'Beta',  SoTien: 2500000 });

  const rows = readRows_(SHEET);
  if (rows.length !== 2) throw new Error('readRows_ sai — expect 2, got ' + rows.length);
  if (rows[0].Ten !== 'Alpha') throw new Error('readRows_ sai tên: ' + rows[0].Ten);

  updateRowById_(SHEET, 'Id', 'T1', { SoTien: 9999999 });
  const updated = findById_(SHEET, 'Id', 'T1');
  if (updated.SoTien !== 9999999) throw new Error('updateRowById_ sai: ' + updated.SoTien);

  const fmt = formatVND_(1234567);
  if (fmt !== '1.234.567 ₫') throw new Error('formatVND_ sai: ' + fmt);

  SpreadsheetApp.getActiveSpreadsheet().deleteSheet(sh);
  Logger.log('testUtils_ PASSED');
}
