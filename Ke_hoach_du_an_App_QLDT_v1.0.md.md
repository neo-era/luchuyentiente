# KẾ HOẠCH DỰ ÁN — ỨNG DỤNG QUẢN LÝ DÒNG TIỀN LAVIPCO

**Tên dự án:** Web app Quản lý dòng tiền (QLDT) — host trên GitHub Pages, dữ liệu trên Google Sheet
**Đơn vị:** CÔNG TY TNHH KỸ NGHỆ LÂM VIỆT PHÁT (LAVIPCO)
**Phiên bản kế hoạch:** v1.0
**Ngày lập:** 08/06/2026

---

## 1. Tổng quan dự án

### 1.1. Mục tiêu
Xây dựng ứng dụng web nội bộ cho phép nhiều người nhập/quản lý giao dịch thu–chi và xem báo cáo dòng tiền, với phân quyền theo vai trò. Giao diện host miễn phí trên GitHub Pages; dữ liệu lưu và xử lý trên Google Sheet thông qua Google Apps Script đóng vai backend.

### 1.2. Kiến trúc tổng thể
- **Frontend:** Vite + React + HashRouter, host trên GitHub Pages (tĩnh).
- **Backend (API + bảo mật + logic):** Google Apps Script Web App (`doGet`/`doPost`), deploy "Execute as: Me" + "Access: Anyone".
- **Cơ sở dữ liệu:** Google Sheet (chỉ tài khoản chủ sở hữu chạm vào; Apps Script là người gác cổng).
- **Xác thực:** Đăng nhập Google (Google Identity Services) → ID token → Apps Script xác minh → phân quyền theo email.

### 1.3. Phạm vi (In scope)
- Nhập, sửa, hủy giao dịch thu/chi (hủy = đánh dấu trạng thái, không xóa cứng).
- Phân quyền 3 vai trò: Admin / Nhập liệu / Chỉ xem.
- Dashboard: số dư từng tài khoản–quỹ, dòng tiền theo tháng, theo dự án, theo danh mục.
- Nhật ký thao tác (Log) phục vụ truy vết và đối soát.
- Quản lý danh mục thu/chi, tài khoản–quỹ, người dùng (vai trò Admin).
- Xuất báo cáo Excel/CSV.

### 1.4. Ngoài phạm vi v1 (Out of scope)
- Đồng bộ tự động với sao kê ngân hàng (đối soát thủ công ở v1).
- Lập kế hoạch ngân sách/dự báo dòng tiền (để roadmap).
- App mobile native (web responsive là đủ ở v1).
- Tích hợp hóa đơn MISA AMIS (để roadmap).

### 1.5. Bảng tóm tắt giai đoạn

| GĐ | Tên giai đoạn | Mục tiêu chính | Thời lượng* | Sản phẩm bàn giao |
|----|---------------|----------------|-------------|-------------------|
| 0 | Chuẩn bị & Thiết kế | Chốt nghiệp vụ, dữ liệu, API, tài khoản | 1–2 ngày | Tài liệu thiết kế, repo, GCP project |
| 1 | Hạ tầng dữ liệu | Dựng Google Sheet + dữ liệu khởi tạo | 0.5–1 ngày | Sheet hoàn chỉnh có dữ liệu mẫu |
| 2 | Backend (Apps Script + Auth) | API + xác thực + phân quyền + log | 3–5 ngày | Web App đã deploy, test pass |
| 3 | Frontend (Vite + React) | Giao diện đăng nhập, nhập liệu, danh sách | 4–6 ngày | App chạy local, gọi API thành công |
| 4 | Báo cáo & Dashboard | Số dư, dòng tiền, biểu đồ, xuất Excel | 2–3 ngày | Dashboard hoàn chỉnh |
| 5 | Kiểm thử & Bảo mật | Test phân quyền, đồng thời, bảo mật, UAT | 2–3 ngày | Báo cáo test, danh sách lỗi đã fix |
| 6 | Triển khai & Vận hành | Deploy GitHub Pages, đào tạo, backup | 1–2 ngày | App live + tài liệu hướng dẫn |

*Ước lượng cho 1 người làm bán thời gian (song song công việc khác). Tổng ~14–22 ngày công.*

---

## 2. GIAI ĐOẠN 0 — CHUẨN BỊ & THIẾT KẾ

**Mục tiêu:** Chốt toàn bộ yêu cầu và thiết kế trước khi viết code, tránh phải làm lại.

