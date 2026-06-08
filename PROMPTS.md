# PROMPTS.md — Bộ prompt dựng App Quản Lý Dòng Tiền LAVIPCO

> **Phiên bản:** 1.0 · **Dùng với:** Claude Code + clasp
> Chạy **tuần tự** từ Prompt 1 → 17. Mỗi prompt là 1 việc độc lập.
> **Quy tắc:** sau mỗi prompt, kiểm tra mục "✅ Kiểm tra" rồi `clasp push` chạy thử; đạt mới sang prompt tiếp theo.
> Mọi prompt đều ngầm định: *tuân thủ quy ước trong `CLAUDE.md`* (đọc kỹ §5 logic nghiệp vụ, §6 quy ước code, §7 hằng số, §11 gotchas).

---

## Giai đoạn A — Khởi tạo & nền tảng

### Prompt 1 — Scaffold project
**File:** `appsscript.json`, cấu trúc thư mục
```
Đọc CLAUDE.md để nắm dự án. Tạo scaffold cho một Google Apps Script project quản lý
bằng clasp:
- Tạo manifest appsscript.json: runtime V8, timeZone "Asia/Ho_Chi_Minh", exceptionLogging
  "STACKDRIVER", oauthScopes cần cho SpreadsheetApp + UrlFetchApp (gọi Zalo) +
  ScriptApp (tạo trigger) + Properties.
- Tạo thư mục ui/ (chứa file .html sau này).
- Tạo các file rỗng có comment header mô tả vai trò: Config.gs, Utils.gs, Setup.gs,
  Transactions.gs, Planning.gs, Forecast.gs, Dashboard.gs, Triggers.gs, Zalo.gs.
Chưa cần logic, chỉ scaffold + comment.
```
**✅ Kiểm tra:** `clasp push` không lỗi; mở editor thấy đủ file + manifest đúng timezone.

---

### Prompt 2 — Config.gs (hằng số)
**File:** `Config.gs`
```
Tạo Config.gs theo §7 của CLAUDE.md: một object CONFIG chứa TIMEZONE, VAT_DEFAULT (8),
GIU_LAI_BAO_HANH (5), object SHEETS (tên 8 sheet), mảng TAI_KHOAN seed (ACB 96968686868,
Sacombank 060267594433, Tiền mặt), FORECAST_THANG (6).
Thêm hàm getScriptProp_(key) và setScriptProp_(key,val) dùng PropertiesService để lưu
secret (vd token Zalo) — KHÔNG hard-code secret trong file.
Định nghĩa thêm object COLS: map tên cột (mảng header) cho từng sheet để các module khác
tham chiếu thống nhất.
```
**✅ Kiểm tra:** COLS có đủ header cho cả 8 sheet, khớp đúng schema §4 CLAUDE.md.

---

### Prompt 3 — Utils.gs (helper dùng chung)
**File:** `Utils.gs`
```
Tạo Utils.gs với các helper (theo §6 CLAUDE.md):
- getSheet_(name): trả sheet theo tên, tạo nếu chưa có.
- genId_(): bọc Utilities.getUuid().
- formatVND_(n): số nguyên đồng, format #,##0 ₫.
- toDate_(v) / fmtDate_(d): xử lý ngày theo timezone, hiển thị dd/MM/yyyy.
- headerMap_(sheet): đọc hàng 1, trả object {tênCột: chỉ_số_0_based} để KHÔNG hard-code
  chỉ số cột.
- readRows_(sheetName): trả mảng object {tênCột: giá_trị} cho toàn bộ data (batch getValues).
- appendRow_(sheetName, objRecord): ghi 1 dòng theo header map.
- updateRowById_(sheetName, idCol, idVal, patchObj): cập nhật dòng theo mã.
Tất cả đọc/ghi theo BATCH, bọc lỗi hợp lý.
```
**✅ Kiểm tra:** Viết hàm test nhỏ ghi/đọc 1 dòng thử trên sheet tạm → đúng dữ liệu.

---

## Giai đoạn B — Khởi tạo bảng tính

