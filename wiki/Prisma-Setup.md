---
title: Prisma-Setup
tags: [backend, database]
---

# Prisma-Setup

- Prisma 7, generator `prisma-client-js`, `datasource` PostgreSQL.
- **Runtime** ([[Backend]]): `PrismaService` dùng adapter `@prisma/adapter-pg` với chuỗi kết nối `DIRECT_URL ?? DATABASE_URL`.
- **CLI**: `prisma.config.ts` đọc `DIRECT_URL` từ `.env`. Biến này chưa có trong `.env.example`, nên nhớ tự thêm ([[Environment-Variables]]).
- Kết nối bằng role `postgres`, nên **bỏ qua RLS** ([[Row-Level-Security]]).

## Hai điều dễ quên
1. **Prisma 7 không tự chạy `generate`** sau `db push`. Đổi schema xong phải `pnpm prisma generate`, nếu không TypeScript báo thiếu field (ví dụ lỗi `googleId` không tồn tại). Docker build đã có bước `prisma generate` ([[Deployment]]); gợi ý thêm `postinstall` để local và CI cũng tự chạy.
2. Repo **chưa có thư mục `prisma/migrations`**: schema đang đồng bộ bằng `db push`, không có lịch sử. Script hiện tại: `db:push` = `prisma db push && prisma db execute --file prisma/rls.sql`. Nên chuyển sang `prisma migrate` kèm RLS trong migration ([[Roadmap]]).

Schema: [[Database-Schema]]. Cách chạy: [[Dev-Setup]]. Sự cố thường gặp: [[Troubleshooting]].
