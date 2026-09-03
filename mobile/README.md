# Mobile — AR Scan App

App cho end-user quét trigger image và xem nội dung AR (model 3D/ảnh/video) do designer tạo trên web.

## Stack

- **React Native 0.86**
- **`@reactvision/react-viro`** (ViroReact) — wrapper ARCore (Android) / ARKit (iOS)

## ⚠️ Không nằm trong pnpm workspace của repo

`mobile` cần đúng `react@19.2.3` (bản `react-native` 0.86 đóng gói sẵn), trong khi `frontend` cần `react@^19.2.6` — 2 khoảng version không giao nhau. Nếu gộp chung 1 pnpm workspace, pnpm buộc phải tạo 2 bản `react` vật lý khác nhau, khiến Metro bundler resolve module không nhất quán → lỗi `Cannot read property 'useState' of null` (2 instance React tồn tại song song trong cùng 1 bundle).

Vì vậy `pnpm-workspace.yaml` ở root có dòng loại trừ tường minh:
```yaml
packages:
  - "frontend"
  - "backend"
  - "!mobile"
```

**Luôn `cd mobile` trước khi chạy bất kỳ lệnh `pnpm` nào** — không chạy `pnpm install`/`pnpm add` từ root cho phần mobile.

## Cài đặt

### Yêu cầu máy

| Công cụ | Ghi chú |
|---|---|
| Node.js | `>= 22.11.0` |
| JDK | **Bắt buộc đúng JDK 17** (không phải bản mới hơn) — AGP/NDK chưa tương thích JDK 24/25, gây lỗi `WARNING: A restricted method in java.lang.System has been called` khi build native (CMake) |
| Android Studio + SDK | Cho `sdk.dir` trong `local.properties` |
| Thiết bị Android thật | AR **không** chạy được trên emulator — cần camera + cảm biến thật, máy phải nằm trong danh sách hỗ trợ ARCore |

### Các bước

```bash
cd mobile
pnpm install
```

Set JDK 17 cho riêng Gradle build này (không đụng JDK mặc định của máy) — `android/gradle.properties`:
```properties
org.gradle.java.home=<đường dẫn tới JDK 17 trên máy bạn>
```

Set Android SDK — `android/local.properties`:
```properties
sdk.dir=<đường dẫn Android SDK trên máy bạn>
```

Chạy Metro (giữ cửa sổ này mở):
```bash
pnpm exec react-native start
```

Cửa sổ khác — map port + cài lên máy:
```bash
adb reverse tcp:8081 tcp:8081
pnpm exec react-native run-android
```

## Cấu hình API

Sửa `src/services/api.ts`, đổi `API_BASE_URL` thành địa chỉ backend thật. Nếu test qua USB với backend chạy local, dùng **IP LAN của máy tính**, không dùng `localhost` (điện thoại thật không tự trỏ về máy tính qua `localhost` được).

## Luồng trong app (`src/`)

| File | Vai trò |
|---|---|
| `screens/ProjectIdEntryScreen.tsx` | Nhập Project ID (tạm cho MVP — sau này thay bằng quét QR code hoặc deep link) |
| `screens/ARScanScreen.tsx` | Gọi `GET /public/projects/:id`, đăng ký trigger image, mở camera AR |
| `screens/ARSceneContent.tsx` | Khi camera nhận diện trigger image, render asset đè lên đúng vị trí |
| `services/api.ts` | Gọi API backend |
| `types/ar.ts` | Type khớp response backend |

## Định dạng asset hỗ trợ

Tự nhận diện qua đuôi file (`src/screens/ARSceneContent.tsx`):

| Đuôi file | Component Viro |
|---|---|
| `.glb`, `.gltf`, `.obj`, `.vrx` | `Viro3DObject` |
| `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` | `ViroImage` |
| `.mp4`, `.mov`, `.m4v` | `ViroVideo` (tự phát, lặp) |

## Quy ước vị trí/scale — số tương đối, không phải mét thật

Trigger image luôn được coi là **1 đơn vị chiều rộng chuẩn** (`NOMINAL_MARKER_WIDTH = 1.0` trong `ARSceneContent.tsx`). `position`/`scale` từ backend (do designer nhập trên `InspectorSidebar` bên web) là số tương đối theo đơn vị này:

- `scale: 1` → asset rộng bằng 100% chiều rộng ảnh trigger
- `scale: 0.5` → bằng 50%

Nhờ vậy overlay luôn hiện đúng tỉ lệ trên camera dù ảnh trigger được in/hiển thị ở kích thước thật bất kỳ — không cần designer đo/nhập kích thước thật ngoài đời (giống cách Artivive/MindAR hoạt động).

## `react-viro` không hỗ trợ autolinking

Phải link thủ công 2 chỗ (nếu tạo lại project từ đầu, xem chi tiết trong lịch sử commit hoặc tài liệu setup nội bộ):

1. **`android/settings.gradle`** — `include ':react_viro', ':arcore_client', ':gvr_common', ':viro_renderer'` + khai `projectDir` trỏ vào `node_modules/@reactvision/react-viro/android/...`
2. **`android/app/src/main/java/.../MainApplication.kt`** — đăng ký `ReactViroPackage` **bên trong** `packageList = PackageList(this).packages.apply { ... }` của `reactHost` (kiến trúc bridgeless của RN 0.86+ không còn dùng hàm `getPackages()` kiểu cũ)

Thiếu 1 trong 2 bước trên gây lỗi runtime `Cannot read property 'setJSAnimations' of null` hoặc `MaterialManager (NativeModules.VRTMaterialManager) is not available`.

## `AndroidManifest.xml` cần khai ARCore

Bên trong `<application>`:
```xml
<meta-data
    android:name="com.google.ar.core"
    android:value="required" />
```
Thiếu dòng này, ARCore báo lỗi gây hiểu lầm `"This device does not support AR"` dù máy hoàn toàn hỗ trợ.

## Vấn đề hay gặp: cổng ADB (5037) bị chiếm

VS Code (extension React Native Tools/Android) hay tự chiếm cổng 5037, gây lỗi `adb: protocol fault`. Đóng hẳn VS Code nếu gặp lỗi này khi chạy `adb start-server`.