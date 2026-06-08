/**
 * ProjectReport.gs — Báo cáo dòng tiền theo từng dự án (P&L tiền mặt).
 * Gồm: thu/chi thực tế, dòng tiền ròng, công nợ còn lại, dự kiến ròng, % đã thu,
 * và bảng chi theo loại (vật tư/nhân công/thầu phụ/quản lý/thuế) cho mỗi dự án.
 */

function baoCaoDuAn() {
  const sh = getSheet_(CONFIG.SHEETS.BAOCAO);
  sh.getCharts().forEach(function (c) { sh.removeChart(c); });
  sh.clear();

  const money = '#,##0 "\u20ab"';
  const duAn = readRows_(CONFIG.SHEETS.DM_DUAN);
  const gd = readRows_(CONFIG.SHEETS.GIAODICH);
  const kh = readRows_(CONFIG.SHEETS.KEHOACH);
  const hm = readRows_(CONFIG.SHEETS.DM_HANGMUC);

  const hmLoai = {};
  hm.forEach(function (h) { hmLoai[h.MaHangMuc] = h.PhanLoaiChi || ''; });

  const sumGd = function (maDuAn, loai) {
    return gd.filter(function (g) { return g.MaDuAn === maDuAn && g.Loai === loai; })
      .reduce(function (s, g) { return s + (Number(g.SoTien) || 0); }, 0);
  };
  const sumKh = function (maDuAn, loai) {
    return kh.filter(function (k) { return k.MaDuAn === maDuAn && k.Loai === loai && k.TrangThai !== CONFIG.TRANG_THAI_KH.DA; })
      .reduce(function (s, k) { return s + (Number(k.SoTienDuKien) || 0); }, 0);
  };

  let r = 1;
  sh.getRange(r, 1).setValue('BÁO CÁO DÒNG TIỀN THEO DỰ ÁN').setFontSize(14).setFontWeight('bold'); r += 1;
  sh.getRange(r, 1).setValue('Cập nhật: ' + fmtDate_(new Date())).setFontColor('#666666'); r += 2;

  // ----- Bảng chính -----
  const head = ['Dự án', 'Giá trị HĐ', 'Thu thực tế', 'Chi thực tế', 'Ròng thực tế', 'Còn phải thu', 'Còn phải trả', 'Dự kiến ròng', '% đã thu'];
  sh.getRange(r, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#1f3864').setFontColor('#ffffff');
  r += 1;

  const rowsForChart = [];
  duAn.forEach(function (d) {
    const giaHD = Number(d.GiaTriSauVAT) || 0;
    const thu = sumGd(d.MaDuAn, 'Thu');
    const chi = sumGd(d.MaDuAn, 'Chi');
    const conThu = sumKh(d.MaDuAn, 'Thu');
    const conTra = sumKh(d.MaDuAn, 'Chi');
    const rong = thu - chi;
    const duKien = rong + conThu - conTra;
    const pct = giaHD ? thu / giaHD : 0;
    sh.getRange(r, 1, 1, head.length).setValues([[d.TenDuAn, giaHD, thu, chi, rong, conThu, conTra, duKien, pct]]);
    sh.getRange(r, 2, 1, 7).setNumberFormat(money);
    sh.getRange(r, 9).setNumberFormat('0.0%');
    if (rong < 0) sh.getRange(r, 5).setFontColor('#cc0000');
    rowsForChart.push({ ten: d.TenDuAn, rong: rong });
    r += 1;
  });
  const tableEnd = r - 1;
  r += 1;

  // ----- Chi theo loại (mỗi dự án) -----
  const loaiList = ['VatTu', 'NhanCong', 'ThauPhu', 'QuanLy', 'Thue', 'Khac'];
  const loaiLabel = { VatTu: 'Vật tư', NhanCong: 'Nhân công', ThauPhu: 'Thầu phụ', QuanLy: 'Quản lý', Thue: 'Thuế', Khac: 'Khác' };
  sh.getRange(r, 1, 1, loaiList.length + 2).merge().setValue('CHI THEO LOẠI (theo dự án)')
    .setFontWeight('bold').setBackground('#1f3864').setFontColor('#ffffff');
  r += 1;
  const ch = ['Dự án'].concat(loaiList.map(function (l) { return loaiLabel[l]; })).concat(['Tổng chi']);
  sh.getRange(r, 1, 1, ch.length).setValues([ch]).setFontWeight('bold');
  r += 1;
  duAn.forEach(function (d) {
    const acc = {}; loaiList.forEach(function (l) { acc[l] = 0; });
    gd.filter(function (g) { return g.MaDuAn === d.MaDuAn && g.Loai === 'Chi'; }).forEach(function (g) {
      let l = hmLoai[g.MaHangMuc] || 'Khac';
      if (loaiList.indexOf(l) < 0) l = 'Khac';
      acc[l] += (Number(g.SoTien) || 0);
    });
    let tong = 0; loaiList.forEach(function (l) { tong += acc[l]; });
    const row = [d.TenDuAn].concat(loaiList.map(function (l) { return acc[l]; })).concat([tong]);
    sh.getRange(r, 1, 1, row.length).setValues([row]);
    sh.getRange(r, 2, 1, loaiList.length + 1).setNumberFormat(money);
    r += 1;
  });
  r += 1;

  // ----- Bảng phụ cho biểu đồ + chart -----
  const chartTitleRow = r;
  sh.getRange(r, 1, 1, 2).setValues([['Dự án', 'Dòng tiền ròng']]).setFontWeight('bold');
  const chartStart = r;
  r += 1;
  rowsForChart.forEach(function (x) {
    sh.getRange(r, 1, 1, 2).setValues([[x.ten, x.rong]]);
    sh.getRange(r, 2).setNumberFormat(money);
    r += 1;
  });
  const chartEnd = r - 1;

  if (chartEnd >= chartStart + 1) {
    const chart = sh.newChart()
      .asColumnChart()
      .addRange(sh.getRange(chartStart, 1, chartEnd - chartStart + 1, 2))
      .setPosition(chartTitleRow, 11, 0, 0)
      .setOption('title', 'Dòng tiền ròng thực tế theo dự án')
      .setOption('width', 480)
      .setOption('height', 300)
      .build();
    sh.insertChart(chart);
  }

  sh.setColumnWidth(1, 200);
  for (let c = 2; c <= head.length; c++) sh.setColumnWidth(c, 120);
  SpreadsheetApp.getActiveSpreadsheet().toast('Đã cập nhật Báo cáo theo dự án.', '💰 Dòng tiền', 4);
  return tableEnd;
}
