/**
 * Config.gs — Hằng số & cấu hình toàn cục.
 * App Quản Lý Dòng Tiền LAVIPCO. Xem CLAUDE.md §7.
 */
const CONFIG = {
  TIMEZONE: 'Asia/Ho_Chi_Minh',
  VAT_DEFAULT: 8,            // % VAT chuẩn LAVIPCO
  GIU_LAI_BAO_HANH: 5,       // % giữ lại bảo hành
  FORECAST_THANG: 6,         // số tháng dự báo

  SHEETS: {
    DM_DUAN: 'DM_DuAn',
    DM_DOITAC: 'DM_DoiTac',
    DM_HANGMUC: 'DM_HangMuc',
    DM_TAIKHOAN: 'DM_TaiKhoan',
    KEHOACH: 'KeHoach',
    GIAODICH: 'GiaoDich',
    DASHBOARD: 'Dashboard',
    FORECAST: 'Forecast',
    BAOCAO: 'BaoCao_DuAn',
    HOSO: 'HoSo'
  },

  // Header (thứ tự cột) cho từng sheet — luôn tham chiếu qua đây, KHÔNG hard-code chỉ số.
  COLS: {
    'DM_DuAn':     ['MaDuAn', 'TenDuAn', 'DoiTac', 'VaiTro', 'GiaTriTruocVAT', 'VAT', 'GiaTriSauVAT', 'NgayKy', 'PhanTramGiuLai', 'TrangThai'],
    'DM_DoiTac':   ['MaDoiTac', 'Ten', 'Loai', 'MST', 'LienHe'],
    'DM_HangMuc':  ['MaHangMuc', 'Ten', 'Nhom', 'PhanLoaiChi'],
    'DM_TaiKhoan': ['MaTK', 'TenTK', 'NganHang', 'SoTK', 'SoDuDauKy'],
    'KeHoach':     ['MaKH', 'MaDuAn', 'Loai', 'MaHangMuc', 'MaDoiTac', 'DienGiai', 'SoTienDuKien', 'NgayDenHan', 'TrangThai', 'MaGD_Khop'],
    'GiaoDich':    ['MaGD', 'Ngay', 'Loai', 'SoTien', 'MaTK', 'MaHangMuc', 'MaDuAn', 'MaDoiTac', 'DienGiai', 'MaKH', 'NguoiNhap'],
    'HoSo':        ['MaHoSo', 'MaDuAn', 'LoaiHoSo', 'TenFile', 'DinhDang', 'KichThuocKB', 'ItemId', 'Link', 'NgayTai', 'NguoiTai', 'GhiChu']
  },

  // Seed tài khoản (số dư đầu kỳ = 0, sửa lại sau khi khởi tạo)
  TAI_KHOAN: [
    { ten: 'ACB',       nganHang: 'ACB',       soTK: '96968686868' },
    { ten: 'Sacombank', nganHang: 'Sacombank', soTK: '060267594433' },
    { ten: 'Tiền mặt',  nganHang: '',          soTK: '' }
  ],

  // Seed hạng mục thu/chi
  HANG_MUC: [
    { ten: 'Tạm ứng hợp đồng',  nhom: 'Thu', phanLoai: '' },
    { ten: 'Thanh toán đợt',    nhom: 'Thu', phanLoai: '' },
    { ten: 'Giữ lại bảo hành',  nhom: 'Thu', phanLoai: '' },
    { ten: 'Vật tư',            nhom: 'Chi', phanLoai: 'VatTu' },
    { ten: 'Nhân công',         nhom: 'Chi', phanLoai: 'NhanCong' },
    { ten: 'Thầu phụ',          nhom: 'Chi', phanLoai: 'ThauPhu' },
    { ten: 'Chi phí quản lý',   nhom: 'Chi', phanLoai: 'QuanLy' },
    { ten: 'Thuế',              nhom: 'Chi', phanLoai: 'Thue' }
  ],

  TRANG_THAI_KH: { CHUA: 'ChuaToiHan', QUA_HAN: 'QuaHan', DA: 'DaThucHien' },

  // OneDrive / Microsoft Graph. Client ID/Secret lưu trong Script Properties:
  // MS_CLIENT_ID, MS_CLIENT_SECRET, (tùy chọn) MS_TENANT.
  ONEDRIVE: {
    TENANT: 'common',            // hoặc Tenant ID của công ty (OneDrive for Business)
    ROOT_FOLDER: 'HoSo_LAVIPCO', // thư mục gốc trên OneDrive
    SCOPE: 'Files.ReadWrite offline_access User.Read'
  },

  // Danh mục loại hồ sơ dự án xây dựng
  LOAI_HOSO: [
    'Hợp đồng', 'Bản vẽ thiết kế', 'Dự toán / BOQ', 'Biên bản nghiệm thu',
    'Biên bản bàn giao', 'Hồ sơ chất lượng (CO/CQ)', 'Hóa đơn - chứng từ',
    'Nhật ký thi công', 'Báo giá', 'Khác'
  ]
};

/** Đọc secret từ Script Properties (vd ZALO_WEBHOOK). KHÔNG hard-code secret. */
function getScriptProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}
function setScriptProp_(key, val) {
  PropertiesService.getScriptProperties().setProperty(key, val);
}
