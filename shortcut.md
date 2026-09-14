# Phím tắt & chuột — Màn Design (Project Editor)

## 🎥 Điều hướng camera (viewport 3D)

| Input | Chức năng |
|---|---|
| `W` / `A` / `S` / `D` | Bay camera tiến / trái / lùi / phải theo hướng đang nhìn |
| `Space` hoặc `E` | Bay lên |
| `Q` | Bay xuống |
| Giữ `Shift` khi bay | Tăng tốc bay (boost ×2.5) |
| Chuột **phải** – giữ & kéo | Xoay góc nhìn camera |
| Chuột **giữa** – giữ & kéo | Pan (dịch camera ngang/dọc, không xoay) |
| Lăn chuột (scroll) | Zoom tiến/lùi theo hướng đang nhìn |
| `F` | Focus — bay lại gần & nhìn thẳng vào asset đang chọn |

> Chuột trái không còn xoay camera nữa — dành riêng cho chọn/kéo asset (xem bên dưới).
> Right-click không còn mở context menu mặc định của trình duyệt.

## 🧩 Thao tác với asset

| Input | Chức năng |
|---|---|
| Chuột trái – click vào asset | Chọn asset |
| Chuột trái – giữ & kéo trên asset | Di chuyển asset trong không gian (mặt phẳng quay mặt về camera) |
| **Giữ `Shift`** + chuột trái – kéo trên asset | Di chuyển **chỉ theo trục Y** (lên/xuống), khoá X/Z |
| Chuột trái – giữ & kéo chấm vàng (scale-handle) | Scale đều asset (0.1× – 10×) |
| `Delete` | Xoá asset đang chọn (có confirm) |
| `Escape` | Bỏ chọn asset |
| `←` `→` | Nhích vị trí theo trục X — 1%/lần, giữ `Shift` = 5%/lần |
| `↑` `↓` | Nhích vị trí theo trục Z — 1%/lần, giữ `Shift` = 5%/lần |
| `Ctrl`/`Cmd` + `D` | Nhân bản asset đang chọn |
| `Tab` / `Shift` + `Tab` | Chuyển sang asset kế tiếp / trước đó trong danh sách |

> Các phím trên bị bỏ qua khi đang gõ trong 1 ô nhập liệu (input/textarea/rename...) để không phá thao tác gõ chữ/số bình thường.
> `Tab` chỉ hoạt động khi không có phần tử nào khác đang được focus (không phá luồng Tab điều hướng UI thường).

## ✏️ Rename project (header)

| Phím | Chức năng |
|---|---|
| `Enter` | Lưu tên project mới |
| `Escape` | Huỷ, rollback về tên cũ |

## ❌ Chưa có (đề xuất còn chờ duyệt)

- `Ctrl`/`Cmd` + `Z` / `Shift` + `Z` — Undo / Redo transform
- `Ctrl`/`Cmd` + `S` — Save thủ công (hiện đang autosave)