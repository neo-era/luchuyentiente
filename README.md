# App Quản Lý Dòng Tiền LAVIPCO

Google Sheets + Apps Script. Quản trị dòng tiền theo dự án: thu/chi, công nợ phải thu/phải trả, dự báo dòng tiền (forecast), cảnh báo Zalo. **Không thay MISA** (xem `CLAUDE.md`).

## Cài đặt nhanh

**Cách A — qua clasp (khuyến nghị, dùng Claude Code):**
```bash
npm install -g @google/clasp
clasp login                      # tài khoản maivulam2020@gmail.com
clasp create --type sheets --title "Dòng tiền LAVIPCO"
# clasp tạo .clasp.json mới -> giữ scriptId của nó, hoặc dán scriptId vào file .clasp.json sẵn có
clasp push                       # đẩy toàn bộ code lên
clasp open                       # mở để cấp quyền lần đầu
```

**Cách B — thủ công:** Tạo Google Sheet mới → Extensions > Apps Script → tạo từng file `.gs` và file HTML `Form` (dán nội dung tương ứng), dán `appsscript.json` vào manifest.

## Khởi động

1. Mở Google Sheet → reload trang → xuất hiện menu **💰 Dòng tiền**.
2. **💰 Dòng tiền > Khởi tạo workbook** → tạo 8 sheet + seed tài khoản/hạng mục.
3. Vào `DM_TaiKhoan` điền **số dư đầu kỳ** thật của ACB / Sacombank / tiền mặt.
4. (Thử) **Tạo dữ liệu mẫu (Cầu Cả Cấm)** để xem forecast + dashboard hoạt động; xóa dữ liệu mẫu trước khi dùng thật.
5. Nhập liệu: **💰 Dòng tiền > Nhập giao dịch** (form mobile).

## Cảnh báo Zalo (tùy chọn)

- Project Settings > **Script Properties** > thêm key `ZALO_WEBHOOK` = URL webhook Zalo của anh
  (định dạng payload mặc định là `{ "text": "..." }` — sửa trong `Zalo.gs > guiZalo_` nếu API khác).
- **💰 Dòng tiền > Cài đặt trigger hằng ngày** → gửi cảnh báo 7h sáng mỗi ngày.

## Dùng form trên điện thoại như web app (tùy chọn)

`clasp deploy` (hoặc Deploy > New deployment > Web app), executeAs **USER_DEPLOYING**, access tùy nhu cầu → mở link trên điện thoại để nhập nhanh.

## Cấu trúc

| File | Vai trò |
|---|---|
| `Config.gs` | Hằng số, tên sheet/cột, seed, secret |
| `Utils.gs` | Helper đọc/ghi sheet theo header, ID, định dạng |
| `Setup.gs` | Khởi tạo workbook, menu, seed, dữ liệu mẫu |
| `Transactions.gs` | Giao dịch thật + tính số dư |
| `Planning.gs` | Kế hoạch thu/chi, công nợ, khớp, quá hạn |
| `Forecast.gs` | Dự báo dòng tiền theo tháng |
| `Dashboard.gs` | Bảng tổng quan + biểu đồ |
| `Zalo.gs` | Cảnh báo Zalo |
| `Triggers.gs` | Lập lịch hằng ngày |
| `Form.gs` + `Form.html` | Form nhập liệu mobile |
| `Import.gs` + `Import.html` | Import sao kê ngân hàng (ACB/Sacombank) |
| `ProjectReport.gs` | Báo cáo dòng tiền theo từng dự án |
| `OneDrive.gs` | Tích hợp OneDrive qua Microsoft Graph (OAuth) |
| `HoSo.gs` + `HoSo.html` | Lưu trữ hồ sơ dự án (mọi định dạng) |

## Lưu ý

- Số dư app theo **tiền mặt thực thu/thực chi**; đừng ép khớp 1-1 với MISA.
- Khoản **giữ lại bảo hành 5%** được tạo tự động khi gọi `taoGiuLaiBaoHanh` — đừng quên với dự án thật.
- Đối chiếu số dư app với sao kê ngân hàng cuối mỗi tuần trong giai đoạn chạy thử.

## Import sao kê ngân hàng

**💰 Dòng tiền > Import sao kê ngân hàng**. Mở file sao kê ACB/Sacombank trong Excel, copy các dòng (gồm hàng tiêu đề), dán vào ô → **Xem trước** (tự nhận diện cột Ngày, Ghi nợ/Ghi có hoặc Số tiền, Nội dung; đánh dấu dòng trùng) → chọn tài khoản → **Xác nhận import**. Chống trùng theo ngày + số tiền + nội dung nên import lại nhiều lần vẫn an toàn. Nếu cột không nhận diện được, đổi tên header cho có chữ "Ngày", "Ghi có"/"Ghi nợ" (hoặc "Số tiền"), "Nội dung".

## Báo cáo dòng tiền theo dự án

**💰 Dòng tiền > Báo cáo dòng tiền theo dự án** → sheet `BaoCao_DuAn`: mỗi dự án có thu/chi thực tế, dòng tiền ròng, công nợ còn phải thu/phải trả, dự kiến ròng, % đã thu; kèm bảng chi theo loại (vật tư/nhân công/thầu phụ/quản lý/thuế) và biểu đồ ròng theo dự án.

## Lưu trữ hồ sơ dự án trên OneDrive

App tạo thư mục riêng cho mỗi dự án trong `OneDrive/HoSo_LAVIPCO/<Tên dự án>`, lưu mọi định dạng file và ghi metadata + link vào sheet `HoSo`.

**Cấu hình một lần (cần quyền Azure):**
1. https://portal.azure.com → **App registrations** → **New registration**.
2. Lấy Redirect URI: trong Apps Script chạy hàm `redirectUri()` → xem Log → dán vào Azure (Authentication > Web > Redirect URIs).
3. **Certificates & secrets** → tạo client secret → copy.
4. **API permissions** → Microsoft Graph → Delegated: `Files.ReadWrite`, `User.Read`, `offline_access` → Grant admin consent (nếu là OneDrive công ty).
5. Apps Script: **Project Settings > Script Properties** thêm `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, và `MS_TENANT` (Tenant ID nếu là OneDrive for Business; để trống = `common`).
6. **💰 Dòng tiền > Kết nối OneDrive** → đăng nhập Microsoft → cấp quyền.

**Dùng:** **💰 Dòng tiền > Hồ sơ dự án (OneDrive)** → chọn dự án + loại hồ sơ → chọn file (nhiều file, mọi định dạng) → **Tải lên OneDrive**. File rất lớn (CAD, scan A3…): thả thẳng vào thư mục OneDrive của dự án rồi bấm **Đồng bộ từ OneDrive** để nạp vào registry (chống trùng theo ItemId).

> OneDrive for Business dùng thư viện tài liệu SharePoint: đổi đường dẫn `/me/drive/...` trong `OneDrive.gs` sang `/sites/{site-id}/drive/...` hoặc `/drives/{drive-id}/...`.
