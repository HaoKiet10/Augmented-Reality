---
title: Rate-Limiting
tags: [security, backend]
---

# Rate-Limiting

Dùng `@nestjs/throttler`, đăng ký trong `app.module.ts` ([[Backend]]).

- **Mặc định toàn app:** 20 request/phút/IP, qua `ThrottlerGuard` đăng ký làm `APP_GUARD`.
- **Chặt hơn, 5 request/phút/IP** cho: `login`, `signup`, `forgot-password`, `reset-password` ([[API-Auth]]). Đây là các điểm có thể bị đoán mật khẩu, dò email đã đăng ký, hoặc đoán token.
- Quá giới hạn → HTTP 429. Frontend đổi thành câu "Too many attempts. Please wait a minute…" ([[Frontend-AuthContext]]).
- Response có header `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- Bộ đếm lưu trong bộ nhớ của tiến trình: chạy nhiều instance thì mỗi instance đếm riêng. Cần kho dùng chung (ví dụ Redis) nếu scale ngang.
- Route public cho mobile ([[API-Public-Scan]]) cũng chịu giới hạn mặc định; nhiều thiết bị chung một IP (ví dụ cùng mạng Wi-Fi) có thể chạm trần.

Liên quan: [[Security-Notes]].
