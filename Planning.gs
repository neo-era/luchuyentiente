/**
 * Planning.gs — Kế hoạch thu/chi (sheet KeHoach), công nợ AR/AP, khớp, quá hạn.
 * Đây là TIM của app (CLAUDE.md §5). Vừa làm công nợ vừa nuôi forecast.
 */

function themKeHoach(obj) {
  const rec = {
    MaKH: genId_(),
    MaDuAn: obj.MaDuAn || '',
    Loai: obj.Loai,
    MaHangMuc: obj.MaHangMuc || '',
    MaDoiTac: obj.MaDoiTac || '',
    DienGiai: obj.DienGiai || '',
    SoTienDuKien: Math.round(Number(obj.SoTienDuKien) || 0),
    NgayDenHan: toDate_(obj.NgayDenHan) || '',
    TrangThai: CONFIG.TRANG_THAI_KH.CHUA,
    MaGD_Khop: ''
  };
  appendRow_(CONFIG.SHEETS.KEHOACH, rec);
  return rec.MaKH;
}

/** Tạo nhiều đợt thu của 1 hợp đồng. dotList: [{dienGiai, soTien, ngayDenHan, maHangMuc?, maDoiTac?}] */
function taoLichThanhToanHopDong(maDuAn, dotList) {
  const ids = [];
  (dotList || []).forEach(function (d) {
    ids.push(themKeHoach({
      MaDuAn: maDuAn, Loai: 'Thu', MaHangMuc: d.maHangMuc || '', MaDoiTac: d.maDoiTac || '',
      DienGiai: d.dienGiai || 'Đợt thanh toán', SoTienDuKien: d.soTien, NgayDenHan: d.ngayDenHan
    }));
  });
  return ids;
}

/** Tự sinh khoản giữ lại bảo hành (gotcha §11 — dễ quên). Gọi ngay khi thêm dự án. */
function taoGiuLaiBaoHanh(maDuAn, ngayHetBaoHanh) {
  const da = findById_(CONFIG.SHEETS.DM_DUAN, 'MaDuAn', maDuAn);
  if (!da) throw new Error('Không tìm thấy dự án ' + maDuAn);
  const giaSauVAT = Number(da.GiaTriSauVAT) || 0;
  const pct = Number(da.PhanTramGiuLai) || CONFIG.GIU_LAI_BAO_HANH;
  const soTien = Math.round(giaSauVAT * pct / 100);
  return themKeHoach({
    MaDuAn: maDuAn, Loai: 'Thu', DienGiai: 'Giữ lại bảo hành ' + pct + '%',
    SoTienDuKien: soTien, NgayDenHan: ngayHetBaoHanh
  });
}

/** Công nợ: KeHoach chưa thực hiện. loai = 'Thu' (phải thu) hoặc 'Chi' (phải trả). */
function congNo(loai) {
  return readRows_(CONFIG.SHEETS.KEHOACH).filter(function (k) {
    return k.Loai === loai && k.TrangThai !== CONFIG.TRANG_THAI_KH.DA;
  });
}

function khopKeHoach_(maKH, maGD) {
  updateRowById_(CONFIG.SHEETS.KEHOACH, 'MaKH', maKH, {
    TrangThai: CONFIG.TRANG_THAI_KH.DA, MaGD_Khop: maGD
  });
}

function huyKhop_(maKH) {
  updateRowById_(CONFIG.SHEETS.KEHOACH, 'MaKH', maKH, {
    TrangThai: CONFIG.TRANG_THAI_KH.CHUA, MaGD_Khop: ''
  });
}

/** Cập nhật trạng thái Quá hạn cho các khoản chưa thực hiện. */
function capNhatQuaHan() {
  const sh = getSheet_(CONFIG.SHEETS.KEHOACH);
  const map = headerMap_(sh);
  const rows = readRows_(CONFIG.SHEETS.KEHOACH);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let changed = 0;
  rows.forEach(function (k) {
    if (k.TrangThai === CONFIG.TRANG_THAI_KH.DA) return;
    const due = toDate_(k.NgayDenHan);
    const newStatus = (due && due < today) ? CONFIG.TRANG_THAI_KH.QUA_HAN : CONFIG.TRANG_THAI_KH.CHUA;
    if (newStatus !== k.TrangThai) {
      sh.getRange(k._row, map['TrangThai'] + 1).setValue(newStatus);
      changed++;
    }
  });
  SpreadsheetApp.getActiveSpreadsheet().toast('Cập nhật quá hạn: ' + changed + ' dòng.', '💰 Dòng tiền', 4);
  return changed;
}
