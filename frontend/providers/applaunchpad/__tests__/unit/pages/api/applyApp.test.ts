import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '@/pages/api/applyApp';
import { ResponseCode, ResponseMessages } from '@/types/response';

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

function createRequest(kind: 'Deployment' | 'StatefulSet', mode: 'create' | 'replace' = 'create') {
  return {
    headers: {},
    body: {
      mode,
      yamlList: [
        `
apiVersion: apps/v1
kind: ${kind}
metadata:
  name: same-name-ui
spec:
  selector:
    matchLabels:
      app: same-name-ui
  template:
    metadata:
      labels:
        app: same-name-ui
    spec:
      containers:
        - name: app
          image: nginx
---
apiVersion: v1
kind: Service
metadata:
  name: same-name-ui
spec:
  selector:
    app: same-name-ui
  ports:
    - port: 80
      targetPort: 80
`
      ]
    }
  } as any;
}

function createResponse() {
  return {
    json: vi.fn((payload) => payload)
  } as any;
}

function createK8sContext() {
  return {
    namespace: 'ns-demo',
    k8sApp: {
      readNamespacedDeployment: vi.fn(() => notFound()),
      readNamespacedStatefulSet: vi.fn(() => notFound())
    },
    k8sNetworkingApp: {
      listNamespacedIngress: vi.fn(() =>
        Promise.resolve({
          body: {
            items: []
          }
        })
      )
    },
    applyYamlList: vi.fn(() => Promise.resolve([{ kind: 'Deployment' }]))
  };
}

describe('/api/applyApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSessionMock.mockResolvedValue('kubeconfig');
  });

  it('rejects create before applying a StatefulSet when a Deployment already uses the app name', async () => {
    const k8s = createK8sContext();
    k8s.k8sApp.readNamespacedDeployment.mockResolvedValue({
      body: {
        metadata: {
          uid: 'deployment-uid'
        }
      }
    });
    getK8sMock.mockResolvedValue(k8s);
    const res = createResponse();

    await handler(createRequest('StatefulSet'), res);

    expect(k8s.k8sApp.readNamespacedDeployment).toHaveBeenCalledWith('same-name-ui', 'ns-demo');
    expect(k8s.k8sApp.readNamespacedStatefulSet).toHaveBeenCalledWith('same-name-ui', 'ns-demo');
    expect(k8s.applyYamlList).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      code: ResponseCode.APP_ALREADY_EXISTS,
      message: ResponseMessages[ResponseCode.APP_ALREADY_EXISTS],
      data: undefined,
      error: undefined
    });
  });

  it('rejects create before applying a Deployment when a StatefulSet already uses the app name', async () => {
    const k8s = createK8sContext();
    k8s.k8sApp.readNamespacedStatefulSet.mockResolvedValue({
      body: {
        metadata: {
          uid: 'statefulset-uid'
        }
      }
    });
    getK8sMock.mockResolvedValue(k8s);
    const res = createResponse();

    await handler(createRequest('Deployment'), res);

    expect(k8s.k8sApp.readNamespacedDeployment).toHaveBeenCalledWith('same-name-ui', 'ns-demo');
    expect(k8s.k8sApp.readNamespacedStatefulSet).toHaveBeenCalledWith('same-name-ui', 'ns-demo');
    expect(k8s.applyYamlList).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      code: ResponseCode.APP_ALREADY_EXISTS,
      message: ResponseMessages[ResponseCode.APP_ALREADY_EXISTS],
      data: undefined,
      error: undefined
    });
  });
});
