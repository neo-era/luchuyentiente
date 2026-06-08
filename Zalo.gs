/**
 * Zalo.gs — Cảnh báo dòng tiền qua Zalo (webhook). Xem CLAUDE.md §11.
 * Cấu hình webhook: Project Settings > Script Properties > key ZALO_WEBHOOK.
 * (Hoặc chạy: setScriptProp_('ZALO_WEBHOOK','https://...'))
 */

function guiZalo_(noiDung) {
  const url = getScriptProp_('ZALO_WEBHOOK');
  if (!url) { console.warn('Chưa cấu hình ZALO_WEBHOOK trong Script Properties.'); return false; }
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

function soanCanhBaoDongTien() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in7 = new Date(today.getTime() + 7 * 24 * 3600 * 1000);
  const kh = readRows_(CONFIG.SHEETS.KEHOACH).filter(function (k) {
    return k.TrangThai !== CONFIG.TRANG_THAI_KH.DA;
  });
  const denHan = kh.filter(function (k) {
    const d = toDate_(k.NgayDenHan); return d && d >= today && d <= in7;
  });
  const quaHan = kh.filter(function (k) { return k.TrangThai === CONFIG.TRANG_THAI_KH.QUA_HAN; });

  const fmt = function (k) {
    return '\u2022 [' + k.Loai + '] ' + k.DienGiai + ' \u2014 ' + formatVND_(k.SoTienDuKien) + ' (' + fmtDate_(k.NgayDenHan) + ')';
  };

  const lines = ['\ud83d\udcb0 CẢNH BÁO DÒNG TIỀN ' + fmtDate_(new Date()), ''];
  lines.push('Số dư hiện tại: ' + formatVND_(soDuHienTai().tong), '');
  lines.push('\ud83d\udd14 Đến hạn 7 ngày tới (' + denHan.length + '):');
  denHan.forEach(function (k) { lines.push(fmt(k)); });
  lines.push('', '\u26a0\ufe0f Quá hạn (' + quaHan.length + '):');
  quaHan.forEach(function (k) { lines.push(fmt(k)); });

  return lines.join('\n');
}

/** Hàm chạy hằng ngày (trigger): cập nhật quá hạn + gửi Zalo. */
function canhBaoHangNgay() {
  capNhatQuaHan();
  const noiDung = soanCanhBaoDongTien();
  guiZalo_(noiDung);
  return noiDung;
}
