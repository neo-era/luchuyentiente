/**
 * Form.gs — Đấu nối form nhập giao dịch (HTML Service). Xem CLAUDE.md §4.
 */

/** Mở form dạng dialog trong Google Sheets. */
function moFormNhap() {
  const html = HtmlService.createHtmlOutputFromFile('Form').setWidth(440).setHeight(640);
  SpreadsheetApp.getUi().showModalDialog(html, 'Nhập giao dịch');
}

/** Web app entry point — phục vụ giao diện tổng quan trung tâm. */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Dòng tiền LAVIPCO')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
}

/** Dữ liệu tổng quan cho trang chủ Index.html. */
function getOverviewData() {
  const tkList   = soDuTheoTK_();
  const tongSoDu = tkList.reduce(function(s, t) { return s + t.soDu; }, 0);

  const phaiThuList = congNo('Thu');
  const phaiTraList = congNo('Chi');
  const phaiThu = phaiThuList.reduce(function(s, k) { return s + (Number(k.SoTienDuKien) || 0); }, 0);
  const phaiTra = phaiTraList.reduce(function(s, k) { return s + (Number(k.SoTienDuKien) || 0); }, 0);
  const soQuaHan = phaiThuList.concat(phaiTraList)
    .filter(function(k) { return k.TrangThai === CONFIG.TRANG_THAI_KH.QUA_HAN; }).length;

  // 10 giao dịch gần nhất, kèm tên dự án
  const duAnMap = {};
  readRows_(CONFIG.SHEETS.DM_DUAN).forEach(function(d) { duAnMap[d.MaDuAn] = d.TenDuAn; });
  const gdList = readRows_(CONFIG.SHEETS.GIAODICH)
    .sort(function(a, b) { return new Date(b.Ngay) - new Date(a.Ngay); })
    .slice(0, 10)
    .map(function(g) {
      return {
        Ngay: g.Ngay, Loai: g.Loai, SoTien: g.SoTien,
        DienGiai: g.DienGiai, MaDuAn: g.MaDuAn,
        TenDuAn: duAnMap[g.MaDuAn] || ''
      };
    });

  return {
    soDuTK: tkList,
    tongSoDu: tongSoDu,
    phaiThu: phaiThu,
    phaiTra: phaiTra,
    soQuaHan: soQuaHan,
    giaoDichGanDay: gdList
  };
}

/** Dữ liệu forecast cho panel Forecast. */
function getForecastData() {
  const rows = readRows_(CONFIG.SHEETS.FORECAST);
  return rows.map(function(r) {
    return {
      thang:      r['Tháng']                    || '',
      soDuDau:    Number(r['Số dư đầu (₫)'])    || 0,
      thuDuKien:  Number(r['Thu dự kiến (₫)'])  || 0,
      chiDuKien:  Number(r['Chi dự kiến (₫)'])  || 0,
      soDuCuoi:   Number(r['Số dư cuối lũy kế (₫)']) || 0
    };
  });
}

/** Dữ liệu công nợ AR/AP cho panel Công nợ. */
function getCongNoData() {
  return {
    phaiThu: congNo('Thu'),
    phaiTra: congNo('Chi')
  };
}

/** Dữ liệu đổ vào các dropdown của form. */
function getFormData() {
  return {
    taiKhoan: readRows_(CONFIG.SHEETS.DM_TAIKHOAN).map(function (t) { return { id: t.MaTK, ten: t.TenTK }; }),
    hangMuc: readRows_(CONFIG.SHEETS.DM_HANGMUC).map(function (h) { return { id: h.MaHangMuc, ten: h.Ten, nhom: h.Nhom }; }),
    duAn: readRows_(CONFIG.SHEETS.DM_DUAN).map(function (d) { return { id: d.MaDuAn, ten: d.TenDuAn }; }),
    doiTac: readRows_(CONFIG.SHEETS.DM_DOITAC).map(function (d) { return { id: d.MaDoiTac, ten: d.Ten }; }),
    keHoach: readRows_(CONFIG.SHEETS.KEHOACH)
      .filter(function (k) { return k.TrangThai !== CONFIG.TRANG_THAI_KH.DA; })
      .map(function (k) { return { id: k.MaKH, duAn: k.MaDuAn, loai: k.Loai, dienGiai: k.DienGiai, soTien: k.SoTienDuKien }; })
  };
}

/** Lưu giao dịch từ form, rồi refresh forecast + dashboard. */
function luuGiaoDichTuForm(data) {
  try {
    themGiaoDich(data);
    capNhatForecast();
    capNhatDashboard();
    return { ok: true, message: 'Đã lưu giao dịch.' };
  } catch (e) {
    return { ok: false, message: String((e && e.message) || e) };
  }
}
