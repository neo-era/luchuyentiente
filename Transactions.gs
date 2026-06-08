/**
 * Transactions.gs — Giao dịch tiền thật (sheet GiaoDich) + tính số dư.
 * Xem CLAUDE.md §4, §5.
 */

function themGiaoDich(obj) {
  if (!obj || !(Number(obj.SoTien) > 0)) throw new Error('Số tiền phải lớn hơn 0');
  if (['Thu', 'Chi'].indexOf(obj.Loai) < 0) throw new Error('Loại phải là Thu hoặc Chi');

  let email = '';
  try { email = Session.getActiveUser().getEmail() || ''; } catch (e) { email = ''; }

  const rec = {
    MaGD: genId_(),
    Ngay: toDate_(obj.Ngay) || new Date(),
    Loai: obj.Loai,
    SoTien: Math.round(Number(obj.SoTien)),
    MaTK: obj.MaTK || '',
    MaHangMuc: obj.MaHangMuc || '',
    MaDuAn: obj.MaDuAn || '',
    MaDoiTac: obj.MaDoiTac || '',
    DienGiai: obj.DienGiai || '',
    MaKH: obj.MaKH || '',
    NguoiNhap: email
  };
  appendRow_(CONFIG.SHEETS.GIAODICH, rec);
  if (rec.MaKH) khopKeHoach_(rec.MaKH, rec.MaGD);
  return rec.MaGD;
}

function xoaGiaoDich(maGD) {
  const sh = getSheet_(CONFIG.SHEETS.GIAODICH);
  const rows = readRows_(CONFIG.SHEETS.GIAODICH).filter(function (r) { return String(r.MaGD) === String(maGD); });
  if (!rows.length) return false;
  const target = rows[0];
  if (target.MaKH) huyKhop_(target.MaKH);
  sh.deleteRow(target._row);
  return true;
}

function danhSachGiaoDich(filter) {
  filter = filter || {};
  let rows = readRows_(CONFIG.SHEETS.GIAODICH);
  if (filter.MaDuAn) rows = rows.filter(function (r) { return r.MaDuAn === filter.MaDuAn; });
  if (filter.Loai) rows = rows.filter(function (r) { return r.Loai === filter.Loai; });
  if (filter.tu) rows = rows.filter(function (r) { return toDate_(r.Ngay) >= toDate_(filter.tu); });
  if (filter.den) rows = rows.filter(function (r) { return toDate_(r.Ngay) <= toDate_(filter.den); });
  return rows;
}

/** Số dư hiện tại = SoDuDauKy + tổng Thu - tổng Chi, gom theo tài khoản. */
function soDuHienTai() {
  const tk = readRows_(CONFIG.SHEETS.DM_TAIKHOAN);
  const gd = readRows_(CONFIG.SHEETS.GIAODICH);
  const byTK = {};
  const names = {};
  tk.forEach(function (t) { byTK[t.MaTK] = Number(t.SoDuDauKy) || 0; names[t.MaTK] = t.TenTK; });
  gd.forEach(function (g) {
    if (!(g.MaTK in byTK)) { byTK[g.MaTK] = 0; names[g.MaTK] = g.MaTK || '(không gán)'; }
    const amt = Number(g.SoTien) || 0;
    byTK[g.MaTK] += (g.Loai === 'Thu' ? amt : -amt);
  });
  let tong = 0;
  Object.keys(byTK).forEach(function (k) { tong += byTK[k]; });
  return { byTK: byTK, names: names, tong: tong };
}
