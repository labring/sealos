import yaml from 'js-yaml';
import type { AppEditType } from '@/types/app';
import { strToBase64, str2Num, pathFormat, pathToNameFormat } from '@/utils/tools';
import { SEALOS_DOMAIN, INGRESS_SECRET } from '@/store/static';
import { maxReplicasKey, minReplicasKey } from '@/constants/app';
import dayjs from 'dayjs';

export const json2Development = (data: AppEditType) => {
  const template = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: data.appName,
      annotations: {
        originImageName: data.imageName,
        [minReplicasKey]: `${data.hpa.use ? data.hpa.minReplicas : data.replicas}`,
        [maxReplicasKey]: `${data.hpa.use ? data.hpa.maxReplicas : data.replicas}`
      },
      labels: {
        [`${SEALOS_DOMAIN}/app-deploy-manager`]: data.appName,
        app: data.appName
      }
    },
    spec: {
      replicas: str2Num(data.hpa.use ? data.hpa.minReplicas : data.replicas),
      revisionHistoryLimit: 1,
      selector: {
        matchLabels: {
          app: data.appName
        }
      },
      strategy: {
        type: 'RollingUpdate',
        rollingUpdate: {
          maxUnavailable: 1,
          maxSurge: 0
        }
      },
      template: {
        metadata: {
          labels: {
            app: data.appName,
            restartTime: `${dayjs().format('YYYYMMDDHHmmss')}`
          }
        },
        spec: {
          imagePullSecrets: data.secret.use
            ? [
                // 私有仓库秘钥
                {
                  name: data.appName
                }
              ]
            : undefined,
          containers: [
            {
              name: data.appName,
              image: `${data.secret.use ? `${data.secret.serverAddress}/` : ''}${data.imageName}`,
              env:
                data.envs.length > 0
                  ? data.envs.map((env) => ({
                      name: env.key,
                      value: env.value
                    }))
                  : [],
              resources: {
                requests: {
                  cpu: `${str2Num(Math.floor(data.cpu * 0.1))}m`,
                  // cpu: '5m',
                  memory: `${str2Num(Math.floor(data.memory * 0.1))}Mi`
                },
                limits: {
                  cpu: `${str2Num(data.cpu)}m`,
                  // cpu: '30m',
                  memory: `${str2Num(data.memory)}Mi`
                }
              },
              command: data.runCMD ? [data.runCMD] : [],
              args: data.cmdParam.split(' ').filter((item) => item),
              ports: [
                {
                  containerPort: str2Num(data.containerOutPort)
                }
              ],
              imagePullPolicy: 'Always',
              volumeMounts: [
                ...data.configMapList.map((item) => ({
                  name: pathToNameFormat(item.mountPath),
                  mountPath: item.mountPath,
                  subPath: pathFormat(item.mountPath)
                }))
              ]
            }
          ],
          volumes: [
            ...data.configMapList.map((item) => ({
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
            }))
          ]
        }
      }
    }
  };

  return yaml.dump(template);
};

export const json2StatefulSet = (data: AppEditType) => {
  const template = {
    apiVersion: 'apps/v1',
    kind: 'StatefulSet',
    metadata: {
      name: data.appName,
      annotations: {
        originImageName: data.imageName,
        [minReplicasKey]: `${data.hpa.use ? data.hpa.minReplicas : data.replicas}`,
        [maxReplicasKey]: `${data.hpa.use ? data.hpa.maxReplicas : data.replicas}`
      },
      labels: {
        [`${SEALOS_DOMAIN}/app-deploy-manager`]: data.appName,
        app: data.appName
      }
    },
    spec: {
      replicas: str2Num(data.replicas),
      revisionHistoryLimit: 1,
      minReadySeconds: 10,
      serviceName: data.appName,
      selector: {
        matchLabels: {
          app: data.appName
        }
      },
      strategy: {
        type: 'RollingUpdate',
        rollingUpdate: {
          maxUnavailable: 1,
          maxSurge: 0
        }
      },
      template: {
        metadata: {
          labels: {
            app: data.appName
          }
        },
        spec: {
          terminationGracePeriodSeconds: 10,
          imagePullSecrets: data.secret.use
            ? [
                // 私有仓库秘钥
                {
                  name: data.appName
                }
              ]
            : undefined,
          containers: [
            {
              name: data.appName,
              image: `${data.secret.use ? `${data.secret.serverAddress}/` : ''}${data.imageName}`,
              env:
                data.envs.length > 0
                  ? data.envs.map((env) => ({
                      name: env.key,
                      value: env.value
                    }))
                  : [],
              resources: {
                requests: {
                  cpu: `${str2Num(Math.floor(data.cpu * 0.1))}m`,
                  // cpu: '5m',
                  memory: `${str2Num(Math.floor(data.memory * 0.1))}Mi`
                },
                limits: {
                  cpu: `${str2Num(data.cpu)}m`,
                  // cpu: '30m',
                  memory: `${str2Num(data.memory)}Mi`
                }
              },
              command: data.runCMD ? [data.runCMD] : [],
              args: data.cmdParam.split(' ').filter((item) => item),
              ports: [
                {
                  containerPort: str2Num(data.containerOutPort)
                }
              ],
              imagePullPolicy: 'Always',
              volumeMounts: [
                ...data.configMapList.map((item) => ({
                  name: pathToNameFormat(item.mountPath),
                  mountPath: item.mountPath,
                  subPath: pathFormat(item.mountPath)
                })),
                ...data.storeList.map((item) => ({
                  name: item.name,
                  mountPath: item.path
                }))
              ]
            }
          ],
          volumes: [
            ...data.configMapList.map((item) => ({
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
            }))
          ]
        }
      },
      volumeClaimTemplates: data.storeList.map((store) => ({
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
      }))
    }
  };

  return yaml.dump(template);
};

