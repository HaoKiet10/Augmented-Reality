# Backend — AR Project API

REST API cho hệ thống AR: quản lý project/asset của designer (web) và phục vụ dữ liệu cho mobile app quét.

## Stack

- **NestJS** (Express) + TypeScript
- **Prisma ORM** + PostgreSQL (Supabase)
- **Supabase Storage** — lưu trigger image + asset (model 3D/ảnh/video)
- **JWT** (access + refresh token qua cookie) cho auth designer

## Cài đặt

```bash
cd backend
cp .env.example .env   # điền giá trị thật
pnpm install
pnpm exec prisma migrate dev
pnpm dev
```

Chạy từ root cũng được (workspace):
```bash
pnpm --filter backend dev
```

## Biến môi trường (`.env`)

| Biến | Mô tả |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Kết nối Supabase (DB + Storage) |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Ký JWT access/refresh token |
| `PORT` | Cổng chạy server (mặc định `3000`) |
| `CORS_ORIGIN` | Danh sách domain frontend được phép gọi API, phân tách bằng dấu phẩy — bỏ trống ở local để dùng mặc định |

## Cấu trúc module (`src/modules/`)

| Module | Vai trò |
|---|---|
| `auth/` | Đăng ký/đăng nhập, JWT access + refresh token (refresh token lưu qua httpOnly cookie) |
| `user/` | Quản lý user |
| `project/` | Project, Asset, publish/unpublish, route public cho mobile |
| `prisma/` | Prisma service dùng chung |

## Route API

### Auth (`/auth`)

| Method | Route | Mô tả |
|---|---|---|
| `POST` | `/auth/signup` | Đăng ký |
| `POST` | `/auth/login` | Đăng nhập |
| `POST` | `/auth/refresh` | Cấp lại access token (cần refresh cookie) |
| `POST` | `/auth/logout` | Đăng xuất, xoá refresh cookie |
| `POST` | `/auth/forgot-password` | Quên mật khẩu |

### Project (`/projects`) — cần JWT

| Method | Route | Mô tả |
|---|---|---|
| `GET` | `/projects` | Danh sách project của designer |
| `GET` | `/projects/:id` | Chi tiết 1 project |
| `POST` | `/projects` | Tạo project mới |
| `PATCH` | `/projects/:id` | Sửa tên/mô tả |
| `DELETE` | `/projects/:id` | Xoá project (kèm asset trên Storage) |
| `POST` | `/projects/:id/trigger` | Upload trigger image |
| `DELETE` | `/projects/:id/trigger` | Xoá trigger image |
| `POST` | `/projects/:id/publish` | Publish — validate đủ trigger image + ≥1 asset trước khi cho publish |
| `POST` | `/projects/:id/unpublish` | Đưa về draft |

### Asset (`/projects/:id/assets`) — cần JWT

| Method | Route | Mô tả |
|---|---|---|
| `GET` | `/projects/:id/assets` | Danh sách asset |
| `POST` | `/projects/:id/assets` | Upload asset (model 3D/ảnh/video) |
| `DELETE` | `/projects/:id/assets/:assetId` | Xoá asset |
| `PATCH` | `/projects/:id/assets/:assetId/transform` | Cập nhật position/rotation/scale |

### Scan (`/public/projects`) — **không cần auth**

| Method | Route | Mô tả |
|---|---|---|
| `GET` | `/public/projects/:id` | Dùng cho mobile app quét — chỉ trả project đã `published`, không lộ field nội bộ (`designerId`, `storageKey`...) |

## Quy ước transform asset

`position`/`rotation`/`scale` lưu dạng số **tương đối** theo chiều rộng trigger image (`scale: 1` = 100%), không phải mét thật — xem chi tiết trong README của `frontend/` và `mobile/`.

## Publish — điều kiện bắt buộc

`POST /projects/:id/publish` validate:
- Đã có `triggerImageUrl`
- Có ít nhất 1 asset

Thiếu điều kiện nào, trả lỗi 400 nêu rõ đang thiếu gì.