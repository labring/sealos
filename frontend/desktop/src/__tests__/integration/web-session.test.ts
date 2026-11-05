import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { sign } from 'jsonwebtoken';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { PrismaClient as GlobalClient } from '../../../prisma/providers/postgresql/global/generated/client';
import { PrismaClient as RegionClient } from '../../../prisma/providers/postgresql/region/generated/client';

// 必须是隔离测试库；不能借用应用配置的数据库。
const globalUrl = process.env.WEB_SESSION_TEST_GLOBAL_URL;
const regionUrl = process.env.WEB_SESSION_TEST_REGION_URL;
const globalDb = new GlobalClient({
  datasources: { db: { url: globalUrl || 'postgresql://unused' } }
});
const regionDb = new RegionClient({
  datasources: { db: { url: regionUrl || 'postgresql://unused' } }
});
vi.mock('@/services/backend/db/init', () => ({ globalPrisma: globalDb, prisma: regionDb }));
vi.mock('@/services/backend/kubernetes/admin', () => ({
  getUserKubeconfigNotPatch: async () =>
    'current-context: ctx\ncontexts:\n- name: ctx\n  context:\n    namespace: ns-original\n'
}));

describe.skipIf(!globalUrl || !regionUrl)(
  'Web session with real PostgreSQL and browser cookies',
  () => {
    const uid = randomUUID(),
      wid = randomUUID(),
      crid = randomUUID();
    const namespace = `ns-${wid}`;
    let server: Server, browser: Browser, context: BrowserContext, page: Page;
    let origin: string;
    let refreshCalls = 0;
    let bootstrapCalls = 0;
    let bundle: string;

    beforeAll(async () => {
      await globalDb.user.create({
        data: { uid, id: uid, name: uid, nickname: 'Test User', avatarUri: '' }
      });
      await regionDb.userCr.create({ data: { uid: crid, userUid: uid, crName: `user-${uid}` } });
      await regionDb.workspace.create({
        data: { uid: wid, id: namespace, displayName: 'Current workspace' }
      });
      await regionDb.userWorkspace.create({
        data: {
          userCrUid: crid,
          workspaceUid: wid,
          status: 'IN_WORKSPACE',
          role: 'OWNER',
          isPrivate: true
        }
      });
      const { default: create } = await import('@/pages/api/auth/session');
      const { default: refresh } = await import('@/pages/api/auth/session/refresh');
      const { default: logout } = await import('@/pages/api/auth/session/logout');
      const { verifyAccessToken } = await import('@/services/backend/auth');
      const handlers: Record<string, typeof create> = {
        '/api/auth/session': create,
        '/api/auth/session/refresh': refresh,
        '/api/auth/session/logout': logout
      };
      server = createServer(async (req, res) => {
        try {
          if (req.url === '/') {
            res.setHeader('Content-Type', 'text/html');
            return res.end(
              '<!doctype html><title>Session test</title><script src="/test.js"></script>'
            );
          }
          if (req.url === '/test.js') {
            res.setHeader('Content-Type', 'application/javascript');
            return res.end(bundle);
          }
          const chunks: string[] = [];
          req.setEncoding('utf8');
          for await (const chunk of req) chunks.push(String(chunk));
          const body = chunks.length ? JSON.parse(chunks.join('')) : {};
          res.setHeader('Content-Type', 'application/json');
          if (req.url === '/api/auth/info' || req.url === '/api/plan/info') {
            const user = await verifyAccessToken(req.headers);
            return res.end(
              JSON.stringify(
                !user
                  ? { code: 401 }
                  : req.url === '/api/auth/info'
                  ? { code: 200, data: { info: { nickname: 'Test User', oauthProvider: [] } } }
                  : { code: 200, data: { subscription: null } }
              )
            );
          }
          if (req.url === '/api/auth/checkStatus') {
            const user = await verifyAccessToken(req.headers);
            return res.end(
              JSON.stringify({ code: user && body.kubeconfig?.includes(namespace) ? 200 : 401 })
            );
          }
          const handler = handlers[req.url || ''];
          if (!handler) {
            res.statusCode = 404;
            return res.end('{}');
          }
          if (req.url?.endsWith('/refresh')) refreshCalls++;
          if (req.url === '/api/auth/session') bootstrapCalls++;
          const cookies = Object.fromEntries(
            (req.headers.cookie || '')
              .split(';')
              .filter(Boolean)
              .map((part) => {
                const at = part.indexOf('=');
                return [part.slice(0, at).trim(), part.slice(at + 1)];
              })
          );
          const response: any = {
            getHeader: res.getHeader.bind(res),
            setHeader: res.setHeader.bind(res),
            status: (status: number) => {
              res.statusCode = status;
              return response;
            },
            json: (value: unknown) => res.end(JSON.stringify(value))
          };
          await handler(Object.assign(req, { body, cookies }) as any, response);
        } catch {
          res.statusCode = 500;
          res.end(JSON.stringify({ code: 500 }));
        }
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
      global.AppConfig = {
        cloud: { regionUID: 'test-region' },
        desktop: {
          auth: {
            callbackURL: origin,
            jwt: { global: 'test-global', regional: 'test-regional', internal: 'test-internal' }
          }
        }
      } as any;
      const require = createRequire(import.meta.url);
      const esbuild = createRequire(require.resolve('vite/package.json'))('esbuild');
      const built = await esbuild.build({
        stdin: {
          contents: `import request from './services/request'; import store from './stores/session'; import { loginSessionConfig, sessionConfig } from './utils/sessionConfig'; window.testSession = { request, store, loginSessionConfig, sessionConfig };`,
          resolveDir: fileURLToPath(new URL('../../', import.meta.url)),
          loader: 'ts'
        },
        alias: { '@': fileURLToPath(new URL('../../', import.meta.url)) },
        bundle: true,
        write: false,
        platform: 'browser',
        define: { 'process.env.NODE_ENV': '"test"' }
      });
      bundle = built.outputFiles[0].text;
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext();
      page = await context.newPage();
      await page.goto(origin);
    }, 30000);

    afterAll(async () => {
      await browser?.close();
      await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
      if (origin) {
        const where = { clientId: `first-party-web:${origin}` };
        await globalDb.oAuthCodeRefreshToken.deleteMany({ where: { session: where } });
        await globalDb.oAuthRefreshSession.deleteMany({ where });
      }
      await regionDb.userWorkspace.deleteMany({ where: { userCrUid: crid } });
      await regionDb.workspace.deleteMany({ where: { uid: wid } });
      await regionDb.userCr.deleteMany({ where: { uid: crid } });
      await globalDb.user.deleteMany({ where: { uid } });
      await Promise.all([globalDb.$disconnect(), regionDb.$disconnect()]);
    });

    it('renews expired access credentials once for concurrent real browser requests and preserves workspace', async () => {
      const { generateGlobalAccessToken } = await import('@/services/backend/auth');
      const globalToken = generateGlobalAccessToken({ sub: uid, user_id: uid });
      const expired = sign(
        {
          userUid: uid,
          userId: uid,
          regionUid: 'test-region',
          workspaceUid: wid,
          workspaceId: namespace
        },
        'test-regional',
        { expiresIn: '-1s' }
      );
      const regional = sign(
        {
          userUid: uid,
          userId: uid,
          userCrUid: crid,
          userCrName: `user-${uid}`,
          regionUid: 'test-region',
          workspaceUid: wid,
          workspaceId: namespace
        },
        'test-regional',
        { expiresIn: '7d' }
      );
      const result = await page.evaluate(
        async ({ globalToken, expired, regional }) => {
          const api = (window as any).testSession;
          api.store.getState().setGlobalToken(globalToken);
          await api.loginSessionConfig({
            token: regional,
            appToken: 'old-app',
            kubeconfig: 'old-kc'
          });
          api.store.getState().setToken(expired);
          const results = await Promise.all([
            api.request.post('/api/auth/checkStatus', { kubeconfig: 'old-kc' }),
            api.request.post('/api/auth/checkStatus', { kubeconfig: 'old-kc' })
          ]);
          return {
            codes: results.map((r) => r.code),
            workspace: api.store.getState().session.user.ns_uid,
            cookieVisible: document.cookie.includes('sealos_web_session'),
            path: location.pathname
          };
        },
        { globalToken, expired, regional }
      );
      expect(result).toEqual({
        codes: [200, 200],
        workspace: wid,
        cookieVisible: false,
        path: '/'
      });
      expect(refreshCalls).toBe(1);
      expect(bootstrapCalls).toBe(1);
      expect((await context.cookies()).find((c) => c.name === 'sealos_web_session')?.httpOnly).toBe(
        true
      );
    });

    it('applies workspace credentials with an expired global proof and a valid persistent cookie', async () => {
      const { generateGlobalAccessToken } = await import('@/services/backend/auth');
      const expiredProof = generateGlobalAccessToken({ sub: uid, user_id: uid }, '-1s');
      const result = await page.evaluate(async (expiredProof) => {
        const api = (window as any).testSession;
        api.store.setState({ globalToken: expiredProof });
        const state = api.store.getState();
        await api.sessionConfig({
          token: state.token,
          appToken: state.session.token,
          kubeconfig: state.session.kubeconfig
        });
        return api.store.getState().session.user.ns_uid;
      }, expiredProof);
      expect(result).toBe(wid);
      expect(bootstrapCalls).toBe(1);
    });

    it('revokes the persistent session and rejects further refresh requests', async () => {
      const options = {
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        data: { workspaceUid: wid }
      };
      expect(
        (await context.request.post(`${origin}/api/auth/session/logout`, options)).status()
      ).toBe(200);
      expect(
        (await context.request.post(`${origin}/api/auth/session/refresh`, options)).status()
      ).toBe(401);
    });
  }
);
