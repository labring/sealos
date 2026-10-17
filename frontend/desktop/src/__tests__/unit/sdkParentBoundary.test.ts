import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSealosApp, sealosApp } from '../../../../packages/client-sdk/src/app';

describe('client SDK parent boundary', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends requests to the direct parent Desktop instead of the top-level host', async () => {
    const parentPostMessage = vi.fn();
    const topPostMessage = vi.fn();
    let messageListener: ((event: MessageEvent) => void) | undefined;

    vi.stubGlobal('window', {
      location: { origin: 'https://app.example.com' },
      parent: { postMessage: parentPostMessage },
      top: { postMessage: topPostMessage },
      addEventListener: vi.fn((type: string, listener: (event: MessageEvent) => void) => {
        if (type === 'message') messageListener = listener;
      }),
      removeEventListener: vi.fn()
    });

    const cleanup = createSealosApp();
    const sessionPromise = sealosApp.getSession();

    expect(parentPostMessage).toHaveBeenCalledOnce();
    expect(topPostMessage).not.toHaveBeenCalled();

    const [request, targetOrigin] = parentPostMessage.mock.calls[0];
    expect(targetOrigin).toBe('*');
    expect(messageListener).toBeDefined();

    messageListener?.({
      data: {
        messageId: request.messageId,
        success: true,
        data: { user: 'test-user' }
      },
      origin: 'https://desktop.example.com',
      source: {}
    } as MessageEvent);

    await expect(sessionPromise).resolves.toEqual({ user: 'test-user' });
    cleanup?.();
  });

  it.each([undefined, 'usd'] as const)(
    'preserves host config with currencySymbol=%s',
    async (currencySymbol) => {
      const postMessage = vi.fn();
      let listener: ((event: MessageEvent) => void) | undefined;
      vi.stubGlobal('window', {
        location: { origin: 'https://app.example.com' },
        parent: { postMessage },
        addEventListener: (_type: string, callback: (event: MessageEvent) => void) => {
          listener = callback;
        },
        removeEventListener: vi.fn()
      });
      const cleanup = createSealosApp();
      try {
        const pending = sealosApp.getHostConfig();
        const request = postMessage.mock.calls[0][0];
        expect(request.apiName).toBe('getHostConfig');
        const config = {
          cloud: { domain: 'example.com', port: '443', regionUid: 'region-1' },
          features: { subscription: true, analytics: true },
          ...(currencySymbol ? { currencySymbol } : {})
        };
        listener?.({
          data: { messageId: request.messageId, success: true, data: config },
          origin: 'https://desktop.example.com',
          source: {}
        } as MessageEvent);
        await expect(pending).resolves.toEqual(config);
      } finally {
        cleanup?.();
      }
    }
  );
});
