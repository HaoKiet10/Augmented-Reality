---
title: Frontend-AuthContext
tags: [frontend, auth]
---

# Frontend-AuthContext

`context/AuthContext.tsx` giữ phiên đăng nhập cho toàn app.

**Trạng thái:** `user`, `token` (access token), `isLoading`, `isAuthenticated`. Lưu ở `localStorage` với khoá `token` và `user`; khi app tải lại sẽ đọc từ đó.

**Hàm:**
- `login`, `signup` → gọi [[API-Auth]]; lỗi 429 được đổi thành `RATE_LIMIT_MESSAGE` ([[Rate-Limiting]]).
- `loginWithToken(token)` → dùng sau Google: gọi `GET /users/me` ([[API-Users]]) để lấy profile rồi lưu phiên ([[Auth-Google-OAuth]]).
- `updateUser(user)` → cập nhật bản cache sau khi sửa profile.
- `logout` → xoá phiên.
- `authFetch(url, init)` → tự gắn `Authorization: Bearer <token>`. Nếu gặp 401, gọi `POST /auth/refresh` (cookie httpOnly tự đính kèm) và thử lại đúng một lần; refresh thất bại thì `logout`. Cơ chế token ở [[Auth-Tokens]].

Lưu ý bảo mật: access token nằm trong `localStorage`, nên XSS đọc được; xem [[Security-Notes]].

Dùng bởi: [[Frontend-Routes]] (`ProtectedRoute`), [[Project-Editor]], [[Frontend]].
