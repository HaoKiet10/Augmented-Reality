---
title: Auth-Google-OAuth
tags: [auth, security]
---

# Auth-Google-OAuth

Đăng nhập bằng Google dùng `passport-google-oauth20` ([[Module-Auth]]). Sau khi xong, mọi thứ chạy bằng JWT của chính dự án ([[Auth-Tokens]]).

## Luồng
```mermaid
sequenceDiagram
    autonumber
    actor U as Trình duyệt
    participant BE as Backend NestJS
    participant G as Google
    participant DB as Postgres
    participant FE as Frontend SPA

    U->>BE: GET /auth/google
    BE-->>U: 302 sang Google (clientID, scope email + profile)
    U->>G: Chọn tài khoản và đồng ý
    G-->>U: 302 về GOOGLE_CALLBACK_URL kèm code
    U->>BE: GET /auth/google/callback?code=...
    BE->>G: Đổi code lấy profile (dùng client secret)
    G-->>BE: Profile gồm id, email, tên, ảnh
    BE->>DB: findOrCreateByGoogle
    DB-->>BE: User
    BE->>DB: Lưu hash refresh token
    BE-->>U: 302 về FRONTEND_URL/oauth-callback?token=access, kèm cookie refresh_token
    U->>FE: Mở /oauth-callback
    FE->>FE: Xoá token khỏi URL
    FE->>BE: GET /users/me (Bearer token)
    BE-->>FE: Profile
    FE-->>U: Vào /dashboard
```

Cách `findOrCreateByGoogle` chọn user:

```mermaid
flowchart TD
    A["Profile từ Google"] --> B{"Có user trùng googleId?"}
    B -- "có" --> U1["Dùng lại user đó"]
    B -- "không" --> C{"Có user trùng email?"}
    C -- "có" --> U2["Gắn googleId vào tài khoản cũ"]
    C -- "không" --> U3["Tạo user mới, password = null"]
```
Frontend: nút ở `/login` và `/signup`, trang `/oauth-callback` ([[Frontend-Routes]]); hàm `loginWithToken` ([[Frontend-AuthContext]]).

## Gộp tài khoản (`findOrCreateByGoogle`, [[Module-User]])
1. Trùng `googleId` → dùng lại user đó.
2. Trùng email (từng đăng ký bằng mật khẩu) → **gắn `googleId` vào tài khoản cũ**, không tạo trùng; từ đó đăng nhập được bằng cả hai cách.
3. Không có → tạo user mới với `password = null` (đổi mật khẩu bị chặn rõ ràng, [[API-Users]]).

## Cấu hình
Google Cloud Console → OAuth client loại Web; **Authorized redirect URI phải khớp từng ký tự** với `GOOGLE_CALLBACK_URL` và trỏ về **backend**. Biến cần: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `FRONTEND_URL` ([[Environment-Variables]]). Chúng bắt buộc để backend khởi động. Ứng dụng ở chế độ Testing chỉ cho email nằm trong danh sách test user.

## Hạn chế đã biết ([[Security-Notes]], [[Roadmap]])
- Chưa có tham số `state` chống login CSRF.
- Lỗi xảy ra trước controller (người dùng bấm Từ chối, code hết hạn) hiện ra JSON ở domain backend, chưa redirect về frontend.
- Access token nằm trên URL ở bước 6.

Sự cố từng gặp: [[Troubleshooting]].
