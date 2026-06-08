/**
 * Import.gs — Import sao kê ngân hàng vào GiaoDich.
 * Tự nhận diện cột theo tên header (Việt/Anh): ngày, ghi nợ/ghi có hoặc số tiền, nội dung.
 * Hỗ trợ dán dữ liệu copy từ Excel (tab) hoặc CSV (',' / ';'). Chống import trùng.
 */

/** Chuẩn hóa chuỗi để so khớp header. */
function _norm(s) {
  return String(s == null ? '' : s).toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

/** Parse số tiền VND: bỏ phần thập phân ,dd/.dd, bỏ dấu phân tách nghìn. */
function parseTien_(v) {
  if (typeof v === 'number') return Math.round(v);
  let s = String(v == null ? '' : v).trim();
  if (!s) return 0;
  const neg = s.indexOf('-') >= 0 || /^\(.*\)$/.test(s);
  s = s.replace(/[^0-9.,]/g, '');
  s = s.replace(/[.,]\d{2}$/, '');     // bỏ phần thập phân nếu có (,00)
  s = s.replace(/[^0-9]/g, '');         // bỏ dấu phân tách nghìn
  const n = s ? parseInt(s, 10) : 0;
  return neg ? -n : n;
}

function _detectDelim(text) {
  const line = (text.split(/\r?\n/).find(function (l) { return l.trim(); })) || '';
  const cand = { '\t': (line.match(/\t/g) || []).length, ';': (line.match(/;/g) || []).length, ',': (line.match(/,/g) || []).length };
  let best = '\t', max = -1;
  Object.keys(cand).forEach(function (k) { if (cand[k] > max) { max = cand[k]; best = k; } });
  return max > 0 ? best : '\t';
}

function _splitLine(line, delim) {
  // Tách đơn giản, có xử lý dấu ngoặc kép bao quanh ô.
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { q = !q; continue; }
    if (ch === delim && !q) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map(function (x) { return x.trim(); });
}

const _KEYS = {
  ngay: ['ngay', 'date', 'tran. date', 'transaction date', 'ngay gd', 'ngay giao dich'],
  co: ['ghi co', 'co', 'credit', 'phat sinh co', 'psco', 'tien vao', 'tien co', 'co (+)'],
  no: ['ghi no', 'no', 'debit', 'phat sinh no', 'psno', 'tien ra', 'tien no', 'no (-)'],
  sotien: ['so tien', 'amount', 'gia tri', 'so tien gd'],
  noidung: ['noi dung', 'dien giai', 'mo ta', 'description', 'remark', 'memo', 'chi tiet', 'noi dung gd']
};

function _matchCol(headers, keys) {
  for (let i = 0; i < headers.length; i++) {
    const h = _norm(headers[i]);
    for (let k = 0; k < keys.length; k++) {
      if (h && (h === keys[k] || h.indexOf(keys[k]) >= 0)) return i;
    }
  }
  return -1;
}

/** Parse text sao kê -> {rows:[{ngay,loai,soTien,dienGiai}], warning}. */
function parseSaoKe_(rawText) {
  const lines = String(rawText || '').split(/\r?\n/).filter(function (l) { return l.trim() !== ''; });
  if (lines.length < 2) return { rows: [], warning: 'Không đủ dữ liệu (cần header + ít nhất 1 dòng).' };
  const delim = _detectDelim(rawText);

  // Tìm dòng header trong 12 dòng đầu.
  let hIdx = -1, cols = null, headers = null;
  for (let i = 0; i < Math.min(12, lines.length); i++) {
    const cells = _splitLine(lines[i], delim);
    const c = {
      ngay: _matchCol(cells, _KEYS.ngay),
      co: _matchCol(cells, _KEYS.co),
      no: _matchCol(cells, _KEYS.no),
      sotien: _matchCol(cells, _KEYS.sotien),
      noidung: _matchCol(cells, _KEYS.noidung)
    };
    if (c.ngay >= 0 && (c.co >= 0 || c.no >= 0 || c.sotien >= 0)) { hIdx = i; cols = c; headers = cells; break; }
  }
  if (hIdx < 0) return { rows: [], warning: 'Không nhận diện được cột. Cần có cột Ngày và (Ghi nợ/Ghi có hoặc Số tiền).' };

  const rows = [];
  for (let i = hIdx + 1; i < lines.length; i++) {
    const cells = _splitLine(lines[i], delim);
    const ngay = toDate_(cells[cols.ngay]);
    if (!ngay) continue;
    const dienGiai = cols.noidung >= 0 ? (cells[cols.noidung] || '') : '';
    let loai = '', soTien = 0;
    if (cols.co >= 0 || cols.no >= 0) {
      const co = cols.co >= 0 ? parseTien_(cells[cols.co]) : 0;
      const no = cols.no >= 0 ? parseTien_(cells[cols.no]) : 0;
      if (co > 0) { loai = 'Thu'; soTien = co; }
      else if (no > 0) { loai = 'Chi'; soTien = no; }
      else continue;
    } else {
      const amt = parseTien_(cells[cols.sotien]);
      if (amt === 0) continue;
      loai = amt > 0 ? 'Thu' : 'Chi'; soTien = Math.abs(amt);
    }
    rows.push({ ngay: ngay, loai: loai, soTien: soTien, dienGiai: dienGiai });
  }
  return { rows: rows, warning: '' };
}

function _keyGD(ngay, soTien, dienGiai) {
  const d = toDate_(ngay);
  const ds = d ? Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd') : '';
  return ds + '|' + Math.round(Number(soTien) || 0) + '|' + _norm(dienGiai);
}

/** ---- Hàm gọi từ form ---- */

function moFormImport() {
  const html = HtmlService.createHtmlOutputFromFile('Import').setWidth(580).setHeight(700);
  SpreadsheetApp.getUi().showModalDialog(html, 'Import sao kê ngân hàng');
}

function getImportConfig() {
  return {
    taiKhoan: readRows_(CONFIG.SHEETS.DM_TAIKHOAN).map(function (t) { return { id: t.MaTK, ten: t.TenTK }; }),
    duAn: readRows_(CONFIG.SHEETS.DM_DUAN).map(function (d) { return { id: d.MaDuAn, ten: d.TenDuAn }; })
  };
}

/** Xem trước: trả về danh sách + đếm trùng (không ghi). */
function previewImport(rawText) {
  const parsed = parseSaoKe_(rawText);
  if (parsed.warning) return { ok: false, message: parsed.warning, rows: [] };
  const existing = {};
  readRows_(CONFIG.SHEETS.GIAODICH).forEach(function (g) {
    existing[_keyGD(g.Ngay, g.SoTien, g.DienGiai)] = true;
  });
  const seen = {};
  let thu = 0, chi = 0, trung = 0;
  const rows = parsed.rows.map(function (r) {
    const key = _keyGD(r.ngay, r.soTien, r.dienGiai);
    const isDup = existing[key] || seen[key];
    seen[key] = true;
    if (isDup) trung++;
    else { if (r.loai === 'Thu') thu += r.soTien; else chi += r.soTien; }
    return {
      ngay: Utilities.formatDate(r.ngay, CONFIG.TIMEZONE, 'dd/MM/yyyy'),
      loai: r.loai, soTien: r.soTien, dienGiai: r.dienGiai, trung: !!isDup
    };
  });
  return { ok: true, rows: rows, tongThu: thu, tongChi: chi, soDong: rows.length, trung: trung };
}

/** Xác nhận: ghi các dòng KHÔNG trùng vào GiaoDich. */
function xacNhanImport(rawText, maTK, maDuAn) {
  const parsed = parseSaoKe_(rawText);
  if (parsed.warning) return { ok: false, message: parsed.warning };
  const existing = {};
  readRows_(CONFIG.SHEETS.GIAODICH).forEach(function (g) {
    existing[_keyGD(g.Ngay, g.SoTien, g.DienGiai)] = true;
  });
  let email = '';
  try { email = Session.getActiveUser().getEmail() || ''; } catch (e) { email = ''; }
  let added = 0, skipped = 0;
  parsed.rows.forEach(function (r) {
    const key = _keyGD(r.ngay, r.soTien, r.dienGiai);
    if (existing[key]) { skipped++; return; }
    existing[key] = true;
    appendRow_(CONFIG.SHEETS.GIAODICH, {
      MaGD: genId_(), Ngay: r.ngay, Loai: r.loai, SoTien: r.soTien,
      MaTK: maTK || '', MaHangMuc: '', MaDuAn: maDuAn || '', MaDoiTac: '',
      DienGiai: r.dienGiai, MaKH: '', NguoiNhap: email
    });
    added++;
  });
  capNhatForecast();
  capNhatDashboard();
  return { ok: true, message: 'Đã import ' + added + ' giao dịch, bỏ qua ' + skipped + ' dòng trùng.', added: added, skipped: skipped };
}
