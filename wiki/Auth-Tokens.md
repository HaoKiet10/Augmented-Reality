---
title: Auth-Tokens
tags: [auth, security]
---

# Auth-Tokens

Backend tự cấp JWT, không dùng Supabase Auth ([[Architecture]]).

| | Access token | Refresh token |
|---|---|---|
| Hạn | 1 ngày | 7 ngày |
| Khoá ký | `JWT_SECRET` | `JWT_REFRESH_SECRET` |
| Payload | `sub` (id user), `email`, `role`, `type: access` | tương tự, `type: refresh` |
| Cách gửi | Header `Authorization: Bearer` | Cookie `refresh_token` |
| Lưu ở client | `localStorage` ([[Frontend-AuthContext]]) | cookie `httpOnly` |
| Lưu ở server | không | chỉ **hash sha256** trong bảng `RefreshToken` ([[Database-Schema]]) |

## Cookie refresh
`httpOnly`, `Path=/auth`, 7 ngày. Môi trường production: `Secure` + `SameSite=None` (vì frontend và backend khác domain); local: `SameSite=Lax`.

## Xoay token và phát hiện dùng lại
`POST /auth/refresh` ([[API-Auth]]) chỉ dùng được **một lần**: token vừa dùng bị thu hồi và cặp mới được cấp.

```mermaid
flowchart TD
    A["POST /auth/refresh<br/>kèm cookie refresh_token"] --> B{"Hash token có trong DB<br/>và đúng user?"}
    B -- "không" --> X["401 Invalid refresh token"]
    B -- "có" --> C{"Đã bị thu hồi<br/>hoặc hết hạn?"}
    C -- "có" --> R["Thu hồi MỌI refresh token<br/>còn hiệu lực của user"]
    R --> X2["401 Refresh token no longer valid"]
    C -- "không" --> D["Thu hồi token vừa dùng"]
    D --> E["Cấp access token mới<br/>và refresh token mới, đặt cookie"]
```

Token đã thu hồi mà vẫn bị đưa ra nghĩa là có thể đã bị lộ và bị dùng lại, nên cả phiên của user bị đóng. Token **hết hạn** cũng đi nhánh này: người dùng phải đăng nhập lại ở mọi thiết bị.

## Frontend tự làm mới khi access token hết hạn
```mermaid
sequenceDiagram
    participant FE as Frontend (authFetch)
    participant BE as Backend
    FE->>BE: Request kèm Bearer access token
    BE-->>FE: 401 (token hết hạn)
    FE->>BE: POST /auth/refresh (cookie refresh_token)
    BE-->>FE: Access token mới, cookie mới
    FE->>BE: Gửi lại request ban đầu
    BE-->>FE: 200
```
Nếu bước refresh cũng lỗi thì frontend `logout` ([[Frontend-AuthContext]]).

## Khi nào mọi refresh token bị thu hồi
- Đặt lại mật khẩu thành công ([[Auth-Password-Reset]]).
- Gửi refresh token đã thu hồi hoặc đã hết hạn lên `/auth/refresh` (sơ đồ trên).

Frontend tự gọi refresh khi gặp 401 ([[Frontend-AuthContext]]). Hai chiến lược xác thực: `JwtStrategy`, `RefreshTokenStrategy` ([[Module-Auth]]). Rủi ro lưu token: [[Security-Notes]].
