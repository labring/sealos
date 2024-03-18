import {
  appDeployKey,
  deployPVCResizeKey,
  gpuNodeSelectorKey,
  gpuResourceKey,
  maxReplicasKey,
  minReplicasKey,
  publicDomainKey
} from '@/constants/app';
import { INGRESS_SECRET, SEALOS_DOMAIN } from '@/store/static';
import type { AppEditType } from '@/types/app';
import { pathFormat, pathToNameFormat, str2Num, strToBase64 } from '@/utils/tools';
import dayjs from 'dayjs';
import yaml from 'js-yaml';

export const json2DeployCr = (data: AppEditType, type: 'deployment' | 'statefulset') => {
  const totalStorage = data.storeList.reduce((acc, item) => acc + item.value, 0);

  const metadata = {
    name: data.appName,
    annotations: {
      originImageName: data.imageName,
      [minReplicasKey]: `${data.hpa.use ? data.hpa.minReplicas : data.replicas}`,
      [maxReplicasKey]: `${data.hpa.use ? data.hpa.maxReplicas : data.replicas}`,
      [deployPVCResizeKey]: `${totalStorage}Gi`
    },
    labels: {
      [appDeployKey]: data.appName,
      app: data.appName
    }
  };
  const commonSpec = {
    replicas: str2Num(data.hpa.use ? data.hpa.minReplicas : data.replicas),
    revisionHistoryLimit: 1,
    selector: {
      matchLabels: {
        app: data.appName
      }
    }
  };
  const templateMetadata = {
    labels: {
      app: data.appName,
      restartTime: `${dayjs().format('YYYYMMDDHHmmss')}`
    }
  };
  const imagePullSecrets = data.secret.use
    ? [
        {
          name: data.appName
        }
      ]
    : undefined;
  const commonContainer = {
    name: data.appName,
    image: `${data.secret.use ? `${data.secret.serverAddress}/` : ''}${data.imageName}`,
    env:
      data.envs.length > 0
        ? data.envs.map((env) => ({
            name: env.key,
            value: env.valueFrom ? undefined : env.value,
            valueFrom: env.valueFrom
          }))
        : [],
    resources: {
      requests: {
        cpu: `${str2Num(Math.floor(data.cpu * 0.1))}m`,
        memory: `${str2Num(Math.floor(data.memory * 0.1))}Mi`,
        ...(!!data.gpu?.type ? { [gpuResourceKey]: data.gpu.amount } : {})
      },
      limits: {
        cpu: `${str2Num(data.cpu)}m`,
        memory: `${str2Num(data.memory)}Mi`,
        ...(!!data.gpu?.type ? { [gpuResourceKey]: data.gpu.amount } : {})
      }
    },
    command: (() => {
      if (!data.runCMD) return undefined;
      try {
        return JSON.parse(data.runCMD);
      } catch (error) {
        return data.runCMD.split(' ').filter((item) => item);
      }
    })(),
    args: (() => {
      if (!data.cmdParam) return undefined;
      try {
        return JSON.parse(data.cmdParam) as string[];
      } catch (error) {
        return [data.cmdParam];
      }
    })(),
    ports: data.networks.map((item, i) => ({
      containerPort: item.port,
      name: item.portName
    })),
    imagePullPolicy: 'Always'
  };
  const configMapVolumeMounts = data.configMapList.map((item) => ({
    name: pathToNameFormat(item.mountPath),
    mountPath: item.mountPath,
    subPath: pathFormat(item.mountPath)
  }));
  const configMapVolumes = data.configMapList.map((item) => ({
    name: pathToNameFormat(item.mountPath), // name === [development.***.volumeMounts[*].name]
    configMap: {
      name: data.appName, // name === configMap.yaml.meta.name
      items: [
        {
          key: pathToNameFormat(item.mountPath),
          path: pathFormat(item.mountPath) // path ===[development.***.volumeMounts[*].subPath]
        }
      ]
    }
  }));

  // pvc settings
  const storageTemplates = data.storeList.map((store) => ({
    metadata: {
      annotations: {
        path: store.path,
        value: `${store.value}`
      },
      name: store.name
    },
    spec: {
      accessModes: ['ReadWriteOnce'],
      resources: {
        requests: {
          storage: `${store.value}Gi`
        }
      }
    }
  }));

  // gpu node selector
  const gpuMap = !!data.gpu?.type
    ? {
        restartPolicy: 'Always',
        runtimeClassName: 'nvidia',
        nodeSelector: {
          [gpuNodeSelectorKey]: data.gpu.type
        }
      }
    : {};

  const template = {
    deployment: {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata,
      spec: {
        ...commonSpec,
        strategy: {
          type: 'RollingUpdate',
          rollingUpdate: {
            maxUnavailable: 0,
            maxSurge: 1
          }
        },
        template: {
          metadata: templateMetadata,
          spec: {
            automountServiceAccountToken: false,
            imagePullSecrets,
            containers: [
              {
                ...commonContainer,
                volumeMounts: [...configMapVolumeMounts]
              }
            ],
            ...gpuMap,
            volumes: [...configMapVolumes]
          }
        }
      }
    },
    statefulset: {
      apiVersion: 'apps/v1',
      kind: 'StatefulSet',
      metadata,
      spec: {
        ...commonSpec,
        updateStrategy: {
          type: 'RollingUpdate',
          rollingUpdate: {
            maxUnavailable: '50%'
          }
        },
        minReadySeconds: 10,
        serviceName: data.appName,
        template: {
          metadata: templateMetadata,
          spec: {
            automountServiceAccountToken: false,
            imagePullSecrets,
            terminationGracePeriodSeconds: 10,
            containers: [
              {
                ...commonContainer,
                volumeMounts: [
                  ...configMapVolumeMounts,
                  ...data.storeList.map((item) => ({
                    name: item.name,
                    mountPath: item.path
                  }))
                ]
              }
            ],
            ...gpuMap,
            volumes: [...configMapVolumes]
          }
        },
        volumeClaimTemplates: storageTemplates
      }
    }
  };

  return yaml.dump(template[type]);
};

