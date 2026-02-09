import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

import prettierConfig from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'check_api.js',
      'playwright.config.ts',
      'public/sw.js',
      'scripts/**',
    ],
  },
  ...nextVitals,
  ...nextTs,
  prettierConfig,
]);

export default eslintConfig;
