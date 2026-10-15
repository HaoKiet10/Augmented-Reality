---
title: API-Projects
tags: [api, ar]
---

# API-Projects

`ProjectController`, tiền tố `/projects`, **tất cả cần JWT** ([[Auth-Tokens]]) và chỉ thấy project của chính mình ([[Module-Project]]).

| Method + đường dẫn | Việc |
|---|---|
| `GET /projects` | Danh sách project của designer (chưa phân trang, [[Roadmap]]) |
| `GET /projects/:id` | Chi tiết, kèm asset chưa bị xoá mềm |
| `POST /projects` | Tạo project (`name` ≤ 200 ký tự) |
| `PATCH /projects/:id` | Sửa `name`, `description`, `lastOpenedAt`. Không đổi được `status` ở đây |
| `DELETE /projects/:id` | Xoá project; dọn **cả** file của asset đã xoá mềm và trigger image khỏi [[Supabase-Storage]] |
| `POST /projects/:id/trigger` | Upload trigger image (multipart, field `file`, ≤ 5 MB, chỉ png/jpg/jpeg) |
| `DELETE /projects/:id/trigger` | Gỡ trigger image |
| `POST /projects/:id/publish` | Công bố; điều kiện ở [[Publish-Flow]] |
| `POST /projects/:id/unpublish` | Về lại `draft` |

Kiểm tra file: [[Upload-Validation]]. Asset của project: [[API-Assets]]. Phiên bản public cho mobile: [[API-Public-Scan]].
