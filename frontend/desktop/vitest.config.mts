import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      '@sealos/shadcn-ui/button': new URL(
        '../packages/shadcn-ui/src/components/ui/button.tsx',
        import.meta.url
      ).pathname
    },
    conditions: ['node', 'import', 'default']
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          globals: true,
          environment: 'node',
          include: ['src/__tests__/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['node_modules', 'dist', '.next', 'src/__tests__/components/**'],
          passWithNoTests: true
        }
      },
      {
        extends: true,
        // 浏览器测试不能沿用 Node 条件，否则 Chakra/tslib 会解析到不兼容的入口。
        resolve: { conditions: ['module', 'browser', 'import', 'default'] },
        test: {
          name: 'components',
          globals: true,
          include: ['src/__tests__/components/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['node_modules', 'dist', '.next'],
          passWithNoTests: true,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }]
          }
        }
      }
    ]
  }
});
