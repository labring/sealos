import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  esbuild: { jsx: 'automatic' },
  test: { environment: 'jsdom', pool: 'forks', include: ['__tests__/unit/**/*.test.{ts,tsx}'] }
});
