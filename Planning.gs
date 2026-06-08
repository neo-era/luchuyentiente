/**
 * Planning.gs — Kế hoạch thu/chi (sheet KeHoach), công nợ AR/AP, khớp, quá hạn.
 * Đây là TIM của app (CLAUDE.md §5). Vừa làm công nợ vừa nuôi forecast.
 */

/** Thêm 1 dòng kế hoạch. Trả MaKH vừa tạo. */
function themKeHoach(obj) {
  const maKH = genId_();
  appendRow_(CONFIG.SHEETS.KEHOACH, {
    MaKH:         maKH,
    MaDuAn:       obj.MaDuAn       || '',
    Loai:         obj.Loai         || 'Thu',
    MaHangMuc:    obj.MaHangMuc    || '',
    MaDoiTac:     obj.MaDoiTac     || '',
    DienGiai:     obj.DienGiai     || '',
    SoTienDuKien: Math.round(Number(obj.SoTienDuKien) || 0),
    NgayDenHan:   obj.NgayDenHan   || '',
    TrangThai:    CONFIG.TRANG_THAI_KH.CHUA,
    MaGD_Khop:    ''
  });
  return maKH;
}

/** Tạo nhiều dòng KeHoach Thu cho các đợt thanh toán hợp đồng. */
function taoLichThanhToanHopDong(maDuAn, mangDot) {
  mangDot.forEach(function(dot) {
    themKeHoach({
      MaDuAn:       maDuAn,
      Loai:         'Thu',
      DienGiai:     dot.dienGiai,
      SoTienDuKien: dot.soTien,
      NgayDenHan:   dot.ngayDenHan
    });
  });
}

/**
 * Tự động tạo khoản giữ lại bảo hành (gotcha §11 — dễ quên).
 * Gọi ngay khi thêm dự án mới.
 */
function taoGiuLaiBaoHanh(maDuAn, ngayHetBaoHanh) {
  const duAn = findById_(CONFIG.SHEETS.DM_DUAN, 'MaDuAn', maDuAn);
  if (!duAn) throw new Error('Không tìm thấy dự án: ' + maDuAn);
  const giaSauVAT  = Number(duAn.GiaTriSauVAT)   || 0;
  const phanTram   = Number(duAn.PhanTramGiuLai)  || CONFIG.GIU_LAI_BAO_HANH;
  themKeHoach({
    MaDuAn:       maDuAn,
    Loai:         'Thu',
    DienGiai:     'Giữ lại bảo hành ' + phanTram + '%',
    SoTienDuKien: Math.round(giaSauVAT * phanTram / 100),
    NgayDenHan:   ngayHetBaoHanh
  });
}

/** AR (loai='Thu') hoặc AP (loai='Chi') — các khoản chưa thực hiện. */
function congNo(loai) {
  return readRows_(CONFIG.SHEETS.KEHOACH).filter(function(r) {
    return r.Loai === loai && r.TrangThai !== CONFIG.TRANG_THAI_KH.DA;
  });
}

// ── Prompt 8: Khớp KeHoach ↔ GiaoDich ─────────────────────────────────────

/** Đánh dấu KeHoach đã thực hiện khi giao dịch được nhập. */
function khopKeHoach_(maKH, maGD) {
  updateRowById_(CONFIG.SHEETS.KEHOACH, 'MaKH', maKH, {
    TrangThai: CONFIG.TRANG_THAI_KH.DA,
    MaGD_Khop: maGD
  });
}

/** Revert KeHoach về ChuaToiHan khi giao dịch bị xóa. */
function huyKhop_(maKH) {
  updateRowById_(CONFIG.SHEETS.KEHOACH, 'MaKH', maKH, {
    TrangThai: CONFIG.TRANG_THAI_KH.CHUA,
    MaGD_Khop: ''
  });
}

/**
 * Cập nhật TrangThai quá hạn cho tất cả KeHoach chưa thực hiện.
 * Chạy bởi trigger hằng ngày. Trả số dòng đã đổi.
 */
function capNhatQuaHan() {
  const sh     = getSheet_(CONFIG.SHEETS.KEHOACH);
  const rows   = readRows_(CONFIG.SHEETS.KEHOACH);
  if (!rows.length) return 0;

  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  const map    = headerMap_(sh);
  const lastCol = sh.getLastColumn();
  const data   = sh.getRange(2, 1, rows.length, lastCol).getValues();
  let count    = 0;

  rows.forEach(function(r, i) {
    if (r.TrangThai === CONFIG.TRANG_THAI_KH.DA) return;
    const ngay      = toDate_(r.NgayDenHan);
    const newStatus = (ngay && ngay < today)
      ? CONFIG.TRANG_THAI_KH.QUA_HAN
      : CONFIG.TRANG_THAI_KH.CHUA;
    if (r.TrangThai !== newStatus) {
      data[i][map['TrangThai']] = newStatus;
      count++;
    }
  });

  if (count > 0) sh.getRange(2, 1, rows.length, lastCol).setValues(data);
  return count;
}
