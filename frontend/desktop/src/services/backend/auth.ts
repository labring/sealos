import { JWTPayload } from '@/types';
import {
  AccessTokenPayload,
  GlobalTokenPayload,
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
export const globalJwtSecret = () => global.AppConfig?.desktop.auth.jwt.global || '123456789';
const regionalJwtSecret = () => global.AppConfig?.desktop.auth.jwt.regional || '123456789';
const internalJwtSecret = () => global.AppConfig?.desktop.auth.jwt.internal || '123456789';

const ACCESS_TOKEN_TYPE = 'access_token' as const;
const REFRESH_TOKEN_TYPE = 'refresh_token' as const;
export const GLOBAL_TOKEN_CLIENT_ID = 'global-auth' as const;
export const LEGACY_GLOBAL_TOKEN_CLIENT_ID = 'desktop-legacy-global-auth' as const;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

type GlobalJwtClaims = OAuth2AccessTokenPayload | OAuth2RefreshTokenPayload;
type GlobalTokenSignablePayload = GlobalTokenPayload | GlobalJwtClaims;

const readAuthorizationToken = (header: IncomingHttpHeaders) =>
  header?.authorization ? decodeURIComponent(header.authorization) : null;

const readRawAuthorizationToken = (header: IncomingHttpHeaders) => header?.authorization || null;

const isAccessTokenClaims = (payload: GlobalJwtClaims): payload is OAuth2AccessTokenPayload =>
  payload.token_type === ACCESS_TOKEN_TYPE &&
  isNonEmptyString(payload.sub) &&
  isNonEmptyString(payload.user_id);

const isRefreshTokenClaims = (payload: GlobalJwtClaims): payload is OAuth2RefreshTokenPayload =>
  payload.token_type === REFRESH_TOKEN_TYPE &&
  isNonEmptyString(payload.sub) &&
  isNonEmptyString(payload.user_id);

/**
 * @deprecated Not recommended to use legacy global tokens
 */
const isLegacyGlobalPayload = (
  payload: GlobalTokenSignablePayload
): payload is GlobalTokenPayload => 'userUid' in payload && 'userId' in payload;

const verifyHeaderToken = async <T extends object>(
  header: IncomingHttpHeaders,
  readToken: (header: IncomingHttpHeaders) => string | null,
  verifyTokenFn: (token?: string) => Promise<T | null>
) => {
  const token = readToken(header);
  if (!token) return null;
  return verifyTokenFn(token);
};

/**
 * Checks global JWT claims.
 */
export const ensureGlobalTokenClaims = (
  payload: GlobalJwtClaims | null
): OAuth2AccessTokenPayload | null => {
  if (!payload || !isAccessTokenClaims(payload)) return null;
  return payload;
};

/**
 * Checks legacy global token claims.
 * @deprecated Not recommended to use legacy global tokens
 */
export const ensureLegacyGlobalTokenClaims = (
  payload: GlobalJwtClaims | null
): GlobalTokenPayload | null => {
  if (!payload || !isLegacyGlobalPayload(payload)) return null;
  return payload;
};

/**
 * Verify **regional token** from HTTP headers
 */
export const verifyAccessToken = async (header: IncomingHttpHeaders) => {
  const payload = await verifyHeaderToken<AccessTokenPayload>(
    header,
    readAuthorizationToken,
    (token) => verifyRegionalJwt<AccessTokenPayload>(token)
  );
  if (payload?.regionUid !== regionUID()) return null;
  return payload;
};

/**
 * Verify **global token** from HTTP headers
 */
export const verifyGlobalToken = async (
  header: IncomingHttpHeaders
): Promise<GlobalTokenPayload | null> => {
  const payload = await verifyHeaderToken<GlobalJwtClaims>(
    header,
    readAuthorizationToken,
    (token) => verifyGlobalJwt<GlobalJwtClaims>(token)
  );

  const parsedPayload = ensureGlobalTokenClaims(payload);
  if (parsedPayload) {
    return {
      userUid: parsedPayload.sub,
      userId: parsedPayload.user_id
    };
  }

  const parsedLegacyPayload = ensureLegacyGlobalTokenClaims(payload);
  if (parsedLegacyPayload) {
    return {
      userUid: parsedLegacyPayload?.userUid,
      userId: parsedLegacyPayload?.userId,
      /**
       * For backwards compatibility
       * @deprecated Not recommended to include regionUid in access (global) tokens.
       */
      regionUid: parsedLegacyPayload.regionUid
    };
  }

  return null;
};

const verifyJwt = <T extends object = JWTPayload>(token: string | undefined, secret: string) =>
  new Promise<T | null>((resolve) => {
    if (!token) return resolve(null);
    verify(token, secret, (err, payload) => {
      if (err) {
        resolve(null);
      } else if (!payload) {
        resolve(null);
      } else {
        resolve(payload as T);
      }
    });
  });

export const verifyRegionalJwt = <T extends object = JWTPayload>(token?: string) =>
  verifyJwt<T>(token, regionalJwtSecret());

export const verifyGlobalJwt = <T extends GlobalJwtClaims = GlobalJwtClaims>(token?: string) =>
  verifyJwt<T>(token, globalJwtSecret());

export const verifyInternalJwt = <T extends AccessTokenPayload = AccessTokenPayload>(
  token?: string
) => verifyJwt<T>(token, internalJwtSecret());

export const verifyAppToken = async (header: IncomingHttpHeaders) => {
  return verifyHeaderToken<AccessTokenPayload>(header, readRawAuthorizationToken, (token) =>
    verifyInternalJwt<AccessTokenPayload>(token)
  );
};

export const generateBillingToken = (props: BillingTokenPayload) =>
  sign(props, internalJwtSecret(), { expiresIn: '3600000' });

export const generateRegionalToken = (props: AccessTokenPayload) =>
  sign(props, regionalJwtSecret(), { expiresIn: '7d' });

export const generateAppToken = (props: AccessTokenPayload) =>
  sign(props, internalJwtSecret(), { expiresIn: '7d' });

/**
 * Signs global token.
 *
 * @param props Global token payload
 * @param expiresIn Token expiry
 * @returns JWT token string
 *
 * @see generateOAuth2AccessToken, generateOAuth2RefreshToken, generateGlobalAccessToken
 */
export const signGlobalToken = (props: GlobalJwtClaims, expiresIn?: string) => {
  const payload = {
    ...props
  };

  return sign(payload, globalJwtSecret(), { expiresIn: expiresIn ?? '7d' });
};

/**
 * Generates legacy global token.
 *
 * @deprecated Not recommended to use legacy global tokens
 * @param props Legacy global token payload
 * @param expiresIn Token expiry
 * @returns JWT token string
 */
export const generateLegacyGlobalToken = (props: GlobalTokenPayload, expiresIn?: string) => {
  const payload = {
    ...props,
    client_id: LEGACY_GLOBAL_TOKEN_CLIENT_ID
  };

  return sign(payload, globalJwtSecret(), { expiresIn: expiresIn ?? '7d' });
};

/**
 * Generate OAuth2 access token using OAuth2-style claims.
 */
export const generateOAuth2AccessToken = (props: OAuth2TokenPayload, expiresIn?: string) =>
  signGlobalToken(
    {
      ...props,
      token_type: ACCESS_TOKEN_TYPE
    },
    expiresIn
  );

/**
 * Generate OAuth2 refresh token using OAuth2-style claims.
 */
export const generateOAuth2RefreshToken = (props: OAuth2TokenPayload, expiresIn?: string) =>
  signGlobalToken(
    {
      ...props,
      token_type: REFRESH_TOKEN_TYPE
    },
    expiresIn
  );

/**
 * Generates global access token for desktop auth flow.
 */
export const generateGlobalAccessToken = (
  props: Omit<OAuth2TokenPayload, 'client_id'>,
  expiresIn?: string
) =>
  generateOAuth2AccessToken(
    {
      ...props,
      client_id: GLOBAL_TOKEN_CLIENT_ID
    },
    expiresIn
  );

const verifyOAuth2TokenByType = async (
  token: string | undefined,
  tokenType: typeof ACCESS_TOKEN_TYPE | typeof REFRESH_TOKEN_TYPE
) => {
  const payload = await verifyGlobalJwt(token);
  if (!payload) return null;

  if (tokenType === ACCESS_TOKEN_TYPE) {
    return isAccessTokenClaims(payload) ? payload : null;
  }
  return isRefreshTokenClaims(payload) ? payload : null;
};

/**
 * Verify OAuth2 access token and reject refresh token.
 */
export const verifyOAuth2AccessToken = (token?: string) =>
  verifyOAuth2TokenByType(token, ACCESS_TOKEN_TYPE);

/**
 * Verify OAuth2 refresh token and reject access token.
 */
export const verifyOAuth2RefreshToken = (token?: string) =>
  verifyOAuth2TokenByType(token, REFRESH_TOKEN_TYPE);

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
