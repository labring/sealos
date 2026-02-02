import yaml from 'js-yaml';

import { devboxKey, gpuTypeAnnotationKey, publicDomainKey } from '@/constants/devbox';
import { DevboxEditType, DevboxEditTypeV2, json2DevboxV2Data, ProtocolType } from '@/types/devbox';
import { produce } from 'immer';
import { nanoid, parseTemplateConfig, str2Num } from './tools';
import { getUserNamespace } from './user';
import { RuntimeNamespaceMap } from '@/types/static';

export const json2Devbox = (
  data: DevboxEditType,
  runtimeNamespaceMap: RuntimeNamespaceMap,
  devboxAffinityEnable: string = 'true',
  squashEnable: string = 'false'
) => {
  // runtimeNamespace inject
  const runtimeNamespace = runtimeNamespaceMap[data.runtimeVersion];
  const gpuResourceKeyValue = data.gpu?.resource?.card;
  const hasGpu = !!data.gpu?.type && !!gpuResourceKeyValue;
  const gpuConfigAnnotation = hasGpu
    ? {
        [gpuTypeAnnotationKey]: data.gpu?.type || ''
      }
    : undefined;
  let json: any = {
    apiVersion: 'devbox.sealos.io/v1alpha1',
    kind: 'Devbox',
    metadata: {
      name: data.name
    },
    spec: {
      squash: squashEnable === 'true',
      network: {
        type: 'NodePort',
        extraPorts: data.networks.map((item) => ({
          containerPort: item.port
        }))
      },
      resource: {
        cpu: `${str2Num(Math.floor(data.cpu))}m`,
        memory: `${str2Num(data.memory)}Mi`,
        ...(hasGpu ? { [gpuResourceKeyValue]: data.gpu?.amount || 0 } : {})
      },
      runtimeRef: {
        name: data.runtimeVersion,
        namespace: runtimeNamespace
      },
      ...(gpuConfigAnnotation
        ? {
            config: {
              annotations: gpuConfigAnnotation
            }
          }
        : {}),
      state: 'Running'
    }
  };
  if (devboxAffinityEnable === 'true') {
    json.spec.tolerations = [
      {
        key: 'devbox.sealos.io/node',
        operator: 'Exists',
        effect: 'NoSchedule'
      }
    ];
    json.spec.affinity = {
      nodeAffinity: {
        requiredDuringSchedulingIgnoredDuringExecution: {
          nodeSelectorTerms: [
            {
              matchExpressions: [
                {
                  key: 'devbox.sealos.io/node',
                  operator: 'Exists'
                }
              ]
            }
          ]
        }
      }
    };
  }
  return yaml.dump(json);
};
export const json2DevboxV2 = (
  data: Omit<json2DevboxV2Data, 'templateRepositoryUid'>,
  devboxAffinityEnable: string = 'true',
  squashEnable: string = 'false'
) => {
  const gpuResourceKeyValue = data.gpu?.resource?.card;
  const hasGpu = !!data.gpu?.type && !!gpuResourceKeyValue;
  const gpuConfigAnnotation = hasGpu
    ? {
        [gpuTypeAnnotationKey]: data.gpu?.type || ''
      }
    : undefined;

  let json: any = {
    apiVersion: 'devbox.sealos.io/v1alpha1',
    kind: 'Devbox',
    metadata: {
      name: data.name
    },
    spec: {
      squash: squashEnable === 'true',
      network: {
        type: 'NodePort',
        extraPorts: data.networks.map((item) => ({
          containerPort: item.port
        }))
      },
      resource: {
        cpu: `${str2Num(Math.floor(data.cpu))}m`,
        memory: `${str2Num(data.memory)}Mi`,
        'ephemeral-storage': `${str2Num(data.storage)}Gi`,
        ...(hasGpu ? { [gpuResourceKeyValue]: data.gpu?.amount || 0 } : {})
      },
      templateID: data.templateUid,
      image: data.image,
      config: produce(parseTemplateConfig(data.templateConfig), (draft) => {
        draft.appPorts = data.networks.map((item) => ({
          port: str2Num(item.port),
          name: item.portName,
          protocol: 'TCP',
          targetPort: str2Num(item.port)
        }));
        if (gpuConfigAnnotation) {
          const draftAny = draft as any;
          draftAny.annotations = {
            ...(draftAny.annotations || {}),
            ...gpuConfigAnnotation
          };
        }

        // Clear user-configurable fields to rebuild from form data
        const newEnv: any[] = [];
        const newVolumes: any[] = [];
        const newVolumeMounts: any[] = [];

        // Handle env from template config
        if (data.env && data.env.length > 0) {
          newEnv.push(...data.env);
        }

        // Handle envs (simple key-value pairs)
        if (data.envs && data.envs.length > 0) {
          newEnv.push(
            ...data.envs.map((item) => ({
              name: item.key,
              value: item.value
            }))
          );
        }

        // Handle configMaps as volumes and volumeMounts
        if (data.configMaps && data.configMaps.length > 0) {
          data.configMaps.forEach((cm) => {
            const shortId = cm.id || nanoid();
            const volumeName = `${data.name}-volume-cm-${shortId}`;
            const configMapName = `${data.name}-cm-${shortId}`;

            newVolumes.push({
              name: volumeName,
              configMap: {
                name: configMapName
              }
            });

            newVolumeMounts.push({
              name: volumeName,
              mountPath: cm.path
            });
          });
        }

        // Handle NFS volumes (PVC-based)
        if (data.volumes && data.volumes.length > 0) {
          data.volumes.forEach((vol) => {
            const shortId = vol.id || nanoid();
            const volumeName = `${data.name}-volume-pvc-${shortId}`;
            const pvcName = `${data.name}-pvc-${shortId}`;

            newVolumes.push({
              name: volumeName,
              persistentVolumeClaim: {
                claimName: pvcName
              }
            });

            newVolumeMounts.push({
              name: volumeName,
              mountPath: vol.path
            });
          });
        }

        // Handle shared memory (emptyDir with Memory medium)
        if (data.sharedMemory?.enabled && data.sharedMemory.sizeLimit > 0) {
          newVolumes.push({
            name: 'shared-memory',
            emptyDir: {
              medium: 'Memory',
              sizeLimit: `${data.sharedMemory.sizeLimit}Gi`
            }
          });

          newVolumeMounts.push({
            name: 'shared-memory',
            mountPath: '/dev/shm'
          });
        }

        // Set the rebuilt fields
        draft.env = newEnv.length > 0 ? newEnv : undefined;
        draft.volumes = newVolumes.length > 0 ? newVolumes : undefined;
        draft.volumeMounts = newVolumeMounts.length > 0 ? newVolumeMounts : undefined;
      }),
      state: 'Running'
    }
  };
  if (devboxAffinityEnable === 'true') {
    json.spec.tolerations = [
      {
        key: 'devbox.sealos.io/node',
        operator: 'Exists',
        effect: 'NoSchedule'
      }
    ];
    json.spec.affinity = {
      nodeAffinity: {
        requiredDuringSchedulingIgnoredDuringExecution: {
          nodeSelectorTerms: [
            {
              matchExpressions: [
                {
                  key: 'devbox.sealos.io/node',
                  operator: 'Exists'
                }
              ]
            }
          ]
        }
      }
    };
  }
  return yaml.dump(json);
};
export const json2StartOrStop = ({
  devboxName,
  type
}: {
  devboxName: string;
  type: 'Paused' | 'Running';
}) => {
  const json = {
    apiVersion: 'devbox.sealos.io/v1alpha1',
    kind: 'Devbox',
    metadata: {
      name: devboxName
    },
    spec: {
      state: type
    }
  };
  return yaml.dump(json);
};
export const getDevboxReleaseName = (devboxName: string, tag: string) => {
  return `${devboxName}-${tag}`;
};
export const json2DevboxRelease = (data: {
  devboxName: string;
  tag: string;
  releaseDes: string;
  devboxUid: string;
}) => {
  const json = {
    apiVersion: 'devbox.sealos.io/v1alpha1',
    kind: 'DevBoxRelease',
    metadata: {
      name: getDevboxReleaseName(data.devboxName, data.tag),
      ownerReferences: [
        {
          apiVersion: 'devbox.sealos.io/v1alpha1',
          kind: 'Devbox',
          name: data.devboxName,
          blockOwnerDeletion: false,
          controller: false,
          uid: data.devboxUid
        }
      ]
    },
    spec: {
      devboxName: data.devboxName,
      newTag: data.tag,
      notes: data.releaseDes
    }
  };
  return yaml.dump(json);
};

