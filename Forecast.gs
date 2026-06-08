/**
 * Forecast.gs — Dự báo dòng tiền theo tháng. Xem CLAUDE.md §5.4.
 * SoDuCuoi[m] = SoDuCuoi[m-1] + ThuDuKien[m] - ChiDuKien[m]. Tô đỏ tháng âm tiền.
 */

function capNhatForecast() {
  const today     = new Date();
  const soThang   = CONFIG.FORECAST_THANG;

  // KeHoach chưa thực hiện
  const keHoach = readRows_(CONFIG.SHEETS.KEHOACH).filter(function(r) {
    return r.TrangThai !== CONFIG.TRANG_THAI_KH.DA;
  });

  // Tính lũy kế theo từng tháng
  let soDuDau = soDuHienTai_();
  const forecastRows = [];

  for (let i = 0; i < soThang; i++) {
    const startOfMonth = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const endOfMonth   = new Date(today.getFullYear(), today.getMonth() + i + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    let thuDuKien = 0;
    let chiDuKien = 0;

    keHoach.forEach(function(kh) {
      const ngay = toDate_(kh.NgayDenHan);
      if (!ngay || ngay < startOfMonth || ngay > endOfMonth) return;
      const so = Number(kh.SoTienDuKien) || 0;
      if (kh.Loai === 'Thu') thuDuKien += so;
      else if (kh.Loai === 'Chi') chiDuKien += so;
    });

    const soDuCuoi = soDuDau + thuDuKien - chiDuKien;
    const thangLabel = Utilities.formatDate(startOfMonth, CONFIG.TIMEZONE, 'MM/yyyy');
    forecastRows.push([thangLabel, soDuDau, thuDuKien, chiDuKien, soDuCuoi]);
    soDuDau = soDuCuoi;
  }

  // Ghi ra sheet Forecast
  const sh = getSheet_(CONFIG.SHEETS.FORECAST);
  sh.clearContents();
  sh.clearFormats();

  const headers = ['Tháng', 'Số dư đầu (₫)', 'Thu dự kiến (₫)', 'Chi dự kiến (₫)', 'Số dư cuối lũy kế (₫)'];
  sh.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#1f3864')
    .setFontColor('#ffffff');
  sh.setFrozenRows(1);

  if (!forecastRows.length) return;

  sh.getRange(2, 1, forecastRows.length, 5).setValues(forecastRows);
  // Định dạng cột tiền
  sh.getRange(2, 2, forecastRows.length, 4).setNumberFormat('#,##0 "₫"');

  // Tô đỏ ô Số dư cuối nếu âm — cảnh báo cash gap
  forecastRows.forEach(function(row, i) {
    const cell = sh.getRange(i + 2, 5);
    if (row[4] < 0) {
      cell.setBackground('#f4cccc').setFontColor('#cc0000').setFontWeight('bold');
    } else {
      cell.setBackground(null).setFontColor(null).setFontWeight('normal');
    }
  });

  sh.autoResizeColumns(1, 5);
}
