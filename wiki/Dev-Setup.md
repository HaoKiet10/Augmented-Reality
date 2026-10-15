---
title: Dev-Setup
tags: [ops]
---

# Dev-Setup

Yêu cầu: Node 20, pnpm 10 (`corepack enable`), một project Supabase.

```bash
pnpm install                       # ở thư mục gốc (workspace)
cd backend
cp .env.example .env               # điền giá trị, xem Environment-Variables
pnpm prisma generate               # BẮT BUỘC sau mỗi lần đổi schema (Prisma 7 không tự generate)
pnpm db:push                       # đẩy schema + bật RLS
pnpm dev                           # backend, cổng 3000
# terminal khác
pnpm --filter frontend dev         # frontend, cổng 5173
```

- Biến môi trường: [[Environment-Variables]]. RLS chạy cùng `db:push`: [[Row-Level-Security]].
- Từ thư mục gốc cũng có `pnpm dev:backend`, `pnpm dev:frontend`, `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm db:push`.
- API docs tại `http://localhost:3000/docs` ([[Swagger-Docs]]).
- Gặp lỗi lạ khi chạy: xem [[Troubleshooting]].

Liên quan: [[Prisma-Setup]] · [[Deployment]] · [[Backend]] · [[Frontend]]
