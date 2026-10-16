import {
  GLOBAL_TOKEN_CLIENT_ID,
  generateOAuth2AccessToken,
  generateLegacyGlobalToken,
  generateOAuth2RefreshToken,
  verifyGlobalToken
} from '@/services/backend/auth';
import { sign } from 'jsonwebtoken';

describe('verifyGlobalToken', () => {
  beforeEach(() => {
    (global as any).AppConfig = {
      desktop: {
        auth: {
          jwt: {
            global: 'test-global-secret',
            regional: 'test-regional-secret',
            internal: 'test-internal-secret'
          }
        }
      },
      cloud: {
        regionUID: 'test-region'
      }
    };
  });

  const buildHeader = (token: string) =>
    ({
      authorization: encodeURIComponent(token)
    } as any);

  it('maps oauth2 access token claims to legacy payload', async () => {
    const token = generateOAuth2AccessToken({
      sub: 'oauth-uid',
      user_id: 'oauth-user-id',
      client_id: GLOBAL_TOKEN_CLIENT_ID
    });

    const payload = await verifyGlobalToken(buildHeader(token));

    expect(payload).toEqual({
      userUid: 'oauth-uid',
      userId: 'oauth-user-id'
    });
  });

  it('rejects oauth2 refresh token', async () => {
    const token = generateOAuth2RefreshToken({
      sub: 'oauth-uid',
      user_id: 'oauth-user-id',
      client_id: GLOBAL_TOKEN_CLIENT_ID
    });

    const payload = await verifyGlobalToken(buildHeader(token));

    expect(payload).toBeNull();
  });

  it('rejects oauth2 access token without subject', async () => {
    const token = sign(
      {
        client_id: GLOBAL_TOKEN_CLIENT_ID,
        token_type: 'access_token',
        user_id: 'oauth-user-id'
      },
      'test-global-secret',
      { expiresIn: '7d' }
    );

    const payload = await verifyGlobalToken(buildHeader(token));

    expect(payload).toBeNull();
  });

  it('rejects oauth2 access token without user_id', async () => {
    const token = sign(
      {
        sub: 'oauth-uid',
        client_id: GLOBAL_TOKEN_CLIENT_ID,
        token_type: 'access_token'
      },
      'test-global-secret',
      { expiresIn: '7d' }
    );

    const payload = await verifyGlobalToken(buildHeader(token));

    expect(payload).toBeNull();
  });
  it('keeps existing release-v5.1 global tokens valid', async () => {
    const token = sign({ userUid: 'legacy-uid', userId: 'legacy-id' }, 'test-global-secret');
    expect(await verifyGlobalToken(buildHeader(token))).toEqual({
      userUid: 'legacy-uid',
      userId: 'legacy-id'
    });
  });

  it('does not add OAuth claims to tokens consumed by legacy external services', () => {
    const token = generateLegacyGlobalToken({ userUid: 'legacy-uid', userId: 'legacy-id' });
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    expect(payload).toMatchObject({ userUid: 'legacy-uid', userId: 'legacy-id' });
    expect(payload).not.toHaveProperty('client_id');
    expect(payload).not.toHaveProperty('token_type');
  });
});
