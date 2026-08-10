import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(cleanup);

if (!AbortSignal.timeout) {
  AbortSignal.timeout = (milliseconds: number) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), milliseconds);
    (timer as any).unref?.();
    return controller.signal;
  };
}
