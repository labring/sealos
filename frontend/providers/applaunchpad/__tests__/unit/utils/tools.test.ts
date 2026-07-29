import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { json2ConfigMap, json2DeployCr, yamlString2Objects } from '@/utils/deployYaml2Json';
import type { AppEditType, DeployKindsType } from '@/types/app';
import { patchYamlList } from '@/utils/tools';

const createWorkload = (kind: 'Deployment' | 'StatefulSet', isPrivate: boolean) => ({
  apiVersion: 'apps/v1',
  kind,
  metadata: {
    name: 'demo'
  },
  spec: {
    ...(kind === 'StatefulSet' ? { serviceName: 'demo' } : {}),
    selector: {
      matchLabels: {
        app: 'demo'
      }
    },
    template: {
      metadata: {
        labels: {
          app: 'demo'
        }
      },
      spec: {
        ...(isPrivate ? { imagePullSecrets: [{ name: 'demo' }] } : {}),
        containers: [
          {
            name: 'demo',
            image: isPrivate ? 'registry.example.com/demo:latest' : 'nginx:latest',
            volumeMounts: []
          }
        ],
        volumes: []
      }
    },
    ...(kind === 'StatefulSet' ? { volumeClaimTemplates: [] } : {})
  }
});

const secret = {
  apiVersion: 'v1',
  kind: 'Secret',
  metadata: {
    name: 'demo'
  },
  type: 'kubernetes.io/dockerconfigjson',
  data: {
    '.dockerconfigjson': 'credentials'
  }
};

const createApp = (): AppEditType =>
  ({
    appName: 'demo',
    imageName: 'nginx:latest',
    runCMD: '',
    cmdParam: '',
    replicas: 1,
    cpu: 100,
    memory: 128,
    networks: [
      {
        networkName: 'demo-web',
        portName: 'web',
        port: 80,
        protocol: 'TCP',
        appProtocol: 'HTTP',
        openPublicDomain: false,
        publicDomain: 'demo',
        customDomain: '',
        domain: 'cloud.example.com',
        openNodePort: false
      }
    ],
    envs: [],
    hpa: {
      use: false,
      target: 'cpu',
      value: 50,
      minReplicas: 1,
      maxReplicas: 1
    },
    secret: {
      use: false,
      username: '',
      password: '',
      serverAddress: ''
    },
    configMapList: [
      {
        mountPath: '/etc/demo/config.yaml',
        key: 'config-yaml',
        value: 'old-value',
        volumeName: 'demo-config'
      }
    ],
    storeList: [],
    networkStoreList: [],
    labels: {},
    volumes: [],
    volumeMounts: [],
    kind: 'deployment'
  } as AppEditType);

const createYamlLists = (app: AppEditType) => [json2DeployCr(app, app.kind), json2ConfigMap(app)];

const createOriginalYamlList = (yamlList: string[]) =>
  yamlList.flatMap((item) => yamlString2Objects(item)) as DeployKindsType[];

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const getPatchValue = (actions: ReturnType<typeof patchYamlList>, kind: string) => {
  const action = actions.find((item) => item.type === 'patch' && item.kind === kind);

  expect(action?.type).toBe('patch');
  return action?.type === 'patch' ? (action.value as any) : undefined;
};

