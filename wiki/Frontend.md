---
title: Frontend
tags: [frontend]
---

# Frontend

Web designer tool: React + TypeScript + Vite + Tailwind CSS. Deploy trên Vercel ([[Deployment]]).

- Thư mục: `frontend/src` gồm `pages/`, `components/`, `context/`, `config.ts`.
- `config.ts` xuất `API_URL`, địa chỉ backend (lấy từ biến `VITE_API_URL`, xem [[Environment-Variables]]).
- Trang được tải lười (`lazy`) và bọc `Suspense`.
- Form dùng `zod` để validate phía client; icon dùng `lucide-react`.
- Trình chỉnh project là phần lớn nhất: [[Project-Editor]].
- Routing và quyền truy cập: [[Frontend-Routes]]. Trạng thái đăng nhập: [[Frontend-AuthContext]].

## Trang và component liên quan đến tài khoản
`Login`, `Signup`, `ForgotPassword`, `ResetPassword`, `OAuthCallback`, `Profile`; component dùng chung `AuthCard`, `GoogleButton`, `ProtectedRoute`. Luồng đằng sau chúng: [[Auth-Tokens]], [[Auth-Google-OAuth]], [[Auth-Password-Reset]], [[API-Users]].

Liên quan: [[Backend]] · [[Architecture]] · [[Dev-Setup]]
