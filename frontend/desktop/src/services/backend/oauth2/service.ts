import {
  OAuth2AuthorizeContextQuery,
  OAuth2AuthorizeContextResponse,
  OAuth2DeviceRequest,
  OAuth2DeviceResponse,
  OAuth2TokenDeviceRequest,
  OAuth2TokenRefreshRequest,
  OAuth2TokenSuccessResponse
} from '@/schema/oauth2';
import { enableOAuth2Idp } from '@/services/enable';
import { globalPrisma } from '../db/init';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { OAuth2HttpError } from './errors';
import { DeviceGrantStatus, OAuthClientType } from 'prisma/global/generated/client';
import {
  generateOAuth2AccessToken,
  generateOAuth2RefreshToken,
  verifyOAuth2RefreshToken
} from '../auth';

const DEFAULT_DEVICE_EXPIRES_IN = 600;
const DEFAULT_DEVICE_POLL_INTERVAL = 5;
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 3600;
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 30 * 24 * 60 * 60;
const DEVICE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';
const REFRESH_TOKEN_GRANT_TYPE = 'refresh_token';

const hashOpaqueCode = (value: string) => createHash('sha256').update(value).digest('hex');

const buildDesktopBaseUrl = () => {
  const callbackURL = global.AppConfig?.desktop.auth.callbackURL || '';
  if (callbackURL.startsWith('http://') || callbackURL.startsWith('https://')) {
    return new URL(callbackURL).origin;
  }
  const domain = global.AppConfig?.cloud.domain || 'localhost';
  const port = global.AppConfig?.cloud.port || '443';
  const isHttps = port === '443';
  return `${isHttps ? 'https' : 'http'}://${domain}${isHttps ? '' : `:${port}`}`;
};

const generateDeviceCode = () => randomBytes(32).toString('hex');

const generateUserCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const chars = Array.from(
    { length: 8 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  );
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
};

const verifyClientSecret = (rawSecret: string, hashedSecret: string) => {
  const actual = hashOpaqueCode(rawSecret);
  const actualBytes = new TextEncoder().encode(actual);
  const expectedBytes = new TextEncoder().encode(hashedSecret);
  if (actualBytes.length !== expectedBytes.length) {
    return false;
  }
  return timingSafeEqual(actualBytes, expectedBytes);
};

const ensureOAuth2Enabled = () => {
  if (!enableOAuth2Idp()) {
    throw new OAuth2HttpError(503, 'server_error', 'OAuth2 IdP is disabled');
  }
};

const getOAuthClient = async (clientId: string) => {
  const client = await globalPrisma.oAuthClient.findUnique({
    where: { clientId }
  });
  if (!client) {
    throw new OAuth2HttpError(401, 'invalid_client');
  }
  return client;
};

export const createDeviceAuthorizationGrant = async (
  params: OAuth2DeviceRequest
): Promise<OAuth2DeviceResponse> => {
  ensureOAuth2Enabled();
  const client = await getOAuthClient(params.client_id);
  if (!client.allowedGrantTypes.includes(DEVICE_GRANT_TYPE)) {
    throw new OAuth2HttpError(400, 'unauthorized_client');
  }
  if (client.clientType !== OAuthClientType.PUBLIC) {
    throw new OAuth2HttpError(400, 'invalid_client', 'Device grant requires a public client');
  }

  const deviceCode = generateDeviceCode();
  const userCode = generateUserCode();
  const expiresAt = new Date(Date.now() + DEFAULT_DEVICE_EXPIRES_IN * 1000);

  const grant = await globalPrisma.oAuthDeviceGrant.create({
    data: {
      clientId: client.clientId,
      deviceCodeHash: hashOpaqueCode(deviceCode),
      userCodeHash: hashOpaqueCode(userCode),
      expiresAt,
      status: DeviceGrantStatus.PENDING
    }
  });

  const verificationUri = `${buildDesktopBaseUrl()}/oauth2/device`;
  return {
    device_code: deviceCode,
    user_code: userCode,
    verification_uri: verificationUri,
    verification_uri_complete: `${verificationUri}?user_code=${encodeURIComponent(userCode)}`,
    expires_in: Math.floor((grant.expiresAt.getTime() - Date.now()) / 1000),
    interval: DEFAULT_DEVICE_POLL_INTERVAL
  };
};

