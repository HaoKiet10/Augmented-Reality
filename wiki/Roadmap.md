---
title: Roadmap
tags: [planning]
---

# Roadmap

Những việc còn thiếu, xếp gần đúng theo mức ưu tiên.

## Nên làm trước khi cho người dùng thật dùng
1. **Gửi email thật** cho [[Auth-Password-Reset]]: hiện link reset chỉ in ra log backend.
2. **Tham số `state` chống CSRF** cho [[Auth-Google-OAuth]] và redirect lỗi sớm về frontend.
3. **CI** (`.github/workflows`) chạy lint + test mỗi PR (hiện chưa có).
4. Đưa RLS vào migration chính thức, bỏ phụ thuộc `db push` ([[Row-Level-Security]], [[Prisma-Setup]]).

## Tính năng
- Thống kê lượt scan (bảng `ScanEvent`, ghi ở [[API-Public-Scan]]).
- Nhân bản cả project (hiện chỉ nhân bản được asset, xem [[API-Assets]]).
- Phân trang, tìm kiếm, sắp xếp cho `GET /projects` ([[API-Projects]]).
- Upload avatar và đổi email có xác thực ([[Module-User]]).
- Xác thực email khi đăng ký.
- Bucket private + signed URL nếu cần asset riêng tư ([[Supabase-Storage]]).
- Mobile: app iOS (hiện chỉ có Android) và các việc khác trong wiki repo ARMobile, note `Mobile-Roadmap` ([[Mobile-App]]).

## Dọn dẹp
- Xoá `SetTriggerDimensionsDto` (không route nào dùng) và route `GET /public/projects` khi không còn app bản cũ ([[Module-Project]], [[API-Public-Scan]]).
- Để `/public/trigger-db` trả luôn bề rộng danh nghĩa thay vì hai bên tự giữ hằng số 0.15 ([[Trigger-Database]]).

Rủi ro đã biết: [[Security-Notes]]
