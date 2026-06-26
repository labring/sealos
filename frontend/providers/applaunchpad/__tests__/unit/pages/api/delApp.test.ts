import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteAppByName } from '@/pages/api/delApp';

const authSessionMock = vi.hoisted(() => vi.fn());
const getK8sMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/backend/auth', () => ({
  authSession: authSessionMock
}));

vi.mock('@/services/backend/kubernetes', () => ({
  getK8s: getK8sMock
}));

function notFound() {
  return Promise.reject({
    body: {
      code: 404
    }
  });
}

function createK8sContext() {
  return {
    namespace: 'ns-demo',
    k8sApp: {
      deleteNamespacedDeployment: vi.fn(() => notFound()),
      deleteNamespacedStatefulSet: vi.fn(() => Promise.resolve({})),
      readNamespacedDeployment: vi.fn(() => notFound()),
      readNamespacedStatefulSet: vi.fn(() =>
        Promise.resolve({
          body: {
            metadata: {
              annotations: {
                'cloud.sealos.io/owner-references': 'ready'
              }
            }
          }
        })
      )
    },
    k8sCore: {
      deleteCollectionNamespacedService: vi.fn(() => Promise.resolve({})),
      deleteNamespacedConfigMap: vi.fn(() => notFound()),
      deleteNamespacedSecret: vi.fn(() => notFound()),
      deleteCollectionNamespacedPersistentVolumeClaim: vi.fn(() => Promise.resolve({}))
    },
    k8sNetworkingApp: {
      deleteCollectionNamespacedIngress: vi.fn(() => Promise.resolve({}))
    },
    k8sAutoscaling: {
      deleteNamespacedHorizontalPodAutoscaler: vi.fn(() => notFound())
    },
    k8sCustomObjects: {
      listNamespacedCustomObject: vi.fn(() =>
        Promise.resolve({
          body: {
            items: []
          }
        })
      )
    }
  };
}

describe('DeleteAppByName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSessionMock.mockResolvedValue('kubeconfig');
  });

  it('deletes app PVCs before returning from ownerReferences cascade path', async () => {
    const k8s = createK8sContext();
    getK8sMock.mockResolvedValue(k8s);

    await DeleteAppByName({
      name: 'demo',
      req: {
        headers: {}
      } as any
    });

    expect(k8s.k8sCore.deleteCollectionNamespacedPersistentVolumeClaim).toHaveBeenCalledWith(
      'ns-demo',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'app=demo'
    );
    expect(k8s.k8sApp.deleteNamespacedStatefulSet).toHaveBeenCalledWith('demo', 'ns-demo');
    expect(k8s.k8sCore.deleteCollectionNamespacedService).not.toHaveBeenCalled();
    expect(k8s.k8sNetworkingApp.deleteCollectionNamespacedIngress).not.toHaveBeenCalled();
  });
});