export type OwnerReference = {
  apiVersion: string;
  kind: string;
  name: string;
  uid: string;
  controller?: boolean;
  blockOwnerDeletion?: boolean;
};

const normalizeOwnerReference = (ownerReference: OwnerReference): OwnerReference => ({
  apiVersion: ownerReference.apiVersion,
  kind: ownerReference.kind,
  name: ownerReference.name,
  uid: ownerReference.uid,
  controller: ownerReference.controller ?? true,
  blockOwnerDeletion: ownerReference.blockOwnerDeletion ?? false
});

const attachOwnerReference = (metadata: any, ownerReference?: OwnerReference) => {
  if (!ownerReference) {
    return metadata;
  }
  return {
    ...metadata,
    ownerReferences: [normalizeOwnerReference(ownerReference)]
  };
};

export const json2Ingress = (
  data: Pick<DevboxEditTypeV2, 'name' | 'networks'>,
  ingressSecret: string,
  ownerReference?: OwnerReference
) => {
  // different protocol annotations
  const map = {
    HTTP: {
      'nginx.ingress.kubernetes.io/ssl-redirect': 'false',
      'nginx.ingress.kubernetes.io/backend-protocol': 'HTTP',
      'nginx.ingress.kubernetes.io/client-body-buffer-size': '64k',
      'nginx.ingress.kubernetes.io/proxy-buffer-size': '64k',
      'nginx.ingress.kubernetes.io/proxy-send-timeout': '300',
      'nginx.ingress.kubernetes.io/proxy-read-timeout': '300',
      'nginx.ingress.kubernetes.io/server-snippet':
        'client_header_buffer_size 64k;\nlarge_client_header_buffers 4 128k;\n'
    },
    GRPC: {
      'nginx.ingress.kubernetes.io/ssl-redirect': 'false',
      'nginx.ingress.kubernetes.io/backend-protocol': 'GRPC'
    },
    WS: {
      'nginx.ingress.kubernetes.io/proxy-read-timeout': '3600',
      'nginx.ingress.kubernetes.io/proxy-send-timeout': '3600',
      'nginx.ingress.kubernetes.io/backend-protocol': 'WS'
    }
  };

  const result = data.networks
    .filter((item) => item.openPublicDomain)
    .map((network) => {
      const host = network.customDomain ? network.customDomain : network.publicDomain;
      const networkName = network.networkName || nanoid();

      const secretName = network.customDomain ? networkName : ingressSecret;
      const ingress = {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'Ingress',
        metadata: {
          ...attachOwnerReference(
            {
              name: networkName,
              labels: {
                [devboxKey]: data.name,
                [publicDomainKey]: network.publicDomain
              },
              annotations: {
                'kubernetes.io/ingress.class': 'nginx',
                'nginx.ingress.kubernetes.io/proxy-body-size': '32m',
                ...map[(network.protocol as ProtocolType) || 'HTTP']
              }
            },
            ownerReference
          )
        },
        spec: {
          rules: [
            {
              host,
              http: {
                paths: [
                  {
                    pathType: 'Prefix',
                    path: '/',
                    backend: {
                      service: {
                        name: data.name,
                        port: {
                          number: network.port
                        }
                      }
                    }
                  }
                ]
              }
            }
          ],
          tls: [
            {
              hosts: [host],
              secretName
            }
          ]
        }
      };
      const issuer = {
        apiVersion: 'cert-manager.io/v1',
        kind: 'Issuer',
        metadata: {
          ...attachOwnerReference(
            {
              name: networkName,
              labels: {
                [devboxKey]: data.name
              }
            },
            ownerReference
          )
        },
        spec: {
          acme: {
            server: 'https://acme-v02.api.letsencrypt.org/directory',
            email: 'admin@sealos.io',
            privateKeySecretRef: {
              name: 'letsencrypt-prod'
            },
            solvers: [
              {
                http01: {
                  ingress: {
                    class: 'nginx',
                    serviceType: 'ClusterIP'
                  }
                }
              }
            ]
          }
        }
      };
      const certificate = {
        apiVersion: 'cert-manager.io/v1',
        kind: 'Certificate',
        metadata: {
          ...attachOwnerReference(
            {
              name: networkName,
              labels: {
                [devboxKey]: data.name
              }
            },
            ownerReference
          )
        },
        spec: {
          secretName,
          dnsNames: [network.customDomain],
          issuerRef: {
            name: networkName,
            kind: 'Issuer'
          }
        }
      };

      let resYaml = yaml.dump(ingress);
      if (network.customDomain) {
        resYaml += `\n---\n${yaml.dump(issuer)}\n---\n${yaml.dump(certificate)}`;
      }
      return resYaml;
    });

  return result.join('\n---\n');
};
export const json2Service = (
  data: Pick<DevboxEditTypeV2, 'name' | 'networks'>,
  ownerReference?: OwnerReference
) => {
  if (data.networks.length === 0) {
    return '';
  }
  const template = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      ...attachOwnerReference(
        {
          name: data.name,
          labels: {
            [devboxKey]: data.name
          }
        },
        ownerReference
      )
    },
    spec: {
      ports: data.networks.map((item) => ({
        port: str2Num(item.port),
        targetPort: str2Num(item.port),
        name: item.portName || nanoid()
      })),
      selector: {
        ['app.kubernetes.io/name']: data.name,
        ['app.kubernetes.io/part-of']: 'devbox',
        ['app.kubernetes.io/managed-by']: 'sealos'
      }
    }
  };
  return yaml.dump(template);
};
export const json2ConfigMap = (
  data: Pick<DevboxEditTypeV2, 'name' | 'configMaps'>,
  ownerReference?: OwnerReference
) => {
  if (!data.configMaps || data.configMaps.length === 0) {
    return '';
  }

  return data.configMaps
    .map((cm) => {
      const shortId = cm.id || nanoid();
      const configMapName = `${data.name}-cm-${shortId}`;
      const filename = cm.path.split('/').pop() || `config-${shortId}`;

      const configMap = {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
          ...attachOwnerReference(
            {
              name: configMapName,
              labels: {
                [devboxKey]: data.name
              }
            },
            ownerReference
          )
        },
        data: {
          [filename]: cm.content
        }
      };

      return yaml.dump(configMap);
    })
    .join('\n---\n');
};

