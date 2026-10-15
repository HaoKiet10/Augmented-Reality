---
title: API-Auth
tags: [api, auth]
---

# API-Auth

Controller: `AuthController` ([[Module-Auth]]). Không route nào cần `Authorization` header, trừ việc `refresh` đọc cookie.

| Method + đường dẫn | Body | Kết quả | Giới hạn |
|---|---|---|---|
| `POST /auth/signup` | `email`, `password` (8–72), `name?` | `{ user, token }` + cookie refresh | 5/phút |
| `POST /auth/login` | `email`, `password` | `{ user, token }` + cookie refresh | 5/phút |
| `POST /auth/refresh` | — (cookie `refresh_token`) | access token mới, **xoay** refresh token | mặc định |
| `POST /auth/logout` | — (cookie) | thu hồi refresh token, xoá cookie | mặc định |
| `POST /auth/forgot-password` | `email` | luôn trả cùng một thông báo | 5/phút |
| `POST /auth/reset-password` | `token`, `newPassword` (8–72) | đổi mật khẩu, thu hồi mọi phiên | 5/phút |
| `GET /auth/google` | — | 302 sang Google | mặc định |
| `GET /auth/google/callback` | (Google gọi) | 302 về `FRONTEND_URL/oauth-callback?token=` | mặc định |

Chi tiết: [[Auth-Tokens]] (token và cookie), [[Auth-Google-OAuth]], [[Auth-Password-Reset]], [[Rate-Limiting]].
Frontend gọi qua [[Frontend-AuthContext]]. Tài liệu tương tác: [[Swagger-Docs]].
