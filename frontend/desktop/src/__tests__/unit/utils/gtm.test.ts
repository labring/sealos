import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gtmLoginSuccess } from '@/utils/gtm';

describe('gtmLoginSuccess', () => {
  beforeEach(() => {
    const dataLayer = [] as any[];
    dataLayer.push = vi.fn<(...items: any[]) => number>(() => 0) as any;

    Object.defineProperty(globalThis, 'window', {
      value: {
        dataLayer: dataLayer as any[] & { push: ReturnType<typeof vi.fn> }
      },
      writable: true,
      configurable: true
    });
  });

  it('pushes direct product user traits for GTM identify variables', () => {
    const push = vi.mocked(window.dataLayer.push);

    gtmLoginSuccess({
      method: 'oauth2',
      oauth2Provider: 'GITHUB',
      user_type: 'existing',
      productUserTraits: {
        user_username: 'octocat',
        user_name: 'Octo Cat',
        user_email: 'octo@example.com'
      }
    });

    expect(push).toHaveBeenCalledWith({
      event: 'login_success',
      method: 'oauth2',
      oauth2_provider: 'GITHUB',
      user_type: 'existing',
      module: 'auth',
      context: 'app',
      user_username: 'octocat',
      user_name: 'Octo Cat',
      user_email: 'octo@example.com'
    });
  });

  it('clears direct trait keys when product user traits are unavailable', () => {
    const push = vi.mocked(window.dataLayer.push);

    gtmLoginSuccess({
      method: 'email',
      user_type: 'new'
    });

    expect(push).toHaveBeenCalledWith({
      event: 'login_success',
      method: 'email',
      oauth2_provider: undefined,
      user_type: 'new',
      module: 'auth',
      context: 'app',
      user_username: '',
      user_name: '',
      user_email: ''
    });
  });
});