export const exchangeDeviceCodeForToken = async (
  params: OAuth2TokenDeviceRequest
): Promise<OAuth2TokenSuccessResponse> => {
  ensureOAuth2Enabled();
  if (params.grant_type !== DEVICE_GRANT_TYPE) {
    throw new OAuth2HttpError(400, 'unsupported_grant_type');
  }

  const client = await getOAuthClient(params.client_id);
  if (!client.allowedGrantTypes.includes(DEVICE_GRANT_TYPE)) {
    throw new OAuth2HttpError(400, 'unauthorized_client');
  }
  if (client.clientType === OAuthClientType.CONFIDENTIAL) {
    if (!client.clientSecretHash || !params.client_secret) {
      throw new OAuth2HttpError(401, 'invalid_client');
    }
    if (!verifyClientSecret(params.client_secret, client.clientSecretHash)) {
      throw new OAuth2HttpError(401, 'invalid_client');
    }
  }

  const grant = await globalPrisma.oAuthDeviceGrant.findFirst({
    where: {
      clientId: client.clientId,
      deviceCodeHash: hashOpaqueCode(params.device_code)
    }
  });
  if (!grant) {
    throw new OAuth2HttpError(400, 'invalid_grant');
  }

  const now = new Date();
  const expired = grant.expiresAt.getTime() <= now.getTime();
  if (expired) {
    throw new OAuth2HttpError(400, 'expired_token');
  }

  const nextPollCount = grant.pollCount + 1;
  await globalPrisma.oAuthDeviceGrant.update({
    where: { id: grant.id },
    data: {
      pollCount: nextPollCount,
      lastPollAt: now
    }
  });

  const msSinceLastPoll = grant.lastPollAt ? now.getTime() - grant.lastPollAt.getTime() : Infinity;
  if (msSinceLastPoll < DEFAULT_DEVICE_POLL_INTERVAL * 1000) {
    throw new OAuth2HttpError(400, 'slow_down');
  }

  if (grant.status === DeviceGrantStatus.PENDING) {
    throw new OAuth2HttpError(400, 'authorization_pending');
  }
  if (grant.status === DeviceGrantStatus.DENIED) {
    throw new OAuth2HttpError(
      400,
      'access_denied',
      'The end-user denied the authorization request'
    );
  }
  if (grant.status === DeviceGrantStatus.CONSUMED) {
    throw new OAuth2HttpError(400, 'expired_token', 'The device_code has already been consumed');
  }
  if (grant.status !== DeviceGrantStatus.APPROVED || !grant.userUid) {
    throw new OAuth2HttpError(400, 'invalid_grant', 'The device authorization grant is invalid');
  }

  const user = await globalPrisma.user.findUnique({
    where: { uid: grant.userUid }
  });
  if (!user) {
    throw new OAuth2HttpError(400, 'invalid_grant');
  }

  const accessToken = generateOAuth2AccessToken(
    {
      sub: user.uid,
      user_id: user.id,
      client_id: client.clientId,
      preferred_username: user.nickname
    },
    `${ACCESS_TOKEN_EXPIRES_IN_SECONDS}s`
  );
  const refreshToken = generateOAuth2RefreshToken(
    {
      sub: user.uid,
      user_id: user.id,
      client_id: client.clientId,
      preferred_username: user.nickname
    },
    `${REFRESH_TOKEN_EXPIRES_IN_SECONDS}s`
  );

  await globalPrisma.oAuthDeviceGrant.update({
    where: { id: grant.id },
    data: { status: DeviceGrantStatus.CONSUMED }
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_EXPIRES_IN_SECONDS
  };
};

export const exchangeRefreshTokenForToken = async (
  params: OAuth2TokenRefreshRequest
): Promise<OAuth2TokenSuccessResponse> => {
  ensureOAuth2Enabled();
  if (params.grant_type !== REFRESH_TOKEN_GRANT_TYPE) {
    throw new OAuth2HttpError(400, 'unsupported_grant_type');
  }

  const client = await getOAuthClient(params.client_id);
  if (!client.allowedGrantTypes.includes(DEVICE_GRANT_TYPE)) {
    throw new OAuth2HttpError(400, 'unauthorized_client');
  }
  if (client.clientType === OAuthClientType.CONFIDENTIAL) {
    if (!client.clientSecretHash || !params.client_secret) {
      throw new OAuth2HttpError(401, 'invalid_client');
    }
    if (!verifyClientSecret(params.client_secret, client.clientSecretHash)) {
      throw new OAuth2HttpError(401, 'invalid_client');
    }
  }

  const refreshPayload = await verifyOAuth2RefreshToken(params.refresh_token);
  if (!refreshPayload) {
    throw new OAuth2HttpError(400, 'invalid_grant', 'Invalid refresh token');
  }
  if (refreshPayload.client_id !== client.clientId) {
    throw new OAuth2HttpError(400, 'invalid_grant', 'Refresh token does not match client');
  }

  const accessToken = generateOAuth2AccessToken(
    {
      sub: refreshPayload.sub,
      user_id: refreshPayload.user_id,
      client_id: refreshPayload.client_id,
      preferred_username: refreshPayload.preferred_username,
      scope: refreshPayload.scope
    },
    `${ACCESS_TOKEN_EXPIRES_IN_SECONDS}s`
  );
  const refreshToken = generateOAuth2RefreshToken(
    {
      sub: refreshPayload.sub,
      user_id: refreshPayload.user_id,
      client_id: refreshPayload.client_id,
      preferred_username: refreshPayload.preferred_username,
      scope: refreshPayload.scope
    },
    `${REFRESH_TOKEN_EXPIRES_IN_SECONDS}s`
  );

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_EXPIRES_IN_SECONDS
  };
};

