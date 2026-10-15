---
title: Module-Auth
tags: [backend, auth]
---

# Module-Auth

`backend/src/modules/auth/`.

| Thành phần | Việc |
|---|---|
| `AuthController` | Các route ở [[API-Auth]]; đặt cookie refresh; redirect sau Google |
| `AuthService` | `signup`, `login`, `refreshTokens`, `logout`, `loginWithGoogle`, `forgotPassword`, `resetPassword`; cấp token qua `issueTokens` |
| `JwtStrategy` | Xác thực access token (`Authorization: Bearer`), gắn `req.user = { id, email, role }` |
| `RefreshTokenStrategy` | Đọc refresh token từ cookie `refresh_token` |
| `GoogleStrategy` | Passport Google OAuth 2.0, gọi `findOrCreateByGoogle` |
| Guard | `JwtAuthGuard`, `JwtRefreshAuthGuard`, `GoogleAuthGuard` |
| DTO | `LoginDto`, `SignupDto` (mật khẩu 8–72 ký tự), `ForgotPasswordDto`, `ResetPasswordDto` |

Các luồng chi tiết: [[Auth-Tokens]] · [[Auth-Google-OAuth]] · [[Auth-Password-Reset]]. Giới hạn tần suất: [[Rate-Limiting]].
Phụ thuộc [[Module-User]] (tìm/tạo user, băm mật khẩu bằng bcrypt) và bảng `RefreshToken`, `PasswordResetToken` trong [[Database-Schema]]. Biến môi trường: [[Environment-Variables]].
