---
title: Swagger-Docs
tags: [api, backend]
---

# Swagger-Docs

- Địa chỉ: `/docs` (ví dụ `http://localhost:3000/docs`).
- **Chỉ bật khi `NODE_ENV !== 'production'`**, để không lộ danh sách route trên server thật. Dockerfile đặt `NODE_ENV=production` nên trên Render sẽ tắt ([[Deployment]]).
- Dùng `@nestjs/swagger` kèm plugin trong `backend/nest-cli.json`: plugin tự suy ra schema từ DTO và decorator `class-validator`, không cần gắn `@ApiProperty` thủ công.
- Có `addBearerAuth()`: bấm Authorize rồi dán access token ([[Auth-Tokens]]) để thử route cần đăng nhập.
- Mục đích: là nguồn tham chiếu chung cho [[Frontend]] và [[Mobile-App]] (repo tách riêng) khỏi phải đọc source. Danh sách route: [[API-Auth]], [[API-Users]], [[API-Projects]], [[API-Assets]], [[API-Public-Scan]].

Thuộc [[Backend]].
