import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      // Cho phép biến/tham số bắt đầu bằng "_" khi cố ý không dùng; `const { password, ...rest } = user` để bỏ field
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      // Code hiện có nhiều `any` (req.user, catch, mock trong test) — cảnh báo để dọn dần, không chặn lint
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]);
