import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '@/pages/api/updateApp';

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
    expect(
      k8s.k8sCore.patchNamespacedPersistentVolumeClaim.mock.invocationCallOrder[0]
    ).toBeLessThan(k8s.k8sApp.deleteNamespacedDeployment.mock.invocationCallOrder[0]);
    expect(res.json).toHaveBeenCalledWith({
      code: 200,
      message: 'Success',
      data: undefined,
      error: undefined
    });
  });

  it('returns an error instead of deleting and recreating a StatefulSet when patching fails', async () => {
    const k8s = createK8sContext();
    k8s.k8sApp.patchNamespacedStatefulSet
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('patch failed'));
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

    expect(k8s.k8sApp.patchNamespacedStatefulSet).toHaveBeenNthCalledWith(
      1,
      'demo',
      'ns-demo',
      expect.anything(),
      undefined,
      'All',
      undefined,
      undefined,
      undefined,
      expect.anything()
    );
    expect(k8s.k8sApp.replaceNamespacedStatefulSet).not.toHaveBeenCalled();
    expect(k8s.k8sApp.deleteNamespacedStatefulSet).not.toHaveBeenCalled();
    expect(k8s.k8sApp.createNamespacedStatefulSet).not.toHaveBeenCalled();
    expect(k8s.k8sCore.patchNamespacedPersistentVolumeClaim).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      code: 500,
      message: 'patch failed',
      data: undefined,
      error: undefined
    });
  });

  it('rejects an immutable StatefulSet serviceName change before creating dependencies', async () => {
    const k8s = createK8sContext();
    k8s.k8sApp.readNamespacedStatefulSet.mockResolvedValue({
      body: {
        metadata: { uid: 'statefulset-uid' },
        spec: { serviceName: 'demo-service' }
      }
    });
    initK8sMock.mockResolvedValue(k8s);
    const res = createResponse();

    await handler(
      {
        body: {
          appName: 'demo',
          stateFulSetYaml: statefulSetYaml,
          patch: [
            {
              type: 'create',
              kind: 'Service',
              value: 'apiVersion: v1\nkind: Service\nmetadata:\n  name: new-service\n'
            },
            {
              type: 'patch',
              kind: 'StatefulSet',
              value: {
                kind: 'StatefulSet',
                metadata: { name: 'demo' },
                spec: { serviceName: 'new-service' }
              }
            }
          ]
        }
      } as any,
      res
    );

    expect(k8s.applyYamlList).not.toHaveBeenCalled();
    expect(k8s.k8sApp.patchNamespacedStatefulSet).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 422,
        message: expect.stringContaining('spec.serviceName is immutable')
      })
    );
  });

  it('inherits a stable Instance owner and rolls back new dependencies when workload patch fails', async () => {
    const k8s = createK8sContext();
    const instanceOwnerReference = {
      apiVersion: 'app.sealos.io/v1',
      kind: 'Instance',
      name: 'demo',
      uid: 'instance-uid',
      controller: false,
      blockOwnerDeletion: false
    };
    k8s.k8sApp.readNamespacedDeployment.mockRejectedValue({ body: { code: 404 } });
    k8s.k8sApp.readNamespacedStatefulSet.mockResolvedValue({
      body: {
        metadata: {
          uid: 'statefulset-uid',
          ownerReferences: [instanceOwnerReference]
        },
        spec: { serviceName: 'demo-service' }
      }
    });
    k8s.k8sApp.patchNamespacedStatefulSet
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('workload patch failed'));
    initK8sMock.mockResolvedValue(k8s);
    const res = createResponse();

    await handler(
      {
        body: {
          appName: 'demo',
          stateFulSetYaml: statefulSetYaml,
          patch: [
            {
              type: 'create',
              kind: 'Service',
              value: 'apiVersion: v1\nkind: Service\nmetadata:\n  name: new-service\n'
            },
            {
              type: 'patch',
              kind: 'StatefulSet',
              value: {
                kind: 'StatefulSet',
                metadata: { name: 'demo' },
                spec: { serviceName: 'demo-service' }
              }
            }
          ]
        }
      } as any,
      res
    );

    const createdYaml = k8s.applyYamlList.mock.calls[0][0][0];
    expect(createdYaml).toContain('kind: Instance');
    expect(createdYaml).toContain('uid: instance-uid');
    expect(k8s.applyYamlList.mock.invocationCallOrder[0]).toBeLessThan(
      k8s.k8sApp.patchNamespacedStatefulSet.mock.invocationCallOrder[1]
    );
    expect(k8s.k8sCore.deleteNamespacedService).toHaveBeenCalledWith('new-service', 'ns-demo');
    expect(k8s.k8sCore.deleteNamespacedService.mock.invocationCallOrder[0]).toBeGreaterThan(
      k8s.k8sApp.patchNamespacedStatefulSet.mock.invocationCallOrder[1]
    );
  });

  it('does not retry a conflicting dependency creation without ownerReferences', async () => {
    const k8s = createK8sContext();
    k8s.applyYamlList.mockRejectedValue({
      body: { code: 409, message: 'services "new-service" already exists' }
    });
    initK8sMock.mockResolvedValue(k8s);
    const res = createResponse();

    await handler(
      {
        body: {
          appName: 'demo',
          stateFulSetYaml: statefulSetYaml,
          patch: [
            {
              type: 'create',
              kind: 'Service',
              value: 'apiVersion: v1\nkind: Service\nmetadata:\n  name: new-service\n'
            }
          ]
        }
      } as any,
      res
    );

    expect(k8s.applyYamlList).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 409,
        message: 'services "new-service" already exists'
      })
    );
  });

  it('treats an already missing Certificate as a successful idempotent delete', async () => {
    const k8s = createK8sContext();
    k8s.k8sCustomObjects.deleteNamespacedCustomObject.mockImplementation(
      (_group: string, _version: string, _namespace: string, plural: string) =>
        plural === 'certificates'
          ? Promise.reject({ body: { code: 404, message: 'certificate not found' } })
          : Promise.resolve({})
    );
    initK8sMock.mockResolvedValue(k8s);
    const res = createResponse();

    await handler(
      {
        body: {
          appName: 'demo',
          stateFulSetYaml: statefulSetYaml,
          patch: [
            { type: 'delete', kind: 'Issuer', name: 'old-network' },
            { type: 'delete', kind: 'Certificate', name: 'old-network' }
          ]
        }
      } as any,
      res
    );

    expect(k8s.k8sCustomObjects.deleteNamespacedCustomObject).toHaveBeenCalledWith(
      'cert-manager.io',
      'v1',
      'ns-demo',
      'issuers',
      'old-network'
    );
    expect(k8s.k8sCustomObjects.deleteNamespacedCustomObject).toHaveBeenCalledWith(
      'cert-manager.io',
      'v1',
      'ns-demo',
      'certificates',
      'old-network'
    );
    expect(res.json).toHaveBeenCalledWith({
      code: 200,
      message: 'Success',
      data: undefined,
      error: undefined
    });
  });

  it('still returns non-404 cleanup errors', async () => {
    const k8s = createK8sContext();
    k8s.k8sCustomObjects.deleteNamespacedCustomObject.mockRejectedValue({
      body: { code: 403, message: 'certificates.cert-manager.io is forbidden' }
    });
    initK8sMock.mockResolvedValue(k8s);
    const res = createResponse();

    await handler(
      {
        body: {
          appName: 'demo',
          stateFulSetYaml: statefulSetYaml,
          patch: [{ type: 'delete', kind: 'Certificate', name: 'old-network' }]
        }
      } as any,
      res
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 403,
        message: 'Insufficient permissions'
      })
    );
  });
});
