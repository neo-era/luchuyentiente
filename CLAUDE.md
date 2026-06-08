# CLAUDE.md — App Quản Lý Dòng Tiền LAVIPCO

> **Phiên bản:** 1.2 · **Cập nhật:** 2026-06
> File context cho Claude Code. Đọc kỹ trước khi sửa bất kỳ file `.gs` / `.html` nào.

---

## 1. Mục tiêu & phạm vi

App quản trị **dòng tiền theo dự án** cho Công ty TNHH Kỹ Nghệ Lâm Việt Phát (LAVIPCO) —
công ty thi công chiếu sáng đô thị, tín hiệu giao thông, hạ tầng điện/xây lắp.

- **Người dùng:** 3 người — admin (chủ dự án), kế toán (nhập liệu), giám đốc (chỉ xem dashboard).
- **Chức năng:** thu/chi cơ bản · gắn theo dự án & hợp đồng · dự báo dòng tiền (forecast) · công nợ phải thu/phải trả (AR/AP).
- **NGUYÊN TẮC LÕI:** app quản lý theo **tiền mặt thực thu/thực chi** (cash basis).
  App **KHÔNG thay MISA** — MISA lo sổ sách kế toán/thuế/hóa đơn (accrual basis).
  Không cố đồng bộ số liệu 1-1 với MISA; hai hệ thống phục vụ mục đích khác nhau.

---

## 2. Tech stack & công cụ

| Lớp | Công nghệ |
|---|---|
| Data layer | Google Sheets (1 spreadsheet, nhiều sheet) |
| Backend | Google Apps Script (V8 runtime, `.gs`) |
| UI nhập liệu mobile | HTML Service (`.html`) — form nhập nhanh trên điện thoại |
| Dev workflow | **clasp** (local → push) + Claude Code CLI |
| Cảnh báo | Zalo (gửi qua webhook/API — tái dùng pattern từ MuasamcongBot) |
| Lập lịch | Apps Script time-driven triggers |

**KHÔNG dùng** Next.js/DB ở giai đoạn này (3 người dùng, over-engineering).
Chỉ migrate sang Next.js + Supabase khi vượt ~vài nghìn dòng giao dịch hoặc cần UX/đa người dùng tốt hơn.

---

## 3. Cấu trúc thư mục (clasp project)

```
.
├── CLAUDE.md
├── .clasp.json              # cấu hình clasp (scriptId)
├── appsscript.json          # manifest (timezone Asia/Ho_Chi_Minh, scopes)
├── Config.gs                # HẰNG SỐ: tên sheet, cột, account, VAT... (xem §7)
├── Setup.gs                 # tạo sheet + header + named range + định dạng
├── Transactions.gs          # CRUD sheet GiaoDich
├── Planning.gs              # CRUD KeHoach + khớp KeHoach↔GiaoDich
├── Forecast.gs              # tính bảng forecast theo tháng
├── Dashboard.gs             # refresh dashboard (số dư, công nợ, biểu đồ)
├── Triggers.gs              # trigger hằng ngày: cập nhật quá hạn + gọi Zalo
├── Zalo.gs                  # gửi cảnh báo Zalo
├── Utils.gs                 # helper: genId, formatVND, parseDate, getSheet...
└── ui/
    └── Form.html            # form nhập giao dịch trên mobile (HTML Service)
```

---

## 4. Mô hình dữ liệu (8 sheet)

> Quy ước: hàng 1 = header. Mã (`Ma*`) sinh bằng `Utilities.getUuid()` (xem §6).
> Mọi sheet master data có prefix `DM_`.

### `DM_DuAn` — danh mục hợp đồng/dự án
`MaDuAn` · `TenDuAn` · `DoiTac` · `VaiTro` (NhaThau/Khac) · `GiaTriTruocVAT` · `VAT%` (mặc định 8) · `GiaTriSauVAT` · `NgayKy` · `PhanTramGiuLai` (mặc định 5) · `TrangThai` (DangThiCong/HoanThanh/BaoHanh)

### `DM_DoiTac`
`MaDoiTac` · `Ten` · `Loai` (ChuDauTu/NCC/ThauPhu) · `MST` · `LienHe`

### `DM_HangMuc` — danh mục thu/chi
`MaHangMuc` · `Ten` · `Nhom` (Thu/Chi) · `PhanLoaiChi` (VatTu/NhanCong/ThauPhu/QuanLy/Thue)

