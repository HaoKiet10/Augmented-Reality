# Augmented Reality Project

Hệ thống AR gồm 3 phần: **web designer tool** (tạo/quản lý project AR), **backend API**, và **mobile app** (end-user quét trigger image, xem nội dung AR).

## Kiến trúc tổng quan

```
Augmented Reality/
├── frontend/    Web designer tool — React + TypeScript + Vite + Tailwind
├── backend/     REST API — NestJS + Prisma + Supabase (Postgres + Storage)
└── mobile/      App quét AR — React Native + ViroReact (ARCore)
```

**Luồng hoạt động:**
1. Designer đăng nhập web, tạo project, upload **trigger image** (ảnh dùng để quét)
2. Designer upload asset (model 3D `.glb`, ảnh, hoặc video) và định vị trên `InspectorSidebar`
3. Designer bấm **Publish** — backend validate đủ điều kiện (có trigger image + ít nhất 1 asset)
4. End-user mở mobile app, nhập Project ID (sau này thay bằng quét QR/deep link), đưa camera vào trigger image
5. Mobile app tải asset qua route public, hiển thị đè lên trigger image qua camera

## `frontend/` — Web Designer Tool

- **Stack:** React + TypeScript + Vite + Tailwind CSS
- **Tính năng chính** (`src/pages/ProjectEditor/`):
  - Upload/xoá trigger image (`AssetSidebar/TriggerImagePanel.tsx`)
  - Upload/xoá/định vị asset — model 3D, ảnh, video (`AssetSidebar/`, `InspectorSidebar/`)
  - Publish/Unpublish project (`EditorHeader.tsx`)
- **Chạy dev:**
  ```bash
  pnpm --filter frontend dev
  ```

### Quy ước định vị asset (quan trọng)

Position/scale trên `InspectorSidebar` là **số tương đối theo chiều rộng trigger image**, KHÔNG phải mét thật:
- `scale = 1` → asset rộng bằng 100% chiều rộng ảnh trigger
- `scale = 0.5` → bằng 50%
- `position.x = 0` → giữa tâm ảnh trigger

Cách này (giống Artivive/MindAR) giúp designer không cần đo kích thước thật ngoài đời — overlay vẫn hiện đúng tỉ lệ trên camera dù ảnh trigger được in/hiển thị ở kích thước bất kỳ.

## `backend/` — REST API

- **Stack:** NestJS + Prisma ORM + PostgreSQL (Supabase) + Supabase Storage
- **Auth:** JWT, hầu hết route yêu cầu đăng nhập (designer), trừ route scan public

### Route chính (`src/modules/project/`)

| Method | Route | Auth | Mô tả |
|---|---|---|---|
| `GET/POST/PATCH/DELETE` | `/projects` | ✅ | CRUD project |
| `POST/DELETE` | `/projects/:id/trigger` | ✅ | Upload/xoá trigger image |
| `GET/POST/DELETE/PATCH` | `/projects/:id/assets` | ✅ | CRUD asset + cập nhật transform |
| `POST` | `/projects/:id/publish` | ✅ | Publish (validate đủ điều kiện) |
| `POST` | `/projects/:id/unpublish` | ✅ | Đưa về draft |
| `GET` | `/public/projects/:id` | ❌ | Route public cho mobile app quét, chỉ trả project đã publish |

- **Chạy dev:**
  ```bash
  pnpm --filter backend dev
  ```
- **Migrate DB:**
  ```bash
  pnpm --filter backend exec prisma migrate dev
  ```

## `mobile/` — App quét AR

- **Stack:** React Native 0.86 + `@reactvision/react-viro` (ViroReact — wrapper ARCore/ARKit)
- **Không nằm trong pnpm workspace của repo** (xem phần dưới) — luôn `cd mobile` trước khi chạy lệnh `pnpm`

### Luồng trong app (`src/`)

1. `ProjectIdEntryScreen.tsx` — nhập Project ID (tạm thời cho MVP, sau thay QR/deep link)
2. `ARScanScreen.tsx` — gọi `GET /public/projects/:id`, đăng ký trigger image
3. `ARSceneContent.tsx` — mở camera AR, khi nhận diện trigger image thì render asset:
   - `.glb`/`.gltf`/`.obj`/`.vrx` → `Viro3DObject` (model 3D)
   - `.png`/`.jpg`/`.jpeg`/`.gif`/`.webp` → `ViroImage` (ảnh phẳng)
   - `.mp4`/`.mov`/`.m4v` → `ViroVideo` (video tự phát, lặp)

### Vì sao `mobile/` tách khỏi pnpm workspace

`mobile` cần đúng `react@19.2.3` (bản react-native 0.86 đóng gói sẵn), trong khi `frontend` cần `react@^19.2.6` — 2 khoảng version không giao nhau. Gộp chung 1 workspace khiến pnpm phải tạo 2 bản `react` vật lý khác nhau, Metro bundler resolve không nhất quán → lỗi `Cannot read property 'useState' of null` (2 instance React khác nhau tồn tại song song trong bundle).

`pnpm-workspace.yaml` ở root có dòng loại trừ tường minh:
```yaml
packages:
  - "frontend"
  - "backend"
  - "!mobile"
```

### Setup máy mới — các điểm dễ vướng

| Vấn đề | Cách xử lý |
|---|---|
| JDK sai version | Bắt buộc JDK 17 (không phải bản mới hơn) cho Gradle — set `org.gradle.java.home` trong `mobile/android/gradle.properties` |
| Thiếu `com.google.ar.core` meta-data | `AndroidManifest.xml` cần `<meta-data android:name="com.google.ar.core" android:value="required" />` trong `<application>`, thiếu sẽ báo nhầm "This device does not support AR" |
| `react-viro` không autolink | Phải link thủ công qua `android/settings.gradle` (`include ':react_viro', ...`) và đăng ký `ReactViroPackage` trong `MainApplication.kt` (đúng bên trong `packageList` của `reactHost`, không phải hàm `getPackages()` đã lỗi thời với kiến trúc bridgeless) |
| Cổng ADB (5037) bị chiếm | VS Code (extension React Native Tools) hay tự chiếm cổng — đóng VS Code nếu `adb` báo `protocol fault` |

- **Chạy:**
  ```bash
  cd mobile
  pnpm install
  pnpm exec react-native start
  # cửa sổ khác:
  adb reverse tcp:8081 tcp:8081
  pnpm exec react-native run-android
  ```

## Package manager

Toàn bộ workspace (trừ `mobile/`) dùng **pnpm** (ghim version qua `packageManager` trong `package.json` root). Cài đặt từ root:
```bash
pnpm install
```