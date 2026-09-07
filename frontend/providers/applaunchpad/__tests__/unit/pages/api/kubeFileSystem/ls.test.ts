import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '@/pages/api/kubeFileSystem/ls';
import { ResponseCode, ResponseMessages } from '@/types/response';

const authSessionMock = vi.hoisted(() => vi.fn());
const getK8sMock = vi.hoisted(() => vi.fn());
const createSelfSubjectAccessReviewMock = vi.hoisted(() => vi.fn());
const kubeFileLsMock = vi.hoisted(() => vi.fn());
const KubeFileSystemMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/backend/auth', () => ({
  authSession: authSessionMock
}));

vi.mock('@/services/backend/kubernetes', () => ({
  getK8s: getK8sMock
}));

vi.mock('@/utils/kubeFileSystem', () => ({
  KubeFileSystem: KubeFileSystemMock
}));

function createRequest() {
  return {
    headers: {},
    body: {
      containerName: 'app',
      podName: 'demo-pod',
      path: '/data',
      showHidden: false
    }
  } as any;
}

function createResponse() {
  return {
    json: vi.fn((payload) => payload)
  } as any;
}

function mockK8sContext(allowed: boolean) {
  createSelfSubjectAccessReviewMock.mockResolvedValue({
    body: {
      status: {
        allowed
      }
    }
  });
  getK8sMock.mockResolvedValue({
    kc: {
      makeApiClient: vi.fn(() => ({
        createSelfSubjectAccessReview: createSelfSubjectAccessReviewMock
      }))
    },
    namespace: 'ns-demo',
    k8sExec: {}
  });
}

describe('/api/kubeFileSystem/ls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSessionMock.mockResolvedValue('kubeconfig');
    KubeFileSystemMock.mockImplementation(function () {
      return {
        ls: kubeFileLsMock
      };
    });
  });

  it('lists files without a preflight pods/exec access review', async () => {
    mockK8sContext(false);
    kubeFileLsMock.mockResolvedValue({
      directories: [],
      files: []
    });
    const res = createResponse();

    await handler(createRequest(), res);

    expect(createSelfSubjectAccessReviewMock).not.toHaveBeenCalled();
    expect(KubeFileSystemMock).toHaveBeenCalledWith({});
    expect(kubeFileLsMock).toHaveBeenCalledWith({
      namespace: 'ns-demo',
      podName: 'demo-pod',
      containerName: 'app',
      path: '/data',
      showHidden: false
    });
    expect(res.json).toHaveBeenCalledWith({
      code: ResponseCode.SUCCESS,
      message: ResponseMessages[ResponseCode.SUCCESS],
      data: {
        directories: [],
        files: []
      },
      error: undefined
    });
  });
});