describe.each(['Deployment', 'StatefulSet'] as const)(
  'patchYamlList private-to-public %s update',
  (kind) => {
    it('preserves imagePullSecrets deletion for JSON Merge Patch', () => {
      const privateWorkload = createWorkload(kind, true);
      const publicWorkload = createWorkload(kind, false);

      const actions = patchYamlList({
        parsedOldYamlList: [yaml.dump(privateWorkload), yaml.dump(secret)],
        parsedNewYamlList: [yaml.dump(publicWorkload)],
        originalYamlList: [privateWorkload, secret] as DeployKindsType[]
      });

      const workloadPatch = actions.find((item) => item.type === 'patch' && item.kind === kind);

      expect(workloadPatch).toMatchObject({
        type: 'patch',
        kind,
        value: {
          spec: {
            template: {
              spec: {
                imagePullSecrets: null
              }
            }
          }
        }
      });
      expect(actions).toContainEqual({
        type: 'delete',
        kind: 'Secret',
        name: 'demo'
      });
    });

    it('keeps imagePullSecrets for private image updates', () => {
      const currentWorkload = createWorkload(kind, true);
      const updatedWorkload = createWorkload(kind, true);
      updatedWorkload.spec.template.spec.containers[0].image = 'registry.example.com/demo:v2';

      const actions = patchYamlList({
        parsedOldYamlList: [yaml.dump(currentWorkload), yaml.dump(secret)],
        parsedNewYamlList: [yaml.dump(updatedWorkload), yaml.dump(secret)],
        originalYamlList: [currentWorkload, secret] as DeployKindsType[]
      });

      const workloadPatch = actions.find((item) => item.type === 'patch' && item.kind === kind);

      expect(workloadPatch).toMatchObject({
        type: 'patch',
        kind,
        value: {
          spec: {
            template: {
              spec: {
                imagePullSecrets: [{ name: 'demo' }]
              }
            }
          }
        }
      });
      expect(actions).not.toContainEqual({
        type: 'delete',
        kind: 'Secret',
        name: 'demo'
      });
    });
  }
);

describe('patchYamlList restart behavior', () => {
  it('restarts the workload when only ConfigMap data changes', () => {
    const oldApp = createApp();
    const newApp = {
      ...oldApp,
      configMapList: [{ ...oldApp.configMapList[0], value: 'new-value' }]
    };
    const oldYamlList = createYamlLists(oldApp);
    const newYamlList = createYamlLists(newApp);

    const actions = patchYamlList({
      parsedOldYamlList: oldYamlList,
      parsedNewYamlList: newYamlList,
      originalYamlList: createOriginalYamlList(oldYamlList)
    });

    const configMapPatch = actions.find(
      (item) => item.type === 'patch' && item.kind === 'ConfigMap'
    );
    const deploymentPatch = actions.find(
      (item) => item.type === 'patch' && item.kind === 'Deployment'
    );

    expect(configMapPatch).toBeDefined();
    expect(deploymentPatch?.type === 'patch' && deploymentPatch.value).toMatchObject({
      metadata: {
        name: 'demo'
      },
      spec: {
        template: {
          metadata: {
            labels: {
              restartTime: expect.any(String)
            }
          }
        }
      }
    });
  });

  it('does not restart the workload when only StatefulSet replicas change', () => {
    const oldApp = createApp();
    oldApp.kind = 'statefulset';
    oldApp.storeList = [
      {
        name: 'data',
        path: '/data',
        value: 1,
        storageType: 'local'
      }
    ];
    const newApp = { ...oldApp, replicas: 2 };
    const oldYamlList = createYamlLists(oldApp);
    const newYamlList = createYamlLists(newApp);

    const actions = patchYamlList({
      parsedOldYamlList: oldYamlList,
      parsedNewYamlList: newYamlList,
      originalYamlList: createOriginalYamlList(oldYamlList)
    });

    const statefulSetPatch = actions.find(
      (item) => item.type === 'patch' && item.kind === 'StatefulSet'
    );

    expect(statefulSetPatch?.type === 'patch' && statefulSetPatch.value).toBeTruthy();
    expect(
      statefulSetPatch?.type === 'patch' &&
        statefulSetPatch.value.spec?.template?.metadata?.labels?.restartTime
    ).toBeFalsy();
  });
});

