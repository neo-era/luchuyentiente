/**
 * Transactions.gs — Giao dịch tiền thật (sheet GiaoDich) + tính số dư.
 * Xem CLAUDE.md §4, §5.
 */

/** Thêm 1 giao dịch mới. Trả về MaGD vừa tạo. */
function themGiaoDich(obj) {
  const soTien = Number(obj.SoTien);
  if (!soTien || soTien <= 0) throw new Error('Số tiền phải > 0');
  if (!['Thu', 'Chi'].includes(obj.Loai)) throw new Error('Loại phải là Thu hoặc Chi');
  if (obj.MaTK && !findById_(CONFIG.SHEETS.DM_TAIKHOAN, 'MaTK', obj.MaTK)) {
    throw new Error('Tài khoản không tồn tại: ' + obj.MaTK);
  }
  if (obj.MaHangMuc && !findById_(CONFIG.SHEETS.DM_HANGMUC, 'MaHangMuc', obj.MaHangMuc)) {
    throw new Error('Hạng mục không tồn tại: ' + obj.MaHangMuc);
  }

  const maGD = genId_();
  appendRow_(CONFIG.SHEETS.GIAODICH, {
    MaGD:      maGD,
    Ngay:      obj.Ngay || new Date(),
    Loai:      obj.Loai,
    SoTien:    Math.round(soTien),
    MaTK:      obj.MaTK      || '',
    MaHangMuc: obj.MaHangMuc || '',
    MaDuAn:    obj.MaDuAn    || '',
    MaDoiTac:  obj.MaDoiTac  || '',
    DienGiai:  obj.DienGiai  || '',
    MaKH:      obj.MaKH      || '',
    NguoiNhap: Session.getActiveUser().getEmail()
  });

  if (obj.MaKH) khopKeHoach_(obj.MaKH, maGD);
  return maGD;
}

/** Lấy danh sách giao dịch theo bộ lọc tùy chọn {maDuAn, loai, tuNgay, denNgay}. */
function danhSachGiaoDich(filter) {
  filter = filter || {};
  let rows = readRows_(CONFIG.SHEETS.GIAODICH);
  if (filter.maDuAn) rows = rows.filter(function(r) { return r.MaDuAn === filter.maDuAn; });
  if (filter.loai)   rows = rows.filter(function(r) { return r.Loai === filter.loai; });
  if (filter.tuNgay) {
    const from = toDate_(filter.tuNgay);
    if (from) rows = rows.filter(function(r) { return toDate_(r.Ngay) >= from; });
  }
  if (filter.denNgay) {
    const to = toDate_(filter.denNgay);
    if (to) rows = rows.filter(function(r) { return toDate_(r.Ngay) <= to; });
  }
  return rows;
}

/** Xóa giao dịch theo MaGD. Nếu đang khớp KeHoach thì revert về ChuaToiHan. */
function xoaGiaoDich(maGD) {
  const rows = readRows_(CONFIG.SHEETS.GIAODICH);
  const found = rows.find(function(r) { return r.MaGD === maGD; });
  if (!found) throw new Error('Không tìm thấy giao dịch: ' + maGD);
  if (found.MaKH) huyKhop_(found.MaKH);
  getSheet_(CONFIG.SHEETS.GIAODICH).deleteRow(found._row);
}

/** Tổng số dư hiện tại tất cả tài khoản (SoDuDauKy + Thu - Chi). */
function soDuHienTai_() {
  return soDuTheoTK_().reduce(function(sum, tk) { return sum + tk.soDu; }, 0);
}

/** Số dư từng tài khoản riêng lẻ — dùng cho Dashboard. */
function soDuTheoTK_() {
  const tkList = readRows_(CONFIG.SHEETS.DM_TAIKHOAN);
  const gdList = readRows_(CONFIG.SHEETS.GIAODICH);
  return tkList.map(function(tk) {
    let soDu = Number(tk.SoDuDauKy) || 0;
    gdList.forEach(function(gd) {
      if (gd.MaTK !== tk.MaTK) return;
      soDu += gd.Loai === 'Thu' ?  (Number(gd.SoTien) || 0)
            : gd.Loai === 'Chi' ? -(Number(gd.SoTien) || 0) : 0;
    });
    return { maTK: tk.MaTK, tenTK: tk.TenTK, soDu: soDu };
  });
}
