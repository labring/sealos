import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '@/pages/api/updateApp';
import yaml from 'js-yaml';

const initK8sMock = vi.hoisted(() => vi.fn());

vi.mock('sealos-desktop-sdk/service', () => ({
  initK8s: initK8sMock
}));

vi.mock('sealos-desktop-sdk', () => ({
  errLog: vi.fn(),
  infoLog: vi.fn(),
  warnLog: vi.fn()
}));

function notFound() {
  return Promise.reject({
    body: {
      code: 404
    }
  });
}

const statefulSetYaml = `
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: demo
spec:
  selector:
    matchLabels:
      app: demo
  serviceName: demo-service
  template:
    metadata:
      labels:
        app: demo
    spec:
      containers:
        - name: demo
          image: nginx
          volumeMounts:
            - name: data
              mountPath: /data
  volumeClaimTemplates:
    - metadata:
        name: data
        annotations:
          path: /data
          value: "1"
      spec:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 1Gi
`;

function createRequest() {
  return {
    body: {
      appName: 'demo',
      stateFulSetYaml: statefulSetYaml,
      patch: [
        {
          type: 'create',
          kind: 'StatefulSet',
          value: statefulSetYaml
        },
        {
          type: 'delete',
          kind: 'Deployment',
          name: 'demo'
        }
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
    applyYamlList: vi.fn(() => Promise.resolve([{ kind: 'StatefulSet' }])),
    k8sApp: {
      readNamespacedDeployment: vi.fn(() =>
        Promise.resolve({
          body: {
            metadata: {
              uid: 'old-deployment-uid'
            }
          }
        })
      ),
      readNamespacedStatefulSet: vi.fn(() =>
        Promise.resolve({
          body: {
            metadata: {
              uid: 'new-statefulset-uid'
            }
          }
        })
      ),
      patchNamespacedDeployment: vi.fn(() => Promise.resolve({})),
      patchNamespacedStatefulSet: vi.fn(() => Promise.resolve({})),
      replaceNamespacedStatefulSet: vi.fn(() => Promise.resolve({})),
      createNamespacedStatefulSet: vi.fn(() => Promise.resolve({})),
      deleteNamespacedDeployment: vi.fn(() => Promise.resolve({})),
      deleteNamespacedStatefulSet: vi.fn(() => Promise.resolve({}))
    },
    k8sCore: {
      listNamespacedPersistentVolumeClaim: vi.fn(() =>
        Promise.resolve({
          body: {
            items: [
              {
                metadata: {
                  name: 'demo-data-0',
                  annotations: {
                    path: '/data',
                    value: '1'
                  }
                },
                spec: {
                  resources: {
                    requests: {
                      storage: '1Gi'
                    }
                  }
                }
              }
            ]
          }
        })
      ),
      listNamespacedService: vi.fn(() =>
        Promise.resolve({
          body: {
            items: [
              {
                metadata: {
                  name: 'demo-service'
                }
              }
            ]
          }
        })
      ),
      patchNamespacedService: vi.fn(() => Promise.resolve({})),
      patchNamespacedPersistentVolumeClaim: vi.fn(() => Promise.resolve({})),
      patchNamespacedConfigMap: vi.fn(() => notFound()),
      patchNamespacedSecret: vi.fn(() => notFound()),
      replaceNamespacedService: vi.fn(() => Promise.resolve({})),
      deleteNamespacedService: vi.fn(() => Promise.resolve({})),
      replaceNamespacedConfigMap: vi.fn(() => Promise.resolve({})),
      deleteNamespacedConfigMap: vi.fn(() => Promise.resolve({})),
      deleteNamespacedSecret: vi.fn(() => Promise.resolve({})),
      deleteNamespacedPersistentVolumeClaim: vi.fn(() => Promise.resolve({}))
    },
    k8sNetworkingApp: {
      listNamespacedIngress: vi.fn(() =>
        Promise.resolve({
          body: {
            items: [
              {
                metadata: {
                  name: 'demo-ingress'
                }
              }
            ]
          }
        })
      ),
      patchNamespacedIngress: vi.fn(() => Promise.resolve({})),
      deleteNamespacedIngress: vi.fn(() => Promise.resolve({}))
    },
    k8sAutoscaling: {
      patchNamespacedHorizontalPodAutoscaler: vi.fn(() => notFound()),
      deleteNamespacedHorizontalPodAutoscaler: vi.fn(() => Promise.resolve({}))
    },
    k8sCustomObjects: {
      listNamespacedCustomObject: vi.fn(() =>
        Promise.resolve({
          body: {
            items: []
          }
        })
      ),
      patchNamespacedCustomObject: vi.fn(() => Promise.resolve({})),
      getNamespacedCustomObject: vi.fn(() =>
        Promise.reject({
          body: {
            code: 404,
            message: 'not found'
          }
        })
      ),
      deleteNamespacedCustomObject: vi.fn(() => Promise.resolve({}))
    }
  };
}

describe('/api/updateApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moves existing network resources to the new StatefulSet before deleting the old Deployment', async () => {
    const k8s = createK8sContext();
    initK8sMock.mockResolvedValue(k8s);
    const res = createResponse();

    await handler(createRequest(), res);

    const ownerReferences = [
      {
        apiVersion: 'apps/v1',
        kind: 'StatefulSet',
        name: 'demo',
        uid: 'new-statefulset-uid',
        controller: true,
        blockOwnerDeletion: true
      }
    ];
    const ownerReferencePatch = {
      metadata: {
        ownerReferences
      }
    };

    expect(k8s.k8sApp.readNamespacedStatefulSet).toHaveBeenCalledWith('demo', 'ns-demo');
    expect(k8s.k8sCore.patchNamespacedService).toHaveBeenCalledWith(
      'demo-service',
      'ns-demo',
      ownerReferencePatch,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      expect.objectContaining({
        headers: {
          'Content-type': 'application/merge-patch+json'
        }
      })
    );
    expect(k8s.k8sCore.patchNamespacedPersistentVolumeClaim).toHaveBeenCalledWith(
      'demo-data-0',
      'ns-demo',
      ownerReferencePatch,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      expect.objectContaining({
        headers: {
          'Content-type': 'application/merge-patch+json'
        }
      })
    );
    expect(k8s.k8sNetworkingApp.patchNamespacedIngress).toHaveBeenCalledWith(
      'demo-ingress',
      'ns-demo',
      ownerReferencePatch,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      expect.objectContaining({
        headers: {
          'Content-type': 'application/merge-patch+json'
        }
      })
    );
    expect(k8s.k8sCore.patchNamespacedService.mock.invocationCallOrder[0]).toBeLessThan(
      k8s.k8sApp.deleteNamespacedDeployment.mock.invocationCallOrder[0]
    );
    expect(k8s.k8sNetworkingApp.patchNamespacedIngress.mock.invocationCallOrder[0]).toBeLessThan(
      k8s.k8sApp.deleteNamespacedDeployment.mock.invocationCallOrder[0]
    );
    expect(k8s.k8sCore.patchNamespacedPersistentVolumeClaim.mock.invocationCallOrder[0]).toBeLessThan(
      k8s.k8sApp.deleteNamespacedDeployment.mock.invocationCallOrder[0]
    );
    expect(res.json).toHaveBeenCalledWith({
      code: 200,
      message: 'Success',
      data: undefined,
      error: undefined
    });
  });

  it('returns an error instead of deleting and recreating a StatefulSet when patching fails', async () => {
    const k8s = createK8sContext();
    k8s.k8sApp.patchNamespacedStatefulSet.mockRejectedValueOnce(new Error('patch failed'));
    k8s.k8sApp.replaceNamespacedStatefulSet.mockRejectedValueOnce(new Error('replace failed'));
    initK8sMock.mockResolvedValue(k8s);
    const res = createResponse();

    await handler(
      {
        body: {
          appName: 'demo',
          stateFulSetYaml: statefulSetYaml,
          patch: [
            {
              type: 'patch',
              kind: 'StatefulSet',
              value: {
                kind: 'StatefulSet',
                metadata: {
                  name: 'demo'
                },
                spec: {}
              }
            }
          ]
        }
      } as any,
      res
    );

    expect(k8s.k8sApp.deleteNamespacedStatefulSet).not.toHaveBeenCalled();
    expect(k8s.k8sApp.createNamespacedStatefulSet).not.toHaveBeenCalled();
    expect(k8s.k8sCore.patchNamespacedPersistentVolumeClaim).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      code: 500,
      message: 'replace failed',
      data: undefined,
      error: undefined
    });
  });
});