### `DM_TaiKhoan` — tài khoản tiền
`MaTK` · `TenTK` · `NganHang` · `SoTK` · `SoDuDauKy`
> Seed sẵn: ACB `96968686868`, Sacombank `060267594433`, Tiền mặt.

### `KeHoach` ⭐ — kế hoạch thu/chi (TIM CỦA APP: vừa AR/AP vừa nuôi forecast)
`MaKH` · `MaDuAn` · `Loai` (Thu/Chi) · `MaHangMuc` · `MaDoiTac` · `DienGiai` (vd "Đợt 2 – 60%") · `SoTienDuKien` · `NgayDenHan` · `TrangThai` (ChuaToiHan/QuaHan/DaThucHien) · `MaGD_Khop`

### `GiaoDich` — phát sinh tiền thật
`MaGD` · `Ngay` · `Loai` (Thu/Chi) · `SoTien` · `MaTK` · `MaHangMuc` · `MaDuAn` · `MaDoiTac` · `DienGiai` · `MaKH` (liên kết, có thể rỗng) · `NguoiNhap`

### `Dashboard` — tự động bằng công thức (không nhập tay)
Số dư hiện tại từng TK + tổng · Tổng phải thu / phải trả · Công nợ quá hạn · Dòng tiền 12 tháng.

### `Forecast` — bảng dòng tiền dự báo theo tháng (tự động)
Cột tháng (M+0 → M+6). Mỗi tháng: Số dư đầu · Thu dự kiến · Chi dự kiến · **Số dư cuối (lũy kế)**.

---

## 5. Logic nghiệp vụ (đọc kỹ — dễ sai)

1. **Khớp KeHoach ↔ GiaoDich:** khi nhập 1 giao dịch ứng với khoản kế hoạch, set `GiaoDich.MaKH` = `KeHoach.MaKH`, đồng thời cập nhật `KeHoach.TrangThai = DaThucHien` và `KeHoach.MaGD_Khop`. Form nhập **bắt buộc** cho chọn (hoặc bỏ qua) khoản kế hoạch để forecast không lệch.

2. **Công nợ (AR/AP)** = các dòng `KeHoach` có `TrangThai ≠ DaThucHien`:
   - Phải thu = `Loai=Thu`; Phải trả = `Loai=Chi`.

3. **Quá hạn:** `NgayDenHan < TODAY()` và chưa thực hiện → `TrangThai=QuaHan` (cập nhật bởi trigger hằng ngày, không sửa tay).

4. **Forecast tháng (lũy kế):**
   `SoDuCuoi[m] = SoDuCuoi[m-1] + ThuDuKien[m] − ChiDuKien[m]`
   (tháng đầu lấy số dư hiện tại làm `SoDuCuoi[m-1]`). Mục tiêu: phát hiện **tháng âm tiền (cash gap)** trước khi xảy ra.

5. **GIỮ LẠI BẢO HÀNH (5%) — DỄ QUÊN:** ngay khi tạo dự án trong `DM_DuAn`, tạo luôn 1 dòng `KeHoach` loại Thu cho khoản giữ lại, `NgayDenHan` = hết thời gian bảo hành. Hàm `Setup`/`Planning` nên nhắc/tự sinh dòng này.

6. **Đặc thù dòng tiền xây dựng:** chi trước (vật tư/nhân công/thầu phụ) — thu sau theo đợt nghiệm thu (vd 30/60/10) + tạm ứng đầu kỳ. Mọi đợt thanh toán hợp đồng phải có 1 dòng `KeHoach` riêng.

---

## 6. Quy ước code (Apps Script)

