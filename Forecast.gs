/**
 * Forecast.gs — Dự báo dòng tiền theo tháng. Xem CLAUDE.md §5.4.
 * SoDuCuoi[m] = SoDuCuoi[m-1] + ThuDuKien[m] - ChiDuKien[m]. Tô đỏ tháng âm tiền.
 */

function capNhatForecast() {
  const sh = getSheet_(CONFIG.SHEETS.FORECAST);
  sh.clear();

  const kh = readRows_(CONFIG.SHEETS.KEHOACH).filter(function (k) {
    return k.TrangThai !== CONFIG.TRANG_THAI_KH.DA;
  });

  const now = new Date();
  const months = [];
  for (let i = 0; i < CONFIG.FORECAST_THANG; i++) {
    months.push(new Date(now.getFullYear(), now.getMonth() + i, 1));
  }

  const header = ['Chỉ tiêu'].concat(months.map(function (m) {
    return Utilities.formatDate(m, CONFIG.TIMEZONE, 'MM/yyyy');
  }));
  const dauRow = ['Số dư đầu'];
  const thuRow = ['Thu dự kiến'];
  const chiRow = ['Chi dự kiến'];
  const cuoiRow = ['Số dư cuối'];

  let prevCuoi = soDuHienTai().tong;
  months.forEach(function (m, idx) {
    const start = new Date(m.getFullYear(), m.getMonth(), 1);
    const end = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59);
    let thu = 0, chi = 0;
    kh.forEach(function (k) {
      const due = toDate_(k.NgayDenHan);
      if (!due) return;
      // Tháng đầu gom luôn các khoản quá hạn (due <= cuối tháng đầu).
      const inBucket = (idx === 0) ? (due <= end) : (due >= start && due <= end);
      if (!inBucket) return;
      const amt = Number(k.SoTienDuKien) || 0;
      if (k.Loai === 'Thu') thu += amt; else chi += amt;
    });
    const dau = prevCuoi;
    const cuoi = dau + thu - chi;
    dauRow.push(dau); thuRow.push(thu); chiRow.push(chi); cuoiRow.push(cuoi);
    prevCuoi = cuoi;
  });

  sh.getRange(1, 1, 1, header.length).setValues([header])
    .setFontWeight('bold').setBackground('#1f3864').setFontColor('#ffffff');
  const body = [dauRow, thuRow, chiRow, cuoiRow];
  sh.getRange(2, 1, body.length, header.length).setValues(body);
  sh.getRange(2, 2, body.length, header.length - 1).setNumberFormat('#,##0 "\u20ab"');
  sh.getRange(5, 1, 1, header.length).setFontWeight('bold');

  // Tô đỏ ô "Số dư cuối" < 0 (cash gap).
  for (let c = 2; c <= header.length; c++) {
    if (Number(cuoiRow[c - 1]) < 0) {
      sh.getRange(5, c).setBackground('#f4cccc').setFontColor('#cc0000');
    }
  }
  sh.setColumnWidth(1, 120);
  SpreadsheetApp.getActiveSpreadsheet().toast('Đã cập nhật Forecast.', '💰 Dòng tiền', 4);
}
