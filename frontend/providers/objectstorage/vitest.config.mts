import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  optimizeDeps: {
    exclude: ['parse5']
  },
  resolve: {
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
          include: ['__tests__/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['node_modules', 'dist', '.next', '__tests__/components/**'],
          passWithNoTests: true,
          server: {
            deps: {
              exclude: ['parse5']
            }
          }
        }
      },
      {
        extends: true,
        test: {
          name: 'components',
          globals: true,
          include: ['__tests__/components/**/*.{test,spec}.{ts,tsx}'],
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
