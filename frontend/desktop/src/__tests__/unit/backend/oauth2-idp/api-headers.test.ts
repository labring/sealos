import { applyOAuth2NoStoreHeaders } from '@/pages/api/auth/oauth2/utils';

describe('applyOAuth2NoStoreHeaders', () => {
  it('sets OAuth2 no-store cache headers', () => {
    const setHeader = jest.fn();
    const res = { setHeader } as any;

    applyOAuth2NoStoreHeaders(res);

    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
  });
});
