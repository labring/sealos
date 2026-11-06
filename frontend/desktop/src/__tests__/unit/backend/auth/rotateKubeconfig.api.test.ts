import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KubeConfig } from '@kubernetes/client-node';
import yaml from 'js-yaml';

const { verifyAccessToken } = vi.hoisted(() => ({ verifyAccessToken: vi.fn() }));

vi.mock('@/services/backend/auth', () => ({ verifyAccessToken }));

import handler from '@/pages/api/auth/rotateKubeconfig';

const client = {
  getClusterCustomObjectStatus: vi.fn(),
  patchClusterCustomObject: vi.fn()
};
const kubeconfig = (token: string) =>
  JSON.stringify({
    contexts: [{ context: { namespace: 'ns-admin' } }],
    users: [{ name: 'admin', user: { token } }]
  });
const setFlag = (value: unknown) =>
  vi.stubGlobal('AppConfig', { desktop: { auth: { adminKubeconfigEnabled: value } } });

const createMockRes = () => {
  const res: any = {
    body: undefined,
    json: vi.fn((payload: unknown) => {
      res.body = payload;
      return res;
    })
  };
  return res;
};

describe('rotate kubeconfig api', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal('AppConfig', undefined);
    vi.spyOn(KubeConfig.prototype, 'loadFromDefault').mockImplementation(() => {});
    vi.spyOn(KubeConfig.prototype, 'makeApiClient').mockReturnValue(client as any);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    verifyAccessToken.mockResolvedValue({
      userCrName: 'admin',
      workspaceId: 'other-workspace'
    });
    client.getClusterCustomObjectStatus
      .mockResolvedValueOnce({ body: { status: { kubeConfig: kubeconfig('old-test-token') } } })
      .mockResolvedValue({ body: { status: { kubeConfig: kubeconfig('new-test-token') } } });
    client.patchClusterCustomObject.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([undefined, false, null, 'true', 'false', 1])(
    'returns 403 for admin with flag %j without touching the cluster API',
    async (value) => {
      setFlag(value);
      const res = createMockRes();
      await handler({ headers: {} } as any, res);

      expect(res.body).toEqual({
        code: 403,
        message: 'Kubeconfig rotation is forbidden for admin users',
        data: null
      });
      expect(KubeConfig.prototype.loadFromDefault).not.toHaveBeenCalled();
      expect(KubeConfig.prototype.makeApiClient).not.toHaveBeenCalled();
      expect(client.patchClusterCustomObject).not.toHaveBeenCalled();
    }
  );

  it('keeps admin blocked before configuration is loaded', async () => {
    const res = createMockRes();
    await handler({ headers: {} } as any, res);
    expect(res.body.code).toBe(403);
    expect(KubeConfig.prototype.loadFromDefault).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'admin', enabled: true },
    { name: 'ns-admin', enabled: false },
    { name: 'workspace-user', enabled: false }
  ])(
    'rotates KC for $name with flag $enabled through the existing flow',
    async ({ name, enabled }) => {
      setFlag(enabled);
      verifyAccessToken.mockResolvedValue({ userCrName: name, workspaceId: 'other-workspace' });
      const res = createMockRes();
      const pending = handler({ headers: {} } as any, res);
      await vi.advanceTimersByTimeAsync(5000);
      await pending;

      expect(res.body.code).toBe(200);
      const returned = yaml.load(res.body.data.kubeconfig) as any;
      expect(returned.contexts[0].context.namespace).toBe('other-workspace');
      expect(returned.users[0].user.token).toBe('new-test-token');
      expect(client.patchClusterCustomObject).toHaveBeenCalledWith(
        'user.sealos.io',
        'v1',
        'users',
        name,
        [expect.objectContaining({ op: 'add', path: '/spec/kubeConfigRotateAt' })],
        undefined,
        undefined,
        undefined,
        { headers: { 'Content-Type': 'application/json-patch+json' } }
      );
    }
  );

  it('rejects invalid credentials even when admin KC access is enabled', async () => {
    setFlag(true);
    verifyAccessToken.mockResolvedValue(null);
    const res = createMockRes();
    await handler({ headers: {} } as any, res);
    expect(res.body.code).toBe(401);
    expect(KubeConfig.prototype.loadFromDefault).not.toHaveBeenCalled();
  });

  it('cannot enable admin KC access using request parameters', async () => {
    setFlag(false);
    const res = createMockRes();
    await handler(
      {
        headers: {},
        query: { adminKubeconfigEnabled: 'true' },
        body: { adminKubeconfigEnabled: true }
      } as any,
      res
    );
    expect(res.body.code).toBe(403);
    expect(client.patchClusterCustomObject).not.toHaveBeenCalled();
  });

  it('preserves cluster errors after access is enabled', async () => {
    setFlag(true);
    client.patchClusterCustomObject.mockRejectedValue(new Error('cluster unavailable'));
    const res = createMockRes();
    await handler({ headers: {} } as any, res);
    expect(res.body).toMatchObject({ code: 500, message: 'cluster unavailable' });
    expect(client.patchClusterCustomObject).toHaveBeenCalledOnce();
  });
});
