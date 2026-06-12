// @ts-nocheck - Vite config files may have type resolution issues with moduleResolution
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  optimizeDeps: {
    include: ['@tanstack/react-query', '@testing-library/react', 'next-i18next', 'next/router'],
    // Exclude parse5 from optimization to avoid ES module issues with jsdom
    exclude: ['parse5']
  },
  resolve: {
    conditions: ['node', 'import', 'default'],
    alias: [
      {
        find: '@',
        replacement: resolve(__dirname, 'src')
      },
      {
        find: /^@sealos\/shadcn-ui\/shadcn\.css$/,
        replacement: resolve(__dirname, '../../packages/shadcn-ui/src/styles/shadcn.css')
      },
      {
        find: /^@sealos\/shadcn-ui\/styles\.css$/,
        replacement: resolve(__dirname, '../../packages/shadcn-ui/src/styles/styles.css')
      },
      {
        find: /^@sealos\/shadcn-ui\/(.+)$/,
        replacement: resolve(__dirname, '../../packages/shadcn-ui/src/components/ui/$1.tsx')
      }
    ]
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['__tests__/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['node_modules', 'dist', '.next', '__tests__/components/**'],
          server: {
            deps: {
              // Exclude parse5 from optimization to avoid ES module issues with jsdom
              exclude: ['parse5']
            }
          }
        }
      },
      {
        extends: true,
        test: {
          name: 'components',
          include: ['__tests__/components/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['node_modules', 'dist', '.next'],
          passWithNoTests: true,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [
              {
                browser: 'chromium',
                viewport: {
                  width: 390,
                  height: 844
                }
              }
            ]
          }
        }
      }
    ]
  }
});
