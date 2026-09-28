import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gtmLoginSuccess, gtmWebsiteTokenLoginSuccess } from '@/utils/gtm';

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

  it('omits product user traits when they are not provided', () => {
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
      context: 'app'
    });
  });

  it('queues login events before the GTM script initializes', () => {
    window.dataLayer = undefined as unknown as any[];

    gtmLoginSuccess({
      method: 'oauth2',
      user_type: 'existing'
    });

    expect(window.dataLayer).toEqual([
      {
        event: 'login_success',
        method: 'oauth2',
        oauth2_provider: undefined,
        user_type: 'existing',
        module: 'auth',
        context: 'app'
      }
    ]);
  });

  it('records website email and Google One Tap token logins with the correct method', () => {
    const push = vi.mocked(window.dataLayer.push);
    const productUserTraits = { user_username: 'user', user_name: 'User', user_email: '' };

    gtmWebsiteTokenLoginSuccess({ source: 'email', userType: 'new', productUserTraits });
    gtmWebsiteTokenLoginSuccess({
      source: 'google_one_tap',
      userType: 'existing',
      productUserTraits
    });

    expect(push).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ event: 'login_success', method: 'email', user_type: 'new' })
    );
    expect(push).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        event: 'login_success',
        method: 'oauth2',
        oauth2_provider: 'GOOGLE',
        user_type: 'existing'
      })
    );
  });

  it('does not record region transfers or unrecognized token login metadata', () => {
    const push = vi.mocked(window.dataLayer.push);
    const productUserTraits = { user_username: 'user', user_name: 'User', user_email: '' };

    gtmWebsiteTokenLoginSuccess({ source: undefined, userType: 'new', productUserTraits });
    gtmWebsiteTokenLoginSuccess({ source: 'email', userType: undefined, productUserTraits });
    gtmWebsiteTokenLoginSuccess({ source: ['email'], userType: 'existing', productUserTraits });

    expect(push).not.toHaveBeenCalled();
  });
});
