import { createHash, randomBytes } from 'crypto';
import { Prisma } from 'prisma/global/generated/client';
import { globalPrisma } from '../db/init';
import { generateOAuth2AccessToken } from '../auth';
import { OAuth2HttpError } from './errors';

export const CODE_REFRESH_PREFIX = 'sc_rt_';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const random = () => randomBytes(32).toString('base64url');
const refreshExpiry = () => new Date(Date.now() + 30 * 86400_000);
export const codeCookieName = (id: string) => `oauth_code_${id}`;
export const codeOrigin = () => {
  const url = global.AppConfig?.desktop.auth.callbackURL;
  if (url?.startsWith('https://') || url?.startsWith('http://')) return new URL(url).origin;
  const { domain = 'localhost', port = '443' } = global.AppConfig?.cloud || {};
  return `${port === '443' ? 'https' : 'http'}://${domain}${port === '443' ? '' : `:${port}`}`;
};
export const ensureCodeEnabled = (newAuthorization = true) => {
  const config = global.AppConfig?.desktop.auth.oauth2idp;
  if (!config?.enabled || (newAuthorization && !config.authorizationCodeEnabled)) {
    throw new OAuth2HttpError(
      503,
      'temporarily_unavailable',
      'Authorization code flow is disabled'
    );
  }
};
const fail = (message = 'Invalid authorization grant'): never => {
  throw new OAuth2HttpError(400, 'invalid_grant', message);
};

// CockroachDB serializes transactions. PostgreSQL uses the same isolation contract.
const transaction = async <T>(run: (db: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await globalPrisma.$transaction(run, { isolationLevel: 'Serializable' });
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2034' || attempt >= 4) throw error;
    }
  }
};

const clientFor = async (clientId: string, grant: string) => {
  if (!clientId) throw new OAuth2HttpError(400, 'invalid_request', 'client_id is required');
  const client = await globalPrisma.oAuthClient.findUnique({ where: { clientId } });
  if (!client || client.clientType !== 'PUBLIC') throw new OAuth2HttpError(400, 'invalid_client');
  if (!client.allowedGrantTypes.includes(grant))
    throw new OAuth2HttpError(400, 'unauthorized_client');
  return client;
};

const validRedirect = (raw: string) => {
  try {
    const url = new URL(raw);
    if (raw.includes('#') || raw.includes('*') || url.username || url.password) return false;
    if (url.protocol === 'https:') return true;
    if (url.protocol === 'http:') return url.hostname === '127.0.0.1' || url.hostname === '[::1]';
    return /^[a-z][a-z0-9+.-]*\.[a-z0-9+.-]+:$/.test(url.protocol);
  } catch {
    return false;
  }
};
const matchesRedirect = (raw: string, registered: string) => {
  if (!validRedirect(raw) || !validRedirect(registered)) return false;
  if (raw === registered) return true;
  const actual = new URL(raw);
  const expected = new URL(registered);
  if (actual.protocol !== 'http:' || expected.protocol !== 'http:') return false;
  // Only the loopback port may vary; preserve raw path/query spelling.
  const withoutPort = (uri: string) =>
    uri.replace(/^(http:\/\/(?:127\.0\.0\.1|\[::1\]))(?::\d+)?(?=\/|\?|$)/, '$1');
  return withoutPort(raw) === withoutPort(registered);
};
export const codeRedirect = (uri: string, fields: Record<string, string>) => {
  const target = new URL(uri);
  for (const key of ['code', 'error', 'error_description', 'state'])
    target.searchParams.delete(key);
  for (const [key, value] of Object.entries(fields)) target.searchParams.set(key, value);
  return target.toString();
};

