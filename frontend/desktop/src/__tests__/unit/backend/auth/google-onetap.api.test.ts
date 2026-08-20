import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyIdToken = vi.fn();
const getPayload = vi.fn();

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn(function () {
    return {
      verifyIdToken
    };
  })
}));

vi.mock('@/services/enable', () => ({
  enableGoogle: vi.fn(() => true)
}));

vi.mock('@/services/backend/persistImage', () => ({
  persistImage: vi.fn(() => Promise.resolve('persisted-avatar'))
}));

vi.mock('@/services/backend/globalAuth', () => ({
  getGlobalToken: vi.fn()
}));

import handler from '@/pages/api/auth/google/onetap';
import { persistImage } from '@/services/backend/persistImage';
import { getGlobalToken } from '@/services/backend/globalAuth';

const mockPersistImage = vi.mocked(persistImage);
const mockGetGlobalToken = vi.mocked(getGlobalToken);

const createMockRes = () => {
  const res: any = {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader: vi.fn((name: string, value: string | string[]) => {
      res.headers[name] = value;
    }),
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((payload: unknown) => {
      res.body = payload;
      return res;
    }),
    end: vi.fn(() => res)
  };
  return res;
};

const setAppConfig = (oneTapOrigins = ['https://www.example.com']) => {
  (global as any).AppConfig = {
    desktop: {
      auth: {
        idp: {
          google: {
            clientID: 'google-client-id',
            oneTapOrigins
          }
        }
      }
    }
  };
};

describe('google onetap api handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAppConfig();
    getPayload.mockReturnValue({
      sub: 'google-sub',
      name: 'Ada Lovelace',
      picture: 'https://example.com/avatar.png',
      email: 'ada@example.com',
      email_verified: true
    });
    verifyIdToken.mockResolvedValue({ getPayload });
    mockGetGlobalToken.mockResolvedValue({
      token: 'global-token',
      user: {
        name: 'Ada',
        avatar: 'persisted-avatar',
        userUid: 'user-uid'
      },
      needInit: false
    });
  });

  it('allows preflight from configured One Tap origin', async () => {
    const req: any = {
      method: 'OPTIONS',
      headers: {
        origin: 'https://www.example.com'
      }
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://www.example.com');
    expect(res.headers['Access-Control-Allow-Credentials']).toBe('true');
    expect(res.headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');
    expect(res.headers['Access-Control-Allow-Headers']).toBe('Content-Type');
    expect(res.headers.Vary).toBe('Origin');
    expect(res.end).toHaveBeenCalled();
  });

  it('rejects forbidden origins before verifying Google token', async () => {
    const req: any = {
      method: 'POST',
      headers: {
        origin: 'https://evil.example.com'
      },
      body: {
        credential: 'credential'
      }
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.body).toMatchObject({
      code: 403,
      message: 'Forbidden origin'
    });
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('returns 400 when credential is missing', async () => {
    const req: any = {
      method: 'POST',
      headers: {
        origin: 'https://www.example.com'
      },
      body: {}
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.body).toMatchObject({
      code: 400,
      message: 'credential is invalid'
    });
  });

  it('signs in with verified Google payload and sets shared auth cookie', async () => {
    const req: any = {
      method: 'POST',
      headers: {
        origin: 'https://www.example.com',
        'x-forwarded-proto': 'https'
      },
      body: {
        credential: 'credential'
      }
    };
    const res = createMockRes();

    await handler(req, res);

    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'credential',
      audience: 'google-client-id'
    });
    expect(mockPersistImage).toHaveBeenCalledWith(
      'https://example.com/avatar.png',
      'avatar/GOOGLE/google-sub'
    );
    expect(mockGetGlobalToken).toHaveBeenCalledWith({
      provider: 'GOOGLE',
      providerId: 'google-sub',
      name: 'Ada Lovelace',
      avatar_url: 'persisted-avatar',
      email: 'ada@example.com'
    });
    expect(res.body).toMatchObject({
      code: 200,
      data: {
        token: 'global-token'
      }
    });
    expect(res.headers['Set-Cookie']).toContain('sealos_auth_token=global-token');
    expect(res.headers['Set-Cookie']).toContain('HttpOnly');
    expect(res.headers['Set-Cookie']).toContain('Secure');
    expect(res.headers['Set-Cookie']).toContain('SameSite=Lax');
  });

  it('does not pass unverified email into account binding', async () => {
    getPayload.mockReturnValue({
      sub: 'google-sub',
      name: 'Ada Lovelace',
      picture: '',
      email: 'ada@example.com',
      email_verified: false
    });
    const req: any = {
      method: 'POST',
      headers: {
        origin: 'https://www.example.com'
      },
      body: {
        credential: 'credential'
      }
    };
    const res = createMockRes();

    await handler(req, res);

    expect(mockGetGlobalToken).toHaveBeenCalledWith({
      provider: 'GOOGLE',
      providerId: 'google-sub',
      name: 'Ada Lovelace',
      avatar_url: '',
      email: undefined
    });
  });

  it('returns 401 when Google token verification fails', async () => {
    verifyIdToken.mockRejectedValue(new Error('bad token'));
    const req: any = {
      method: 'POST',
      headers: {
        origin: 'https://www.example.com'
      },
      body: {
        credential: 'credential'
      }
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.body).toMatchObject({
      code: 401,
      message: 'Unauthorized'
    });
  });
});
