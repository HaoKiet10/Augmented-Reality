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
| `CORS_ORIGIN` | nên có | Danh sách domain frontend, cách nhau dấu phẩy; mặc định `localhost:5173` + domain Vercel |
| `PORT` | không | Mặc định 3000 |
| `NODE_ENV` | không | `production` bật cookie Secure/SameSite=None và tắt [[Swagger-Docs]] |

`JWT_*`, `GOOGLE_*` dùng `getOrThrow`: thiếu thì app dừng ngay lúc khởi động, thay vì lỗi muộn.

## Frontend
- `VITE_API_URL` → `API_URL` trong `config.ts` ([[Frontend]]).

## Lưu ý
- `.env` đã nằm trong `.gitignore` ở gốc, `frontend/` và `backend/`; `render.yaml` dùng `sync: false` cho mọi bí mật để giá trị thật không vào repo ([[Deployment]]).
- Mọi biến mới thêm vào code phải được thêm cả vào `.env.example` và Render ([[Troubleshooting]], [[Security-Notes]]).