it('completes PVC expansion and updates the template without deleting pods or PVCs', async () => {
  const k8s = createK8sContext();
  const current: any = yaml.load(statefulSetYaml);
  current.metadata.uid = 'old-sts';
  current.metadata.resourceVersion = '10';
  const desired = structuredClone(current);
  desired.spec.volumeClaimTemplates[0].metadata.annotations.value = '2';
  desired.spec.volumeClaimTemplates[0].spec.resources.requests.storage = '2Gi';
  const invalid = { body: { code: 422, message: 'spec: Forbidden: updates to statefulset spec' } };
  k8s.k8sApp.patchNamespacedStatefulSet.mockRejectedValueOnce(invalid);
  k8s.k8sApp.replaceNamespacedStatefulSet.mockRejectedValueOnce(invalid);
  k8s.k8sApp.readNamespacedStatefulSet
    .mockResolvedValueOnce({ body: current })
    .mockRejectedValueOnce({ body: { code: 404 } });
  initK8sMock.mockResolvedValue(k8s);
  const res = createResponse();
  await handler(
    {
      body: {
        appName: 'demo',
        stateFulSetYaml: yaml.dump(desired),
        patch: [{ type: 'patch', kind: 'StatefulSet', value: desired }]
      }
    } as any,
    res
  );
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 200 }));
  expect(k8s.k8sCore.patchNamespacedPersistentVolumeClaim.mock.calls[0][2]).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: '/spec/resources/requests/storage', value: '2Gi' })
    ])
  );
  expect(k8s.k8sApp.createNamespacedStatefulSet).toHaveBeenCalledWith(
    'ns-demo',
    expect.objectContaining({
      spec: expect.objectContaining({ volumeClaimTemplates: desired.spec.volumeClaimTemplates })
    })
  );
  expect(k8s.k8sCore.deleteNamespacedPersistentVolumeClaim).not.toHaveBeenCalled();
});

it('does not recreate a StatefulSet when expansion is forbidden by RBAC', async () => {
  const k8s = createK8sContext();
  const desired: any = yaml.load(statefulSetYaml);
  desired.spec.volumeClaimTemplates[0].metadata.annotations.value = '2';
  desired.spec.volumeClaimTemplates[0].spec.resources.requests.storage = '2Gi';
  const forbidden = { body: { code: 403, message: 'User cannot update statefulsets' } };
  k8s.k8sApp.patchNamespacedStatefulSet.mockRejectedValueOnce(forbidden);
  k8s.k8sApp.replaceNamespacedStatefulSet.mockRejectedValueOnce(forbidden);
  initK8sMock.mockResolvedValue(k8s);
  const res = createResponse();
  await handler(
    {
      body: {
        appName: 'demo',
        stateFulSetYaml: yaml.dump(desired),
        patch: [{ type: 'patch', kind: 'StatefulSet', value: desired }]
      }
    } as any,
    res
  );
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 403 }));
  expect(k8s.k8sApp.deleteNamespacedStatefulSet).not.toHaveBeenCalled();
  expect(k8s.k8sApp.createNamespacedStatefulSet).not.toHaveBeenCalled();
});
