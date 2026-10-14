import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sign } from 'jsonwebtoken';
vi.mock('@/services/backend/db/init', () => ({
  globalPrisma: { desktopLoginRecord: { upsert: vi.fn() }, oAuthClient: { findUnique: vi.fn() } }
}));
vi.mock('@/services/backend/activity/rewards', () => ({ checkAndGrantUserRewards: vi.fn() }));
import handler from '@/pages/api/account/desktop/reportClientLogin';
import { globalPrisma } from '@/services/backend/db/init';
import { checkAndGrantUserRewards } from '@/services/backend/activity/rewards';
import {
  generateGlobalAccessToken,
  generateLegacyGlobalToken,
  generateOAuth2AccessToken,
  generateOAuth2RefreshToken,
  generateRegionalToken
} from '@/services/backend/auth';
const DEVICE = 'af993c98-d19d-4bdc-b338-79b80dc4f8bf';
const CODE = 'sealox-desktop-bja';
const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';
const user = { sub: 'test-user-uid', user_id: 'test-user-id' };
const access = (client_id = DEVICE, expiresIn?: string) =>
  generateOAuth2AccessToken({ ...user, client_id }, expiresIn);
async function report(token?: string, body: unknown = {}) {
  const res: any = {
    body: undefined,
    setHeader: vi.fn(),
    status: vi.fn(() => res),
    json: vi.fn((body) => {
      res.body = body;
      return res;
    })
  };
  await handler(
    { method: 'POST', headers: token ? { authorization: token } : {}, body } as any,
    res
  );
  return res.body;
}
const registered = (clientId = DEVICE) => ({
  clientId,
  clientType: 'PUBLIC',
  allowedGrantTypes:
    clientId === DEVICE ? [DEVICE_GRANT, 'refresh_token'] : ['authorization_code', 'refresh_token'],
  redirectUris: clientId === DEVICE ? [] : ['http://127.0.0.1/callback']
});

describe('Desktop login facts require authenticated official OAuth client credentials', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (global as any).AppConfig = {
      cloud: { regionUID: 'test-region' },
      desktop: {
        auth: {
          jwt: {
            global: 'activity-test-global',
            regional: 'activity-test-regional',
            internal: 'activity-test-internal'
          }
        }
      }
    };
    vi.mocked(globalPrisma.oAuthClient.findUnique).mockResolvedValue(registered() as any);
    vi.mocked(globalPrisma.desktopLoginRecord.upsert).mockResolvedValue({} as any);
    vi.mocked(checkAndGrantUserRewards).mockResolvedValue(undefined);
  });
  it.each([
    'web',
    'legacy',
    'regional',
    'refresh',
    'third-party',
    'array-client-id',
    'tampered-client-id',
    'expired',
    'tampered',
    'missing'
  ])('rejects %s credentials even with forged Desktop metadata', async (kind) => {
    const token =
      kind === 'web'
        ? generateGlobalAccessToken(user)
        : kind === 'legacy'
        ? generateLegacyGlobalToken({ userUid: user.sub, userId: user.user_id })
        : kind === 'regional'
        ? generateRegionalToken({
            userUid: user.sub,
            userId: user.user_id,
            regionUid: 'test-region',
            userCrUid: 'cr',
            userCrName: 'cr',
            workspaceUid: 'ws',
            workspaceId: 'ns'
          })
        : kind === 'refresh'
        ? generateOAuth2RefreshToken({ ...user, client_id: DEVICE })
        : kind === 'third-party'
        ? access('third-party-native-client')
        : kind === 'array-client-id'
        ? sign({ ...user, client_id: [DEVICE], token_type: 'access_token' }, 'activity-test-global')
        : kind === 'tampered-client-id'
        ? (() => {
            const parts = access('global-auth').split('.');
            const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            claims.client_id = DEVICE;
            parts[1] = Buffer.from(JSON.stringify(claims)).toString('base64url');
            return parts.join('.');
          })()
        : kind === 'expired'
        ? access(DEVICE, '-1s')
        : kind === 'tampered'
        ? sign({ ...user, client_id: DEVICE, token_type: 'access_token' }, 'wrong-secret')
        : undefined;
    expect(
      (await report(token, { authSource: 'oauth2_device_grant', client_id: DEVICE })).code
    ).toBe(401);
    expect(globalPrisma.oAuthClient.findUnique).not.toHaveBeenCalled();
    expect(globalPrisma.desktopLoginRecord.upsert).not.toHaveBeenCalled();
    expect(checkAndGrantUserRewards).not.toHaveBeenCalled();
  });
  it.each([DEVICE, CODE])('accepts signed and registered official client %s', async (clientId) => {
    vi.mocked(globalPrisma.oAuthClient.findUnique).mockResolvedValue(registered(clientId) as any);
    expect(
      (
        await report(access(clientId), {
          clientVersion: '0.9.13',
          authSource: 'forged',
          userUid: 'someone-else'
        })
      ).code
    ).toBe(200);
    expect(globalPrisma.oAuthClient.findUnique).toHaveBeenCalledWith({ where: { clientId } });
    expect(globalPrisma.desktopLoginRecord.upsert).toHaveBeenCalledWith({
      where: { userUid: user.sub },
      create: {
        userUid: user.sub,
        clientVersion: '0.9.13',
        authSource: `oauth2_client:${clientId}`,
        firstSeenAt: expect.any(Date),
        lastSeenAt: expect.any(Date)
      },
      update: {
        clientVersion: '0.9.13',
        authSource: `oauth2_client:${clientId}`,
        lastSeenAt: expect.any(Date)
      }
    });
    expect(checkAndGrantUserRewards).toHaveBeenCalledExactlyOnceWith(user.sub);
  });
  it.each(['missing-client', 'confidential', 'wrong-grant', 'wrong-redirect'])(
    'rejects official ID with %s registration',
    async (kind) => {
      const client = registered(CODE);
      vi.mocked(globalPrisma.oAuthClient.findUnique).mockResolvedValue(
        (kind === 'missing-client'
          ? null
          : {
              ...client,
              ...(kind === 'confidential' ? { clientType: 'CONFIDENTIAL' } : {}),
              ...(kind === 'wrong-grant' ? { allowedGrantTypes: ['refresh_token'] } : {}),
              ...(kind === 'wrong-redirect'
                ? { redirectUris: ['https://third-party.invalid/callback'] }
                : {})
            }) as any
      );
      expect((await report(access(CODE))).code).toBe(401);
      expect(globalPrisma.desktopLoginRecord.upsert).not.toHaveBeenCalled();
      expect(checkAndGrantUserRewards).not.toHaveBeenCalled();
    }
  );
});
