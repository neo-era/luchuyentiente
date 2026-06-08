# CHECKLIST — App Quản Lý Dòng Tiền LAVIPCO
> Kiểm tra theo Prompt 16 · Ngày: 2026-06-08

---

## Giai đoạn A — Nền tảng
- [x] **Prompt 1** — Scaffold: đủ file `.gs`, `appsscript.json` đúng timezone/scopes/runtime
- [x] **Prompt 2** — `Config.gs`: `CONFIG` đủ hằng số, `COLS` khớp schema §4, `getScriptProp_`/`setScriptProp_`
- [x] **Prompt 3** — `Utils.gs`: đủ 8 helper, batch read/write, `testUtils_()` để verify

## Giai đoạn B — Bảng tính
- [x] **Prompt 4** — `Setup.gs`: `setup()` idempotent, 8 sheet + header + định dạng + named ranges
- [x] **Prompt 5** — Menu `onOpen()`: đủ mục, đấu nối đúng hàm

## Giai đoạn C — Nghiệp vụ lõi
- [x] **Prompt 6** — `Transactions.gs`: `themGiaoDich` validate + khớp, `danhSachGiaoDich`, `xoaGiaoDich`, `soDuHienTai_`, `soDuTheoTK_`
- [x] **Prompt 7** — `Planning.gs`: `themKeHoach`, `taoLichThanhToanHopDong`, `taoGiuLaiBaoHanh`, `congNo`
- [x] **Prompt 8** — Khớp: `khopKeHoach_`, `huyKhop_`, `capNhatQuaHan`
- [x] **Prompt 9** — `Forecast.gs`: `capNhatForecast` 6 tháng lũy kế, tô đỏ tháng âm
- [x] **Prompt 10** — `Dashboard.gs`: số dư/công nợ/quá hạn/12 tháng/biểu đồ

## Giai đoạn D — Form mobile
- [x] **Prompt 11** — `Form.html`: responsive, đủ trường, validate client, không dùng `<form>` submit
- [x] **Prompt 12** — `FormServer.gs`: `moFormNhap`, `doGet`, `getFormData`, `luuGiaoDichTuForm`

## Giai đoạn E — Tự động hóa
- [x] **Prompt 13** — `Zalo.gs`: `guiZalo_`, `soanCanhBaoDongTien` (đến hạn / quá hạn / cash gap), `canhBaoHangNgay`
- [x] **Prompt 14** — `Triggers.gs`: `caiTrigger` idempotent 7h sáng, `goTrigger`

## Giai đoạn F — Hoàn thiện
- [x] **Prompt 15** — `seedDuAnMau`: HĐ 0511/2026/HĐTC-LVP, 30/60/10, giữ lại BH, 3 chi mẫu; `xoaDuLieuMau` xóa theo prefix `[MẪU]`
- [x] **Prompt 16** — Audit & checklist (file này)

---

## Kiểm tra kỹ thuật (Prompt 16)

| Tiêu chí | Kết quả |
|---|---|
| Không hard-code chỉ số cột trong nghiệp vụ | ✅ Tất cả dùng `headerMap_` / `CONFIG.COLS` |
| Không dùng `getValue()` đơn lẻ trong vòng lặp | ✅ Toàn bộ batch `getValues()` / `setValues()` |
| Không `getSheetByName` rải rác | ✅ Chỉ qua `getSheet_()` trong `Utils.gs` |
| Số dư = `SoDuDauKy + Thu − Chi` | ✅ `soDuTheoTK_()` trong `Transactions.gs` |
| `soDuHienTai_()` nhất quán (trả số) | ✅ Gọi từ `Forecast.gs` và `Zalo.gs` |
| Secret không hard-code | ✅ Qua `PropertiesService` (`getScriptProp_`) |
| Khớp `KeHoach ↔ GiaoDich` | ✅ `themGiaoDich` tự gọi `khopKeHoach_` khi có `MaKH` |
| Giữ lại bảo hành tự động | ✅ `taoGiuLaiBaoHanh` trong `seedDuAnMau` + `Planning.gs` |

## Gotchas §11 — trạng thái

| Gotcha | Xử lý |
|---|---|
| Quên khớp `KeHoach↔GiaoDich` | ✅ Form bắt chọn kế hoạch; `themGiaoDich` tự khớp |
| Quên giữ lại bảo hành | ✅ `taoGiuLaiBaoHanh` gọi trong seed; cần nhớ gọi khi thêm dự án thật |
| Lẫn cash-basis vs accrual | ✅ App chỉ ghi `GiaoDich` thật; không đồng bộ MISA |
| Hard-code chỉ số cột | ✅ Không còn |
| Lặp `getRange` từng ô | ✅ Không còn |

---

## Việc còn lại trước khi dùng thật

- [ ] Điền `SoDuDauKy` thật cho 3 tài khoản trong sheet `DM_TaiKhoan`
- [ ] Chạy **Xóa dữ liệu mẫu** trước khi nhập số liệu thật
- [ ] Cài webhook Zalo: Script Properties → `ZALO_WEBHOOK`
- [ ] Chạy **Cài đặt trigger hằng ngày** để bật cảnh báo 7h
- [ ] (Tùy chọn) `clasp deploy` để dùng form trên điện thoại qua link web app
- [ ] Phân quyền: giám đốc chỉ xem tab `Dashboard` (protect các sheet còn lại)