let nextCleanup = 0;
export const limitCodeRequests = async (identity: string) => {
  const now = Date.now();
  const bucket = Math.floor(now / 60_000);
  const key = hash(`${identity}:${bucket}`);
  const record = await globalPrisma.oAuthCodeRateLimit.upsert({
    where: { key },
    create: { key, count: 1, expiresAt: new Date((bucket + 2) * 60_000) },
    update: { count: { increment: 1 } }
  });
  if (record.count > 120)
    throw new OAuth2HttpError(429, 'temporarily_unavailable', 'Too many requests');
  if (now >= nextCleanup) {
    nextCleanup = now + 60_000;
    try {
      await transaction(async (db) => {
        await db.oAuthAuthorizationRequest.deleteMany({
          where: { expiresAt: { lt: new Date(now) } }
        });
        await db.oAuthRefreshSession.deleteMany({ where: { expiresAt: { lt: new Date(now) } } });
        await db.oAuthCodeRateLimit.deleteMany({ where: { expiresAt: { lt: new Date(now) } } });
      });
    } catch {
      nextCleanup = 0;
    } // Cleanup failure must not prevent login; retry next request.
  }
};

export const beginCodeAuthorization = async (params: Record<string, string>) => {
  ensureCodeEnabled();
  const client = await clientFor(params.client_id, 'authorization_code');
  if (!client.redirectUris.some((uri) => matchesRedirect(params.redirect_uri, uri))) {
    throw new OAuth2HttpError(400, 'invalid_request', 'Unregistered redirect_uri');
  }
  const reject = (error: string) => ({
    redirect: codeRedirect(params.redirect_uri, {
      error,
      ...(params.state ? { state: params.state } : {})
    })
  });
  if (params.response_type !== 'code') return reject('unsupported_response_type');
  if (params.scope) return reject('invalid_scope');
  if (
    !params.state ||
    params.state.length > 1024 ||
    params.code_challenge_method !== 'S256' ||
    !/^[A-Za-z0-9_-]{43}$/.test(params.code_challenge || '')
  )
    return reject('invalid_request');
  if (!client.allowedGrantTypes.includes('refresh_token')) return reject('unauthorized_client');
  const browserSecret = random();
  const request = await globalPrisma.oAuthAuthorizationRequest.create({
    data: {
      clientId: client.clientId,
      redirectUri: params.redirect_uri,
      state: params.state,
      challenge: params.code_challenge,
      browserHash: hash(browserSecret),
      expiresAt: new Date(Date.now() + 600_000)
    }
  });
  return { requestId: request.id, browserSecret };
};

const loadRequest = async (id: string, browserSecret: string) => {
  ensureCodeEnabled();
  const request = await globalPrisma.oAuthAuthorizationRequest.findUnique({ where: { id } });
  if (
    !request ||
    request.browserHash !== hash(browserSecret) ||
    request.expiresAt.getTime() <= Date.now() ||
    request.status !== 'PENDING'
  )
    fail('Authorization request is invalid or expired. Start again in the app.');
  return request!;
};
export const codeContext = async (id: string, browserSecret: string, userUid: string) => {
  const request = await loadRequest(id, browserSecret);
  const client = await clientFor(request.clientId, 'authorization_code');
  const user = await globalPrisma.user.findUnique({ where: { uid: userUid } });
  if (!user) fail();
  return {
    client_name: client.name,
    client_logo_url: client.logoUrl,
    account: user!.nickname || user!.id,
    expires_at: request.expiresAt.toISOString()
  };
};
export const decideCodeAuthorization = async (
  id: string,
  browserSecret: string,
  userUid: string,
  approve: boolean
) => {
  const request = await loadRequest(id, browserSecret);
  const client = await clientFor(request.clientId, 'authorization_code');
  if (!client.redirectUris.some((uri) => matchesRedirect(request.redirectUri, uri))) fail();
  const code = random();
  await transaction(async (db) => {
    if (!(await db.user.findUnique({ where: { uid: userUid } }))) fail();
    const changed = await db.oAuthAuthorizationRequest.updateMany({
      where: { id, status: 'PENDING', expiresAt: { gt: new Date() } },
      data: {
        status: approve ? 'APPROVED' : 'DENIED',
        userUid,
        codeHash: approve ? hash(code) : null,
        expiresAt: new Date(Date.now() + 300_000)
      }
    });
    if (changed.count !== 1) fail();
  });
  return {
    redirect_uri: codeRedirect(request.redirectUri, {
      ...(approve ? { code } : { error: 'access_denied' }),
      state: request.state
    })
  };
};

