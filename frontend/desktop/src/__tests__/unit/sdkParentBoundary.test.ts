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
});