### Việc cần làm
- [ ] Liệt kê & chốt danh mục thu (vd: thu hợp đồng, tạm ứng, thu khác) và danh mục chi (vd: vật tư, nhân công, thầu phụ, vận hành, thuế…).
- [ ] Liệt kê & chốt danh sách tài khoản–quỹ: Quỹ tiền mặt, STK ACB (96968686868), STK Sacombank (060267594433).
- [ ] Chốt 3 vai trò và quyền chi tiết (xem Bảng quyền bên dưới).
- [ ] Chốt các báo cáo cần có ở v1 (số dư, dòng tiền theo tháng, theo dự án, theo danh mục).
- [ ] Thiết kế cấu trúc dữ liệu Google Sheet (tên sheet + tên cột).
- [ ] Thiết kế danh sách API (endpoint, tham số, dữ liệu trả về).
- [ ] Phác thảo nhanh (wireframe) các màn hình chính.
- [ ] Tạo Google Cloud project + cấu hình OAuth Consent Screen (Internal nếu dùng Google Workspace, hoặc External).
- [ ] Tạo OAuth Client ID (loại Web) — ghi lại Client ID, khai báo Authorized JavaScript origins (URL GitHub Pages).
- [ ] Tạo GitHub repository cho dự án (private hoặc public tùy nhu cầu).

### Bảng quyền (chốt ở GĐ0)
| Chức năng | Admin | Nhập liệu | Chỉ xem |
|-----------|:-----:|:---------:|:-------:|
| Thêm giao dịch | ✅ | ✅ | ❌ |
| Sửa/hủy giao dịch của mình | ✅ | ✅ | ❌ |
| Sửa/hủy giao dịch của người khác | ✅ | ❌ | ❌ |
| Xem dashboard & báo cáo | ✅ | ✅ | ✅ |
| Quản lý danh mục/tài khoản | ✅ | ❌ | ❌ |
| Quản lý người dùng & vai trò | ✅ | ❌ | ❌ |

### Tiêu chí hoàn thành (DoD)
Có tài liệu thiết kế gồm: cấu trúc Sheet, danh sách API, bảng quyền; đã tạo xong GCP project + OAuth Client ID + GitHub repo.

---

## 3. GIAI ĐOẠN 1 — HẠ TẦNG DỮ LIỆU (GOOGLE SHEET)

**Mục tiêu:** Dựng Google Sheet làm database với cấu trúc chuẩn và dữ liệu khởi tạo.

### Việc cần làm
- [ ] Tạo Google Sheet mới, đặt tên rõ ràng (vd: `LAVIPCO_QLDT_DB`).
- [ ] Tạo sheet `Giao_dich`: cột `ID | Ngày | Loại (Thu/Chi) | Danh mục | Số tiền | Tài khoản | Dự án | Diễn giải | Người tạo | Thời gian tạo | Trạng thái`.
- [ ] Tạo sheet `Tai_khoan`: `Mã | Tên tài khoản/quỹ | Số dư đầu kỳ | Ghi chú`.
- [ ] Tạo sheet `Danh_muc`: `Mã | Tên danh mục | Loại (Thu/Chi) | Trạng thái`.
- [ ] Tạo sheet `Nguoi_dung`: `Email | Họ tên | Vai trò | Trạng thái`.
- [ ] Tạo sheet `Log`: `Thời gian | Email | Hành động | Đối tượng | Chi tiết`.
- [ ] Nhập dữ liệu khởi tạo: 3 tài khoản–quỹ + số dư đầu kỳ.
- [ ] Nhập danh mục thu/chi chuẩn hóa.
- [ ] Nhập danh sách người dùng đầu tiên (ít nhất 1 Admin là email của anh).
- [ ] Nhập vài giao dịch mẫu để test sau này.

### Tiêu chí hoàn thành (DoD)
Sheet đầy đủ 5 tab, đúng cấu trúc cột, có dữ liệu khởi tạo cho tài khoản/danh mục/người dùng.

---

## 4. GIAI ĐOẠN 2 — BACKEND (APPS SCRIPT WEB APP + AUTH)

**Mục tiêu:** Xây API có xác thực và phân quyền, đọc/ghi Sheet an toàn.

