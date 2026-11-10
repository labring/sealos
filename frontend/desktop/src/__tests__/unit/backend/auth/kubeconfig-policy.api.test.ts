import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KubeConfig } from '@kubernetes/client-node';
import yaml from 'js-yaml';

const auth = vi.hoisted(() => ({
  verifyAccessToken: vi.fn(),
  verifyAppToken: vi.fn(),
  verifyGlobalToken: vi.fn(),
  verifyRegionalJwt: vi.fn()
}));
const { getRegionToken } = vi.hoisted(() => ({ getRegionToken: vi.fn() }));
vi.mock('@/services/backend/auth', () => auth);
vi.mock('@/services/backend/regionAuth', () => ({ getRegionToken }));

import getKubeconfig from '@/pages/api/auth/getKubeconfig';
import getDefaultKubeconfig from '@/pages/api/auth/getDefaultKubeconfig';
import { getAuthClientConfig } from '@/pages/api/platform/getAuthConfig';

const client = { getClusterCustomObject: vi.fn() };
const regionUser = {
  userCrName: 'admin',
  userCrUid: 'test-cr-uid',
  workspaceId: 'other-workspace'
};
const fixtures = ['regional', 'app', 'global'] as const;
const setFlag = (value: unknown) =>
  vi.stubGlobal('AppConfig', {
    desktop: { auth: { adminKubeconfigEnabled: value, callbackURL: '/callback', idp: {} } }
  });
const createMockRes = () => {
  const res: any = {
    body: undefined,
    json: vi.fn((body: unknown) => {
      res.body = body;
      return res;
    })
  };
  return res;
};
const handlerFor = (type: (typeof fixtures)[number]) => {
  if (type === 'app') auth.verifyAccessToken.mockResolvedValue(null);
  return type === 'global' ? getDefaultKubeconfig : getKubeconfig;
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('AppConfig', undefined);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(KubeConfig.prototype, 'loadFromDefault').mockImplementation(() => {});
  vi.spyOn(KubeConfig.prototype, 'makeApiClient').mockReturnValue(client as any);
  auth.verifyAccessToken.mockResolvedValue(regionUser);
  auth.verifyAppToken.mockResolvedValue(regionUser);
  auth.verifyGlobalToken.mockResolvedValue({ userUid: 'test-uid', userId: 'test-id' });
  auth.verifyRegionalJwt.mockResolvedValue(regionUser);
  getRegionToken.mockResolvedValue({ token: 'test-region-token' });
  client.getClusterCustomObject.mockResolvedValue({
    status: {
      kubeConfig: JSON.stringify({
        contexts: [{ context: { namespace: 'ns-admin' } }],
        users: [{ name: 'admin', user: { token: 'test-user-token' } }]
      })
    }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('admin kubeconfig API policy', () => {
  it.each(fixtures)('keeps %s token access blocked by default', async (type) => {
    const res = createMockRes();
    await handlerFor(type)({ headers: {} } as any, res);
    expect(res.body).toMatchObject({ code: 403, data: null });
    expect(KubeConfig.prototype.loadFromDefault).not.toHaveBeenCalled();
    expect(client.getClusterCustomObject).not.toHaveBeenCalled();
  });

  it.each(fixtures)(
    'allows authenticated %s token access when explicitly enabled',
    async (type) => {
      setFlag(true);
      const res = createMockRes();
      await handlerFor(type)({ headers: {} } as any, res);
      expect(res.body.code).toBe(200);
      const returned = yaml.load(res.body.data.kubeconfig) as any;
      expect(returned.contexts[0].context.namespace).toBe('other-workspace');
      expect(returned.users[0].user.token).toBe('test-user-token');
      expect(client.getClusterCustomObject).toHaveBeenCalledWith({
        group: 'user.sealos.io',
        version: 'v1',
        plural: 'users',
        name: 'admin'
      });
    }
  );

  it.each(fixtures)('still rejects invalid %s credentials with the flag enabled', async (type) => {
    setFlag(true);
    auth.verifyAccessToken.mockResolvedValue(null);
    auth.verifyAppToken.mockResolvedValue(null);
    auth.verifyGlobalToken.mockResolvedValue(null);
    const res = createMockRes();
    await handlerFor(type)({ headers: {} } as any, res);
    expect(res.body.code).toBe(401);
    expect(KubeConfig.prototype.loadFromDefault).not.toHaveBeenCalled();
  });

  it.each(fixtures)('ignores attempts to enable admin access in %s requests', async (type) => {
    setFlag(false);
    const res = createMockRes();
    await handlerFor(type)(
      {
        headers: {},
        query: { adminKubeconfigEnabled: 'true', userCrName: 'ordinary-user' },
        body: { adminKubeconfigEnabled: true, userCrName: 'ordinary-user' }
      } as any,
      res
    );
    expect(res.body.code).toBe(403);
    expect(client.getClusterCustomObject).not.toHaveBeenCalled();
  });

  it.each(fixtures)('keeps cluster read failures as errors for %s requests', async (type) => {
    setFlag(true);
    client.getClusterCustomObject.mockRejectedValue(new Error('cluster unavailable'));
    const res = createMockRes();
    await handlerFor(type)({ headers: {} } as any, res);
    expect(res.body).toMatchObject({ code: 500, data: null });
  });

  it.each([false, true])(
    'never includes the backend flag %s in public auth configuration',
    async (enabled) => {
      setFlag(enabled);
      const config = await getAuthClientConfig();
      expect(config.callbackURL).toBe('/callback');
      expect(config.idp.password.enabled).toBe(false);
      expect(config).not.toHaveProperty('adminKubeconfigEnabled');
    }
  );
});
