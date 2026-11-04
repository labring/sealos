import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';
import {
  generateGlobalAccessToken,
  generateOAuth2AccessToken,
  verifyRegionalJwt
} from '@/services/backend/auth';
import create from '@/pages/api/auth/session';
import refresh from '@/pages/api/auth/session/refresh';
import logout from '@/pages/api/auth/session/logout';
import { WEB_SESSION_COOKIE } from '@/services/backend/web-session';

const { db, membership, getKc } = vi.hoisted(() => ({
  db: {
    user: { findUnique: vi.fn() },
    oAuthRefreshSession: { create: vi.fn(), updateMany: vi.fn() },
    oAuthCodeRefreshToken: { findUnique: vi.fn() }
  },
  membership: vi.fn(),
  getKc: vi.fn()
}));
vi.mock('@/services/backend/db/init', () => ({
  globalPrisma: db,
  prisma: { userWorkspace: { findFirst: membership } }
}));
vi.mock('@/services/backend/oauth2/authorization-code', () => ({
  codeOrigin: () => 'https://cloud.example.test',
  limitCodeRequests: vi.fn()
}));
vi.mock('@/pages/api/platform/getCloudConfig', () => ({ getCloudConfig: vi.fn() }));
vi.mock('@/services/backend/kubernetes/admin', () => ({ getUserKubeconfigNotPatch: getKc }));