describe('patchYamlList intent-driven normalization', () => {
  it('preserves live StatefulSet storage fields when only replicas change', () => {
    const oldFormWorkload = createWorkload('StatefulSet', false) as any;
    oldFormWorkload.spec.replicas = 1;
    oldFormWorkload.spec.volumeClaimTemplates = [
      {
        metadata: {
          name: 'data',
          annotations: {
            path: '/data',
            value: '1',
            storageType: 'local'
          }
        },
        spec: {
          accessModes: ['ReadWriteOnce'],
          resources: {
            requests: {
              storage: '1Gi'
            }
          }
        }
      }
    ];

    const newFormWorkload = clone(oldFormWorkload);
    newFormWorkload.spec.replicas = 2;

    const liveWorkload = clone(oldFormWorkload);
    delete liveWorkload.spec.volumeClaimTemplates[0].metadata.annotations.storageType;
    liveWorkload.spec.volumeClaimTemplates[0].metadata.annotations['example.com/keep'] = 'true';
    liveWorkload.spec.volumeClaimTemplates[0].metadata.labels = {
      'example.com/keep': 'true'
    };
    liveWorkload.spec.template.spec.volumes = [
      {
        name: 'injected-volume',
        emptyDir: {}
      }
    ];
    liveWorkload.spec.template.spec.containers[0].volumeMounts = [
      {
        name: 'injected-volume',
        mountPath: '/injected'
      }
    ];

    const actions = patchYamlList({
      parsedOldYamlList: [yaml.dump(oldFormWorkload)],
      parsedNewYamlList: [yaml.dump(newFormWorkload)],
      originalYamlList: [liveWorkload] as DeployKindsType[]
    });
    const patchValue = getPatchValue(actions, 'StatefulSet');

    expect(patchValue.spec.volumeClaimTemplates).toEqual(liveWorkload.spec.volumeClaimTemplates);
    expect(
      patchValue.spec.volumeClaimTemplates[0].metadata.annotations.storageType
    ).toBeUndefined();
    expect(patchValue.spec.template.spec.volumes).toEqual(liveWorkload.spec.template.spec.volumes);
    expect(patchValue.spec.template.spec.containers[0].volumeMounts).toEqual(
      liveWorkload.spec.template.spec.containers[0].volumeMounts
    );
  });

  it('preserves a legacy unnamed workload port on unrelated updates', () => {
    const oldFormWorkload = createWorkload('Deployment', false) as any;
    oldFormWorkload.spec.replicas = 1;
    oldFormWorkload.spec.template.spec.containers[0].ports = [
      {
        name: 'web',
        containerPort: 80,
        protocol: 'TCP'
      }
    ];

    const newFormWorkload = clone(oldFormWorkload);
    newFormWorkload.spec.replicas = 2;

    const liveWorkload = clone(oldFormWorkload);
    delete liveWorkload.spec.template.spec.containers[0].ports[0].name;

    const actions = patchYamlList({
      parsedOldYamlList: [yaml.dump(oldFormWorkload)],
      parsedNewYamlList: [yaml.dump(newFormWorkload)],
      originalYamlList: [liveWorkload] as DeployKindsType[]
    });
    const patchValue = getPatchValue(actions, 'Deployment');

    expect(patchValue.spec.template.spec.containers[0].ports).toEqual(
      liveWorkload.spec.template.spec.containers[0].ports
    );
  });

  it('preserves a legacy unnamed Service port on unrelated updates', () => {
    const oldFormService = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: 'demo'
      },
      spec: {
        selector: {
          app: 'demo'
        },
        ports: [
          {
            name: 'web',
            port: 80,
            targetPort: 80,
            protocol: 'TCP'
          }
        ]
      }
    };
    const newFormService = clone(oldFormService) as any;
    newFormService.metadata.annotations = {
      'example.com/change': 'true'
    };

    const liveService = clone(oldFormService) as any;
    delete liveService.spec.ports[0].name;

    const actions = patchYamlList({
      parsedOldYamlList: [yaml.dump(oldFormService)],
      parsedNewYamlList: [yaml.dump(newFormService)],
      originalYamlList: [liveService] as DeployKindsType[]
    });
    const patchValue = getPatchValue(actions, 'Service');

    expect(patchValue.spec.ports).toEqual(liveService.spec.ports);
  });

  it('updates an explicitly modified volumeClaimTemplate', () => {
    const oldFormWorkload = createWorkload('StatefulSet', false) as any;
    oldFormWorkload.spec.volumeClaimTemplates = [
      {
        metadata: {
          name: 'data',
          annotations: {
            path: '/data',
            value: '1',
            storageType: 'local'
          }
        },
        spec: {
          accessModes: ['ReadWriteOnce'],
          resources: {
            requests: {
              storage: '1Gi'
            }
          }
        }
      }
    ];

    const newFormWorkload = clone(oldFormWorkload);
    newFormWorkload.spec.volumeClaimTemplates[0].metadata.annotations.value = '2';
    newFormWorkload.spec.volumeClaimTemplates[0].spec.resources.requests.storage = '2Gi';

    const liveWorkload = clone(oldFormWorkload);
    delete liveWorkload.spec.volumeClaimTemplates[0].metadata.annotations.storageType;

    const actions = patchYamlList({
      parsedOldYamlList: [yaml.dump(oldFormWorkload)],
      parsedNewYamlList: [yaml.dump(newFormWorkload)],
      originalYamlList: [liveWorkload] as DeployKindsType[]
    });
    const patchValue = getPatchValue(actions, 'StatefulSet');

    expect(patchValue.spec.volumeClaimTemplates[0]).toMatchObject({
      metadata: {
        annotations: {
          value: '2',
          storageType: 'local'
        }
      },
      spec: {
        resources: {
          requests: {
            storage: '2Gi'
          }
        }
      }
    });
  });

  it('updates explicitly modified workload volumes and volume mounts', () => {
    const oldFormWorkload = createWorkload('Deployment', false) as any;
    oldFormWorkload.spec.template.spec.volumes = [
      {
        name: 'data',
        emptyDir: {}
      }
    ];
    oldFormWorkload.spec.template.spec.containers[0].volumeMounts = [
      {
        name: 'data',
        mountPath: '/data'
      }
    ];

    const newFormWorkload = clone(oldFormWorkload);
    newFormWorkload.spec.template.spec.volumes[0].emptyDir.medium = 'Memory';
    newFormWorkload.spec.template.spec.containers[0].volumeMounts[0].mountPath = '/cache';

    const actions = patchYamlList({
      parsedOldYamlList: [yaml.dump(oldFormWorkload)],
      parsedNewYamlList: [yaml.dump(newFormWorkload)],
      originalYamlList: [clone(oldFormWorkload)] as DeployKindsType[]
    });
    const patchValue = getPatchValue(actions, 'Deployment');

    expect(patchValue.spec.template.spec.volumes[0].emptyDir.medium).toBe('Memory');
    expect(patchValue.spec.template.spec.containers[0].volumeMounts[0].mountPath).toBe('/cache');
  });

  it.each([
    {
      kind: 'Deployment',
      path: (resource: any) => resource.spec.template.spec.containers[0].ports,
      oldResource: (() => {
        const workload = createWorkload('Deployment', false) as any;
        workload.spec.template.spec.containers[0].ports = [
          {
            name: 'web',
            containerPort: 80,
            protocol: 'TCP'
          }
        ];
        return workload;
      })()
    },
    {
      kind: 'Service',
      path: (resource: any) => resource.spec.ports,
      oldResource: {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
          name: 'demo'
        },
        spec: {
          selector: {
            app: 'demo'
          },
          ports: [
            {
              name: 'web',
              port: 80,
              targetPort: 80,
              protocol: 'TCP'
            }
          ]
        }
      }
    }
  ])('normalizes ports after an explicit $kind port edit', ({ kind, path, oldResource }) => {
    const newResource = clone(oldResource) as any;
    const newPorts = path(newResource);
    delete newPorts[0].name;
    if (kind === 'Service') {
      newPorts[0].port = 8080;
      newPorts[0].targetPort = 8080;
    } else {
      newPorts[0].containerPort = 8080;
    }

    const actions = patchYamlList({
      parsedOldYamlList: [yaml.dump(oldResource)],
      parsedNewYamlList: [yaml.dump(newResource)],
      originalYamlList: [clone(oldResource)] as DeployKindsType[]
    });
    const patchValue = getPatchValue(actions, kind);

    expect(path(patchValue)[0].name).toBe('p-t-8080-0');
  });
});
