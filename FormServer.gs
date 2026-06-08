/**
 * Form.gs — Đấu nối form nhập giao dịch (HTML Service). Xem CLAUDE.md §4.
 */

/** Mở form dạng dialog trong Google Sheets. */
function moFormNhap() {
  const html = HtmlService.createHtmlOutputFromFile('Form').setWidth(440).setHeight(640);
  SpreadsheetApp.getUi().showModalDialog(html, 'Nhập giao dịch');
}

/** Mở form như web app (dùng link trên điện thoại). Cần deploy (xem README). */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Form')
    .setTitle('Nhập giao dịch — Dòng tiền LAVIPCO')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Dữ liệu đổ vào các dropdown của form. */
function getFormData() {
  return {
    taiKhoan: readRows_(CONFIG.SHEETS.DM_TAIKHOAN).map(function (t) { return { id: t.MaTK, ten: t.TenTK }; }),
    hangMuc: readRows_(CONFIG.SHEETS.DM_HANGMUC).map(function (h) { return { id: h.MaHangMuc, ten: h.Ten, nhom: h.Nhom }; }),
    duAn: readRows_(CONFIG.SHEETS.DM_DUAN).map(function (d) { return { id: d.MaDuAn, ten: d.TenDuAn }; }),
    doiTac: readRows_(CONFIG.SHEETS.DM_DOITAC).map(function (d) { return { id: d.MaDoiTac, ten: d.Ten }; }),
    keHoach: readRows_(CONFIG.SHEETS.KEHOACH)
      .filter(function (k) { return k.TrangThai !== CONFIG.TRANG_THAI_KH.DA; })
      .map(function (k) { return { id: k.MaKH, duAn: k.MaDuAn, loai: k.Loai, dienGiai: k.DienGiai, soTien: k.SoTienDuKien }; })
  };
}

/** Lưu giao dịch từ form, rồi refresh forecast + dashboard. */
function luuGiaoDichTuForm(data) {
  try {
    themGiaoDich(data);
    capNhatForecast();
    capNhatDashboard();
    return { ok: true, message: 'Đã lưu giao dịch.' };
  } catch (e) {
    return { ok: false, message: String((e && e.message) || e) };
  }
}
