# Frontend — Web Designer Tool

Web app cho designer tạo và quản lý project AR: upload trigger image, upload asset (model 3D/ảnh/video), định vị asset, publish cho mobile app quét.

## Stack

- **React** + **TypeScript** + **Vite**
- **Tailwind CSS**

## Cài đặt

```bash
cd frontend
cp .env.example .env   # sửa VITE_API_URL nếu backend không chạy ở localhost:3000
pnpm install
pnpm dev
```

Chạy từ root cũng được (workspace):
```bash
pnpm --filter frontend dev
```

## Biến môi trường (`.env`)

| Biến | Mô tả |
|---|---|
| `VITE_API_URL` | URL backend. Local dev mặc định `http://localhost:3000` (không set cũng được). Khi deploy, set trỏ tới backend đã deploy (Render/Railway...) |

## Cấu trúc chính (`src/pages/ProjectEditor/`)

| File/Folder | Vai trò |
|---|---|
| `ProjectEditor.tsx` | Trang chính, gộp toàn bộ state + gọi API |
| `hooks/useProjectData.ts` | Fetch project/asset, publish/unpublish |
| `components/EditorHeader.tsx` | Tên project, badge status, nút Publish/Unpublish |
| `components/AssetSidebar/TriggerImagePanel.tsx` | Upload/xoá trigger image |
| `components/AssetSidebar/` | Danh sách asset, upload asset mới |
| `components/InspectorSidebar/` | Chỉnh position/rotation/scale của asset đang chọn |
| `components/ArViewport/` | Xem trước project trong editor |

## Quy ước quan trọng: position/scale là số TƯƠNG ĐỐI

Trên `InspectorSidebar`, các trường Position/Scale **không phải mét thật** — là tỉ lệ theo chiều rộng trigger image:

- `scale = 1` → asset hiển thị đúng bằng 100% chiều rộng ảnh trigger
- `scale = 0.5` → bằng 50%
- `position.x = 0` → nằm giữa tâm ảnh trigger; `position.x = 0.3` → lệch phải 30% chiều rộng ảnh

**Lý do:** không bắt designer phải đo kích thước thật của trigger image ngoài đời (in ra to/nhỏ tuỳ nơi dán) — mobile app coi trigger image luôn là "1 đơn vị chiều rộng chuẩn", nên overlay luôn hiện đúng tỉ lệ trên camera dù ảnh in ra ở kích thước bất kỳ (giống cách Artivive/MindAR hoạt động). Xem thêm ở `mobile/README.md`.

## Định dạng asset hỗ trợ

| Loại | Đuôi file | Hiển thị trên mobile |
|---|---|---|
| Model 3D | `.glb`, `.gltf`, `.obj`, `.vrx` | Vật thể 3D |
| Ảnh | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` | Ảnh phẳng dán trong không gian AR |
| Video | `.mp4`, `.mov`, `.m4v` | Video tự phát, lặp lại |

## Publish

Nút Publish ở `EditorHeader` gọi `POST /projects/:id/publish` — backend sẽ từ chối nếu project chưa có trigger image hoặc chưa có asset nào, kèm thông báo rõ đang thiếu gì.