export const json2Service = (data: AppEditType) => {
  const template = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: data.appName,
      labels: {
        [appDeployKey]: data.appName
      }
    },
    spec: {
      ports: data.networks.map((item, i) => ({
        port: str2Num(item.port),
        targetPort: str2Num(item.port),
        name: item.portName
      })),
      selector: {
        app: data.appName
      }
    }
  };
  return yaml.dump(template);
};

export const json2NetWorkByType = (type: 'ingress' | 'gateway', data: AppEditType) => {
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
    .map((network, i) => {
      const host = network.customDomain
        ? network.customDomain
        : `${network.publicDomain}.${SEALOS_DOMAIN}`;

      const secretName = network.customDomain ? network.networkName : INGRESS_SECRET;

      const ingress = {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'Ingress',
        metadata: {
          name: network.networkName,
          labels: {
            [appDeployKey]: data.appName,
            [publicDomainKey]: network.publicDomain
          },
          annotations: {
            'kubernetes.io/ingress.class': 'nginx',
            'nginx.ingress.kubernetes.io/proxy-body-size': '32m',
            ...map[network.protocol]
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
                        name: data.appName,
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
          name: network.networkName,
          labels: {
            [appDeployKey]: data.appName
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
          name: network.networkName,
          labels: {
            [appDeployKey]: data.appName
          }
        },
        spec: {
          secretName,
          dnsNames: [network.customDomain],
          issuerRef: {
            name: network.networkName,
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

export const json2Ingress = (data: AppEditType) => {
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
    .map((network, i) => {
      const host = network.customDomain
        ? network.customDomain
        : `${network.publicDomain}.${SEALOS_DOMAIN}`;

      const secretName = network.customDomain ? network.networkName : INGRESS_SECRET;

      const ingress = {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'Ingress',
        metadata: {
          name: network.networkName,
          labels: {
            [appDeployKey]: data.appName,
            [publicDomainKey]: network.publicDomain
          },
          annotations: {
            'kubernetes.io/ingress.class': 'nginx',
            'nginx.ingress.kubernetes.io/proxy-body-size': '32m',
            ...map[network.protocol]
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
                        name: data.appName,
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
          name: network.networkName,
          labels: {
            [appDeployKey]: data.appName
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
          name: network.networkName,
          labels: {
            [appDeployKey]: data.appName
          }
        },
        spec: {
          secretName,
          dnsNames: [network.customDomain],
          issuerRef: {
            name: network.networkName,
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

export const json2ConfigMap = (data: AppEditType) => {
  if (data.configMapList.length === 0) return '';

  const configFile: { [key: string]: string } = {};
  data.configMapList.forEach((item) => {
    configFile[pathToNameFormat(item.mountPath)] = item.value; // key ===  [development.***.volumes[*].configMap.items[0].key]
  });

  const template = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: data.appName
    },
    data: configFile
  };

  return yaml.dump(template);
};

export const json2Secret = (data: AppEditType) => {
  const auth = strToBase64(`${data.secret.username}:${data.secret.password}`);
  const dockerconfigjson = strToBase64(
    JSON.stringify({
      auths: {
        [data.secret.serverAddress || '']: {
          username: data.secret.username,
          password: data.secret.password,
          auth
        }
      }
    })
  );

  const template = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: data.appName
    },
    data: {
      '.dockerconfigjson': dockerconfigjson
    },
    type: 'kubernetes.io/dockerconfigjson'
  };
  return yaml.dump(template);
};
export const json2HPA = (data: AppEditType) => {
  const template = {
    apiVersion: 'autoscaling/v2',
    kind: 'HorizontalPodAutoscaler',
    metadata: {
      name: data.appName
    },
    spec: {
      scaleTargetRef: {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: data.appName
      },
      minReplicas: str2Num(data.hpa?.minReplicas),
      maxReplicas: str2Num(data.hpa?.maxReplicas),
      metrics: [
        {
          type: 'Resource',
          resource: {
            name: data.hpa.target,
            target: {
              type: 'Utilization',
              averageUtilization: str2Num(data.hpa.value * 10)
            }
          }
        }
      ],
      behavior: {
        scaleDown: {
          policies: [
            {
              type: 'Pods',
              value: 1,
              periodSeconds: 60
            }
          ]
        },
        scaleUp: {
          policies: [
            {
              type: 'Pods',
              value: 1,
              periodSeconds: 60
            }
          ]
        }
      }
    }
  };
  return yaml.dump(template);
};
