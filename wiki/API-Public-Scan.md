---
title: API-Public-Scan
tags: [api, ar, mobile]
---

# API-Public-Scan

`GET /public/projects/:id` — route **không cần xác thực** ([[Module-Project]], `ScanController`). Dành cho [[Mobile-App]].

- Chỉ trả project có `status = published`; ngược lại 404 `Project not found or not published`.
- Trả về: `id`, `name`, `description`, `triggerImageUrl`, và danh sách `assets` (chỉ asset chưa xoá mềm) gồm `id`, `filename`, `fileType`, `url`, `transform`.
- **Không** lộ `designerId`, `storageKey` hay field nội bộ khác.
- `triggerImageUrl` và `url` là URL public của bucket ([[Supabase-Storage]]); mobile tải thẳng từ đó.
- `transform` theo quy ước ở [[Asset-Transform]].
- Chịu giới hạn mặc định 20 request/phút/IP ([[Rate-Limiting]]).

Chưa ghi lại lượt quét ([[Roadmap]]). Điều kiện để một project có thể được trả ở đây: [[Publish-Flow]]. Cân nhắc rủi ro lộ asset: [[Security-Notes]].
