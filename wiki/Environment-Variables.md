---
title: Environment-Variables
tags: [ops, security]
---

# Environment-Variables

## Backend (`backend/.env`, mẫu ở `.env.example`)
| Biến | Bắt buộc | Dùng cho |
|---|---|---|
| `DIRECT_URL` | có | Kết nối Postgres cho Prisma CLI và runtime ([[Prisma-Setup]]). **Chưa có trong `.env.example`**, nên thêm |
| `SUPABASE_URL` | có | [[Supabase-Storage]] |
| `SUPABASE_SERVICE_ROLE_KEY` | có | Ghi/xoá file; thiếu là backend không khởi động |
| `SUPABASE_ANON_KEY` | không còn dùng trực tiếp | giữ cho đồng bộ cấu hình |
| `JWT_SECRET` | có | Ký access token ([[Auth-Tokens]]) |
| `JWT_REFRESH_SECRET` | có | Ký refresh token |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | có | [[Auth-Google-OAuth]] |
| `GOOGLE_CALLBACK_URL` | có | Trỏ về **backend** (`…/auth/google/callback`), khớp Google Console |
| `FRONTEND_URL` | nên có | Đích redirect sau Google và gốc của link reset mật khẩu; mặc định `http://localhost:5173` |
| `SMTP_USER`, `SMTP_PASS` | có (production) | Gửi email reset mật khẩu, mặc định qua Gmail; `SMTP_PASS` là App Password. Thiếu ở local thì link in ra log `[DEV ONLY]`; thiếu ở production thì không gửi được |
| `SMTP_HOST`, `SMTP_PORT` | không | Mặc định `smtp.gmail.com` / `465`; chỉ đổi khi dùng nhà cung cấp khác |
| `MAIL_FROM` | không | Người gửi; mặc định `AR Studio <SMTP_USER>`. Với Gmail, địa chỉ phải trùng `SMTP_USER` |
| `CORS_ORIGIN` | nên có | Danh sách domain frontend, cách nhau dấu phẩy; mặc định `localhost:5173` + domain Vercel |
| `PORT` | không | Mặc định 3000 |
| `ARCOREIMG_PATH` | không | Đường dẫn tool `arcoreimg` dựng database nhận diện; mặc định `arcoreimg` trong PATH (image Docker có sẵn). Chạy local trên Windows trỏ tới `arcoreimg.exe` ([[Trigger-Database]]) |
| `NODE_ENV` | không | `production` bật cookie Secure/SameSite=None và tắt [[Swagger-Docs]] |

`JWT_*`, `GOOGLE_*` dùng `getOrThrow`: thiếu thì app dừng ngay lúc khởi động, thay vì lỗi muộn.

## Frontend
- `VITE_API_URL` → `API_URL` trong `config.ts` ([[Frontend]]).

## Lưu ý
- `.env` đã nằm trong `.gitignore` ở gốc, `frontend/` và `backend/`; `render.yaml` dùng `sync: false` cho mọi bí mật để giá trị thật không vào repo ([[Deployment]]).
- Mọi biến mới thêm vào code phải được thêm cả vào `.env.example` và Render ([[Troubleshooting]], [[Security-Notes]]).
