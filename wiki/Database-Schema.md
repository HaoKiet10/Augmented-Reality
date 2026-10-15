---
title: Database-Schema
tags: [database]
---

# Database-Schema

PostgreSQL trên Supabase, định nghĩa trong `backend/prisma/schema.prisma` ([[Prisma-Setup]]).

```mermaid
erDiagram
    User ||--o{ Project : "designerId"
    User ||--o{ Asset : "uploadedBy"
    User ||--o{ RefreshToken : "sở hữu"
    User ||--o{ PasswordResetToken : "sở hữu"
    Project ||--o{ Asset : "chứa"

    User {
        string id PK
        string email UK
        string password "nullable, Google-only thì null"
        string googleId UK "nullable"
        string name
        string role "designer hoặc admin"
        string avatarUrl
        datetime createdAt
        datetime updatedAt
    }
    Project {
        string id PK
        string name
        string description
        string status "draft, published, archived"
        string triggerImage "storage key"
        string triggerImageUrl
        datetime publishedAt
        datetime lastOpenedAt
        string designerId FK
    }
    Asset {
        string id PK
        string filename
        string fileType "MIME"
        int fileSize
        string storageKey
        string url
        int width
        int height
        json transform "position, rotation, scale"
        datetime deletedAt "xoá mềm"
        string projectId FK
        string uploadedBy FK
    }
    RefreshToken {
        string id PK
        string userId FK
        string tokenHash UK "sha256"
        boolean revoked
        datetime expiresAt
    }
    PasswordResetToken {
        string id PK
        string userId FK
        string tokenHash UK "sha256"
        datetime usedAt
        datetime expiresAt
    }
```

Bảng `Configuration` độc lập, chưa thấy code dùng nên không vẽ ở đây.

Mọi quan hệ từ User đều `onDelete: Cascade`; xoá Project cũng xoá Asset của nó.

## User
`id` (uuid), `email` (unique), `password` (**nullable**: tài khoản Google-only không có), `googleId` (unique, nullable), `name`, `role` (mặc định `designer`; có thể là `admin`), `avatarUrl`, `createdAt`, `updatedAt`. → [[Module-User]], [[Auth-Google-OAuth]]

## RefreshToken
`tokenHash` (sha256, unique; không lưu token thô), `revoked`, `expiresAt`. → [[Auth-Tokens]]

## PasswordResetToken
`tokenHash` (unique), `usedAt`, `expiresAt`. Dùng một lần, hạn 1 giờ. → [[Auth-Password-Reset]]

## Project
`name`, `description`, `status` (`draft` / `published` / `archived`), `triggerImage` (storage key), `triggerImageUrl`, `publishedAt`, `lastOpenedAt`, `designerId`. → [[Module-Project]], [[Publish-Flow]]

## Asset
`filename`, `fileType` (MIME), `fileSize`, `storageKey`, `url`, `width`/`height` (chỉ ảnh), `transform` (JSON `{position, rotation, scale}`), `deletedAt` (**xoá mềm**: file vật lý vẫn còn để khôi phục), `projectId`, `uploadedBy`. → [[Asset-Transform]], [[Supabase-Storage]]

Bảo vệ truy cập trực tiếp: [[Row-Level-Security]].
