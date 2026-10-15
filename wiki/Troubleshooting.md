---
title: Troubleshooting
tags: [ops]
---

# Troubleshooting

Những lỗi đã thực sự gặp trong dự án, kèm cách xử lý.

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| TypeScript: `Property 'googleId' does not exist on type …` | Prisma Client chưa tạo lại sau khi đổi schema; Prisma 7 không tự `generate` | `pnpm prisma generate`, rồi restart TS Server. Chi tiết [[Prisma-Setup]] |
| Google login xong vẫn ở `/login`, backend không có log | Request không tới backend hoặc route frontend chưa đăng ký | Xem Network: nếu `callback?code=` trả 302 về `/oauth-callback` thì lỗi ở frontend. Kiểm tra route trong [[Frontend-Routes]] (route `*` nuốt đường dẫn lạ). Kiểm tra `GOOGLE_CALLBACK_URL` trỏ về backend ([[Auth-Google-OAuth]]) |
| `ERROR: event trigger "rls_auto_enable" already exists` khi chạy `db:push` | `rls.sql` chứa lệnh tạo event trigger đã có sẵn | Để `rls.sql` chỉ còn khối `DO $$ … $$` ([[Row-Level-Security]]) |
| `pnpm --filter backend …` rồi lệnh sau `&&` không thấy `prisma` hoặc file | `--filter` chỉ áp cho một lệnh | Lặp `--filter backend` ở từng lệnh, hoặc đặt script trong `backend/package.json` ([[Dev-Setup]]) |
| Backend chết ngay lúc khởi động: `Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY` hoặc `GOOGLE_CLIENT_ID is required` | Thiếu biến môi trường bắt buộc | Điền đủ theo [[Environment-Variables]]; trên Render cập nhật cả `render.yaml` ([[Deployment]]) |
| `GET /rest/v1/…` bằng anon key trả `[]` | RLS đang bật, đúng thiết kế | Đi qua backend ([[Row-Level-Security]]) |
| Bảng mới hoặc bảng tạo lại không có RLS | RLS không nằm trong migration | Chạy lại `pnpm db:push` hoặc `rls.sql` |
| HTTP 429 / "Too many attempts" | Vượt giới hạn 5 lần/phút ở route auth | Đợi một phút ([[Rate-Limiting]]) |
| Email reset mật khẩu không tới | Chưa nối dịch vụ gửi mail | Lấy link trong log backend (`[DEV ONLY]`), [[Auth-Password-Reset]] |
| CORS lỗi, frontend báo không tới được API | `CORS_ORIGIN` không khớp origin (ví dụ `127.0.0.1` khác `localhost`) | Sửa `CORS_ORIGIN` ([[Backend]]) |
| `/docs` 404 | Đang chạy với `NODE_ENV=production` | Chỉ bật ngoài production ([[Swagger-Docs]]) |

Nếu gặp lỗi mới, bổ sung vào bảng này.
