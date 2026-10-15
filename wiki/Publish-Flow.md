---
title: Publish-Flow
tags: [ar, business]
---

# Publish-Flow

Trạng thái project: `draft` → `published` (và `archived`, chưa có route đặt) — cột `status` ([[Database-Schema]]).

```mermaid
stateDiagram-v2
    [*] --> draft: Tạo project
    draft --> published: Publish, đủ trigger image và ít nhất 1 asset
    published --> draft: Unpublish
    draft --> [*]: Xoá project
    published --> [*]: Xoá project
```

Trạng thái `archived` có trong schema nhưng chưa có route nào đặt.

```mermaid
flowchart TD
    A["POST /projects/:id/publish"] --> B["Tìm project của designer"]
    B --> C{"Có triggerImageUrl?"}
    C -- "không" --> M["Thêm trigger image vào danh sách thiếu"]
    C -- "có" --> D{"Có ít nhất 1 asset<br/>chưa xoá mềm?"}
    M --> D
    D -- "không" --> M2["Thêm asset vào danh sách thiếu"]
    D -- "có" --> E{"Danh sách thiếu rỗng?"}
    M2 --> E
    E -- "không" --> X["400, nêu rõ phần còn thiếu"]
    E -- "có" --> OK["status = published<br/>publishedAt = now"]
```

## Điều kiện publish (`ProjectService.publish`, [[Module-Project]])
Thiếu một trong hai là lỗi 400, thông báo liệt kê phần còn thiếu:
1. Có **trigger image** (`triggerImageUrl`).
2. Có **ít nhất 1 asset** còn hiệu lực (không tính asset xoá mềm).

Thành công thì đặt `status = published` và `publishedAt = now`. `POST /projects/:id/unpublish` đưa về `draft` và xoá `publishedAt` ([[API-Projects]]).

## Hệ quả
- Chỉ project `published` mới truy cập được bằng route public ([[API-Public-Scan]]), nên [[Mobile-App]] chỉ quét được project đã công bố.
- Sau khi publish, designer vẫn sửa được asset; thay đổi có hiệu lực ngay với người quét vì mobile đọc dữ liệu trực tiếp.
- Nút Publish/Unpublish nằm ở header của [[Project-Editor]].

Giới hạn upload ảnh trigger và asset: [[Upload-Validation]].
