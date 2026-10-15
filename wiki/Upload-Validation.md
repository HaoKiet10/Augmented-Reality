---
title: Upload-Validation
tags: [ar, security]
---

# Upload-Validation

Logic ở `asset-validation.ts` ([[Module-Project]]), áp cho cả [[API-Assets]] và trigger image ([[API-Projects]]).

```mermaid
flowchart TD
    A["POST upload, multipart field file"] --> B{"Multer: file ≤ 5 MB?"}
    B -- "không" --> X1["Từ chối, file quá lớn"]
    B -- "có" --> C["Kiểm tra quyền sở hữu project"]
    C --> D{"Đuôi file trong whitelist?"}
    D -- "không" --> X2["400"]
    D -- "có" --> E{"MIME khớp đuôi?"}
    E -- "không" --> X2
    E -- "có" --> F{"Magic bytes khớp loại file?"}
    F -- "không" --> X2
    F -- "có" --> G{"Tổng asset của project<br/>sau khi thêm ≤ 5 MB?"}
    G -- "không" --> X3["400, vượt hạn mức project"]
    G -- "có" --> H["Upload lên Supabase Storage"]
    H --> I["Nếu là ảnh, đọc width và height"]
    I --> J["Tạo bản ghi Asset<br/>với transform mặc định"]
    J --> K["Cập nhật lastOpenedAt của project"]
```

## Giới hạn
- Mỗi file ≤ **5 MB** (chặn ngay tại `FileInterceptor`).
- Tổng asset còn hiệu lực của một project ≤ **5 MB**. Giao diện hiển thị bằng thanh `CapacityBar` ([[Project-Editor]]).

## Loại file cho asset
`.png`, `.jpg`, `.jpeg`, `.mp4`, `.webm`, `.glb`, `.gltf`.

## Trigger image
Chỉ ảnh raster: `.png`, `.jpg`, `.jpeg`.

## Cách kiểm tra
1. Đuôi file nằm trong whitelist.
2. MIME type khớp đuôi.
3. **Magic bytes** của nội dung khớp loại file (`.gltf` là JSON nên chỉ kiểm tra parse được).

## Cố ý không cho `.svg`
SVG có thể chứa `<script>` và bị trình duyệt chạy khi mở thẳng URL file (stored XSS qua upload), không đáng đánh đổi ([[Security-Notes]]).

File được lưu ở [[Supabase-Storage]].
