# Augmented Reality Project

Hệ thống AR gồm 3 phần: **web designer tool** (tạo/quản lý project AR), **backend API**, và **mobile app** (end-user quét trigger image, xem nội dung AR).

## Kiến trúc tổng quan

```
Augmented Reality/           (repo này)
├── frontend/    Web designer tool — React + TypeScript + Vite + Tailwind
└── backend/     REST API — NestJS + Prisma + Supabase (Postgres + Storage)

ARMobile/                    (repo riêng: github.com/HaoKiet10/ARMobile)
                 App quét AR — React Native + native module ARCore tự viết
```

**Luồng hoạt động:**
1. Designer đăng nhập web, tạo project, upload **trigger image** (ảnh dùng để quét)
2. Designer upload asset (model 3D `.glb`, ảnh, hoặc video) và định vị trên `InspectorSidebar`
3. Designer bấm **Publish** — backend validate đủ điều kiện (có trigger image + ít nhất 1 asset), rồi **dựng lại database nhận diện** (`.imgdb`) gồm trigger image của mọi project đã publish (xem [Database nhận diện ảnh](#database-nhận-diện-ảnh-imgdb))
4. End-user mở mobile app — app tải 1 file database nhận diện, **không cần nhập Project ID**, chỉ cần đưa camera vào trigger image bất kỳ
5. ARCore nhận ra ảnh nào thì app gọi route public lấy asset của project đó, hiển thị đè lên trigger image qua camera

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
| `GET` | `/public/trigger-db` | ❌ | Database nhận diện (`.imgdb`) dựng sẵn cho mobile: `{ version, url, sha256, size, triggers }` |
| `GET` | `/public/projects/:id` | ❌ | Route public cho mobile app quét, chỉ trả project đã publish |
| `GET` | `/public/projects` | ❌ | Danh sách trigger image đã publish — chỉ còn để tương thích app bản cũ |

- **Chạy dev:**
  ```bash
  pnpm --filter backend dev
  ```
- **Migrate DB:**
  ```bash
  pnpm --filter backend exec prisma migrate dev
  ```

## Database nhận diện ảnh (`.imgdb`)

ARCore cần một **AugmentedImageDatabase** để nhận diện trigger image. Đây *không* phải database kiểu SQL: nó là bộ "dấu vân tay" (feature point) trích ra từ từng ảnh, mỗi ảnh gắn 1 tên (ở đây = project id). File `.imgdb` là bộ đó được serialize ra đĩa.

Database được **dựng trên server**, không dựng trên điện thoại (`backend/src/modules/project/trigger-db.service.ts`):

1. Mỗi khi tập trigger image của project đã publish thay đổi — publish, unpublish, đổi/xoá trigger image, xoá project đang publish — và lúc server khởi động, `TriggerDbService` được hẹn dựng lại (gom các thay đổi trong 3 giây, mỗi lúc chỉ 1 lần dựng). `version` = hash của danh sách project + URL ảnh; không đổi thì bỏ qua.
2. Tải từng trigger image → đè lên nền trắng (PNG trong suốt làm ARCore mất feature) → thu nhỏ còn tối đa 1024px (`sharp`).
3. `arcoreimg eval-img` chấm từng ảnh. Ảnh ARCore **không dùng được** (thiếu keypoint) bị loại kèm lý do — vì `arcoreimg build-db` làm hỏng **cả** database nếu có dù chỉ 1 ảnh như vậy. Ảnh điểm < 75 vẫn được dùng nhưng có log cảnh báo.
4. `arcoreimg build-db` → upload lên Supabase Storage `assets/trigger-db/<version>.imgdb` → lưu `{ version, url, sha256, triggers, skipped }` vào bảng `Configuration` (key `triggerDb`) → xoá file của bản trước.
5. Mobile gọi `GET /public/trigger-db`, tải file, **kiểm tra HTTP 200 + sha256** rồi mới lưu cache và deserialize. File tải lỗi/cụt không bao giờ vào cache.

**Lưu ý:**
- Chiều rộng danh nghĩa ghi vào database là **0.15 m** (`NOMINAL_MARKER_WIDTH_M` ở backend) — phải khớp `NOMINAL_MARKER_WIDTH` trong `ARScanScreen.tsx` của mobile.
- Đổi cách tiền xử lý ảnh thì tăng `BUILD_FORMAT` trong `trigger-db.service.ts` để mọi máy tải database mới.
- Project bị loại khỏi database (ảnh 404, ảnh quá ít chi tiết...) xem ở log server (`Bỏ ảnh trigger của project ...`) hoặc field `skipped` trong bảng `Configuration`.
- `arcoreimg` là tool Linux của Google, được tải vào image Docker (`backend/Dockerfile`, ghim theo commit). Chạy backend local trên Windows thì tải `arcoreimg.exe` từ [arcore-android-sdk/tools/arcoreimg](https://github.com/google-ar/arcore-android-sdk/tree/main/tools/arcoreimg) và đặt biến môi trường `ARCOREIMG_PATH` trỏ tới nó — thiếu tool thì server log lỗi và `/public/trigger-db` trả 503.

## Mobile app (repo `ARMobile`)

- **Stack:** React Native 0.86 (Android) + native module ARCore tự viết (`android/.../artracking/`: `ArCameraView`, `OverlayRenderer`, `GlbRenderer`) — đã gỡ `react-viro`
- **Repo riêng**, không nằm trong pnpm workspace của repo này (xem phần dưới)

### Luồng trong app (`src/`)

1. `ARScanScreen.tsx` — gọi `GET /public/trigger-db`, truyền `{ version, url, sha256 }` xuống native qua prop `triggerDbJson`
2. `ArCameraView` (native) — tải + kiểm tra sha256 file `.imgdb` (lần sau dùng cache), nạp vào ARCore, báo `ArAnchorFound`/`ArAnchorRemoved` theo tên ảnh (= project id)
3. Nhận ra project nào thì gọi `GET /public/projects/:id` và truyền asset qua prop `overlayJson` để native vẽ:
   - `.glb` → model 3D (`GlbRenderer`; `.gltf` dạng text / `.obj` / `.vrx` chưa hỗ trợ)
   - `.png`/`.jpg`/`.jpeg`/`.gif`/`.webp` → ảnh phẳng
   - `.mp4`/`.mov`/`.m4v`/`.webm` → video

### Vì sao mobile tách khỏi pnpm workspace

Mobile cần đúng `react@19.2.3` (bản react-native 0.86 đóng gói sẵn), trong khi `frontend` cần `react@^19.2.6` — 2 khoảng version không giao nhau. Gộp chung 1 workspace khiến pnpm phải tạo 2 bản `react` vật lý khác nhau, Metro bundler resolve không nhất quán → lỗi `Cannot read property 'useState' of null` (2 instance React khác nhau tồn tại song song trong bundle).

`pnpm-workspace.yaml` ở root vẫn giữ dòng loại trừ tường minh (phòng khi clone mobile vào trong repo này):
```yaml
packages:
  - "frontend"
  - "backend"
  - "!mobile"
```

### Setup máy mới — các điểm dễ vướng

| Vấn đề | Cách xử lý |
|---|---|
| JDK sai version | Bắt buộc JDK 17 (không phải bản mới hơn) cho Gradle — set `org.gradle.java.home` trong `android/gradle.properties` |
| Thiếu `com.google.ar.core` meta-data | `AndroidManifest.xml` cần `<meta-data android:name="com.google.ar.core" android:value="required" />` trong `<application>`, thiếu sẽ báo nhầm "This device does not support AR" |
| Native module AR không autolink | `ArTrackingPackage` phải được add thủ công trong `MainApplication.kt` (bên trong `packageList` của `reactHost`, không phải hàm `getPackages()` đã lỗi thời với kiến trúc bridgeless) |
| App báo "đang chuẩn bị dữ liệu nhận diện" | `/public/trigger-db` trả 503: server chưa dựng xong database lần đầu (vài giây sau khi khởi động) hoặc thiếu `arcoreimg` — xem log backend |
| Cổng ADB (5037) bị chiếm | VS Code (extension React Native Tools) hay tự chiếm cổng — đóng VS Code nếu `adb` báo `protocol fault` |

- **Chạy:**
  ```bash
  cd ARMobile
  pnpm install
  pnpm exec react-native start
  # cửa sổ khác:
  adb reverse tcp:8081 tcp:8081
  pnpm exec react-native run-android
  ```

## Package manager

Toàn bộ workspace dùng **pnpm** (ghim version qua `packageManager` trong `package.json` root). Cài đặt từ root:
```bash
pnpm install
```