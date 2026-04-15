import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  optimizeDeps: {
    exclude: ['parse5']
  },
  resolve: {
    conditions: ['node', 'import', 'default']
  },
  test: {
    globals: true,
    environment: 'node',
    include: ["__tests__/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".next"],
    server: {
      deps: {
        exclude: ['parse5']
      }
    }
  }
});
