/**
 * Dashboard.gs — Bảng tổng quan dòng tiền. Xem CLAUDE.md §4.
 */

function capNhatDashboard() {
  const sh = getSheet_(CONFIG.SHEETS.DASHBOARD);
  sh.getCharts().forEach(function (c) { sh.removeChart(c); });
  sh.clear();

  const money = '#,##0 "\u20ab"';
  const sd = soDuHienTai();
  let r = 1;

  sh.getRange(r, 1).setValue('BẢNG TỔNG QUAN DÒNG TIỀN — LAVIPCO').setFontSize(14).setFontWeight('bold'); r += 1;
  sh.getRange(r, 1).setValue('Cập nhật: ' + fmtDate_(new Date())).setFontColor('#666666'); r += 2;

  // --- Số dư hiện tại ---
  sectionHeader_(sh, r, 'SỐ DƯ HIỆN TẠI'); r += 1;
  Object.keys(sd.byTK).forEach(function (k) {
    sh.getRange(r, 1).setValue(sd.names[k] || k);
    sh.getRange(r, 2).setValue(sd.byTK[k]).setNumberFormat(money);
    r += 1;
  });
  sh.getRange(r, 1).setValue('TỔNG').setFontWeight('bold');
  sh.getRange(r, 2).setValue(sd.tong).setNumberFormat(money).setFontWeight('bold'); r += 2;

  // --- Công nợ ---
  const phaiThu = congNo('Thu');
  const phaiTra = congNo('Chi');
  const sum = function (arr) { return arr.reduce(function (s, x) { return s + (Number(x.SoTienDuKien) || 0); }, 0); };
  sectionHeader_(sh, r, 'CÔNG NỢ'); r += 1;
  sh.getRange(r, 1).setValue('Tổng phải thu'); sh.getRange(r, 2).setValue(sum(phaiThu)).setNumberFormat(money); r += 1;
  sh.getRange(r, 1).setValue('Tổng phải trả'); sh.getRange(r, 2).setValue(sum(phaiTra)).setNumberFormat(money); r += 2;

  // --- Công nợ quá hạn ---
  const quaHan = phaiThu.concat(phaiTra).filter(function (k) { return k.TrangThai === CONFIG.TRANG_THAI_KH.QUA_HAN; });
  sh.getRange(r, 1, 1, 4).merge().setValue('CÔNG NỢ QUÁ HẠN').setFontWeight('bold').setBackground('#cc0000').setFontColor('#ffffff'); r += 1;
  if (quaHan.length === 0) {
    sh.getRange(r, 1).setValue('(Không có)'); r += 1;
  } else {
    sh.getRange(r, 1, 1, 4).setValues([['Loại', 'Diễn giải', 'Đến hạn', 'Số tiền']]).setFontWeight('bold'); r += 1;
    quaHan.forEach(function (k) {
      sh.getRange(r, 1, 1, 4).setValues([[k.Loai, k.DienGiai, fmtDate_(k.NgayDenHan), Number(k.SoTienDuKien) || 0]]);
      sh.getRange(r, 4).setNumberFormat(money);
      r += 1;
    });
  }
  r += 1;

  // --- Dòng tiền 12 tháng ---
  const tableTitleRow = r;
  sh.getRange(r, 1, 1, 4).merge().setValue('DÒNG TIỀN 12 THÁNG').setFontWeight('bold').setBackground('#1f3864').setFontColor('#ffffff'); r += 1;
  const headerRow = r;
  sh.getRange(r, 1, 1, 4).setValues([['Tháng', 'Thu', 'Chi', 'Ròng']]).setFontWeight('bold'); r += 1;
  const monthly = dongTien12Thang_();
  const dataStart = r;
  monthly.forEach(function (m) {
    sh.getRange(r, 1, 1, 4).setValues([[m.label, m.thu, m.chi, m.thu - m.chi]]);
    sh.getRange(r, 2, 1, 3).setNumberFormat(money);
    r += 1;
  });
  const dataEnd = r - 1;

  // Biểu đồ cột Thu vs Chi (cột Tháng, Thu, Chi).
  if (dataEnd >= dataStart) {
    const chart = sh.newChart()
      .asColumnChart()
      .addRange(sh.getRange(headerRow, 1, dataEnd - headerRow + 1, 3))
      .setPosition(tableTitleRow, 6, 0, 0)
      .setOption('title', 'Thu vs Chi theo tháng')
      .setOption('width', 480)
      .setOption('height', 300)
      .build();
    sh.insertChart(chart);
  }

  sh.setColumnWidth(1, 170);
  sh.setColumnWidth(2, 130);
  sh.setColumnWidth(3, 130);
  sh.setColumnWidth(4, 130);
  SpreadsheetApp.getActiveSpreadsheet().toast('Đã cập nhật Dashboard.', '💰 Dòng tiền', 4);
}

function sectionHeader_(sh, row, text) {
  sh.getRange(row, 1, 1, 2).merge().setValue(text)
    .setFontWeight('bold').setBackground('#1f3864').setFontColor('#ffffff');
}

function dongTien12Thang_() {
  const gd = readRows_(CONFIG.SHEETS.GIAODICH);
  const now = new Date();
  const buckets = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      y: d.getFullYear(), m: d.getMonth(),
      label: Utilities.formatDate(d, CONFIG.TIMEZONE, 'MM/yyyy'), thu: 0, chi: 0
    });
  }
  gd.forEach(function (g) {
    const d = toDate_(g.Ngay); if (!d) return;
    const b = buckets.filter(function (x) { return x.y === d.getFullYear() && x.m === d.getMonth(); })[0];
    if (!b) return;
    const amt = Number(g.SoTien) || 0;
    if (g.Loai === 'Thu') b.thu += amt; else b.chi += amt;
  });
  return buckets;
}
