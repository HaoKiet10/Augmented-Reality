---
title: Supabase-Storage
tags: [storage, backend]
---

# Supabase-Storage

Lưu trigger image và asset. Truy cập qua `StorageService` ([[Module-Project]]).

- **Bucket:** `assets` (public). Key lưu trong DB: `assets/{projectId}/{tên-file-duy-nhất}`.
- URL trả về bằng `getPublicUrl`, tải thẳng từ CDN không cần token. Mobile dùng URL này ([[API-Public-Scan]]).
- Thao tác: upload, `copyFile` (nhân bản asset, [[API-Assets]]), `deleteFile`.
- **Cần `SUPABASE_SERVICE_ROLE_KEY`.** Service ném lỗi ngay lúc khởi động nếu thiếu `SUPABASE_URL` hoặc key này; không còn rơi âm thầm sang `anon key` ([[Environment-Variables]]). Key chỉ được nằm ở backend.
- Xoá asset trên giao diện là **xoá mềm** (`deletedAt`), file vật lý vẫn giữ để khôi phục ([[Database-Schema]]).
- Giới hạn 5 MB mỗi file và 5 MB tổng mỗi project; loại file theo [[Upload-Validation]].
- `supabase-js` cần transport WebSocket (`ws`) trên Node < 22 vì nó khởi tạo Realtime ngay khi `createClient`.

Hệ quả bảo mật của bucket public: [[Security-Notes]].
