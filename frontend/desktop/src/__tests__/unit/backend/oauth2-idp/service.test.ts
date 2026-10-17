import { DeviceGrantStatus, OAuthClientType } from 'prisma/global/generated/client';
import { OAuth2HttpError } from '@/services/backend/oauth2/errors';
import { createHash } from 'crypto';

jest.mock('@/services/backend/db/init', () => ({
  globalPrisma: {
    oAuthClient: {
      findUnique: jest.fn()
    },
    oAuthDeviceGrant: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    oAuthUserConsent: {
      findFirst: jest.fn(),
      upsert: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    },
    $transaction: jest.fn()
  }
}));

jest.mock('@/services/backend/auth', () => ({
  generateOAuth2AccessToken: jest.fn(() => 'mock-access-token'),
  generateOAuth2RefreshToken: jest.fn(() => 'mock-refresh-token'),
  verifyOAuth2RefreshToken: jest.fn()
}));

jest.mock('@/services/enable', () => ({
  enableOAuth2Idp: jest.fn(() => true)
}));

import {
  createDeviceAuthorizationGrant,
  exchangeDeviceCodeForToken,
  exchangeRefreshTokenForToken
} from '@/services/backend/oauth2/service';
import { globalPrisma } from '@/services/backend/db/init';
import { verifyOAuth2RefreshToken } from '@/services/backend/auth';

const mockPrisma = globalPrisma as any;
const mockVerifyOAuth2RefreshToken = verifyOAuth2RefreshToken as jest.MockedFunction<
  typeof verifyOAuth2RefreshToken
>;

const buildClient = () => ({
  id: 'c1',
  clientId: 'client-1',
  clientType: OAuthClientType.PUBLIC,
  userUid: null,
  clientSecretHash: null,
  allowedGrantTypes: ['urn:ietf:params:oauth:grant-type:device_code'],
  name: 'Test Client',
  logoUrl: null,
  createdAt: new Date(),
  updatedAt: new Date()
});

const hashSecret = (secret: string) => createHash('sha256').update(secret).digest('hex');

const buildConfidentialClient = () => ({
  ...buildClient(),
  clientType: OAuthClientType.CONFIDENTIAL,
  clientSecretHash: hashSecret('top-secret')
});

const buildGrant = (status: DeviceGrantStatus, lastPollAt?: Date) => ({
  id: 'request-id',
  clientId: 'client-1',
  deviceCodeHash: 'hashed-device',
  userCodeHash: 'hashed-user',
  userUid: status === DeviceGrantStatus.APPROVED ? 'user-uid' : null,
  status,
  expiresAt: new Date(Date.now() + 60 * 1000),
  lastPollAt: lastPollAt ?? new Date(Date.now() - 10 * 1000),
  pollCount: 0,
  createdAt: new Date(),
  updatedAt: new Date()
});

