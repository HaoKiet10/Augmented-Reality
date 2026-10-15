---
title: Frontend-Routes
tags: [frontend]
---

# Frontend-Routes

Định nghĩa trong `App.tsx` (React Router).

| Đường dẫn | Quyền | Trang | Ghi chú |
|---|---|---|---|
| `/login` | public | Login | Có link quên mật khẩu và nút Google; đọc `?error=google_auth_failed` |
| `/signup` | public | Signup | Có nút Google |
| `/forgot-password` | public | ForgotPassword | → [[Auth-Password-Reset]] |
| `/reset-password?token=` | public | ResetPassword | Token lấy từ link trong email |
| `/oauth-callback?token=` | public | OAuthCallback | Đích sau [[Auth-Google-OAuth]] |
| `/profile` | cần đăng nhập | Profile | Đổi tên, đổi mật khẩu → [[API-Users]] |
| `/dashboard` | cần đăng nhập | Dashboard | Danh sách project |
| `/project/:id` | cần đăng nhập | ProjectEditor | → [[Project-Editor]] |
| `*` | — | — | Chuyển về `/dashboard` |

```mermaid
flowchart TD
    R["Mở một URL"] --> M{"Khớp route nào?"}
    M -- "/login, /signup, /forgot-password,<br/>/reset-password, /oauth-callback" --> P["Trang public"]
    M -- "/dashboard, /profile, /project/:id" --> G{"ProtectedRoute"}
    M -- "route chưa khai báo (*)" --> D["Chuyển sang /dashboard"]
    D --> G
    G -- "isLoading" --> S["Hiện spinner"]
    G -- "chưa đăng nhập" --> L["Chuyển sang /login"]
    G -- "đã đăng nhập" --> OK["Hiện trang"]
```

**Lưu ý:** route `*` nuốt mọi đường dẫn chưa khai báo và đẩy về `/dashboard`, rồi nếu chưa đăng nhập thì tiếp tục bị đẩy sang `/login`. Quên đăng ký một route mới sẽ trông giống "bị kẹt ở trang login", xem [[Troubleshooting]].

`ProtectedRoute` kiểm tra `isAuthenticated` từ [[Frontend-AuthContext]].