### Prompt 4 — Setup.gs (tạo 8 sheet)
**File:** `Setup.gs`
```
Tạo Setup.gs với hàm setup() khởi tạo toàn bộ workbook theo §4 CLAUDE.md:
- Tạo đủ 8 sheet (tên lấy từ CONFIG.SHEETS) với header đúng schema từng sheet (lấy từ
  CONFIG.COLS), bôi đậm + freeze hàng 1.
- Định dạng cột số tiền dạng #,##0 ₫; cột ngày dd/MM/yyyy.
- Tạo named range cho các vùng tra cứu (danh sách MaDuAn, MaDoiTac, MaHangMuc, MaTK) để
  dùng cho data validation dropdown.
- Seed DM_TaiKhoan từ CONFIG.TAI_KHOAN (SoDuDauKy = 0).
- Seed DM_HangMuc mẫu: Thu (Tạm ứng HĐ, Thanh toán đợt, Giữ lại bảo hành); Chi (Vật tư,
  Nhân công, Thầu phụ, Chi phí quản lý, Thuế).
- Hàm idempotent: chạy lại không tạo trùng sheet, không xóa dữ liệu đã có.
```
**✅ Kiểm tra:** Chạy `setup()` → đủ 8 sheet, header đúng, DM_TaiKhoan + DM_HangMuc có seed; chạy lần 2 không nhân đôi.

---

### Prompt 5 — Menu tùy chỉnh (onOpen)
**File:** `Setup.gs` (bổ sung) hoặc `Menu.gs`
```
Thêm onOpen() tạo menu tùy chỉnh "💰 Dòng tiền" trên thanh menu Google Sheets với các mục:
- Khởi tạo workbook (gọi setup)
- Nhập giao dịch (mở form HTML — đấu nối ở Prompt 12)
- Cập nhật Forecast
- Cập nhật Dashboard
- Cập nhật trạng thái quá hạn
- Cài đặt trigger hằng ngày
Mục nào chưa có hàm thì để placeholder hiện toast "Đang phát triển".
```
**✅ Kiểm tra:** Mở lại sheet thấy menu "💰 Dòng tiền" đủ mục.

---

## Giai đoạn C — Nghiệp vụ lõi

### Prompt 6 — Transactions.gs (giao dịch thật)
**File:** `Transactions.gs`
```
Tạo Transactions.gs xử lý sheet GiaoDich (§4 CLAUDE.md):
- themGiaoDich(obj): validate (số tiền > 0, Loai ∈ {Thu,Chi}, MaTK/MaHangMuc tồn tại),
  tự sinh MaGD bằng genId_, set NgayNhap/NguoiNhap (Session.getActiveUser().getEmail()),
  ghi vào GiaoDich. Nếu obj có MaKH thì gọi khopKeHoach_ (Prompt 8).
- danhSachGiaoDich(filter): trả mảng theo bộ lọc (dự án, khoảng ngày, loại).
- xoaGiaoDich(MaGD): nếu giao dịch đang khớp 1 KeHoach thì revert KeHoach về ChuaToiHan.
Đọc/ghi batch, bọc lỗi.
```
**✅ Kiểm tra:** Thêm 1 thu + 1 chi → đúng dòng; xóa giao dịch có khớp → kế hoạch trở lại chưa thực hiện.

---

### Prompt 7 — Planning.gs (kế hoạch thu/chi + giữ lại bảo hành)
**File:** `Planning.gs`
```
Tạo Planning.gs xử lý sheet KeHoach (§4, §5 CLAUDE.md):
- themKeHoach(obj): sinh MaKH, mặc định TrangThai=ChuaToiHan.
- taoLichThanhToanHopDong(maDuAn, mang_dot): tạo nhiều dòng KeHoach loại Thu cho các đợt
  (vd [{dienGiai:"Tạm ứng 30%", soTien, ngayDenHan}, ...]).
- taoGiuLaiBaoHanh(maDuAn, ngayHetBaoHanh): TỰ ĐỘNG tạo 1 dòng KeHoach Thu cho khoản giữ
  lại = GiaTriSauVAT * PhanTramGiuLai/100 (gotcha §11 — dễ quên). Gọi hàm này ngay khi
  thêm dự án mới.
- congNo(loai): trả danh sách KeHoach loại Thu/Chi chưa thực hiện (AR/AP).
```
**✅ Kiểm tra:** Tạo dự án + gọi `taoGiuLaiBaoHanh` → có dòng giữ lại đúng 5% giá trị sau VAT.

---

### Prompt 8 — Khớp KeHoach ↔ GiaoDich
**File:** `Planning.gs` (bổ sung)
```
Bổ sung vào Planning.gs (§5.1 CLAUDE.md):
- khopKeHoach_(maKH, maGD): set KeHoach.TrangThai=DaThucHien, KeHoach.MaGD_Khop=maGD.
- huyKhop_(maKH): revert về ChuaToiHan, xóa MaGD_Khop (dùng khi xóa giao dịch).
- capNhatQuaHan(): với mọi KeHoach chưa thực hiện, nếu NgayDenHan < hôm nay → QuaHan,
  ngược lại ChuaToiHan. Trả số dòng vừa đổi.
Đảm bảo themGiaoDich (Prompt 6) gọi đúng khopKeHoach_ khi có MaKH.
```
**✅ Kiểm tra:** Nhập giao dịch gắn 1 kế hoạch → kế hoạch chuyển "Đã thực hiện"; chạy `capNhatQuaHan` với khoản hết hạn → thành "Quá hạn".