describe('oauth2 service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates device authorization grant', async () => {
    mockPrisma.oAuthClient.findUnique.mockResolvedValue(buildClient());
    mockPrisma.oAuthDeviceGrant.create.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60 * 1000)
    });

    const result = await createDeviceAuthorizationGrant({
      client_id: 'client-1'
    });

    expect(result.device_code).toBeTruthy();
    expect(result.user_code).toBeTruthy();
    expect(result.verification_uri).toContain('/oauth2/device');
    expect(result.verification_uri_complete).toContain('user_code=');
  });

  it('returns authorization_pending before approval', async () => {
    mockPrisma.oAuthClient.findUnique.mockResolvedValue(buildClient());
    mockPrisma.oAuthDeviceGrant.findFirst.mockResolvedValue(buildGrant(DeviceGrantStatus.PENDING));
    mockPrisma.oAuthDeviceGrant.update.mockResolvedValue({});

    await expect(
      exchangeDeviceCodeForToken({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: 'device',
        client_id: 'client-1'
      })
    ).rejects.toMatchObject<Partial<OAuth2HttpError>>({
      error: 'authorization_pending'
    });
  });

  it('returns slow_down when polling too frequently', async () => {
    mockPrisma.oAuthClient.findUnique.mockResolvedValue(buildClient());
    mockPrisma.oAuthDeviceGrant.findFirst.mockResolvedValue(
      buildGrant(DeviceGrantStatus.PENDING, new Date(Date.now() - 1000))
    );
    mockPrisma.oAuthDeviceGrant.update.mockResolvedValue({});

    await expect(
      exchangeDeviceCodeForToken({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: 'device',
        client_id: 'client-1'
      })
    ).rejects.toMatchObject<Partial<OAuth2HttpError>>({
      error: 'slow_down'
    });
  });

  it('returns expired_token when grant is expired', async () => {
    mockPrisma.oAuthClient.findUnique.mockResolvedValue(buildClient());
    mockPrisma.oAuthDeviceGrant.findFirst.mockResolvedValue({
      ...buildGrant(DeviceGrantStatus.PENDING),
      expiresAt: new Date(Date.now() - 1000)
    });

    await expect(
      exchangeDeviceCodeForToken({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: 'device',
        client_id: 'client-1'
      })
    ).rejects.toMatchObject<Partial<OAuth2HttpError>>({
      error: 'expired_token'
    });
  });

  it('returns access_denied when user denied request', async () => {
    mockPrisma.oAuthClient.findUnique.mockResolvedValue(buildClient());
    mockPrisma.oAuthDeviceGrant.findFirst.mockResolvedValue(buildGrant(DeviceGrantStatus.DENIED));
    mockPrisma.oAuthDeviceGrant.update.mockResolvedValue({});

    await expect(
      exchangeDeviceCodeForToken({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: 'device',
        client_id: 'client-1'
      })
    ).rejects.toMatchObject<Partial<OAuth2HttpError>>({
      error: 'access_denied'
    });
  });

  it('returns access token when grant is approved', async () => {
    mockPrisma.oAuthClient.findUnique.mockResolvedValue(buildClient());
    mockPrisma.oAuthDeviceGrant.findFirst.mockResolvedValue(buildGrant(DeviceGrantStatus.APPROVED));
    mockPrisma.oAuthDeviceGrant.update.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({
      uid: 'user-uid',
      id: 'user-id',
      name: 'user-name'
    });

    const result = await exchangeDeviceCodeForToken({
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: 'device',
      client_id: 'client-1'
    });

    expect(result.access_token).toBe('mock-access-token');
    expect(result.refresh_token).toBe('mock-refresh-token');
    expect(result.token_type).toBe('Bearer');
    expect(result.expires_in).toBeGreaterThan(0);
  });

  it('returns expired_token when device code has already been consumed', async () => {
    mockPrisma.oAuthClient.findUnique.mockResolvedValue(buildClient());
    mockPrisma.oAuthDeviceGrant.findFirst.mockResolvedValue(buildGrant(DeviceGrantStatus.CONSUMED));
    mockPrisma.oAuthDeviceGrant.update.mockResolvedValue({});

    await expect(
      exchangeDeviceCodeForToken({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: 'device',
        client_id: 'client-1'
      })
    ).rejects.toMatchObject<Partial<OAuth2HttpError>>({
      error: 'expired_token'
    });
  });

  it('returns unauthorized_client when client grant type is not allowed in device exchange', async () => {
    mockPrisma.oAuthClient.findUnique.mockResolvedValue({
      ...buildClient(),
      allowedGrantTypes: []
    });

    await expect(
      exchangeDeviceCodeForToken({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: 'device',
        client_id: 'client-1'
      })
    ).rejects.toMatchObject<Partial<OAuth2HttpError>>({
      error: 'unauthorized_client'
    });
  });

  it('rejects confidential client device exchange when client_secret is missing', async () => {
    mockPrisma.oAuthClient.findUnique.mockResolvedValue(buildConfidentialClient());

    await expect(
      exchangeDeviceCodeForToken({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: 'device',
        client_id: 'client-1'
      })
    ).rejects.toMatchObject<Partial<OAuth2HttpError>>({
      error: 'invalid_client'
    });
  });

  it('rejects confidential client device exchange when client_secret is invalid', async () => {
    mockPrisma.oAuthClient.findUnique.mockResolvedValue(buildConfidentialClient());

    await expect(
      exchangeDeviceCodeForToken({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: 'device',
        client_id: 'client-1',
        client_secret: 'wrong-secret'
      })
    ).rejects.toMatchObject<Partial<OAuth2HttpError>>({
      error: 'invalid_client'
    });
  });

  it('refreshes token when refresh token is valid', async () => {
    mockPrisma.oAuthClient.findUnique.mockResolvedValue(buildClient());
    mockVerifyOAuth2RefreshToken.mockResolvedValue({
      sub: 'user-uid',
      user_id: 'user-id',
      client_id: 'client-1',
      preferred_username: 'user-name',
      token_type: 'refresh_token'
    });

    const result = await exchangeRefreshTokenForToken({
      grant_type: 'refresh_token',
      refresh_token: 'valid-refresh-token',
      client_id: 'client-1'
    });

    expect(result.access_token).toBe('mock-access-token');
    expect(result.refresh_token).toBe('mock-refresh-token');
    expect(result.token_type).toBe('Bearer');
    expect(result.expires_in).toBeGreaterThan(0);
  });

  it('rejects invalid refresh token', async () => {
    mockPrisma.oAuthClient.findUnique.mockResolvedValue(buildClient());
    mockVerifyOAuth2RefreshToken.mockResolvedValue(null);

    await expect(
      exchangeRefreshTokenForToken({
        grant_type: 'refresh_token',
        refresh_token: 'invalid-refresh-token',
        client_id: 'client-1'
      })
    ).rejects.toMatchObject<Partial<OAuth2HttpError>>({
      error: 'invalid_grant'
    });
  });

  it('rejects refresh token when client does not match', async () => {
    mockPrisma.oAuthClient.findUnique.mockResolvedValue(buildClient());
    mockVerifyOAuth2RefreshToken.mockResolvedValue({
      sub: 'user-uid',
      user_id: 'user-id',
      client_id: 'another-client',
      preferred_username: 'user-name',
      token_type: 'refresh_token'
    });

    await expect(
      exchangeRefreshTokenForToken({
        grant_type: 'refresh_token',
        refresh_token: 'valid-refresh-token',
        client_id: 'client-1'
      })
    ).rejects.toMatchObject<Partial<OAuth2HttpError>>({
      error: 'invalid_grant'
    });
  });

  it('returns unauthorized_client when client grant type is not allowed in refresh exchange', async () => {
    mockPrisma.oAuthClient.findUnique.mockResolvedValue({
      ...buildClient(),
      allowedGrantTypes: []
    });

    await expect(
      exchangeRefreshTokenForToken({
        grant_type: 'refresh_token',
        refresh_token: 'valid-refresh-token',
        client_id: 'client-1'
      })
    ).rejects.toMatchObject<Partial<OAuth2HttpError>>({
      error: 'unauthorized_client'
    });
  });

  it('rejects confidential client refresh exchange when client_secret is missing', async () => {
    mockPrisma.oAuthClient.findUnique.mockResolvedValue(buildConfidentialClient());

    await expect(
      exchangeRefreshTokenForToken({
        grant_type: 'refresh_token',
        refresh_token: 'valid-refresh-token',
        client_id: 'client-1'
      })
    ).rejects.toMatchObject<Partial<OAuth2HttpError>>({
      error: 'invalid_client'
    });
  });

  it('rejects confidential client refresh exchange when client_secret is invalid', async () => {
    mockPrisma.oAuthClient.findUnique.mockResolvedValue(buildConfidentialClient());

    await expect(
      exchangeRefreshTokenForToken({
        grant_type: 'refresh_token',
        refresh_token: 'valid-refresh-token',
        client_id: 'client-1',
        client_secret: 'wrong-secret'
      })
    ).rejects.toMatchObject<Partial<OAuth2HttpError>>({
      error: 'invalid_client'
    });
  });

  // [TODO] Invalidate used refresh tokens
  it.todo(
    'should reject replayed refresh token after rotation (security enhancement pending implementation)'
  );

  // [TODO] Prevent device_code race
  it.todo(
    'should prevent concurrent device_code exchanges from issuing multiple token pairs (race-condition hardening pending implementation)'
  );
});
