---
title: API-Assets
tags: [api, ar]
---

# API-Assets

`AssetController`, tiền tố `/projects/:id/assets`, cần JWT, chỉ chủ project ([[Module-Project]]).

| Method + đường dẫn | Việc |
|---|---|
| `GET /projects/:id/assets` | Asset còn hiệu lực (`deletedAt = null`) |
| `POST /projects/:id/assets` | Upload (multipart, field `file`, ≤ 5 MB/file) |
| `POST /projects/:id/assets/:assetId/duplicate` | Nhân bản asset (copy file trong [[Supabase-Storage]]) |
| `DELETE /projects/:id/assets/:assetId` | **Xoá mềm**: chỉ đặt `deletedAt`, file vẫn còn |
| `POST /projects/:id/assets/:assetId/restore` | Hoàn tác xoá |
| `PATCH /projects/:id/assets/:assetId/transform` | Lưu `position`, `rotation`, `scale` ([[Asset-Transform]]) |

Quy tắc:
- Tổng dung lượng asset còn hiệu lực của một project tối đa **5 MB**; asset đã xoá mềm không tính. Vượt quá thì 400.
- Loại file hợp lệ: [[Upload-Validation]].
- Chưa có job dọn asset xoá mềm lâu ngày (hiện giữ vô thời hạn); xoá cả project thì dọn hết ([[API-Projects]]).

Giao diện dùng các route này: [[Project-Editor]]. Cột dữ liệu: [[Database-Schema]].