### Việc cần làm
- [ ] Mở trình quản lý Apps Script gắn với Sheet (Extensions → Apps Script).
- [ ] Dựng khung `Code.gs`: router cho `doGet`/`doPost`, đọc tham số `action`.
- [ ] Viết hàm trả về JSON qua `ContentService` (xử lý CORS cho fetch từ GitHub Pages).
- [ ] Lớp xác thực: nhận ID token → gọi `tokeninfo` của Google qua `UrlFetchApp` → kiểm tra đúng Client ID + chưa hết hạn → lấy email.
- [ ] Lớp phân quyền: tra email trong `Nguoi_dung` → lấy vai trò → chặn thao tác không đủ quyền.
- [ ] API `themGiaoDich` (có `LockService` + ghi `Log`).
- [ ] API `suaGiaoDich` / `huyGiaoDich` (kiểm tra quyền theo người tạo; hủy = đổi trạng thái).
- [ ] API `layGiaoDich` (lọc theo quyền + bộ lọc ngày/dự án/tài khoản).
- [ ] API `layDanhMuc`, `layTaiKhoan` (dữ liệu cho dropdown).
- [ ] API `layBaoCao` (tính tổng hợp số dư + dòng tiền, trả JSON gọn).
- [ ] API quản trị: `quanLyNguoiDung`, `quanLyDanhMuc`, `quanLyTaiKhoan` (chỉ Admin).
- [ ] Deploy thành Web App ("Execute as: Me", "Access: Anyone"); ghi lại URL.
- [ ] Test toàn bộ API bằng curl/Postman với token thật.

### Tiêu chí hoàn thành (DoD)
Mọi API trả đúng dữ liệu; thao tác sai quyền bị chặn; mỗi lần ghi đều xuất hiện dòng trong `Log`; chạy đồng thời không ghi đè nhau.

---

## 5. GIAI ĐOẠN 3 — FRONTEND (VITE + REACT)

**Mục tiêu:** Giao diện đăng nhập, nhập liệu và danh sách giao dịch, gắn với backend.

### Việc cần làm
- [ ] Khởi tạo dự án Vite + React; cài router (HashRouter) và thư viện gọi API.
- [ ] Tích hợp Google Identity Services: nút "Đăng nhập bằng Google", lấy ID token.
- [ ] Lưu token + thông tin người dùng (in-memory/state), tự đính token vào mỗi request.
- [ ] Lớp gọi API (service) tới Apps Script Web App; xử lý lỗi & CORS.
- [ ] Màn hình **Nhập giao dịch**: form thu/chi (ngày, loại, danh mục, số tiền, tài khoản, dự án, diễn giải) với validate.
- [ ] Màn hình **Danh sách giao dịch**: bảng + bộ lọc (ngày, loại, tài khoản, dự án), sửa/hủy theo quyền.
- [ ] Ẩn/hiện nút và menu theo vai trò (Admin/Nhập liệu/Chỉ xem).
- [ ] Trang **Quản trị** (chỉ Admin): quản lý danh mục, tài khoản, người dùng.
- [ ] Định dạng số tiền kiểu Việt Nam (phân tách hàng nghìn, đơn vị VND).
- [ ] Giao diện responsive để dùng được trên điện thoại.

### Tiêu chí hoàn thành (DoD)
Đăng nhập Google chạy được; nhập một giao dịch và thấy nó xuất hiện trong Sheet + danh sách; UI thay đổi đúng theo vai trò.

---

## 6. GIAI ĐOẠN 4 — BÁO CÁO & DASHBOARD

**Mục tiêu:** Cung cấp bức tranh dòng tiền tổng thể, trực quan.

### Việc cần làm
- [ ] Thẻ tổng quan: số dư hiện tại từng tài khoản–quỹ + tổng cộng.
- [ ] Biểu đồ dòng tiền theo tháng (thu / chi / ròng).
- [ ] Báo cáo theo dự án (tổng thu, tổng chi, lợi nhuận ròng từng dự án).
- [ ] Báo cáo theo danh mục (cơ cấu chi tiêu).
- [ ] Bộ lọc khoảng thời gian cho toàn bộ dashboard.
- [ ] Xuất báo cáo ra Excel/CSV.
- [ ] Kiểm tra số liệu báo cáo khớp với tổng giao dịch trong Sheet.

### Tiêu chí hoàn thành (DoD)
Số dư và dòng tiền hiển thị đúng, khớp khi đối chiếu thủ công với Sheet; xuất file Excel thành công.

---

## 7. GIAI ĐOẠN 5 — KIỂM THỬ & BẢO MẬT

**Mục tiêu:** Đảm bảo đúng, an toàn và sẵn sàng cho người dùng thật.

### Việc cần làm
- [ ] Test từng vai trò: Admin / Nhập liệu / Chỉ xem làm đúng và *không làm được* việc ngoài quyền.
- [ ] Test người dùng ngoài whitelist → bị từ chối.
- [ ] Test ID token hết hạn / giả → bị từ chối.
- [ ] Test đồng thời: nhiều người nhập cùng lúc, không trùng/đè dữ liệu (kiểm tra `LockService`).
- [ ] Rà bảo mật: endpoint công khai có chặn đúng; không lộ thông tin nhạy cảm; không có API key trong code client.
- [ ] Đối soát số liệu: nhập một bộ giao dịch mẫu, so số dư app vs tính tay.
- [ ] Test trên điện thoại + nhiều trình duyệt.
- [ ] UAT: cho 1–2 nhân viên dùng thử, ghi nhận phản hồi và lỗi.
- [ ] Sửa các lỗi phát hiện trong UAT.