- **Runtime:** V8. Dùng `const`/`let`, arrow function, template literal.
- **Sinh ID:** `Utilities.getUuid()` cho mọi `Ma*`. KHÔNG tự tăng số theo hàng (tránh lỗi khi xóa dòng).
- **Truy cập sheet:** luôn qua helper `getSheet_(name)` trong `Utils.gs`; KHÔNG hard-code `getSheetByName` rải rác.
- **Tên cột:** đọc header động (map tên→index) thay vì hard-code chỉ số cột → an toàn khi chèn cột.
- **Hiệu năng:** đọc/ghi theo batch (`getValues()`/`setValues()`), KHÔNG lặp `getRange` từng ô.
- **Tiền VND:** số nguyên (đồng), không thập phân; format hiển thị `#,##0 "₫"` qua `formatVND_()`.
- **Ngày:** timezone `Asia/Ho_Chi_Minh`; lưu kiểu Date, hiển thị `dd/MM/yyyy`.
- **Ngôn ngữ:** label UI và comment bằng tiếng Việt; tên hàm/biến tiếng Anh (camelCase), hằng số `UPPER_SNAKE`.
- **Lỗi:** bọc try/catch ở entry-point (form submit, trigger); log bằng `console.error`; báo người dùng bằng `SpreadsheetApp.getUi().alert` hoặc toast.

---

## 7. Hằng số (đặt trong `Config.gs`)

```javascript
const CONFIG = {
  TIMEZONE: 'Asia/Ho_Chi_Minh',
  VAT_DEFAULT: 8,                 // % — chuẩn LAVIPCO
  GIU_LAI_BAO_HANH: 5,            // %
  SHEETS: {
    DM_DUAN: 'DM_DuAn', DM_DOITAC: 'DM_DoiTac', DM_HANGMUC: 'DM_HangMuc',
    DM_TAIKHOAN: 'DM_TaiKhoan', KEHOACH: 'KeHoach', GIAODICH: 'GiaoDich',
    DASHBOARD: 'Dashboard', FORECAST: 'Forecast'
  },
  TAI_KHOAN: [
    { ten: 'ACB',        soTK: '96968686868'   },
    { ten: 'Sacombank',  soTK: '060267594433'  },
    { ten: 'Tiền mặt',   soTK: ''              }
  ],
  FORECAST_THANG: 6,              // số tháng dự báo
  ZALO_WEBHOOK: ''                // điền sau, không commit secret thật
};
```
> **KHÔNG commit** token/secret Zalo vào repo. Dùng `PropertiesService.getScriptProperties()`.

---

## 8. Lệnh thường dùng

```bash
clasp login                 # đăng nhập (1 lần) — tài khoản maivulam2020@gmail.com
clasp pull                  # kéo code từ Google về local
clasp push                  # đẩy code local lên Apps Script
clasp open                  # mở editor trên web
clasp run setup             # (nếu bật API) chạy hàm khởi tạo sheet
```
> `executeAs: USER_DEPLOYING` → chỉ tài khoản deploy cần cấp quyền OAuth.

---

## 9. Quy ước LAVIPCO (khi xuất tài liệu từ app)

- Font tài liệu pháp lý/báo cáo: **Times New Roman** (TIMES.TTF…).
- VAT 8% · A4, lề 2-2-2-3cm · Giám đốc: Nguyễn Kim Thúy Quỳnh.
- Định dạng số tiền tiếng Việt; tên file: tăng version (v1.0, v1.1…) và **kèm đuôi kép** khi xuất (vd `BaoCao_v1.0.pdf.pdf`) để giao diện giữ đúng extension khi tải.

---

## 10. Phân quyền & bảo mật

- Admin + kế toán: quyền chỉnh sửa.
- Giám đốc: chỉ xem — protect các sheet dữ liệu, chia sẻ riêng tab `Dashboard` view-only.
- Bảo vệ sheet công thức (`Dashboard`, `Forecast`) khỏi sửa tay.

---

## 11. Gotchas (lưu ý hay sai)

- ❌ Quên khớp `KeHoach↔GiaoDich` → forecast & công nợ sai. Form phải xử lý rõ ràng.
- ❌ Quên ghi nhận khoản **giữ lại bảo hành** → thiếu khoản thu tương lai.
- ❌ Lẫn lộn cash-basis (app) với accrual (MISA) → đừng ép khớp số.
- ❌ Hard-code chỉ số cột → vỡ khi chèn cột. Luôn map theo tên header.
- ❌ Lặp `getRange` từng ô → chậm. Dùng batch.

---

## 12. Roadmap

- **v1:** 8 sheet + form nhập + forecast + dashboard + cảnh báo Zalo (đang làm).
- **v1.x:** import sao kê ngân hàng / export báo cáo dòng tiền theo từng dự án.
- **v2:** migrate Next.js + Supabase khi dữ liệu/người dùng tăng.
