// @ts-nocheck - Vite config files may have type resolution issues with moduleResolution
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  optimizeDeps: {
    // Exclude parse5 from optimization to avoid ES module issues with jsdom
    exclude: ['parse5']
  },
  resolve: {
    conditions: ['node', 'import', 'default']
  },
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['**/__tests__/unit/**', 'node'],
      ['**/__tests__/e2e/**', 'node'],
      ['**/__tests__/components/**', 'jsdom']
    ],
    include: ['__tests__/**/*.{test,spec}.{ts,tsx}'],
    // Exclude node_modules
    exclude: ['node_modules', 'dist', '.next'],
    server: {
      deps: {
        // Exclude parse5 from dependency optimization
        exclude: ['parse5']
      }
    }
  }
});