---

### Prompt 9 — Forecast.gs (dự báo dòng tiền)
**File:** `Forecast.gs`
```
Tạo Forecast.gs (§5.4 CLAUDE.md):
- capNhatForecast(): tính bảng dòng tiền CONFIG.FORECAST_THANG tháng tới, ghi ra sheet
  Forecast. Mỗi tháng: SoDuDau, ThuDuKien (tổng KeHoach Thu chưa thực hiện đến hạn trong
  tháng), ChiDuKien (tương tự loại Chi), SoDuCuoi = SoDuDau + Thu - Chi (lũy kế).
  SoDuDau tháng đầu = tổng số dư hiện tại tất cả tài khoản.
- Tô đỏ ô SoDuCuoi nếu < 0 (cảnh báo cash gap).
Số dư hiện tại = SoDuDauKy + tổng Thu - tổng Chi (từ GiaoDich), gom theo tài khoản.
```
**✅ Kiểm tra:** Tạo vài kế hoạch tương lai → bảng Forecast 6 tháng đúng phép cộng lũy kế; tháng âm bị tô đỏ.

---

### Prompt 10 — Dashboard.gs
**File:** `Dashboard.gs`
```
Tạo Dashboard.gs với capNhatDashboard() ghi ra sheet Dashboard (§4):
- Số dư hiện tại từng tài khoản + tổng.
- Tổng phải thu / phải trả (từ congNo).
- Công nợ QUÁ HẠN (phải thu & phải trả) — liệt kê chi tiết dòng.
- Bảng dòng tiền thực tế 12 tháng gần nhất (Thu/Chi/Ròng theo tháng từ GiaoDich).
- Chèn 1 biểu đồ cột Thu vs Chi theo tháng.
Bố cục gọn, có tiêu đề mục, định dạng tiền VND.
```
**✅ Kiểm tra:** Chạy `capNhatDashboard` → số dư khớp tay tính, có biểu đồ, công nợ quá hạn hiển thị đúng.

---

## Giai đoạn D — Form nhập liệu trên mobile

### Prompt 11 — Form.html (giao diện)
**File:** `ui/Form.html`
```
Tạo ui/Form.html — form nhập giao dịch tối ưu cho điện thoại (responsive, nút lớn):
- Trường: Ngày (mặc định hôm nay), Loại (Thu/Chi), Số tiền, Tài khoản (dropdown),
  Hạng mục (dropdown lọc theo Loại), Dự án (dropdown), Đối tác (dropdown), Diễn giải,
  và "Khớp kế hoạch" (dropdown các KeHoach chưa thực hiện của dự án đó — có thể bỏ trống).
- Validate phía client: số tiền > 0, trường bắt buộc.
- Khi submit gọi google.script.run.luuGiaoDichTuForm(data); hiện trạng thái thành công/lỗi,
  reset form. KHÔNG dùng thẻ <form> submit truyền thống.
Style sạch, tiếng Việt, dùng được offline-friendly (CSS inline).
```
**✅ Kiểm tra:** Mở preview HTML, các dropdown render, validate chặn số tiền ≤ 0.

---

### Prompt 12 — Đấu nối form với backend
**File:** `Transactions.gs` / `Setup.gs`
```
Đấu nối Form.html với Apps Script:
- moFormNhap(): mở Form.html bằng SpreadsheetApp.getUi().showModalDialog (và đấu vào menu
  "Nhập giao dịch" ở Prompt 5).
- getFormData(): trả về JSON cho client gồm danh sách tài khoản, hạng mục (kèm Nhom),
  dự án, đối tác, và kế hoạch chưa thực hiện — để đổ dropdown.
- luuGiaoDichTuForm(data): gọi themGiaoDich; trả {ok, message}. Nếu có khớp kế hoạch thì
  chuyển trạng thái (Prompt 8). Sau khi lưu, gọi capNhatDashboard + capNhatForecast.
```
**✅ Kiểm tra:** Từ menu mở form trên mobile → nhập 1 giao dịch thật → ghi đúng + dashboard tự cập nhật.

---

## Giai đoạn E — Tự động hóa & cảnh báo