export const json2Service = (data: AppEditType) => {
  const template = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: data.appName,
      labels: {
        [`${SEALOS_DOMAIN}/app-deploy-manager`]: data.appName
      }
    },
    spec: {
      ports: [
        {
          port: str2Num(data.containerOutPort)
        }
      ],
      selector: {
        app: data.appName
      }
    }
  };
  return yaml.dump(template);
};

export const json2Ingress = (data: AppEditType) => {
  const host = data.accessExternal.selfDomain
    ? data.accessExternal.selfDomain
    : `${data.accessExternal.outDomain}.${SEALOS_DOMAIN}`;
  const secretName = data.accessExternal.selfDomain ? data.appName : INGRESS_SECRET;

  // different protocol annotations
  const map = {
    HTTP: {
      'nginx.ingress.kubernetes.io/ssl-redirect': 'false',
      'nginx.ingress.kubernetes.io/backend-protocol': 'HTTP',
      'nginx.ingress.kubernetes.io/rewrite-target': '/$2',
      'nginx.ingress.kubernetes.io/client-body-buffer-size': '64k',
      'nginx.ingress.kubernetes.io/proxy-buffer-size': '64k',
      'nginx.ingress.kubernetes.io/server-snippet':
        'client_header_buffer_size 64k;\nlarge_client_header_buffers 4 128k;\n',
      'nginx.ingress.kubernetes.io/configuration-snippet':
        'if ($request_uri ~* \\.(js|css|gif|jpe?g|png)) {\n  expires 30d;\n  add_header Cache-Control "public";\n}\n'
    },
    GRPC: {
      'nginx.ingress.kubernetes.io/ssl-redirect': 'false',
      'nginx.ingress.kubernetes.io/backend-protocol': 'GRPC',
      'nginx.ingress.kubernetes.io/rewrite-target': '/$2'
    },
    WS: {
      'nginx.ingress.kubernetes.io/proxy-read-timeout': '3600',
      'nginx.ingress.kubernetes.io/proxy-send-timeout': '3600',
      'nginx.ingress.kubernetes.io/backend-protocol': 'WS'
    }
  };

  const ingress = {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
    metadata: {
      name: data.appName,
      labels: {
        [`${SEALOS_DOMAIN}/app-deploy-manager`]: data.appName,
        [`${SEALOS_DOMAIN}/app-deploy-manager-domain`]: `${data.accessExternal.outDomain}`
      },
      annotations: {
        'kubernetes.io/ingress.class': 'nginx',
        'nginx.ingress.kubernetes.io/proxy-body-size': '32m',
        'nginx.ingress.kubernetes.io/server-snippet': `gzip on;gzip_min_length 1024;gzip_types text/plain text/css application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript;`,
        ...map[data.accessExternal.backendProtocol]
      }
    },
    spec: {
      rules: [
        {
          host: host,
          http: {
            paths: [
              {
                pathType: 'Prefix',
                path: '/()(.*)',
                backend: {
                  service: {
                    name: data.appName,
                    port: {
                      number: data.containerOutPort
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
      name: data.appName
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
                class: 'nginx'
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
      name: data.appName
    },
    spec: {
      secretName,
      dnsNames: [data.accessExternal.selfDomain],
      issuerRef: {
        name: data.appName,
        kind: 'Issuer'
      }
    }
  };
  let resYaml = yaml.dump(ingress);
  if (data.accessExternal.selfDomain) {
    resYaml += `\n---\n${yaml.dump(issuer)}\n---\n${yaml.dump(certificate)}`;
  }
  return resYaml;
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
    apiVersion: 'autoscaling/v2beta2',
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
              averageUtilization: str2Num(data.hpa.value)
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
