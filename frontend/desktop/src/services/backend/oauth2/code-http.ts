import { getCloudConfig } from '@/pages/api/platform/getCloudConfig';
import { getClientIp } from '../requestIp';
import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { OAuth2HttpError } from './errors';
import {
  codeCookieName,
  codeOrigin,
  ensureCodeEnabled,
  limitCodeRequests
} from './authorization-code';
import { resolveOAuth2AuthUser } from './auth';

export const codeParameters = (input: unknown): Record<string, string> => {
  let entries: [string, unknown][];
  if (typeof input === 'string') entries = [...new URLSearchParams(input).entries()];
  else if (input && typeof input === 'object' && !Array.isArray(input))
    entries = Object.entries(input);
  else throw new OAuth2HttpError(400, 'invalid_request');
  const params: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (Object.hasOwn(params, key) || typeof value !== 'string' || value.length > 4096)
      throw new OAuth2HttpError(400, 'invalid_request', 'Invalid or duplicate parameters');
    Object.defineProperty(params, key, { value, enumerable: true });
  }
  if (!params.client_id && !params.request_id) throw new OAuth2HttpError(400, 'invalid_request');
  return params;
};
export const codeResponse = async (res: NextApiResponse, action: () => Promise<unknown>) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Referrer-Policy', 'no-referrer');
  try {
    await action();
  } catch (error) {
    const known = error instanceof OAuth2HttpError;
    res.status(known ? error.status : 500).json({
      error: known ? error.error : 'server_error',
      ...(known ? { error_description: error.message } : {})
    });
  }
};
export const limitCodeHttp = async (req: NextApiRequest, newAuthorization = true) => {
  if (!global.AppConfig) await getCloudConfig();
  ensureCodeEnabled(newAuthorization);
  await limitCodeRequests(getClientIp(req) || 'unknown');
};
export const codeBrowserUser = async (req: NextApiRequest, params: Record<string, string>) => {
  if (!z.string().uuid().safeParse(params.request_id).success)
    throw new OAuth2HttpError(400, 'invalid_request');
  // Browser decisions require an explicit authorization header and same-origin JSON.
  // Cookies alone never authorize a decision.
  if (
    req.method === 'POST' &&
    (req.headers.origin !== codeOrigin() ||
      !req.headers['content-type']?.startsWith('application/json'))
  )
    throw new OAuth2HttpError(403, 'access_denied');
  const auth = await resolveOAuth2AuthUser(req);
  if (!auth?.userUid) throw new OAuth2HttpError(401, 'invalid_request', 'Authentication required');
  const secret = req.cookies[codeCookieName(params.request_id)];
  if (!secret) throw new OAuth2HttpError(400, 'invalid_grant');
  return { userUid: auth.userUid, secret };
};