const uid = '11111111-1111-4111-8111-111111111111';
const wid = '22222222-2222-4222-8222-222222222222';
const user = { uid, id: 'alice', nickname: 'Alice', status: 'NORMAL_USER' };
const proof = () => generateGlobalAccessToken({ sub: uid, user_id: 'alice' });
const call = async (handler: typeof create, extra: any = {}) => {
  const res: any = { headers: {}, statusCode: 200 };
  res.getHeader = (key: string) => res.headers[key];
  res.setHeader = (key: string, value: unknown) => {
    res.headers[key] = value;
    return res;
  };
  res.status = (status: number) => {
    res.statusCode = status;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  await handler(
    {
      method: 'POST',
      headers: {
        origin: 'https://cloud.example.test',
        'content-type': 'application/json',
        authorization: proof()
      },
      cookies: {},
      body: { workspaceUid: wid },
      socket: {},
      ...extra
    } as any,
    res
  );
  return res;
};
const cookie = (res: any) => res.headers['Set-Cookie'][0].split(';')[0].split('=')[1];

describe('first-party Web session HTTP contract', () => {
  let session: any;
  beforeEach(() => {
    vi.clearAllMocks();
    global.AppConfig = {
      cloud: { regionUID: 'region' },
      desktop: {
        auth: { jwt: { global: 'test-global', regional: 'test-region', internal: 'test-internal' } }
      }
    } as any;
    session = undefined;
    db.user.findUnique.mockResolvedValue(user);
    db.oAuthRefreshSession.create.mockImplementation(async ({ data }) => {
      session = { id: 'session', ...data };
      return session;
    });
    db.oAuthCodeRefreshToken.findUnique.mockImplementation(async ({ where }) =>
      session?.tokens.create.hash === where.hash ? { session } : null
    );
    db.oAuthRefreshSession.updateMany.mockImplementation(async () => {
      session.revokedAt = new Date();
      return { count: 1 };
    });
    membership.mockResolvedValue({
      userCr: { uid: 'user-cr', crName: 'alice' },
      workspace: { uid: wid, id: 'ns-current' }
    });
    getKc.mockResolvedValue(
      'current-context: ctx\ncontexts:\n- name: ctx\n  context:\n    namespace: ns-original\n'
    );
  });

  it('creates a host-only HttpOnly session and renews the selected workspace without exposing its secret', async () => {
    const started = await call(create);
    expect(started.statusCode).toBe(200);
    expect(started.body.data).toBeNull();
    expect(started.headers['Set-Cookie'][0]).toContain(`${WEB_SESSION_COOKIE}=`);
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/'])
      expect(started.headers['Set-Cookie'][0]).toContain(flag);
    expect(started.headers['Set-Cookie'][0]).not.toContain('Domain=');
    const raw = cookie(started);
    expect(session.tokens.create.hash).toBe(createHash('sha256').update(raw).digest('hex'));
    const renewed = await call(refresh, {
      cookies: { [WEB_SESSION_COOKIE]: raw },
      headers: {
        origin: 'https://cloud.example.test',
        'content-type': 'application/json',
        authorization: 'expired-access'
      }
    });
    expect(renewed.statusCode).toBe(200);
    expect(renewed.body.data).not.toHaveProperty('refresh_token');
    expect(renewed.body.data.kubeconfig).toContain('namespace: ns-current');
    expect(await verifyRegionalJwt(renewed.body.data.token)).toMatchObject({
      userUid: uid,
      workspaceUid: wid
    });
    expect(renewed.headers['Set-Cookie']).toBeUndefined();
    expect(renewed.headers['Cache-Control']).toBe('no-store');
  });

  it('cannot upgrade another OAuth client or an expired proof into a Web session', async () => {
    for (const token of [
      generateOAuth2AccessToken({ sub: uid, user_id: 'alice', client_id: 'external-app' }),
      generateGlobalAccessToken({ sub: uid, user_id: 'alice' }, '-1s')
    ]) {
      const result = await call(create, {
        headers: {
          origin: 'https://cloud.example.test',
          'content-type': 'application/json',
          authorization: token
        }
      });
      expect(result.statusCode).toBe(401);
    }
    expect(db.oAuthRefreshSession.create).not.toHaveBeenCalled();
  });

  it('rejects cross-origin requests before using credentials', async () => {
    const result = await call(refresh, {
      headers: { origin: 'https://other.example.test', 'content-type': 'application/json' }
    });
    expect(result.statusCode).toBe(403);
    expect(db.oAuthCodeRefreshToken.findUnique).not.toHaveBeenCalled();
  });

  it('revokes the Web session on logout and rejects further renewal', async () => {
    const started = await call(create);
    const cookies = { [WEB_SESSION_COOKIE]: cookie(started) };
    const ended = await call(logout, { cookies });
    expect(ended.statusCode).toBe(200);
    expect(ended.headers['Set-Cookie'][0]).toContain('Max-Age=0');
    const rejected = await call(refresh, { cookies });
    expect(rejected.statusCode).toBe(401);
    expect(rejected.headers['Set-Cookie']).toBeUndefined();
  });

  it('does not silently switch workspace or expire the account when membership is missing', async () => {
    const started = await call(create);
    membership.mockResolvedValue(null);
    const result = await call(refresh, { cookies: { [WEB_SESSION_COOKIE]: cookie(started) } });
    expect(result.statusCode).toBe(403);
    expect(getKc).not.toHaveBeenCalled();
    expect(session.revokedAt).toBeUndefined();
  });

  it('rejects disabled users and expired sessions', async () => {
    const started = await call(create);
    const cookies = { [WEB_SESSION_COOKIE]: cookie(started) };
    db.user.findUnique.mockResolvedValue({ ...user, status: 'LOCK_USER' });
    expect((await call(refresh, { cookies })).statusCode).toBe(401);
    db.user.findUnique.mockResolvedValue(user);
    session.expiresAt = new Date(0);
    expect((await call(refresh, { cookies })).statusCode).toBe(401);
  });

  it('returns service failures without revoking a valid session or clearing its cookie', async () => {
    const started = await call(create);
    getKc.mockRejectedValue(new Error('cluster unavailable'));
    const result = await call(refresh, { cookies: { [WEB_SESSION_COOKIE]: cookie(started) } });
    expect(result.statusCode).toBe(503);
    expect(result.headers['Set-Cookie']).toBeUndefined();
    expect(session.revokedAt).toBeUndefined();
  });
});
