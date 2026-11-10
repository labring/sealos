import { createHash, randomBytes } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { globalPrisma, prisma } from './db/init';
import {
  generateAppToken,
  generateGlobalAccessToken,
  generateRegionalToken,
  GLOBAL_TOKEN_CLIENT_ID,
  verifyOAuth2AccessToken
} from './auth';
import { codeOrigin, limitCodeRequests } from './oauth2/authorization-code';
import { OAuth2HttpError } from './oauth2/errors';
import { getCloudConfig } from '@/pages/api/platform/getCloudConfig';
import { getClientIp } from './requestIp';
import { getRegionUid } from '@/services/enable';
import { getUserKubeconfigNotPatch } from './kubernetes/admin';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';
import type { WebSessionCredentials } from '@/types/web-session';

export const WEB_SESSION_COOKIE = '__Host-sealos_web_session';
export const webSessionCookieName = () =>
  codeOrigin().startsWith('https:') ? WEB_SESSION_COOKIE : 'sealos_web_session';
const PREFIX = 'sw_rt_';
const MAX_AGE = 30 * 86400;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const clientId = () => `first-party-web:${codeOrigin()}`;

class WebSessionError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export const appendAuthCookie = (res: NextApiResponse, cookie: string) => {
  const previous = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', [
    ...(Array.isArray(previous) ? previous : previous ? [String(previous)] : []),
    cookie
  ]);
};
const setCookie = (res: NextApiResponse, value: string, maxAge: number) => {
  appendAuthCookie(
    res,
    `${webSessionCookieName()}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${
      codeOrigin().startsWith('https:') ? '; Secure' : ''
    }`
  );
};

const sessionFor = async (raw: unknown) => {
  if (typeof raw !== 'string' || !raw.startsWith(PREFIX) || raw.length > 256) return null;
  const token = await globalPrisma.oAuthCodeRefreshToken.findUnique({
    where: { hash: hash(raw) },
    include: { session: true }
  });
  const session = token?.session;
  if (
    !session ||
    session.clientId !== clientId() ||
    session.revokedAt ||
    session.expiresAt.getTime() <= Date.now()
  )
    return null;
  return session;
};

export const issueWebSession = async (res: NextApiResponse, userUid: string, existing?: string) => {
  const session = await sessionFor(existing);
  if (session?.userUid === userUid) return;
  const raw = PREFIX + randomBytes(32).toString('base64url');
  await globalPrisma.oAuthRefreshSession.create({
    data: {
      clientId: clientId(),
      userUid,
      expiresAt: new Date(Date.now() + MAX_AGE * 1000),
      tokens: { create: { hash: hash(raw) } }
    }
  });
  setCookie(res, raw, MAX_AGE);
};

const requireUser = async (userUid: string) => {
  const user = await globalPrisma.user.findUnique({ where: { uid: userUid } });
  if (!user || user.status !== 'NORMAL_USER') throw new WebSessionError(401, 'Session unavailable');
  return user;
};

export const createWebSession = async (req: NextApiRequest, res: NextApiResponse) => {
  const value = req.headers.authorization;
  let raw: string;
  try {
    raw = typeof value === 'string' ? decodeURIComponent(value) : '';
  } catch {
    throw new WebSessionError(401, 'Invalid login proof');
  }
  const claims = await verifyOAuth2AccessToken(raw);
  // 只允许普通 Web 登录的第一方证明，不能把原生/外部 OAuth token 升级为控制台会话。
  if (!claims || claims.client_id !== GLOBAL_TOKEN_CLIENT_ID)
    throw new WebSessionError(401, 'Invalid login proof');
  await requireUser(claims.sub);
  await issueWebSession(res, claims.sub, req.cookies[webSessionCookieName()]);
  return null;
};

export const refreshWebSession = async (req: NextApiRequest): Promise<WebSessionCredentials> => {
  const session = await sessionFor(req.cookies[webSessionCookieName()]);
  if (!session) throw new WebSessionError(401, 'Session expired');
  const user = await requireUser(session.userUid);
  const workspaceUid = req.body?.workspaceUid;
  if (
    typeof workspaceUid !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceUid)
  )
    throw new WebSessionError(400, 'workspaceUid is required');
  const membership = await prisma.userWorkspace.findFirst({
    where: { workspaceUid, status: 'IN_WORKSPACE', userCr: { userUid: user.uid } },
    include: { userCr: true, workspace: true }
  });
  if (!membership) throw new WebSessionError(403, 'Workspace access denied');
  // 续期读取现有 KC，不能调用会修改 User CR 的登录初始化路径。
  const kc = await getUserKubeconfigNotPatch(membership.userCr.crName);
  if (!kc) throw new WebSessionError(503, 'Credentials temporarily unavailable');
  const payload = {
    userUid: user.uid,
    userId: user.id,
    regionUid: getRegionUid(),
    userCrUid: membership.userCr.uid,
    userCrName: membership.userCr.crName,
    workspaceUid: membership.workspace.uid,
    workspaceId: membership.workspace.id
  };
  return {
    userUid: user.uid,
    workspaceUid: membership.workspace.uid,
    globalToken: generateGlobalAccessToken({
      sub: user.uid,
      user_id: user.id,
      preferred_username: user.nickname
    }),
    token: generateRegionalToken(payload),
    appToken: generateAppToken(payload),
    kubeconfig: switchKubeconfigNamespace(kc, membership.workspace.id)
  };
};

export const logoutWebSession = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await sessionFor(req.cookies[webSessionCookieName()]);
  if (session)
    await globalPrisma.oAuthRefreshSession.updateMany({
      where: { id: session.id, clientId: clientId() },
      data: { revokedAt: new Date() }
    });
  setCookie(res, '', 0);
  return null;
};

export const webSessionHandler =
  (action: (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    if (req.method !== 'POST') return res.status(405).json({ code: 405 });
    try {
      if (!global.AppConfig) await getCloudConfig();
      if (
        req.headers.origin !== codeOrigin() ||
        !req.headers['content-type']?.startsWith('application/json')
      )
        throw new WebSessionError(403, 'Forbidden origin');
      await limitCodeRequests(`web-session:${getClientIp(req) || 'unknown'}`);
      const data = await action(req, res);
      return res.status(200).json({ code: 200, data });
    } catch (error) {
      const status =
        error instanceof WebSessionError || error instanceof OAuth2HttpError ? error.status : 503;
      // 续期响应不能改 cookie；迟到的旧会话失败不能清掉刚登录的新会话。
      return res.status(status).json({
        code: status,
        message: error instanceof WebSessionError ? error.message : 'Session service unavailable'
      });
    }
  };
