---
title: Security-Notes
tags: [security]
---

# Security-Notes

Tổng hợp rủi ro đã biết, kèm mức độ và việc cần làm. Việc cần làm nằm ở [[Roadmap]].

## Đã xử lý
- Mật khẩu băm bcrypt; refresh/reset token chỉ lưu hash ([[Auth-Tokens]], [[Auth-Password-Reset]]).
- Giới hạn tần suất cho route auth ([[Rate-Limiting]]).
- Khoá truy cập trực tiếp vào DB qua REST ([[Row-Level-Security]]).
- `StorageService` không còn rơi sang `anon key` khi thiếu service key ([[Supabase-Storage]]).
- Cấm upload SVG (tránh XSS), kiểm tra magic bytes ([[Upload-Validation]]).
- Route public không lộ `designerId`/`storageKey` ([[API-Public-Scan]]).

## Còn mở
| Rủi ro | Mức độ | Ghi chú |
|---|---|---|
| Link reset mật khẩu in ra log | **Cao khi dùng thật** | [[Auth-Password-Reset]] |
| Thiếu `state` trong Google OAuth | Trung bình | login CSRF, [[Auth-Google-OAuth]] |
| Access token trên URL sau Google login | Thấp | sống 1 ngày; nằm trong lịch sử trình duyệt |
| Access token trong `localStorage` | Trung bình | XSS đọc được, [[Frontend-AuthContext]] |
| Bucket `assets` public, key đoán được theo pattern | Thấp với dữ liệu hiện tại | file của project nháp hoặc đã xoá mềm vẫn tải được nếu biết URL, [[Supabase-Storage]] |
| RLS không nằm trong migration | Trung bình | dựng DB mới có thể quên bật, [[Row-Level-Security]] |
| Bộ đếm rate limit trong bộ nhớ | Thấp | [[Rate-Limiting]] |
| Chưa có CI | Thấp | [[Roadmap]] |

Không bao giờ để `SUPABASE_SERVICE_ROLE_KEY` hoặc `GOOGLE_CLIENT_SECRET` ra frontend, repo hay log ([[Environment-Variables]]). Kiểm tra lịch sử git chưa từng commit file `.env`.
