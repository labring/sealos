import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackDesktopNewUser } from '@/services/backend/tracking';

const payload = {
  userUid: '11111111-2222-3333-4444-555555555555',
  clientId: 'desktop-client',
  accountAgeDays: 0,
  region: 'https://bja.example.test'
};

const setLayout = (layout: unknown) => {
  (global as any).AppConfig = {
    desktop: { layout },
    common: {},
    tracking: {}
  };
};

describe('trackDesktopNewUser', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true } as Response))
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (global as any).AppConfig;
  });

  it('does nothing when rybbit is not configured', async () => {
    setLayout({ rybbitHost: null, rybbitSiteId: null });
    await expect(trackDesktopNewUser(payload)).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('identifies the account then reports the event once', async () => {
    setLayout({ rybbitHost: 'https://rybbit.example.test/', rybbitSiteId: 'site-1' });
    await trackDesktopNewUser(payload);
    expect(fetch).toHaveBeenCalledTimes(2);
    const [identifyUrl, identifyInit] = vi.mocked(fetch).mock.calls[0];
    const [trackUrl, trackInit] = vi.mocked(fetch).mock.calls[1];
    expect(identifyUrl).toBe('https://rybbit.example.test/identify');
    expect(JSON.parse(String(identifyInit?.body))).toMatchObject({
      site_id: 'site-1',
      user_id: payload.userUid,
      is_new_identify: true
    });
    expect(trackUrl).toBe('https://rybbit.example.test/track');
    expect(JSON.parse(String(trackInit?.body))).toMatchObject({
      site_id: 'site-1',
      hostname: 'bja.example.test',
      type: 'custom_event',
      event_name: 'desktop_new_user',
      user_id: payload.userUid,
      properties: {
        client_id: 'desktop-client',
        account_age_days: '0',
        region: 'https://bja.example.test'
      }
    });
  });

  it('swallows delivery failures instead of rejecting', async () => {
    setLayout({ rybbitHost: 'https://rybbit.example.test', rybbitSiteId: 'site-1' });
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));
    await expect(trackDesktopNewUser(payload)).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
