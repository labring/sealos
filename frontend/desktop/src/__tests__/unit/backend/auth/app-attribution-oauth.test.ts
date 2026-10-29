import { createHash } from 'crypto';
import { beginAnalyticsHandoff } from '@/services/backend/oauth2/analytics-cookie';

const mocks = vi.hoisted(() => ({
  db: {
    oAuthClient: { findUnique: vi.fn() },
    oAuthAuthorizationRequest: { findUnique: vi.fn(), updateMany: vi.fn() },
    user: { findUnique: vi.fn() },
    oAuthRefreshSession: { create: vi.fn() },
    $transaction: vi.fn()
  }
}));
vi.mock('@/services/backend/db/init', () => ({ globalPrisma: mocks.db }));
vi.mock('@/services/backend/auth', () => ({
  generateOAuth2AccessToken: vi.fn(() => 'access-token')
}));
import {
  decideCodeAuthorization,
  exchangeAuthorizationCode
} from '@/services/backend/oauth2/authorization-code';

const uid = 'b7fa951a-1683-4a43-82f0-a6e1089f96ea';
const visitor = '41781e2d-cf00-4b7c-8712-25aa7e47f2bf';
const origin = 'https://usw-1.sealos.io';
const verifier = 'v'.repeat(43);
const browserSecret = 'browser-secret';
const cookie = Buffer.from(
  JSON.stringify({
    version: 1,
    realm: 'global',
    visitor_id: visitor,
    consent: {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    }
  })
).toString('base64url');
const params = { client_id: 'sealos-io', state: 'state-test', analytics_consent: 'granted' };
let request: any;
describe('OAuth stays authoritative while optional metadata crosses the existing flow', () => {
  const previous = global.AppConfig;
  beforeEach(() => {
    vi.clearAllMocks();
    global.AppConfig = {
      desktop: {
        auth: {
          callbackURL: origin,
          jwt: { global: 'test-key' },
          oauth2idp: { enabled: true, authorizationCodeEnabled: true }
        }
      }
    } as any;
    request = {
      id: 'request-id',
      clientId: 'sealos-io',
      state: params.state,
      redirectUri: 'io.sealos.desktop:/callback',
      browserHash: createHash('sha256').update(browserSecret).digest('hex'),
      challenge: createHash('sha256').update(verifier).digest('base64url'),
      expiresAt: new Date(Date.now() + 600_000),
      status: 'PENDING',
      userUid: uid
    };
    mocks.db.$transaction.mockImplementation((run: any) => run(mocks.db));
    mocks.db.oAuthClient.findUnique.mockResolvedValue({
      clientId: 'sealos-io',
      clientType: 'PUBLIC',
      redirectUris: [request.redirectUri],
      allowedGrantTypes: ['authorization_code', 'refresh_token']
    });
    mocks.db.oAuthAuthorizationRequest.findUnique.mockImplementation(async () => request);
    mocks.db.oAuthAuthorizationRequest.updateMany.mockImplementation(async ({ data }: any) => {
      Object.assign(request, data);
      return { count: 1 };
    });
    mocks.db.user.findUnique.mockResolvedValue({ uid, id: '1234', nickname: 'Alice' });
    mocks.db.oAuthRefreshSession.create.mockResolvedValue({});
  });
  afterEach(() => {
    global.AppConfig = previous;
  });
  async function approve(metadata = true) {
    return decideCodeAuthorization(
      request.id,
      browserSecret,
      uid,
      true,
      metadata
        ? {
            token: beginAnalyticsHandoff(params, request.id, cookie, origin),
            cookie
          }
        : undefined
    );
  }
  async function exchange(redirect: string, extra = {}) {
    const url = new URL(redirect);
    return exchangeAuthorizationCode({
      client_id: 'sealos-io',
      code: url.searchParams.get('code')!,
      redirect_uri: request.redirectUri,
      code_verifier: verifier,
      analytics_token: url.searchParams.get('analytics_token') || '',
      ...extra
    });
  }
  it('approves then consumes the original code, and attaches the same verified UID', async () => {
    const result = await approve();
    expect(result.analytics_context?.subject_id).toBe(uid);
    const response = await exchange(result.redirect_uri);
    expect(response.access_token).toBe('access-token');
    expect(response.analytics_context?.visitor_id).toBe(visitor);
    expect(response.analytics_context?.subject_id).toBe(uid);
    expect(request.status).toBe('CONSUMED');
    expect(mocks.db.oAuthRefreshSession.create).toHaveBeenCalledTimes(1);
  });
  it.each(['', 'tampered'])(
    'invalid/missing analytics receipt %s leaves login successful and unmatched',
    async (token) => {
      const result = await approve();
      const response = await exchange(result.redirect_uri, { analytics_token: token });
      expect(response.access_token).toBe('access-token');
      expect(response).not.toHaveProperty('analytics_context');
    }
  );
  it('old Apps continue logging in without requesting metadata', async () => {
    const result = await approve(false);
    expect(result).not.toHaveProperty('analytics_context');
    expect(new URL(result.redirect_uri).searchParams.has('analytics_token')).toBe(false);
    expect((await exchange(result.redirect_uri)).access_token).toBe('access-token');
  });
  it('denial never issues a receipt or browser link event context', async () => {
    const result = await decideCodeAuthorization(request.id, browserSecret, uid, false, {
      token: beginAnalyticsHandoff(params, request.id, cookie, origin),
      cookie
    });
    expect(new URL(result.redirect_uri).searchParams.get('error')).toBe('access_denied');
    expect(result).not.toHaveProperty('analytics_context');
    expect(new URL(result.redirect_uri).searchParams.has('analytics_token')).toBe(false);
  });
  it('metadata cannot bypass PKCE or revive an already consumed code', async () => {
    const result = await approve();
    await expect(
      exchange(result.redirect_uri, { code_verifier: 'x'.repeat(43) })
    ).rejects.toMatchObject({ error: 'invalid_grant' });
    await exchange(result.redirect_uri);
    await expect(exchange(result.redirect_uri)).rejects.toMatchObject({ error: 'invalid_grant' });
  });
  it('browser secret checks still apply before optional attribution is considered', async () => {
    await expect(
      decideCodeAuthorization(request.id, 'wrong-browser', uid, true, { cookie })
    ).rejects.toMatchObject({ error: 'invalid_grant' });
    expect(mocks.db.oAuthAuthorizationRequest.updateMany).not.toHaveBeenCalled();
  });
});
