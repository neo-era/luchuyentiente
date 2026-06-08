/**
 * Setup.gs — Khởi tạo workbook, menu tùy chỉnh, seed dữ liệu. Xem CLAUDE.md §4.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('💰 Dòng tiền')
    .addItem('Khởi tạo workbook', 'setup')
    .addSeparator()
    .addItem('Nhập giao dịch', 'moFormNhap')
    .addItem('Import sao kê ngân hàng', 'moFormImport')
    .addSeparator()
    .addItem('Cập nhật Forecast', 'capNhatForecast')
    .addItem('Cập nhật Dashboard', 'capNhatDashboard')
    .addItem('Báo cáo dòng tiền theo dự án', 'baoCaoDuAn')
    .addItem('Cập nhật trạng thái quá hạn', 'capNhatQuaHan')
    .addSeparator()
    .addItem('Hồ sơ dự án (OneDrive)', 'moFormHoSo')
    .addItem('Kết nối OneDrive', 'ketNoiOneDrive')
    .addSeparator()
    .addItem('Tạo dữ liệu mẫu (Cầu Cả Cấm)', 'seedDuAnMau')
    .addItem('Cài đặt trigger hằng ngày', 'caiTrigger')
    .addToUi();
}

/** Khởi tạo 8 sheet + header + định dạng + seed. Idempotent. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(CONFIG.COLS).forEach(function (name) {
    const sh = getSheet_(name);
    const headers = CONFIG.COLS[name];
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#1f3864').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    formatSheetColumns_(sh, headers);
  });

  getSheet_(CONFIG.SHEETS.DASHBOARD);
  getSheet_(CONFIG.SHEETS.FORECAST);

  seedTaiKhoan_();
  seedHangMuc_();

  const def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) {
    try { ss.deleteSheet(def); } catch (e) {}
  }
  ss.toast('Đã khởi tạo workbook (8 sheet).', '💰 Dòng tiền', 5);
}

function formatSheetColumns_(sh, headers) {
  const moneyCols = ['GiaTriTruocVAT', 'GiaTriSauVAT', 'SoDuDauKy', 'SoTienDuKien', 'SoTien'];
  const dateCols = ['NgayKy', 'NgayDenHan', 'Ngay', 'NgayTai'];
  const maxRows = sh.getMaxRows() - 1;
  headers.forEach(function (h, i) {
    if (moneyCols.indexOf(h) >= 0) sh.getRange(2, i + 1, maxRows, 1).setNumberFormat('#,##0 "\u20ab"');
    if (dateCols.indexOf(h) >= 0) sh.getRange(2, i + 1, maxRows, 1).setNumberFormat('dd/mm/yyyy');
  });
}

function seedTaiKhoan_() {
  if (readRows_(CONFIG.SHEETS.DM_TAIKHOAN).length > 0) return;
  CONFIG.TAI_KHOAN.forEach(function (tk) {
    appendRow_(CONFIG.SHEETS.DM_TAIKHOAN, {
      MaTK: genId_(), TenTK: tk.ten, NganHang: tk.nganHang, SoTK: tk.soTK, SoDuDauKy: 0
    });
  });
}

function seedHangMuc_() {
  if (readRows_(CONFIG.SHEETS.DM_HANGMUC).length > 0) return;
  CONFIG.HANG_MUC.forEach(function (hm) {
    appendRow_(CONFIG.SHEETS.DM_HANGMUC, {
      MaHangMuc: genId_(), Ten: hm.ten, Nhom: hm.nhom, PhanLoaiChi: hm.phanLoai
    });
  });
}

/**
 * Dữ liệu mẫu hợp đồng Cầu Cả Cấm (xóa khi vào dữ liệu thật).
 * Minh họa đặc thù "chi trước – thu sau" của ngành xây dựng.
 */
function seedDuAnMau() {
  const maDuAn = genId_();
  const giaTruoc = 2000000000;            // 2 tỷ (giả định)
  const vat = CONFIG.VAT_DEFAULT;
  const giaSau = Math.round(giaTruoc * (1 + vat / 100));

  appendRow_(CONFIG.SHEETS.DM_DUAN, {
    MaDuAn: maDuAn, TenDuAn: 'Chiếu sáng Cầu Cả Cấm', DoiTac: 'Chủ đầu tư',
    VaiTro: 'NhaThau', GiaTriTruocVAT: giaTruoc, VAT: vat, GiaTriSauVAT: giaSau,
    NgayKy: new Date(), PhanTramGiuLai: CONFIG.GIU_LAI_BAO_HANH, TrangThai: 'DangThiCong'
  });

  const today = new Date();
  const plus = function (m) { return new Date(today.getFullYear(), today.getMonth() + m, 15); };

  taoLichThanhToanHopDong(maDuAn, [
    { dienGiai: 'Tạm ứng 30%',        soTien: Math.round(giaSau * 0.30), ngayDenHan: plus(0) },
    { dienGiai: 'Nghiệm thu đợt 60%', soTien: Math.round(giaSau * 0.60), ngayDenHan: plus(2) },
    { dienGiai: 'Quyết toán 10%',     soTien: Math.round(giaSau * 0.10), ngayDenHan: plus(4) }
  ]);
  taoGiuLaiBaoHanh(maDuAn, plus(16));

  const tk = readRows_(CONFIG.SHEETS.DM_TAIKHOAN);
  const maTK = tk.length ? tk[0].MaTK : '';
  themGiaoDich({ Ngay: today, Loai: 'Chi', SoTien: 400000000, MaTK: maTK, MaDuAn: maDuAn, DienGiai: 'Mua vật tư đèn LED' });
  themGiaoDich({ Ngay: today, Loai: 'Chi', SoTien: 150000000, MaTK: maTK, MaDuAn: maDuAn, DienGiai: 'Nhân công lắp đặt' });

  capNhatQuaHan();
  capNhatForecast();
  capNhatDashboard();
  SpreadsheetApp.getActiveSpreadsheet().toast('Đã tạo dữ liệu mẫu Cầu Cả Cấm.', '💰 Dòng tiền', 5);
}
