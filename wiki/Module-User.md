---
title: Module-User
tags: [backend, auth]
---

# Module-User

`backend/src/modules/user/`.

**UserService:** `findById`, `findByEmail`, `findByGoogleId`, `create`, `update`, `delete`, `validate` (so khớp mật khẩu; trả null nếu tài khoản chỉ có Google), `findOrCreateByGoogle`, `changePassword` (bắt buộc đúng mật khẩu hiện tại), `sanitize` (bỏ hash mật khẩu khỏi response).

**UserController** (`/users/me`, cần JWT): xem [[API-Users]]. Mọi thao tác dựa trên `req.user.id`, không nhận id từ URL, nên không sửa được tài khoản người khác.

`findOrCreateByGoogle` có 3 nhánh: trùng `googleId` thì dùng lại; trùng email thì gắn `googleId` vào tài khoản cũ; không có thì tạo user mới với `password = null` ([[Auth-Google-OAuth]]).

Chưa có: đổi email (cần xác thực email), upload avatar ([[Roadmap]]). Dữ liệu ở [[Database-Schema]]; dùng bởi [[Module-Auth]].
