import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'components',
          globals: true,
          passWithNoTests: true,
          include: ['__tests__/components/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['node_modules', 'dist', 'src-server/**'],
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
