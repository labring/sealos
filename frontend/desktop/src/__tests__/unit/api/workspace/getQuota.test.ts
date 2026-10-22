import type { NextApiRequest, NextApiResponse } from 'next';
import { load } from 'js-yaml';
import handler from '@/pages/api/workspace/getQuota';
import { verifyAccessToken } from '@/services/backend/auth';
import { getUserKubeconfigNotPatch } from '@/services/backend/kubernetes/admin';
import { K8sApi } from '@/services/backend/kubernetes/user';
import { normalizeWorkspaceQuota } from '@/services/backend/workspaceQuota';

jest.mock('@/services/backend/auth', () => ({ verifyAccessToken: jest.fn() }));
jest.mock('@/services/backend/kubernetes/admin', () => ({
  getUserKubeconfigNotPatch: jest.fn()
}));
jest.mock('@/services/backend/kubernetes/user', () => ({ K8sApi: jest.fn() }));

const readQuota = jest.fn();
const createResponse = () =>
  ({ json: jest.fn(), setHeader: jest.fn() } as unknown as NextApiResponse);
const createRequest = (method = 'GET') =>
  ({
    method,
    headers: { authorization: 'regional-token' },
    query: { namespace: 'ns-victim', workspaceId: 'ns-victim' },
    body: { namespace: 'ns-victim', workspaceId: 'ns-victim' }
  } as unknown as NextApiRequest);

describe('GET /api/workspace/getQuota', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(verifyAccessToken).mockResolvedValue({
      regionUid: 'region',
      userUid: 'user-uid',
      userId: 'user-id',
      userCrUid: 'user-cr-uid',
      userCrName: 'user-cr',
      workspaceUid: 'workspace-uid',
      workspaceId: 'ns-team'
    });
    jest
      .mocked(getUserKubeconfigNotPatch)
      .mockResolvedValue('contexts:\n  - context:\n      namespace: ns-original\n');
    jest.mocked(K8sApi).mockReturnValue({
      makeApiClient: () => ({ readNamespacedResourceQuota: readQuota })
    } as any);
    readQuota.mockResolvedValue({
      body: {
        status: {
          hard: {
            'limits.cpu': '2',
            'limits.memory': '4Gi',
            'requests.storage': '100Gi',
            pods: '20',
            'services.nodeports': '5'
          },
          used: {
            'limits.cpu': '250m',
            'limits.memory': '512Mi',
            'requests.storage': '2Gi',
            pods: '3',
            'services.nodeports': '1'
          }
        }
      }
    });
  });

  it('returns the exact native client contract and reads only the token workspace', async () => {
    const res = createResponse();
    await handler(createRequest(), res);

    expect(verifyAccessToken).toHaveBeenCalledWith({ authorization: 'regional-token' });
    expect(getUserKubeconfigNotPatch).toHaveBeenCalledWith('user-cr');
    expect(load(jest.mocked(K8sApi).mock.calls[0][0])).toEqual({
      contexts: [{ context: { namespace: 'ns-team' } }]
    });
    expect(readQuota).toHaveBeenCalledTimes(1);
    expect(readQuota).toHaveBeenCalledWith('quota-ns-team', 'ns-team');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(res.json).toHaveBeenCalledWith({
      code: 200,
      message: '',
      data: {
        quota: [
          { type: 'cpu', used: 250, limit: 2000 },
          { type: 'memory', used: 512, limit: 4096 },
          { type: 'storage', used: 2048, limit: 102400 },
          { type: 'pod', used: 3, limit: 20 },
          { type: 'nodeport', used: 1, limit: 5 }
        ]
      }
    });
  });

  it('rejects missing or expired regional tokens without accessing Kubernetes', async () => {
    jest.mocked(verifyAccessToken).mockResolvedValue(null);
    const res = createResponse();
    await handler(createRequest(), res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 401, data: null }));
    expect(getUserKubeconfigNotPatch).not.toHaveBeenCalled();
    expect(readQuota).not.toHaveBeenCalled();
  });

  it('rejects other methods without accessing Kubernetes', async () => {
    const res = createResponse();
    await handler(createRequest('POST'), res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 405, data: null }));
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'GET');
    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(readQuota).not.toHaveBeenCalled();
  });

  it('reports a missing user kubeconfig', async () => {
    jest.mocked(getUserKubeconfigNotPatch).mockResolvedValue(null);
    const res = createResponse();
    await handler(createRequest(), res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 404, data: null }));
    expect(readQuota).not.toHaveBeenCalled();
  });

  it.each([403, 404, 500])('reports Kubernetes error %i without leaking details', async (code) => {
    readQuota.mockRejectedValue({ statusCode: code, body: 'sensitive upstream details' });
    const res = createResponse();
    await handler(createRequest(), res);
    expect(res.json).toHaveBeenCalledWith({
      code,
      message: 'Failed to read workspace quota',
      data: null
    });
  });

  it('does not turn an unavailable quota status into successful empty data', async () => {
    readQuota.mockResolvedValue({ body: {} });
    const res = createResponse();
    await handler(createRequest(), res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 500, data: null }));
  });
});

describe('native client quantity units', () => {
  it.each([
    ['500m', 'cpu', 500],
    ['250000u', 'cpu', 250],
    ['100000000n', 'cpu', 100],
    ['1e-3', 'cpu', 1],
    ['1.5', 'cpu', 1500],
    ['1048576', 'memory', 1],
    ['1024Ki', 'memory', 1],
    ['1.5Gi', 'memory', 1536],
    ['1G', 'memory', 1000000000 / 1048576],
    ['1Ti', 'storage', 1048576]
  ])('converts %s for %s', (quantity, type, expected) => {
    const key = type === 'storage' ? 'requests.storage' : `limits.${type}`;
    expect(normalizeWorkspaceQuota({ status: { hard: { [key]: quantity } } })).toEqual([
      { type, used: 0, limit: expected }
    ]);
  });

  it('uses matching hard/used keys, preserves zero limits and omits unconfigured resources', () => {
    expect(
      normalizeWorkspaceQuota({
        status: {
          hard: {
            'limits.cpu': '0',
            'requests.cpu': '2',
            'requests.memory': '1Gi',
            'count/pods': '10'
          },
          used: { 'requests.cpu': '1', 'requests.memory': '256Mi', 'count/pods': '2' }
        }
      })
    ).toEqual([
      { type: 'cpu', used: 0, limit: 0 },
      { type: 'memory', used: 256, limit: 1024 },
      { type: 'pod', used: 2, limit: 10 }
    ]);
  });

  it.each(['invalid', '-1', '1GiB', '1e999'])('rejects invalid quantity %s', (value) => {
    expect(() => normalizeWorkspaceQuota({ status: { hard: { 'limits.cpu': value } } })).toThrow();
  });
});
