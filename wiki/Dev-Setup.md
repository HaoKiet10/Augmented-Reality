---
title: Dev-Setup
tags: [ops]
---

# Dev-Setup

Yêu cầu: Node 24 LTS (≥ 24.22.1 — bản vá bảo mật 10/2026), pnpm 10 (`corepack enable`), Docker Desktop, một project Supabase (chỉ dùng Storage khi dev).

```bash
pnpm install                       # ở thư mục gốc (workspace)
docker compose up -d               # Postgres dev (container ar-dev-db, cổng 5432, DB ar_dev)
cd backend
cp .env.example .env               # điền giá trị, xem Environment-Variables
pnpm prisma generate               # BẮT BUỘC sau mỗi lần đổi schema (Prisma 7 không tự generate)
pnpm db:push                       # đẩy schema + bật RLS
pnpm dev                           # backend, cổng 3000
# terminal khác
pnpm --filter frontend dev         # frontend, cổng 5173
```

- Biến môi trường: [[Environment-Variables]]. RLS chạy cùng `db:push`: [[Row-Level-Security]].

## Database dev
- `docker-compose.yml` ở gốc repo chạy `postgres:17-alpine` (user/mật khẩu `postgres`/`postgres`, DB `ar_dev`) — chỉ cho máy local, không liên quan deploy.
- `DATABASE_URL` và `DIRECT_URL` trong `backend/.env` trỏ về `localhost:5432/ar_dev` (mẫu ở `.env.example`). **Không** trỏ máy local vào DB production.
- `docker compose down` tắt (giữ dữ liệu); `docker compose down -v` xoá sạch, sau đó chạy lại `pnpm db:push`.
- Xem dữ liệu: `docker exec -it ar-dev-db psql -U postgres -d ar_dev`, hoặc `pnpm --filter backend exec prisma studio`.
- **Storage vẫn là Supabase thật**: upload asset/trigger image khi dev vẫn vào bucket `assets` của project Supabase trong `SUPABASE_URL`. Muốn tách hẳn thì tạo project Supabase riêng cho dev và đổi `SUPABASE_*`.
- Từ thư mục gốc cũng có `pnpm dev:backend`, `pnpm dev:frontend`, `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm db:push`.
- API docs tại `http://localhost:3000/docs` ([[Swagger-Docs]]).
- Gặp lỗi lạ khi chạy: xem [[Troubleshooting]].

Liên quan: [[Prisma-Setup]] · [[Deployment]] · [[Backend]] · [[Frontend]]
