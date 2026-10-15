---
title: Module-Project
tags: [backend, ar]
---

# Module-Project

`backend/src/modules/project/`.

| Thành phần | Việc |
|---|---|
| `ProjectController` | CRUD project, trigger image, publish/unpublish → [[API-Projects]] |
| `AssetController` | CRUD asset, transform, duplicate, restore → [[API-Assets]] |
| `ScanController` | Route public cho mobile → [[API-Public-Scan]] |
| `ProjectService` | Logic project; `publish` kiểm tra điều kiện ([[Publish-Flow]]); `findPublishedForScan` |
| `AssetService` | Logic asset; giới hạn tổng 5 MB mỗi project |
| `StorageService` | Làm việc với [[Supabase-Storage]] |
| `asset-validation.ts` | Whitelist loại file + kiểm tra magic bytes → [[Upload-Validation]] |
| DTO | `CreateProjectDto`, `UpdateProjectDto`, `UpdateAssetTransformDto` |

Quyền sở hữu: mọi method nhận `designerId` lấy từ JWT, nên designer chỉ thao tác trên project của chính mình. `UpdateProjectDto` chỉ cho sửa `name`, `description`, `lastOpenedAt`; `status` chỉ đổi qua publish/unpublish.

Dữ liệu: [[Database-Schema]]. Giao diện dùng nó: [[Project-Editor]].
