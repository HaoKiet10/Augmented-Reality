---
title: Asset-Transform
tags: [ar, business]
---

# Asset-Transform

Mỗi asset có trường JSON `transform` ([[Database-Schema]]):

```json
{ "position": {"x":0,"y":0,"z":0},
  "rotation": {"x":0,"y":0,"z":0},
  "scale":    {"x":1,"y":1,"z":1} }
```

- Asset mới upload có `transform` mặc định: `position` lệch ngẫu nhiên nhẹ trong khoảng ±0.15 ở trục x và z (để các asset không chồng khít lên nhau), `y = 0`, `rotation` bằng 0, `scale` bằng 1. Với ảnh, backend còn lưu `width`/`height` gốc để vẽ đúng tỉ lệ khung hình ([[Upload-Validation]]).
- Cả ba vector bắt buộc, mỗi vector có đủ `x`, `y`, `z` kiểu số; field lạ bị từ chối ([[Backend]] dùng `forbidNonWhitelisted`).
- Lưu bằng `PATCH /projects/:id/assets/:assetId/transform` ([[API-Assets]]). Trình chỉnh gọi qua `useAssetTransform` / `useSpatialSave` ([[Project-Editor]]).
- Mobile nhận cùng cấu trúc trong [[API-Public-Scan]] và đặt vật thể 3D tương ứng so với trigger image ([[Mobile-App]]).
- Đơn vị và gốc toạ độ phụ thuộc cảnh xem trước của trình chỉnh; khi viết phía mobile cần đối chiếu để hai bên khớp nhau (chưa có tài liệu quy ước chính thức; nên bổ sung ở đây).
