const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * Cấu hình thêm để Metro hiểu đúng symlink của pnpm — mặc định Metro không
 * tự "leo theo" symlink để tìm module thật, gây lỗi "Unable to resolve module"
 * dù file thực tế đã tồn tại trong .pnpm store.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Cho phép Metro tự theo dõi symlink thay vì coi node_modules là "kín"
    unstable_enableSymlinks: true,
    // Cho phép resolve package ra ngoài phạm vi thư mục mobile/ (tới root workspace)
    unstable_enablePackageExports: true,
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '..', 'node_modules'),
    ],
  },
  watchFolders: [
    // Cho Metro theo dõi cả node_modules ở root workspace (nơi pnpm hoist thật)
    path.resolve(__dirname, '..', 'node_modules'),
  ],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);