---
title: API-Users
tags: [api, auth]
---

# API-Users

Controller: `UserController` ([[Module-User]]). Tất cả cần `Authorization: Bearer <access token>` ([[Auth-Tokens]]). Chỉ thao tác trên chính người đang đăng nhập.

| Method + đường dẫn | Body | Kết quả |
|---|---|---|
| `GET /users/me` | — | profile (không có hash mật khẩu, không có `googleId`), kèm `hasPassword`, `hasGoogle` |
| `PATCH /users/me` | `name?` (≤100) | profile mới. **Chưa cho đổi email** |
| `PATCH /users/me/password` | `currentPassword`, `newPassword` (8–72) | thông báo thành công; lỗi 401 nếu sai mật khẩu hiện tại hoặc tài khoản Google-only |
| `POST /users/me/password` | `newPassword` (8–72) | đặt mật khẩu lần đầu cho tài khoản Google-only; lỗi 400 nếu tài khoản đã có mật khẩu (phải dùng `PATCH`) |
| `POST /users/me/avatar` | multipart, field `file`: PNG/JPEG/WebP ≤ 5 MB | profile mới với `avatarUrl` mới; 400 nếu sai loại (kiểm cả magic bytes), 413 nếu quá lớn |
| `DELETE /users/me/avatar` | — | profile mới với `avatarUrl: null` |

Cờ `hasPassword` để giao diện chọn form: đổi mật khẩu (`PATCH`) hay đặt mật khẩu lần đầu (`POST`).

Avatar lưu ở bucket Supabase riêng `avatars` (public, tên đổi được qua `SUPABASE_AVATAR_BUCKET`), key `<userId>/<timestamp><ext>`. Khi đổi/xoá avatar, file cũ chỉ bị xoá nếu nằm trong bucket đó — ảnh Google chỉ bị bỏ link, không bao giờ bị xoá. Trang dùng: `/profile` ([[Frontend-Routes]]). Sau Google login, frontend cũng gọi `GET /users/me` ([[Auth-Google-OAuth]]).
Dữ liệu: [[Database-Schema]].