### Prompt 13 — Zalo.gs (cảnh báo)
**File:** `Zalo.gs`
```
Tạo Zalo.gs gửi cảnh báo (tái dùng pattern UrlFetchApp như MuasamcongBot):
- guiZalo_(noiDung): POST tới webhook lấy từ getScriptProp_('ZALO_WEBHOOK'); bọc lỗi,
  log nếu webhook trống (không crash).
- soanCanhBaoDongTien(): tạo nội dung gồm (1) khoản phải thu/chi ĐẾN HẠN trong 7 ngày tới,
  (2) khoản QUÁ HẠN, (3) cảnh báo tháng nào trong forecast bị âm tiền. Định dạng tiền VND,
  tiếng Việt, ngắn gọn.
- canhBaoHangNgay(): gọi capNhatQuaHan → soanCanhBaoDongTien → guiZalo_.
KHÔNG commit token; đọc từ Script Properties.
```
**✅ Kiểm tra:** Đặt webhook test, chạy `canhBaoHangNgay` → nhận tin nhắn đúng nội dung.

---

### Prompt 14 — Triggers.gs (lập lịch)
**File:** `Triggers.gs`
```
Tạo Triggers.gs:
- caiTrigger(): xóa trigger cũ trùng tên rồi tạo time-driven trigger chạy canhBaoHangNgay
  mỗi sáng ~7h (Asia/Ho_Chi_Minh). Idempotent.
- goTrigger(): xóa toàn bộ trigger của script.
Đấu caiTrigger vào menu "Cài đặt trigger hằng ngày" (Prompt 5).
```
**✅ Kiểm tra:** Chạy `caiTrigger` → trong Triggers của project có đúng 1 trigger 7h sáng; chạy lại không nhân đôi.

---

## Giai đoạn F — Dữ liệu thật & hoàn thiện

### Prompt 15 — Seed dự án mẫu (Cầu Cả Cấm) + test end-to-end
**File:** `Setup.gs` (bổ sung) / hàm test
```
Tạo seedDuAnMau() tạo dữ liệu thử cho hợp đồng Cầu Cả Cấm (0511/2026/HĐTC-LVP,
LAVIPCO là nhà thầu): thêm dự án vào DM_DuAn (giá trị giả định, VAT 8%, giữ lại 5%),
tạo lịch thanh toán đợt 30/60/10 bằng taoLichThanhToanHopDong, tạo khoản giữ lại bảo hành.
Thêm 2-3 giao dịch chi vật tư/nhân công mẫu. Sau đó chạy capNhatForecast + capNhatDashboard.
Viết ghi chú hướng dẫn xóa dữ liệu mẫu khi vào thật.
```
**✅ Kiểm tra:** Chạy seed → Forecast thể hiện đúng "chi trước thu sau" (vài tháng đầu âm rồi dương khi tới đợt thu); Dashboard hiển thị công nợ phải thu.

---

### Prompt 16 — Đối chiếu & chốt
**File:** —
```
Rà soát toàn bộ project theo CLAUDE.md:
- Kiểm tra mọi truy cập cột đều qua headerMap_/COLS (không hard-code chỉ số).
- Kiểm tra mọi đọc/ghi sheet theo batch.
- Kiểm tra số dư hiện tại = SoDuDauKy + Thu - Chi khớp với cộng tay.
- Liệt kê các điểm chưa khớp gotcha §11 và sửa.
Xuất 1 file CHECKLIST.md liệt kê hạng mục đã hoàn thành.
```
**✅ Kiểm tra:** CHECKLIST.md đầy đủ; không còn hard-code chỉ số cột.

---

### Prompt 17 — (Tùy chọn) Deploy web app & phân quyền
**File:** `Setup.gs`
```
Nếu muốn dùng form ngoài Google Sheets (mở link trên điện thoại):
- Thêm doGet() trả Form.html qua HtmlService (cho phép dùng như web app).
- Hướng dẫn deploy: clasp deploy, executeAs USER_DEPLOYING (chỉ tài khoản deploy cần cấp
  quyền), access chỉ người trong tổ chức.
- Ghi chú phân quyền §10: kế toán + admin edit, giám đốc chỉ xem tab Dashboard.
```
**✅ Kiểm tra:** Mở link web app trên điện thoại → nhập được giao dịch.

---

## Phụ lục — Thứ tự build & phụ thuộc

```
A. Nền tảng:   1 → 2 → 3
B. Bảng tính:  4 → 5
C. Nghiệp vụ:  6 → 7 → 8 → 9 → 10
D. Form:       11 → 12
E. Tự động:    13 → 14
F. Hoàn thiện: 15 → 16 → (17)
```
Sau mỗi giai đoạn: `clasp push` + chạy thử + commit git.
