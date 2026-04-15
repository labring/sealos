import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    conditions: ['node', 'import', 'default']
  },
  test: {
    globals: true,
    environment: 'node',
    include: ["src/__tests__/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".next"]
  }
});
