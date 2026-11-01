---
title: API-Public-Scan
tags: [api, ar, mobile]
---

# API-Public-Scan

Ba route **không cần xác thực**, đều trong `scan.controller.ts`:

| Route | Dùng cho |
|---|---|
| `GET /public/trigger-db` | Database nhận diện `.imgdb` dựng sẵn: `{ version, url, sha256, size, triggers }`; 503 khi chưa dựng xong ([[Trigger-Database]]) |
| `GET /public/projects/:id` | Nội dung một project đã publish (chi tiết bên dưới) |
| `GET /public/projects` | Danh sách `{id, name, triggerImageUrl}` của project đã publish — chỉ còn để tương thích app bản cũ dựng database trên máy |

## `GET /public/projects/:id`

Route ([[Module-Project]], `ScanController`). Dành cho [[Mobile-App]].

- Chỉ trả project có `status = published`; ngược lại 404 `Project not found or not published`.
- Trả về: `id`, `name`, `description`, `triggerImageUrl`, và danh sách `assets` (chỉ asset chưa xoá mềm) gồm `id`, `filename`, `fileType`, `url`, `transform`.
- **Không** lộ `designerId`, `storageKey` hay field nội bộ khác.
- `triggerImageUrl` và `url` là URL public của bucket ([[Supabase-Storage]]); mobile tải thẳng từ đó.
- `transform` theo quy ước ở [[Asset-Transform]].
- Chịu giới hạn mặc định 20 request/phút/IP ([[Rate-Limiting]]).

Mobile gọi route này khi ARCore nhận ra trigger image của project (tên ảnh = project id).

Chưa ghi lại lượt quét ([[Roadmap]]). Điều kiện để một project có thể được trả ở đây: [[Publish-Flow]]. Cân nhắc rủi ro lộ asset: [[Security-Notes]].
