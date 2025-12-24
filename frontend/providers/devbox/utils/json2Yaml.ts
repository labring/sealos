import yaml from 'js-yaml';

import { devboxKey, publicDomainKey } from '@/constants/devbox';
import { DevboxEditTypeV2, json2DevboxData, ProtocolType } from '@/types/devbox';
import { produce } from 'immer';
import { nanoid, parseTemplateConfig, str2Num } from './tools';
import { getUserNamespace } from './user';

export const json2Devbox = (
  data: Omit<json2DevboxData, 'templateRepositoryUid'>,
  devboxAffinityEnable: string = 'true',
  storageLimit: string = '1Gi'
) => {
  const gpuMap = !!data.gpu?.type
    ? {
        nodeSelector: {
          [gpuNodeSelectorKey]: data.gpu.type
        }
      }
    : {};

  let json: any = {
    apiVersion: 'devbox.sealos.io/v1alpha2',
    kind: 'Devbox',
    metadata: {
      name: data.name
    },
    spec: {
      network: {
        type: 'SSHGate', // TODO: github import and local import maybe should adjust this too.
        extraPorts: data.networks.map((item) => ({
          containerPort: item.port
        }))
      },
      resource: {
        cpu: `${str2Num(Math.floor(data.cpu))}m`,
        memory: `${str2Num(data.memory)}Mi`,
        ...(!!data.gpu?.type ? { [gpuResourceKey]: data.gpu.amount } : {})
      },
      ...(!!data.gpu?.type ? { runtimeClassName: 'nvidia' } : {}),
      templateID: data.templateUid,
      image: data.image,
      config: produce(parseTemplateConfig(data.templateConfig), (draft) => {
        draft.appPorts = data.networks.map((item) => ({
          port: str2Num(item.port),
          name: item.portName,
          protocol: 'TCP',
          targetPort: str2Num(item.port)
        }));
        if (data.env && data.env.length > 0) {
          if (!draft.env) {
            draft.env = [];
          }
          draft.env = [...draft.env, ...data.env];
        }
      }),
      state: 'Running',
      ...gpuMap,
      runtimeClassName: 'devbox-runtime',
      storageLimit: storageLimit // 1Gi default
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

export const getDevboxReleaseName = (devboxName: string, tag: string) => {
  return `${devboxName}-${tag}`;
};
export const json2DevboxRelease = (data: {
  devboxName: string;
  tag: string;
  releaseDes: string;
  devboxUid: string;
  startDevboxAfterRelease: boolean;
}) => {
  const json = {
    apiVersion: 'devbox.sealos.io/v1alpha2',
    kind: 'DevBoxRelease',
    metadata: {
      name: getDevboxReleaseName(data.devboxName, data.tag),
      ownerReferences: [
        {
          apiVersion: 'devbox.sealos.io/v1alpha2',
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
      version: data.tag,
      notes: data.releaseDes,
      startDevboxAfterRelease: data.startDevboxAfterRelease
    }
  };
  return yaml.dump(json);
};

export const json2Ingress = (
  data: Pick<DevboxEditTypeV2, 'name' | 'networks'>,
  ingressSecret: string
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
          name: networkName,
          labels: {
            [devboxKey]: data.name
          }
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
          name: networkName,
          labels: {
            [devboxKey]: data.name
          }
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
export const json2Service = (data: Pick<DevboxEditTypeV2, 'name' | 'networks'>) => {
  if (data.networks.length === 0) {
    return '';
  }
  const template = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: data.name,
      labels: {
        [devboxKey]: data.name
      }
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
  data: json2DevboxData,
  env: {
    devboxAffinityEnable?: string;
    storageLimit?: string;
    ingressSecret: string;
  }
) => {
  return [
    {
      filename: 'devbox.yaml',
      value: json2Devbox(data, env.devboxAffinityEnable, env.storageLimit)
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