### Tiêu chí hoàn thành (DoD)
Bảng test phân quyền pass 100%; không còn lỗi nghiêm trọng (blocker/critical); số liệu đối soát khớp.

---

## 8. GIAI ĐOẠN 6 — TRIỂN KHAI & VẬN HÀNH

**Mục tiêu:** Đưa app lên môi trường thật và bàn giao cho nhóm sử dụng.

### Việc cần làm
- [ ] Build frontend (`vite build`) và cấu hình `base` đúng cho GitHub Pages.
- [ ] Deploy lên GitHub Pages (thủ công hoặc qua GitHub Actions).
- [ ] Cập nhật Authorized JavaScript origins trong OAuth Client ID = URL GitHub Pages thật.
- [ ] Kiểm tra app live: đăng nhập, nhập liệu, báo cáo hoạt động đúng.
- [ ] Viết tài liệu hướng dẫn sử dụng (cho người nhập liệu + cho Admin).
- [ ] Đào tạo nhanh cho nhân viên.
- [ ] Thiết lập backup định kỳ Google Sheet (vd: bản sao theo tháng).
- [ ] Lập kế hoạch bảo trì + ghi nhận yêu cầu mới cho v2.

### Tiêu chí hoàn thành (DoD)
App truy cập được qua URL công khai; nhân viên đăng nhập và sử dụng được; có tài liệu hướng dẫn và cơ chế backup.

---

## 9. Phụ thuộc giữa các giai đoạn

- GĐ1 cần GĐ0 (chốt cấu trúc dữ liệu).
- GĐ2 cần GĐ1 (Sheet đã có) + GĐ0 (OAuth Client ID).
- GĐ3 cần GĐ2 (API đã chạy được) + Client ID.
- GĐ4 cần GĐ2 (API báo cáo) + GĐ3 (khung giao diện).
- GĐ5 cần GĐ3 + GĐ4 hoàn tất.
- GĐ6 cần GĐ5 pass.

---

## 10. Rủi ro & cách giảm thiểu

| Rủi ro | Mức độ | Cách giảm thiểu |
|--------|:------:|-----------------|
| CORS với Apps Script gây lỗi gọi API | Cao | Trả JSON qua `ContentService`, gọi `text/plain` để tránh preflight; test sớm ở GĐ2 |
| Endpoint công khai bị lạm dụng | Cao | Bắt buộc verify ID token + whitelist email; ghi Log mọi thao tác |
| Ghi đè khi nhiều người nhập | TB | `LockService.getScriptLock()` quanh mọi thao tác ghi |
| Vượt quota Apps Script | Thấp | Quy mô nội bộ ít rủi ro; báo cáo tổng hợp ở backend để giảm số request |
| Mất/hỏng dữ liệu Sheet | Cao | Backup định kỳ; hủy mềm (không xóa cứng); Log truy vết |
| Số liệu báo cáo sai | Cao | Đối soát thủ công ở GĐ4 & GĐ5 trước khi go-live |

---

## 11. Mốc quan trọng (Milestones)

1. **M1 — Thiết kế xong** (hết GĐ0): đủ tài liệu để bắt đầu code.
2. **M2 — Backend chạy được** (hết GĐ2): API test pass bằng Postman.
3. **M3 — App chạy local** (hết GĐ3): đăng nhập + nhập liệu thành công.
4. **M4 — Dashboard hoàn chỉnh** (hết GĐ4): báo cáo khớp số liệu.
5. **M5 — Sẵn sàng go-live** (hết GĐ5): UAT pass.
6. **M6 — Go-live** (hết GĐ6): app live, nhân viên sử dụng.

---

## 12. Roadmap mở rộng (sau v1)

- Đối soát bán tự động với sao kê ngân hàng (ACB, Sacombank).
- Lập kế hoạch/dự báo dòng tiền theo dự án.
- Cảnh báo (số dư thấp, chi vượt ngưỡng).
- Tích hợp hóa đơn MISA AMIS.
- Liên kết dữ liệu dự án với hệ thống chiếu sáng/IoT của LAVIPCO.

---

*Tài liệu kế hoạch v1.0 — cập nhật version mỗi lần chỉnh sửa.*
