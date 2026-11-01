import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      // Cho phép biến/tham số bắt đầu bằng "_" khi cố ý không dùng; `const { a, ...rest } = obj` để bỏ field
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      // Code hiện có nhiều `any` (response API, catch) — cảnh báo để dọn dần, không chặn lint
      '@typescript-eslint/no-explicit-any': 'warn',
      // Rule thời React Compiler: các chỗ bị báo vẫn chạy đúng (load data khi mount, đồng bộ ref),
      // nhưng sửa cần refactor + test tay trong editor 3D — để warning, sửa dần
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      // AuthContext export cả provider lẫn hook useAuth — chỉ ảnh hưởng HMR khi dev
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
]);
