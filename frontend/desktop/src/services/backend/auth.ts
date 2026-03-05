import { JWTPayload } from '@/types';
import {
  AccessTokenPayload,
  AuthenticationTokenPayload,
  BillingTokenPayload,
  CronJobTokenPayload,
  OAuth2AccessTokenPayload,
  OAuth2TokenPayload,
  OAuth2RefreshTokenPayload,
  OnceTokenPayload
} from '@/types/token';
import { IncomingHttpHeaders } from 'http';
import { sign, verify } from 'jsonwebtoken';

const regionUID = () => global.AppConfig?.cloud.regionUID || '123456789';
const grobalJwtSecret = () => global.AppConfig?.desktop.auth.jwt.global || '123456789';
const regionalJwtSecret = () => global.AppConfig?.desktop.auth.jwt.regional || '123456789';
const internalJwtSecret = () => global.AppConfig?.desktop.auth.jwt.internal || '123456789';
const OAUTH2_ACCESS_TOKEN_TYPE = 'access_token' as const;
const OAUTH2_REFRESH_TOKEN_TYPE = 'refresh_token' as const;
const verifyToken = async <T extends Object>(header: IncomingHttpHeaders) => {
  try {
    if (!header?.authorization) {
      throw new Error('缺少凭证');
    }
    const token = decodeURIComponent(header.authorization);
    const payload = await verifyJWT<T>(token);
    return payload;
  } catch (err) {
    return null;
  }
};

/**
 * Verify **regional token** from HTTP headers
 *
 * @param header HTTP headers
 * @returns Promise for validated token payloads
 */
export const verifyAccessToken = async (header: IncomingHttpHeaders) =>
  verifyToken<AccessTokenPayload>(header).then(
    (payload) => {
      if (payload?.regionUid === regionUID()) {
        return payload;
      } else {
        return null;
      }
    },
    (err) => null
  );

export const verifyAuthenticationToken = async (
  header: IncomingHttpHeaders
): Promise<AuthenticationTokenPayload | null> => {
  try {
    if (!header?.authorization) {
      throw new Error('缺少凭证');
    }
    const token = decodeURIComponent(header.authorization);
    const payload = await verifyJWT<AuthenticationTokenPayload & { token_type?: string }>(
      token,
      grobalJwtSecret()
    );
    // OAuth2 access/refresh tokens must not be treated as internal global authentication token.
    if (payload?.token_type) {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
};
export const verifyJWT = <T extends Object = JWTPayload>(token?: string, secret?: string) =>
  new Promise<T | null>((resolve) => {
    if (!token) return resolve(null);
    verify(token, secret || regionalJwtSecret(), (err, payload) => {
      if (err) {
        // console.log(err);
        resolve(null);
      } else if (!payload) {
        resolve(null);
      } else {
        resolve(payload as T);
      }
    });
  });

export const verifyAppToken = async (header: IncomingHttpHeaders) => {
  try {
    if (!header?.authorization) {
      throw new Error('缺少凭证');
    }
    const token = header.authorization;
    const payload = await verifyJWT<AccessTokenPayload>(token, internalJwtSecret());
    return payload;
  } catch (err) {
    return null;
  }
};

export const generateBillingToken = (props: BillingTokenPayload) =>
  sign(props, internalJwtSecret(), { expiresIn: '3600000' });
export const generateAccessToken = (props: AccessTokenPayload) =>
  sign(props, regionalJwtSecret(), { expiresIn: '7d' });
export const generateAppToken = (props: AccessTokenPayload) =>
  sign(props, internalJwtSecret(), { expiresIn: '7d' });
export const generateAuthenticationToken = (
  props: AuthenticationTokenPayload,
  expiresIn?: string
) => {
  if (expiresIn) {
    return sign(props, grobalJwtSecret(), { expiresIn: expiresIn });
  }
  return sign(props, grobalJwtSecret(), { expiresIn: '7d' });
};

/**
 * Generate OAuth2 access token using OAuth2-style claims.
 */
export const generateOAuth2AccessToken = (props: OAuth2TokenPayload, expiresIn?: string) =>
  generateAuthenticationToken(
    {
      ...props,
      token_type: OAUTH2_ACCESS_TOKEN_TYPE
    } as OAuth2AccessTokenPayload,
    expiresIn
  );

/**
 * Generate OAuth2 refresh token using OAuth2-style claims.
 */
export const generateOAuth2RefreshToken = (props: OAuth2TokenPayload, expiresIn?: string) =>
  generateAuthenticationToken(
    {
      ...props,
      token_type: OAUTH2_REFRESH_TOKEN_TYPE
    } as OAuth2RefreshTokenPayload,
    expiresIn
  );

const verifyOAuth2TokenByType = async (
  token: string | undefined,
  tokenType: typeof OAUTH2_ACCESS_TOKEN_TYPE | typeof OAUTH2_REFRESH_TOKEN_TYPE
) => {
  const payload = await verifyJWT<OAuth2AccessTokenPayload | OAuth2RefreshTokenPayload>(
    token,
    grobalJwtSecret()
  );
  if (!payload || payload.token_type !== tokenType) {
    return null;
  }
  return payload;
};

/**
 * Verify OAuth2 access token and reject refresh token.
 */
export const verifyOAuth2AccessToken = (token?: string) =>
  verifyOAuth2TokenByType(token, OAUTH2_ACCESS_TOKEN_TYPE);

/**
 * Verify OAuth2 refresh token and reject access token.
 */
export const verifyOAuth2RefreshToken = (token?: string) =>
  verifyOAuth2TokenByType(token, OAUTH2_REFRESH_TOKEN_TYPE);

export const generateOnceToken = (props: OnceTokenPayload) =>
  sign(props, regionalJwtSecret(), { expiresIn: '1800000' });

export const generateCronJobToken = (props: CronJobTokenPayload) =>
  sign(props, internalJwtSecret(), { expiresIn: '60000' });

export const callBillingService = async (
  endpoint: string,
  payload: { userUid: string; userId: string },
  body: Record<string, any>
) => {
  const billingUrl = global.AppConfig.desktop.auth.billingUrl;
  if (!billingUrl) {
    throw new Error('Billing service not configured');
  }

  const billingToken = generateBillingToken(payload);
  const regionDomain = global.AppConfig.cloud.domain;

  const response = await fetch(`${billingUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${billingToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...body,
      regionDomain
    })
  });
  if (!response.ok) {
    throw new Error('Failed to call billing service');
  }
  return response.json();
};
