import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_NAME } from '../../../../../packages/client-sdk/src/constants';
import { createMasterAPP, masterApp } from '../../../../../packages/client-sdk/src/master';

afterEach(() => vi.unstubAllGlobals());

describe('SDK event sender context', () => {
  it('passes the browser supplied source and origin to the relay and acknowledges once', async () => {
    const listeners = new Map<string, (event: unknown) => void>();
    const source = { postMessage: vi.fn() };
    const origin = 'https://brain.usw-1.sealos.io';
    vi.stubGlobal('window', {
      location: { origin: 'https://usw-1.sealos.io' },
      addEventListener: (name: string, listener: (event: unknown) => void) =>
        listeners.set(name, listener),
      removeEventListener: (name: string) => listeners.delete(name)
    });
    const cleanup = createMasterAPP({
      allowedOrigins: [origin],
      getWorkspaceQuotaApi: async () => []
    });
    const handler = vi.fn(() => ({ accepted: true }));
    masterApp.addEventListen('trackAnalyticsEvent', handler);
    const payload = { event: 'deployment_create', module: 'brain', source: 'forged' };
    try {
      listeners.get('message')?.({
        origin,
        source,
        data: {
          apiName: API_NAME.EVENT_BUS,
          messageId: 'event-1',
          data: { eventName: 'trackAnalyticsEvent', eventData: payload }
        }
      });
      await Promise.resolve();
      expect(handler).toHaveBeenCalledExactlyOnceWith(payload, { source, origin });
      expect(source.postMessage).toHaveBeenCalledExactlyOnceWith(
        {
          masterOrigin: 'https://usw-1.sealos.io',
          messageId: 'event-1',
          success: true,
          message: '',
          data: { accepted: true }
        },
        { targetOrigin: origin }
      );
      listeners.get('message')?.({
        origin: 'https://untrusted.example',
        source,
        data: {
          apiName: API_NAME.EVENT_BUS,
          messageId: 'event-2',
          data: { eventName: 'trackAnalyticsEvent', eventData: payload }
        }
      });
      expect(handler).toHaveBeenCalledTimes(1);
    } finally {
      cleanup?.();
    }
  });
});
