// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../src/pages/api/getQuota';

const { readQuota, authSession, verifyInternalToken } = vi.hoisted(() => ({
  readQuota: vi.fn(),
  authSession: vi.fn(),
  verifyInternalToken: vi.fn()
}));
vi.mock('../../src/service/backend/auth', () => ({ authSession }));
vi.mock('../../src/service/auth', () => ({ verifyInternalToken }));

const invoke = async (body: object) => {
  const json = vi.fn();
  await handler({ body, headers: {} } as any, { json } as any);
  return json.mock.calls[0][0];
};

beforeEach(() => {
  vi.clearAllMocks();
  verifyInternalToken.mockResolvedValue(null);
  (global as any).AppConfig = { cloud: { regionUID: 'local' } };
  authSession.mockResolvedValue({
    getCurrentUser: () => ({ name: 'user' }),
    contexts: [{ namespace: 'ns-current' }],
    getCurrentContext: () => 'current',
    getContextObject: () => ({ namespace: 'ns-current' }),
    makeApiClient: () => ({ readNamespacedResourceQuota: readQuota })
  });
  readQuota.mockImplementation(async (_name: string, namespace: string) => ({
    body: {
      status: {
        hard:
          namespace === 'ns-current'
            ? { 'limits.cpu': '4', 'limits.memory': '8Gi' }
            : { 'limits.cpu': '2000m', 'requests.storage': '20Gi', 'requests.nvidia.com/gpu': '1' },
        used:
          namespace === 'ns-current'
            ? { 'limits.cpu': '500m', 'limits.memory': '1Gi' }
            : { 'limits.cpu': '250m', 'requests.storage': '5Gi', 'requests.nvidia.com/gpu': '1' }
      }
    }
  }));
});

describe('resource quota workspace selection', () => {
  it('sums all selected workspaces by type and deduplicates namespace IDs', async () => {
    const result = await invoke({
      namespace: '',
      namespaces: ['ns-current', 'ns-team', 'ns-team'],
      regionUid: 'local'
    });
    expect(result.code).toBe(200);
    expect(result.data.quota).toEqual([
      { type: 'cpu', used: 0.75, limit: 6 },
      { type: 'memory', used: 1, limit: 8 },
      { type: 'storage', used: 5, limit: 20 },
      { type: 'gpu', used: 1, limit: 1 }
    ]);
    expect(readQuota).toHaveBeenCalledTimes(2);
    expect(readQuota).toHaveBeenCalledWith('quota-ns-team', 'ns-team');
  });

  it('keeps a specific workspace scoped to that workspace', async () => {
    const result = await invoke({ namespace: 'ns-team', namespaces: ['ns-current'] });
    expect(result.code).toBe(200);
    expect(readQuota).toHaveBeenCalledTimes(1);
    expect(readQuota).toHaveBeenCalledWith('quota-ns-team', 'ns-team');
  });

  it('preserves the default namespace for callers omitting the selection', async () => {
    expect((await invoke({})).code).toBe(200);
    expect(readQuota).toHaveBeenCalledWith('quota-ns-current', 'ns-current');
  });

  it('does not turn an empty workspace list into the current workspace', async () => {
    expect((await invoke({ namespace: '', namespaces: [] })).data.quota).toEqual([]);
    expect(readQuota).not.toHaveBeenCalled();
  });

  it.each(
    [undefined, ['ns-current', ''], ['ns-current', 1], 'ns-current'].map((namespaces) => ({
      namespaces
    }))
  )('rejects invalid all-workspace lists: $namespaces', async ({ namespaces }) => {
    expect((await invoke({ namespace: '', namespaces })).code).toBe(400);
    expect(readQuota).not.toHaveBeenCalled();
  });

  it('does not return a partial total when Kubernetes denies a workspace', async () => {
    readQuota.mockRejectedValueOnce({ statusCode: 403 });
    const result = await invoke({ namespace: '', namespaces: ['ns-team', 'ns-current'] });
    expect(result.code).toBe(500);
    expect(result.data).toBeUndefined();
  });

  it('does not query the local cluster for a different region', async () => {
    expect((await invoke({ namespace: 'ns-team', regionUid: 'remote' })).code).toBe(400);
    expect(readQuota).not.toHaveBeenCalled();
  });

  it('uses the signed session region when older chart configurations omit cloud.regionUID', async () => {
    (global as any).AppConfig.cloud.regionUID = '';
    verifyInternalToken.mockResolvedValue({ regionUid: 'local' });
    expect(
      (await invoke({ namespace: 'ns-team', regionUid: 'local', internalToken: 'signed-token' }))
        .code
    ).toBe(200);
    expect(verifyInternalToken).toHaveBeenCalledWith('signed-token');
    expect(readQuota).toHaveBeenCalledWith('quota-ns-team', 'ns-team');
  });

  it('rejects another region even when using the signed session fallback', async () => {
    (global as any).AppConfig.cloud.regionUID = '';
    verifyInternalToken.mockResolvedValue({ regionUid: 'local' });
    expect(
      (await invoke({ namespace: 'ns-team', regionUid: 'remote', internalToken: 'signed-token' }))
        .code
    ).toBe(400);
    expect(readQuota).not.toHaveBeenCalled();
  });

  it('does not trust the requested region without configuration or a valid signed session', async () => {
    (global as any).AppConfig.cloud.regionUID = '';
    expect((await invoke({ namespace: 'ns-team', regionUid: 'local' })).code).toBe(400);
    expect(readQuota).not.toHaveBeenCalled();
  });
});
