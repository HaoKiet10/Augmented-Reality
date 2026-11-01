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
- Mobile nhận cùng cấu trúc trong [[API-Public-Scan]] và đặt asset tương ứng so với trigger image ([[Mobile-App]]).

## Quy ước đơn vị và trục
- **Đơn vị tương đối theo bề rộng trigger image**, không phải mét: `scale = 1` là rộng bằng 100% ảnh, `scale = 0.5` là 50%; `position = 0` là tâm ảnh. Designer không cần đo kích thước thật, overlay vẫn đúng tỉ lệ dù ảnh in to hay nhỏ.
- Mobile nhân với bề rộng danh nghĩa 0.15 m — cùng số backend ghi vào database nhận diện ([[Trigger-Database]]).
- Hệ trục editor (A-Frame): ảnh trigger nằm trong mặt XY, x phải, y lên, z ra khỏi mặt ảnh, gốc ở tâm. Rotation là độ, áp theo thứ tự Euler `YXZ` của A-Frame; mobile phải giữ đúng thứ tự này.
- Model `.glb`: scale nhân lên kích thước gốc của file (mét theo glTF).
- Công thức đổi sang hệ marker ARCore: wiki repo ARMobile, note `Coordinate-Conversion`.