const tokenResponse = (
  user: { uid: string; id: string; nickname: string },
  clientId: string,
  refreshToken: string
) => ({
  access_token: generateOAuth2AccessToken(
    { sub: user.uid, user_id: user.id, preferred_username: user.nickname, client_id: clientId },
    '3600s'
  ),
  refresh_token: refreshToken,
  token_type: 'Bearer' as const,
  expires_in: 3600
});
export const exchangeAuthorizationCode = async (params: Record<string, string>) => {
  ensureCodeEnabled();
  const client = await clientFor(params.client_id, 'authorization_code');
  if (!client.allowedGrantTypes.includes('refresh_token'))
    throw new OAuth2HttpError(400, 'unauthorized_client');
  if (!params.code || !params.redirect_uri || !params.code_verifier)
    throw new OAuth2HttpError(400, 'invalid_request');
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(params.code_verifier)) fail();
  return transaction(async (db) => {
    const request = await db.oAuthAuthorizationRequest.findUnique({
      where: { codeHash: hash(params.code) }
    });
    const challenge = createHash('sha256').update(params.code_verifier).digest('base64url');
    if (
      !request ||
      !request.userUid ||
      request.clientId !== client.clientId ||
      request.redirectUri !== params.redirect_uri ||
      request.challenge !== challenge ||
      request.status !== 'APPROVED' ||
      request.expiresAt.getTime() <= Date.now()
    )
      return fail();
    if (!client.redirectUris.some((uri) => matchesRedirect(request.redirectUri, uri)))
      return fail();
    const user = await db.user.findUnique({ where: { uid: request.userUid } });
    if (!user) return fail();
    const consumed = await db.oAuthAuthorizationRequest.updateMany({
      where: { id: request.id, status: 'APPROVED', expiresAt: { gt: new Date() } },
      data: { status: 'CONSUMED' }
    });
    if (consumed.count !== 1) return fail();
    const refresh = CODE_REFRESH_PREFIX + random();
    await db.oAuthRefreshSession.create({
      data: {
        clientId: client.clientId,
        userUid: user.uid,
        expiresAt: refreshExpiry(),
        tokens: { create: { hash: hash(refresh) } }
      }
    });
    return tokenResponse(user, client.clientId, refresh);
  });
};
export const refreshCodeToken = async (params: Record<string, string>) => {
  ensureCodeEnabled(false);
  const client = await clientFor(params.client_id, 'refresh_token');
  const result = await transaction(async (db) => {
    const token = await db.oAuthCodeRefreshToken.findUnique({
      where: { hash: hash(params.refresh_token) },
      include: { session: true }
    });
    if (
      !token ||
      token.session.clientId !== client.clientId ||
      token.session.revokedAt ||
      token.session.expiresAt.getTime() <= Date.now()
    )
      return null;
    if (token.consumedAt) {
      await db.oAuthRefreshSession.update({
        where: { id: token.sessionId },
        data: { revokedAt: new Date() }
      });
      return null; // Commit revocation before returning invalid_grant.
    }
    const user = await db.user.findUnique({ where: { uid: token.session.userUid } });
    if (!user) return null;
    await db.oAuthCodeRefreshToken.update({
      where: { hash: token.hash },
      data: { consumedAt: new Date() }
    });
    const refresh = CODE_REFRESH_PREFIX + random();
    await db.oAuthRefreshSession.update({
      where: { id: token.sessionId },
      data: { expiresAt: refreshExpiry(), tokens: { create: { hash: hash(refresh) } } }
    });
    return tokenResponse(user, client.clientId, refresh);
  });
  return result || fail();
};
export const revokeCodeToken = async (clientId: string, raw: string) => {
  ensureCodeEnabled(false);
  await clientFor(clientId, 'refresh_token');
  if (!raw.startsWith(CODE_REFRESH_PREFIX)) return;
  await transaction(async (db) => {
    const token = await db.oAuthCodeRefreshToken.findUnique({ where: { hash: hash(raw) } });
    if (token)
      await db.oAuthRefreshSession.updateMany({
        where: { id: token.sessionId, clientId },
        data: { revokedAt: new Date() }
      });
  });
};
