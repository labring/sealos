import { NextApiRequest, NextApiResponse } from 'next';
import { OAuth2Client } from 'google-auth-library';
import { enableGoogle } from '@/services/enable';
import { persistImage } from '@/services/backend/persistImage';
import { getGlobalToken } from '@/services/backend/globalAuth';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { jsonRes } from '@/services/backend/response';
import { SHARED_AUTH_COOKIE_NAME } from '@/utils/cookieUtils';
import { ProviderType } from 'prisma/global/generated/client';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

const getAllowedOrigins = () => global.AppConfig?.desktop.auth.idp.google?.oneTapOrigins || [];

const getRequestOrigin = (req: NextApiRequest) => req.headers.origin;

const isAllowedOrigin = (origin: string | undefined) =>
  !!origin && getAllowedOrigins().includes(origin);

const applyCorsHeaders = (req: NextApiRequest, res: NextApiResponse) => {
  const origin = getRequestOrigin(req);
  if (!origin || !isAllowedOrigin(origin)) return false;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  return true;
};

const isHttpsRequest = (req: NextApiRequest) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  return proto === 'https';
};

const serializeAuthCookie = (token: string, secure: boolean) =>
  [
    `${SHARED_AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${COOKIE_MAX_AGE}`,
    ...(secure ? ['Secure'] : [])
  ].join('; ');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!applyCorsHeaders(req, res)) {
    if (req.method === 'OPTIONS') {
      return res.status(403).end();
    }
    return jsonRes(res, {
      code: 403,
      message: 'Forbidden origin'
    });
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return jsonRes(res, {
      code: 405,
      message: 'Method not allowed'
    });
  }

  if (!enableGoogle()) {
    return jsonRes(res, {
      code: 500,
      message: 'google client is not defined'
    });
  }

  const credential = typeof req.body?.credential === 'string' ? req.body.credential : '';
  if (!credential) {
    return jsonRes(res, {
      code: 400,
      message: 'credential is invalid'
    });
  }

  const clientID = global.AppConfig?.desktop.auth.idp.google?.clientID;
  if (!clientID) {
    return jsonRes(res, {
      code: 500,
      message: 'google client is not defined'
    });
  }

  let payload;
  try {
    const ticket = await new OAuth2Client(clientID).verifyIdToken({
      idToken: credential,
      audience: clientID
    });
    payload = ticket.getPayload();
  } catch {
    return jsonRes(res, {
      code: 401,
      message: 'Unauthorized'
    });
  }

  if (!payload?.sub) {
    return jsonRes(res, {
      code: 401,
      message: 'Unauthorized'
    });
  }

  const avatarUrl = payload.picture
    ? await persistImage(payload.picture, 'avatar/' + ProviderType.GOOGLE + '/' + payload.sub)
        .then((url) => url || '')
        .catch(() => '')
    : '';

  const data = await getGlobalToken({
    provider: ProviderType.GOOGLE,
    providerId: payload.sub,
    name: payload.name || '',
    avatar_url: avatarUrl,
    email: payload.email_verified ? payload.email : undefined
  });

  if (data?.isRestricted) {
    return jsonRes(res, {
      code: 401,
      message: 'Account banned'
    });
  }

  if (!data) {
    return jsonRes(res, {
      code: 401,
      message: 'Unauthorized'
    });
  }

  if (data.error) {
    return jsonRes(res, {
      code: 40000,
      data,
      message: 'Unauthorized'
    });
  }

  const token = data.token;
  if (!token) {
    return jsonRes(res, {
      code: 401,
      message: 'Unauthorized'
    });
  }

  res.setHeader('Set-Cookie', serializeAuthCookie(token, isHttpsRequest(req)));
  return jsonRes(res, {
    data,
    code: 200,
    message: 'Successfully'
  });
}

export default ErrorHandler(handler);