export const getAuthorizeContext = async (
  query: OAuth2AuthorizeContextQuery,
  userUid?: string
): Promise<OAuth2AuthorizeContextResponse> => {
  ensureOAuth2Enabled();
  const where = query.request_id
    ? { id: query.request_id }
    : { userCodeHash: hashOpaqueCode(query.user_code || '') };

  const grant = await globalPrisma.oAuthDeviceGrant.findFirst({
    where,
    include: {
      client: true
    }
  });
  if (!grant) {
    throw new OAuth2HttpError(400, 'invalid_grant');
  }
  if (grant.expiresAt.getTime() <= Date.now()) {
    throw new OAuth2HttpError(400, 'expired_token');
  }

  const hasExistingConsent = Boolean(
    userUid &&
      (await globalPrisma.oAuthUserConsent.findFirst({
        where: {
          userUid,
          clientId: grant.clientId
        }
      }))
  );

  return {
    request_id: grant.id,
    client_id: grant.clientId,
    client_name: grant.client.name,
    client_logo_url: grant.client.logoUrl || undefined,
    expires_at: grant.expiresAt.toISOString(),
    status: grant.status,
    has_existing_consent: hasExistingConsent
  };
};

export const submitAuthorizeDecision = async ({
  requestId,
  decision,
  userUid
}: {
  requestId: string;
  decision: 'approve' | 'deny';
  userUid: string;
}) => {
  ensureOAuth2Enabled();
  const grant = await globalPrisma.oAuthDeviceGrant.findUnique({
    where: { id: requestId }
  });
  if (!grant) {
    throw new OAuth2HttpError(400, 'invalid_grant');
  }
  if (grant.expiresAt.getTime() <= Date.now()) {
    throw new OAuth2HttpError(400, 'expired_token');
  }
  if (grant.status !== DeviceGrantStatus.PENDING) {
    throw new OAuth2HttpError(400, 'invalid_grant');
  }

  if (decision === 'approve') {
    await globalPrisma.$transaction([
      globalPrisma.oAuthUserConsent.upsert({
        where: {
          userUid_clientId: {
            userUid,
            clientId: grant.clientId
          }
        },
        update: {},
        create: {
          userUid,
          clientId: grant.clientId
        }
      }),
      globalPrisma.oAuthDeviceGrant.update({
        where: { id: grant.id },
        data: {
          status: DeviceGrantStatus.APPROVED,
          userUid
        }
      })
    ]);
    return { status: 'approved' as const };
  }

  await globalPrisma.oAuthDeviceGrant.update({
    where: { id: grant.id },
    data: {
      status: DeviceGrantStatus.DENIED,
      userUid
    }
  });
  return { status: 'denied' as const };
};
