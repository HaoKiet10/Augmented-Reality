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

Cờ `hasPassword` để giao diện ẩn form đổi mật khẩu cho tài khoản Google-only. Trang dùng: `/profile` ([[Frontend-Routes]]). Sau Google login, frontend cũng gọi `GET /users/me` ([[Auth-Google-OAuth]]).
Dữ liệu: [[Database-Schema]].
