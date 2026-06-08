/**
 * HoSo.gs — Lưu trữ hồ sơ dự án (mọi định dạng) trên OneDrive + registry sheet HoSo.
 * Phối hợp với OneDrive.gs (transport) và Form HoSo.html (giao diện).
 */

function moFormHoSo() {
  const html = HtmlService.createHtmlOutputFromFile('HoSo').setWidth(640).setHeight(740);
  SpreadsheetApp.getUi().showModalDialog(html, 'Hồ sơ dự án (OneDrive)');
}

function getHoSoConfig() {
  return {
    duAn: readRows_(CONFIG.SHEETS.DM_DUAN).map(function (d) { return { id: d.MaDuAn, ten: d.TenDuAn }; }),
    loai: CONFIG.LOAI_HOSO,
    ketNoi: trangThaiOneDrive()
  };
}

function _email_() {
  try { return Session.getActiveUser().getEmail() || ''; } catch (e) { return ''; }
}

function _ext_(fileName) {
  const p = String(fileName || '').split('.');
  return p.length > 1 ? p.pop().toLowerCase() : '';
}

function themHoSoRecord_(o) {
  const rec = {
    MaHoSo: genId_(),
    MaDuAn: o.MaDuAn || '',
    LoaiHoSo: o.LoaiHoSo || 'Khác',
    TenFile: o.TenFile || '',
    DinhDang: o.DinhDang || _ext_(o.TenFile),
    KichThuocKB: Math.round(Number(o.KichThuocKB) || 0),
    ItemId: o.ItemId || '',
    Link: o.Link || '',
    NgayTai: o.NgayTai || new Date(),
    NguoiTai: o.NguoiTai || '',
    GhiChu: o.GhiChu || ''
  };
  appendRow_(CONFIG.SHEETS.HOSO, rec);
  return rec.MaHoSo;
}

function danhSachHoSo(maDuAn) {
  return readRows_(CONFIG.SHEETS.HOSO)
    .filter(function (h) { return !maDuAn || h.MaDuAn === maDuAn; })
    .map(function (h) {
      return {
        loai: h.LoaiHoSo, tenFile: h.TenFile, dinhDang: h.DinhDang,
        kichThuoc: Number(h.KichThuocKB) || 0, link: h.Link,
        ngay: fmtDate_(h.NgayTai), nguoi: h.NguoiTai, ghiChu: h.GhiChu
      };
    });
}

/** Upload 1 file từ form (base64). Trả {ok, message, link}. */
function uploadHoSo(maDuAn, loai, fileName, mime, base64, ghiChu) {
  try {
    if (!maDuAn) throw new Error('Chưa chọn dự án.');
    if (!fileName) throw new Error('Thiếu tên file.');
    const bytes = Utilities.base64Decode(base64);
    const up = ensureFoldersAndUpload_(maDuAn, fileName, bytes, mime);
    themHoSoRecord_({
      MaDuAn: maDuAn, LoaiHoSo: loai || 'Khác', TenFile: fileName, DinhDang: _ext_(fileName),
      KichThuocKB: up.sizeKB, ItemId: up.itemId, Link: up.link, NgayTai: new Date(),
      NguoiTai: _email_(), GhiChu: ghiChu || ''
    });
    return { ok: true, message: 'Đã lưu: ' + fileName, link: up.link };
  } catch (e) {
    return { ok: false, message: String((e && e.message) || e) };
  }
}

/** Đồng bộ: nạp các file đã có sẵn trong thư mục OneDrive của dự án vào registry. */
function syncFolderDuAn(maDuAn) {
  try {
    if (!maDuAn) throw new Error('Chưa chọn dự án.');
    const files = odListProjectFiles_(maDuAn);
    const existing = {};
    readRows_(CONFIG.SHEETS.HOSO).forEach(function (h) { if (h.ItemId) existing[h.ItemId] = true; });
    let added = 0;
    files.forEach(function (f) {
      if (existing[f.id]) return;
      existing[f.id] = true;
      themHoSoRecord_({
        MaDuAn: maDuAn, LoaiHoSo: '(đồng bộ)', TenFile: f.name, DinhDang: _ext_(f.name),
        KichThuocKB: Math.round((Number(f.size) || 0) / 1024), ItemId: f.id, Link: f.webUrl,
        NgayTai: new Date(), NguoiTai: '', GhiChu: 'Đồng bộ từ OneDrive'
      });
      added++;
    });
    return { ok: true, added: added, message: 'Đồng bộ ' + added + ' file mới từ OneDrive.' };
  } catch (e) {
    return { ok: false, message: String((e && e.message) || e) };
  }
}

/** Lấy link thư mục OneDrive của dự án (tạo nếu chưa có). */
function moFolderDuAnLink(maDuAn) {
  try { return { ok: true, link: odFolderLink_(maDuAn) }; }
  catch (e) { return { ok: false, message: String((e && e.message) || e) }; }
}
