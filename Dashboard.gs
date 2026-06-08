/**
 * Dashboard.gs — Bảng tổng quan dòng tiền. Xem CLAUDE.md §4.
 */

function capNhatDashboard() {
  const sh = getSheet_(CONFIG.SHEETS.DASHBOARD);
  sh.getCharts().forEach(function(c) { sh.removeChart(c); });
  sh.clear();

  const money = '#,##0 "₫"';
  let r = 1;

  // ── Tiêu đề ────────────────────────────────────────────────────────────────
  sh.getRange(r, 1).setValue('BẢNG TỔNG QUAN DÒNG TIỀN — LAVIPCO')
    .setFontSize(14).setFontWeight('bold');
  r += 1;
  sh.getRange(r, 1).setValue('Cập nhật: ' + fmtDate_(new Date()))
    .setFontColor('#666666');
  r += 2;

  // ── Số dư hiện tại ─────────────────────────────────────────────────────────
  sectionHeader_(sh, r, 'SỐ DƯ HIỆN TẠI'); r += 1;
  const tkList = soDuTheoTK_();
  let tongSoDu = 0;
  tkList.forEach(function(tk) {
    sh.getRange(r, 1).setValue(tk.tenTK);
    sh.getRange(r, 2).setValue(tk.soDu).setNumberFormat(money);
    tongSoDu += tk.soDu;
    r += 1;
  });
  sh.getRange(r, 1).setValue('TỔNG').setFontWeight('bold');
  sh.getRange(r, 2).setValue(tongSoDu).setNumberFormat(money).setFontWeight('bold');
  r += 2;

  // ── Công nợ tổng ───────────────────────────────────────────────────────────
  const phaiThu = congNo('Thu');
  const phaiTra = congNo('Chi');
  const sumKH   = function(arr) {
    return arr.reduce(function(s, x) { return s + (Number(x.SoTienDuKien) || 0); }, 0);
  };
  sectionHeader_(sh, r, 'CÔNG NỢ'); r += 1;
  sh.getRange(r, 1).setValue('Tổng phải thu (AR)');
  sh.getRange(r, 2).setValue(sumKH(phaiThu)).setNumberFormat(money);
  r += 1;
  sh.getRange(r, 1).setValue('Tổng phải trả (AP)');
  sh.getRange(r, 2).setValue(sumKH(phaiTra)).setNumberFormat(money);
  r += 2;

  // ── Công nợ quá hạn ────────────────────────────────────────────────────────
  const quaHan = phaiThu.concat(phaiTra).filter(function(k) {
    return k.TrangThai === CONFIG.TRANG_THAI_KH.QUA_HAN;
  });
  sh.getRange(r, 1, 1, 4).merge()
    .setValue('CÔNG NỢ QUÁ HẠN')
    .setFontWeight('bold').setBackground('#cc0000').setFontColor('#ffffff');
  r += 1;
  if (quaHan.length === 0) {
    sh.getRange(r, 1).setValue('(Không có khoản quá hạn)').setFontColor('#666666');
    r += 1;
  } else {
    sh.getRange(r, 1, 1, 4).setValues([['Loại', 'Diễn giải', 'Đến hạn', 'Số tiền (₫)']])
      .setFontWeight('bold').setBackground('#f4cccc');
    r += 1;
    quaHan.forEach(function(k) {
      sh.getRange(r, 1, 1, 4).setValues([
        [k.Loai, k.DienGiai, fmtDate_(k.NgayDenHan), Number(k.SoTienDuKien) || 0]
      ]);
      sh.getRange(r, 4).setNumberFormat(money);
      r += 1;
    });
  }
  r += 1;

  // ── Dòng tiền thực tế 12 tháng ────────────────────────────────────────────
  const tableTitleRow = r;
  sh.getRange(r, 1, 1, 4).merge()
    .setValue('DÒNG TIỀN THỰC TẾ 12 THÁNG')
    .setFontWeight('bold').setBackground('#1f3864').setFontColor('#ffffff');
  r += 1;
  const headerRow = r;
  sh.getRange(r, 1, 1, 4).setValues([['Tháng', 'Thu (₫)', 'Chi (₫)', 'Ròng (₫)']])
    .setFontWeight('bold').setBackground('#c9daf8');
  r += 1;

  const monthly  = dongTien12Thang_();
  const dataStart = r;
  monthly.forEach(function(m) {
    sh.getRange(r, 1, 1, 4).setValues([[m.label, m.thu, m.chi, m.thu - m.chi]]);
    sh.getRange(r, 2, 1, 3).setNumberFormat(money);
    if (m.thu - m.chi < 0) sh.getRange(r, 4).setFontColor('#cc0000');
    r += 1;
  });
  const dataEnd = r - 1;

  // Biểu đồ cột Thu vs Chi
  if (dataEnd >= dataStart) {
    const chart = sh.newChart()
      .asColumnChart()
      .addRange(sh.getRange(headerRow, 1, dataEnd - headerRow + 1, 3))
      .setPosition(tableTitleRow, 6, 0, 0)
      .setOption('title', 'Thu vs Chi theo tháng (12 tháng gần nhất)')
      .setOption('width', 500)
      .setOption('height', 320)
      .setOption('colors', ['#34a853', '#ea4335'])
      .build();
    sh.insertChart(chart);
  }

  sh.setColumnWidth(1, 180);
  sh.setColumnWidth(2, 140);
  sh.setColumnWidth(3, 140);
  sh.setColumnWidth(4, 140);
  SpreadsheetApp.getActiveSpreadsheet().toast('Đã cập nhật Dashboard.', '💰 Dòng tiền', 4);
}

function sectionHeader_(sh, row, text) {
  sh.getRange(row, 1, 1, 2).merge()
    .setValue(text)
    .setFontWeight('bold').setBackground('#1f3864').setFontColor('#ffffff');
}

/** Tổng hợp thu/chi từ GiaoDich theo 12 tháng gần nhất. */
function dongTien12Thang_() {
  const gd  = readRows_(CONFIG.SHEETS.GIAODICH);
  const now = new Date();
  const buckets = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      y: d.getFullYear(), m: d.getMonth(),
      label: Utilities.formatDate(d, CONFIG.TIMEZONE, 'MM/yyyy'),
      thu: 0, chi: 0
    });
  }
  gd.forEach(function(g) {
    const d = toDate_(g.Ngay);
    if (!d) return;
    const b = buckets.find(function(x) { return x.y === d.getFullYear() && x.m === d.getMonth(); });
    if (!b) return;
    const amt = Number(g.SoTien) || 0;
    if (g.Loai === 'Thu') b.thu += amt;
    else if (g.Loai === 'Chi') b.chi += amt;
  });
  return buckets;
}
