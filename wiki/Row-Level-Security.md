---
title: Row-Level-Security
tags: [database, security]
---

# Row-Level-Security

## Vì sao cần
Supabase tự mở REST (PostgREST) cho mọi bảng trong schema `public`, và `anon key` vốn công khai (nằm trong bundle frontend, repo public). Bảng không bật RLS thì ai có key cũng đọc/sửa/xoá được, bất kể backend kiểm tra quyền chặt thế nào.

## Cách làm ở dự án này
- `backend/prisma/rls.sql` chạy một vòng `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` cho **mọi** bảng trong `public`, và **không tạo policy** nào. Nghĩa là role `anon` và `authenticated` bị chặn hoàn toàn.
- [[Backend]] kết nối bằng role `postgres` qua Prisma ([[Prisma-Setup]]), role này bỏ qua RLS nên mọi thứ vẫn chạy.
- Hợp lý vì web và mobile đều chỉ đi qua backend ([[Architecture]]). Nếu sau này client gọi thẳng Supabase thì mới cần viết policy; lưu ý dự án không dùng Supabase Auth nên `auth.uid()` không có nghĩa, phải dùng claim riêng hoặc tiếp tục đi qua backend.
- Script `db:push` chạy file này sau mỗi lần đẩy schema ([[Dev-Setup]]).

## Điểm cần nhớ
- RLS **không nằm trong migration**: dựng DB mới hoặc thêm bảng mới phải chạy lại `rls.sql` (đoạn SQL chạy lặp được).
- Tạo lại bảng (`--force-reset`, đổi tên model) sẽ mất RLS của bảng đó.
- RLS trên bảng `public` **không liên quan** đến `storage.objects`. Bucket `assets` để public nên file vẫn tải được qua URL ([[Supabase-Storage]], [[Security-Notes]]).
- Kiểm tra: gọi `/rest/v1/<Bảng>` bằng `anon key`, kết quả phải là `[]`; hoặc xem Security Advisor trong Dashboard.
- Dự định gộp vào migration: [[Roadmap]].
