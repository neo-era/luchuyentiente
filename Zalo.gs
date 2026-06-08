/**
 * Zalo.gs — Cảnh báo dòng tiền qua Zalo (webhook). Xem CLAUDE.md §11.
 * Cấu hình webhook: Project Settings > Script Properties > key ZALO_WEBHOOK.
 */

/** POST nội dung cảnh báo lên Zalo webhook. Không crash nếu webhook trống. */
function guiZalo_(noiDung) {
  const url = getScriptProp_('ZALO_WEBHOOK');
  if (!url) {
    console.warn('Chưa cấu hình ZALO_WEBHOOK trong Script Properties.');
    return false;
  }
  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ text: noiDung }),
      muteHttpExceptions: true
    });
    return true;
  } catch (e) {
    console.error('Lỗi gửi Zalo: ' + e);
    return false;
  }
}

/** Soạn nội dung cảnh báo: đến hạn 7 ngày + quá hạn + tháng forecast âm. */
function soanCanhBaoDongTien() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in7   = new Date(today.getTime() + 7 * 24 * 3600 * 1000);

  const kh = readRows_(CONFIG.SHEETS.KEHOACH).filter(function(k) {
    return k.TrangThai !== CONFIG.TRANG_THAI_KH.DA;
  });
  const denHan = kh.filter(function(k) {
    const d = toDate_(k.NgayDenHan);
    return d && d >= today && d <= in7;
  });
  const quaHan = kh.filter(function(k) {
    return k.TrangThai === CONFIG.TRANG_THAI_KH.QUA_HAN;
  });

  // Đọc forecast để tìm tháng âm tiền
  const forecastRows = readRows_(CONFIG.SHEETS.FORECAST);
  const thangAm = forecastRows.filter(function(r) {
    const cuoi = Number(r['Số dư cuối lũy kế (₫)']) || 0;
    return cuoi < 0;
  });

  const fmt = function(k) {
    return '• [' + k.Loai + '] ' + k.DienGiai + ' — ' + formatVND_(k.SoTienDuKien) + ' (' + fmtDate_(k.NgayDenHan) + ')';
  };

  const lines = [
    '💰 CẢNH BÁO DÒNG TIỀN LAVIPCO',
    fmtDate_(new Date()),
    '',
    'Số dư hiện tại: ' + formatVND_(soDuHienTai_()),
    ''
  ];

  lines.push('🔔 Đến hạn trong 7 ngày tới (' + denHan.length + ' khoản):');
  if (denHan.length === 0) {
    lines.push('  (Không có)');
  } else {
    denHan.forEach(function(k) { lines.push(fmt(k)); });
  }

  lines.push('');
  lines.push('⚠️ Quá hạn chưa thanh toán (' + quaHan.length + ' khoản):');
  if (quaHan.length === 0) {
    lines.push('  (Không có)');
  } else {
    quaHan.forEach(function(k) { lines.push(fmt(k)); });
  }

  if (thangAm.length > 0) {
    lines.push('');
    lines.push('🚨 CẢNH BÁO CASH GAP — tháng dự báo âm tiền:');
    thangAm.forEach(function(r) {
      const ten = r['Tháng'] || '';
      const cuoi = Number(r['Số dư cuối lũy kế (₫)']) || 0;
      lines.push('  Tháng ' + ten + ': ' + formatVND_(cuoi));
    });
  }

  return lines.join('\n');
}

/** Hàm chạy hằng ngày bởi trigger: cập nhật quá hạn → soạn → gửi Zalo. */
function canhBaoHangNgay() {
  capNhatQuaHan();
  const noiDung = soanCanhBaoDongTien();
  guiZalo_(noiDung);
  return noiDung;
}
