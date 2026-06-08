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
    .addItem('Xóa dữ liệu mẫu', 'xoaDuLieuMau')
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
  setupNamedRanges_();

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
 * Tạo named range trỏ đến cột ID của từng sheet master để dùng trong data validation dropdown.
 * Idempotent — gọi lại chỉ cập nhật lại range.
 */
function setupNamedRanges_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targets = [
    { name: 'NR_MaDuAn',   sheet: CONFIG.SHEETS.DM_DUAN,     col: 1 },
    { name: 'NR_MaDoiTac', sheet: CONFIG.SHEETS.DM_DOITAC,   col: 1 },
    { name: 'NR_MaHangMuc',sheet: CONFIG.SHEETS.DM_HANGMUC,  col: 1 },
    { name: 'NR_MaTK',     sheet: CONFIG.SHEETS.DM_TAIKHOAN, col: 1 },
  ];
  targets.forEach(function (t) {
    const sh = getSheet_(t.sheet);
    // Trỏ đến hàng 2 → 1000 của cột ID (bỏ qua header)
    const range = sh.getRange(2, t.col, 999, 1);
    // Xóa named range cũ nếu có để tránh trùng
    const existing = ss.getNamedRanges().filter(function (nr) { return nr.getName() === t.name; });
    existing.forEach(function (nr) { nr.remove(); });
    ss.setNamedRange(t.name, range);
  });
}

/**
 * Dữ liệu mẫu HĐ 0511/2026/HĐTC-LVP — Cầu Cả Cấm (XÓA trước khi dùng thật).
 * Minh họa "chi trước – thu sau" đặc thù ngành xây dựng:
 *   tháng đầu âm tiền (chi vật tư/nhân công) → dương khi thu đợt nghiệm thu.
 * Để xóa: chạy 💰 Dòng tiền > Xóa dữ liệu mẫu, hoặc gọi xoaDuLieuMau().
 */
function seedDuAnMau() {
  const maDuAn = genId_();
  const giaTruoc = 2000000000;
  const vat      = CONFIG.VAT_DEFAULT;
  const giaSau   = Math.round(giaTruoc * (1 + vat / 100));

  appendRow_(CONFIG.SHEETS.DM_DUAN, {
    MaDuAn: maDuAn,
    TenDuAn: '[MẪU] Chiếu sáng Cầu Cả Cấm — 0511/2026/HĐTC-LVP',
    DoiTac: 'Ban QLDA Giao thông TP',
    VaiTro: 'NhaThau',
    GiaTriTruocVAT: giaTruoc,
    VAT: vat,
    GiaTriSauVAT: giaSau,
    NgayKy: new Date(),
    PhanTramGiuLai: CONFIG.GIU_LAI_BAO_HANH,
    TrangThai: 'DangThiCong'
  });

  const today = new Date();
  const plus  = function(m) { return new Date(today.getFullYear(), today.getMonth() + m, 15); };

  // Lịch thu 30/60/10 — mỗi đợt 1 dòng KeHoach
  taoLichThanhToanHopDong(maDuAn, [
    { dienGiai: '[MẪU] Tạm ứng 30%',        soTien: Math.round(giaSau * 0.30), ngayDenHan: plus(0) },
    { dienGiai: '[MẪU] Nghiệm thu đợt 60%', soTien: Math.round(giaSau * 0.60), ngayDenHan: plus(2) },
    { dienGiai: '[MẪU] Quyết toán 10%',     soTien: Math.round(giaSau * 0.10), ngayDenHan: plus(4) }
  ]);
  taoGiuLaiBaoHanh(maDuAn, plus(16));

  // Chi trước: vật tư + nhân công + thầu phụ
  const tk   = readRows_(CONFIG.SHEETS.DM_TAIKHOAN);
  const maTK = tk.length ? tk[0].MaTK : '';
  themGiaoDich({ Ngay: today, Loai: 'Chi', SoTien: 400000000, MaTK: maTK, MaDuAn: maDuAn, DienGiai: '[MẪU] Mua vật tư đèn LED Philips' });
  themGiaoDich({ Ngay: today, Loai: 'Chi', SoTien: 150000000, MaTK: maTK, MaDuAn: maDuAn, DienGiai: '[MẪU] Nhân công lắp đặt tháng 1' });
  themGiaoDich({ Ngay: today, Loai: 'Chi', SoTien: 80000000,  MaTK: maTK, MaDuAn: maDuAn, DienGiai: '[MẪU] Thầu phụ kéo cáp ngầm' });

  capNhatQuaHan();
  capNhatForecast();
  capNhatDashboard();
  SpreadsheetApp.getActiveSpreadsheet().toast('Đã tạo dữ liệu mẫu Cầu Cả Cấm. Nhớ xóa trước khi dùng thật!', '💰 Dòng tiền', 8);
}

/**
 * Xóa toàn bộ dữ liệu mẫu có prefix "[MẪU]" khỏi DM_DuAn, KeHoach, GiaoDich.
 * Chạy trước khi nhập số liệu thật.
 */
function xoaDuLieuMau() {
  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert('Xác nhận xóa dữ liệu mẫu?',
    'Sẽ xóa tất cả dòng có "[MẪU]" trong DM_DuAn, KeHoach, GiaoDich.\nKhông thể hoàn tác!',
    ui.ButtonSet.OK_CANCEL);
  if (confirm !== ui.Button.OK) return;

  const sheetNames = [CONFIG.SHEETS.GIAODICH, CONFIG.SHEETS.KEHOACH, CONFIG.SHEETS.DM_DUAN];
  const searchFields = {
    [CONFIG.SHEETS.GIAODICH]: 'DienGiai',
    [CONFIG.SHEETS.KEHOACH]:  'DienGiai',
    [CONFIG.SHEETS.DM_DUAN]:  'TenDuAn'
  };

  let total = 0;
  sheetNames.forEach(function(name) {
    const sh   = getSheet_(name);
    const rows = readRows_(name);
    const field = searchFields[name];
    // Xóa từ dưới lên để không lệch chỉ số hàng
    const toDelete = rows.filter(function(r) { return String(r[field] || '').indexOf('[MẪU]') >= 0; })
                         .sort(function(a, b) { return b._row - a._row; });
    toDelete.forEach(function(r) { sh.deleteRow(r._row); total++; });
  });

  capNhatForecast();
  capNhatDashboard();
  ui.alert('Đã xóa ' + total + ' dòng dữ liệu mẫu.');
}