export const json2PVC = (
  data: Pick<DevboxEditTypeV2, 'name' | 'volumes'>,
  storageClassName: string = 'nfs-csi',
  ownerReference?: OwnerReference
) => {
  if (!data.volumes || data.volumes.length === 0) {
    return '';
  }

  return data.volumes
    .map((vol) => {
      const shortId = vol.id || nanoid();
      const pvcName = `${data.name}-pvc-${shortId}`;

      const pvc = {
        apiVersion: 'v1',
        kind: 'PersistentVolumeClaim',
        metadata: {
          ...attachOwnerReference(
            {
              name: pvcName,
              labels: {
                [devboxKey]: data.name
              }
            },
            ownerReference
          )
        },
        spec: {
          accessModes: ['ReadWriteMany'],
          resources: {
            requests: {
              storage: `${vol.size}Gi`
            }
          },
          storageClassName
        }
      };

      return yaml.dump(pvc);
    })
    .join('\n---\n');
};

export const limitRangeYaml = `
apiVersion: v1
kind: LimitRange
metadata:
  name: ${getUserNamespace()}
spec:
  limits:
    - default:
        cpu: 50m
        memory: 64Mi
      type: Container
`;
export const generateYamlList = (
  data: json2DevboxV2Data,
  env: {
    devboxAffinityEnable?: string;
    squashEnable?: string;
    ingressSecret: string;
    nfsStorageClassName?: string;
  }
) => {
  const storageClassName = env.nfsStorageClassName || 'nfs-csi';

  return [
    // PVC must be created before devbox
    ...(data.volumes && data.volumes.length > 0
      ? [
          {
            filename: 'pvc.yaml',
            value: json2PVC(data, storageClassName)
          }
        ]
      : []),
    // ConfigMap must be created before devbox
    ...(data.configMaps && data.configMaps.length > 0
      ? [
          {
            filename: 'configmap.yaml',
            value: json2ConfigMap(data)
          }
        ]
      : []),
    {
      filename: 'devbox.yaml',
      value: json2DevboxV2(data, env.devboxAffinityEnable, env.squashEnable)
    },
    ...(data.networks.length > 0
      ? [
          {
            filename: 'service.yaml',
            value: json2Service(data)
          }
        ]
      : []),
    ...(data.networks.find((item) => item.openPublicDomain)
      ? [
          {
            filename: 'ingress.yaml',
            value: json2Ingress(data, env.ingressSecret)
          }
        ]
      : [])
  ];
};
