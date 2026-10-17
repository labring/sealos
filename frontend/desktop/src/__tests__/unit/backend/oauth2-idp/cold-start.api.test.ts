import { getCloudConfig } from '@/pages/api/platform/getCloudConfig';
import device from '@/pages/api/auth/oauth2/device';
import token from '@/pages/api/auth/oauth2/token';
import context from '@/pages/api/auth/oauth2/authorize/context';
import decision from '@/pages/api/auth/oauth2/authorize/decision';

jest.mock('@/pages/api/platform/getCloudConfig', () => ({
  getCloudConfig: jest.fn(async () => {
    (global as any).AppConfig = { desktop: { auth: { oauth2idp: { enabled: true } } } };
  })
}));
jest.mock('@/services/backend/oauth2/service', () => {
  const requireConfig = jest.fn(async () => {
    if (!(global as any).AppConfig?.desktop.auth.oauth2idp.enabled) {
      throw new Error('OAuth configuration was not initialized');
    }
    throw new (require('@/services/backend/oauth2/errors').OAuth2HttpError)(400, 'invalid_client');
  });
  return {
    createDeviceAuthorizationGrant: requireConfig,
    exchangeDeviceCodeForToken: requireConfig,
    exchangeRefreshTokenForToken: requireConfig,
    getAuthorizeContext: requireConfig,
    submitAuthorizeDecision: requireConfig
  };
});
jest.mock('@/services/backend/oauth2/auth', () => ({
  resolveOAuth2AuthUser: jest.fn(async () => {
    if (!(global as any).AppConfig) throw new Error('Auth ran before configuration load');
    return { userUid: 'test-user' };
  })
}));

const requestId = '550e8400-e29b-41d4-a716-446655440000';
describe('OAuth device endpoints on a fresh server process', () => {
  beforeEach(() => {
    delete (global as any).AppConfig;
    jest.clearAllMocks();
  });

  it.each([
    ['device', device, { method: 'POST', body: { client_id: 'test-client' } }],
    [
      'token',
      token,
      {
        method: 'POST',
        body: {
          client_id: 'test-client',
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: 'test-code'
        }
      }
    ],
    ['context', context, { method: 'GET', query: { request_id: requestId } }],
    ['decision', decision, { method: 'POST', body: { request_id: requestId, decision: 'approve' } }]
  ] as const)('%s initializes configuration before auth/service work', async (_, handler, req) => {
    const res: any = {
      statusCode: 200,
      body: undefined,
      setHeader: jest.fn(),
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: unknown) {
        this.body = body;
        return this;
      },
      end: jest.fn()
    };
    await handler(req as any, res);
    expect(getCloudConfig).toHaveBeenCalledTimes(1);
    // Reaching the service's protocol error proves the cold process did not crash.
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('invalid_client');
  });
});
