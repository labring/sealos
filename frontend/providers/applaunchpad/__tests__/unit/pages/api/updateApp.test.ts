// @vitest-environment node
import type { NextApiRequest, NextApiResponse } from 'next';
import yaml from 'js-yaml';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import handler from '@/pages/api/updateApp';
import { initK8s } from 'sealos-desktop-sdk/service';

vi.mock('sealos-desktop-sdk/service', () => ({
  initK8s: vi.fn()
}));

vi.mock('sealos-desktop-sdk', () => ({
  errLog: vi.fn(),
  infoLog: vi.fn(),
  warnLog: vi.fn()
}));

vi.mock('@/config', () => ({
  Config: () => ({
    cloud: {
      disableHttps: false,
      httpPort: undefined,
      port: undefined
    }
  })
}));

const mockedInitK8s = vi.mocked(initK8s);

const createResponse = () =>
  ({
    json: vi.fn((payload) => payload)
  } as unknown as NextApiResponse & { json: ReturnType<typeof vi.fn> });

const createResourceYaml = (kind: 'Service' | 'Ingress', name: string, type?: string) =>
  yaml.dump({
    apiVersion: kind === 'Ingress' ? 'networking.k8s.io/v1' : 'v1',
    kind,
    metadata: {
      name,
      labels: {
        'cloud.sealos.io/app-deploy-manager': 'demo'
      }
    },
    ...(kind === 'Service'
      ? {
          spec: {
            ...(type ? { type } : {}),
            selector: { app: 'demo' },
            ports: [{ name: 'web', port: 80, targetPort: 80, protocol: 'TCP' }]
          }
        }
      : {
          spec: {
            rules: [
              {
                host: 'demo.example.com',
                http: {
                  paths: [
                    {
                      path: '/',
                      pathType: 'Prefix',
                      backend: { service: { name: 'demo-cluster', port: { number: 80 } } }
                    }
                  ]
                }
              }
            ]
          }
        })
  });

const setupK8s = ({
  deploymentMetadata,
  statefulSetMetadata,
  deleteService = vi.fn().mockResolvedValue({})
}: {
  deploymentMetadata?: Record<string, any>;
  statefulSetMetadata?: Record<string, any>;
  deleteService?: ReturnType<typeof vi.fn>;
}) => {
  const applyYamlList = vi.fn().mockResolvedValue([]);
  const readNamespacedDeployment = deploymentMetadata
    ? vi.fn().mockResolvedValue({ body: { metadata: deploymentMetadata } })
    : vi.fn().mockRejectedValue({ body: { code: 404 } });
  const readNamespacedStatefulSet = statefulSetMetadata
    ? vi.fn().mockResolvedValue({ body: { metadata: statefulSetMetadata } })
    : vi.fn().mockRejectedValue({ body: { code: 404 } });

  mockedInitK8s.mockResolvedValue({
    namespace: 'ns-test',
    applyYamlList,
    k8sApp: {
      readNamespacedDeployment,
      readNamespacedStatefulSet
    },
    k8sCore: {
      listNamespacedPersistentVolumeClaim: vi.fn().mockResolvedValue({ body: { items: [] } }),
      deleteNamespacedService: deleteService
    },
    k8sNetworkingApp: {},
    k8sAutoscaling: {},
    k8sCustomObjects: {
      getNamespacedCustomObject: vi.fn().mockResolvedValue(null)
    }
  } as any);

  return { applyYamlList, readNamespacedDeployment, readNamespacedStatefulSet, deleteService };
};

const callHandler = async (resources: string[]) => {
  const req = {
    body: {
      appName: 'demo',
      patch: resources.map((value) => ({
        type: 'create',
        kind: (yaml.load(value) as { kind: string }).kind,
        value
      }))
    }
  } as unknown as NextApiRequest;
  const res = createResponse();

  await handler(req, res);

  return res;
};

const getAppliedResources = (applyYamlList: ReturnType<typeof vi.fn>) => {
  expect(applyYamlList).toHaveBeenCalledTimes(1);
  expect(applyYamlList.mock.calls[0][1]).toBe('create');
  return (applyYamlList.mock.calls[0][0] as string[]).map((item) => yaml.load(item) as any);
};

describe('/api/updateApp recreated resource ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inherits the template Instance ownership of a Deployment', async () => {
    const instanceOwnerReference = {
      apiVersion: 'app.sealos.io/v1',
      kind: 'Instance',
      name: 'template-instance',
      uid: 'instance-uid',
      controller: false,
      blockOwnerDeletion: false
    };
    const { applyYamlList, readNamespacedDeployment, readNamespacedStatefulSet } = setupK8s({
      deploymentMetadata: {
        labels: { 'cloud.sealos.io/deploy-on-sealos': 'template-instance' },
        ownerReferences: [instanceOwnerReference]
      }
    });

    const res = await callHandler([
      createResourceYaml('Service', 'demo-cluster'),
      createResourceYaml('Ingress', 'demo-ingress'),
      createResourceYaml('Service', 'demo-nodeport', 'NodePort')
    ]);

    const resources = getAppliedResources(applyYamlList);
    expect(resources).toHaveLength(3);
    resources.forEach((resource) => {
      expect(resource.metadata.ownerReferences).toEqual([instanceOwnerReference]);
      expect(resource.metadata.labels['cloud.sealos.io/deploy-on-sealos']).toBe(
        'template-instance'
      );
    });
    expect(readNamespacedDeployment).toHaveBeenCalledWith('demo', 'ns-test');
    expect(readNamespacedStatefulSet).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 200 }));
  });

  it('falls back to the StatefulSet for template ownership metadata', async () => {
    const instanceOwnerReference = {
      apiVersion: 'app.sealos.io/v1',
      kind: 'Instance',
      name: 'template-instance',
      uid: 'instance-uid',
      controller: false,
      blockOwnerDeletion: false
    };
    const { applyYamlList, readNamespacedStatefulSet } = setupK8s({
      statefulSetMetadata: {
        labels: { 'cloud.sealos.io/deploy-on-sealos': 'template-instance' },
        ownerReferences: [instanceOwnerReference]
      }
    });

    await callHandler([createResourceYaml('Service', 'demo-nodeport', 'NodePort')]);

    const [service] = getAppliedResources(applyYamlList);
    expect(service.metadata.ownerReferences).toEqual([instanceOwnerReference]);
    expect(service.metadata.labels['cloud.sealos.io/deploy-on-sealos']).toBe('template-instance');
    expect(readNamespacedStatefulSet).toHaveBeenCalledWith('demo', 'ns-test');
  });

  it('does not attach a recreated resource to a replaceable standalone workload', async () => {
    const { applyYamlList } = setupK8s({
      deploymentMetadata: { uid: 'deployment-uid', labels: {} }
    });

    await callHandler([createResourceYaml('Service', 'demo-nodeport', 'NodePort')]);

    const [service] = getAppliedResources(applyYamlList);
    expect(service.metadata.ownerReferences).toBeUndefined();
    expect(service.metadata.labels['cloud.sealos.io/deploy-on-sealos']).toBeUndefined();
  });

  it('treats deleting an already garbage-collected resource as success', async () => {
    const deleteService = vi.fn().mockRejectedValue({ body: { code: 404 } });
    setupK8s({ deleteService });
    const req = {
      body: {
        appName: 'demo',
        patch: [{ type: 'delete', kind: 'Service', name: 'demo-nodeport' }]
      }
    } as unknown as NextApiRequest;
    const res = createResponse();

    await handler(req, res);

    expect(deleteService).toHaveBeenCalledWith('demo-nodeport', 'ns-test');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 200 }));
  });
});
