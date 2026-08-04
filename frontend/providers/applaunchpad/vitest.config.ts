import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  test: {
    globals: false,
    environment: 'jsdom',
    setupFiles: [resolve(__dirname, '__tests__/setup.ts')]
  }
});
