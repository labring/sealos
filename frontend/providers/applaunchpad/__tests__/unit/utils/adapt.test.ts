import { describe, expect, it } from 'vitest';
import { adaptAppDetail, adaptEditAppData } from '@/utils/adapt';
import type { DeployKindsType } from '@/types/app';

const createDeployment = (): DeployKindsType =>
  ({
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: 'demo',
      labels: {}
    },
    spec: {
      replicas: 1,
      template: {
        metadata: {
          annotations: {}
        },
        spec: {
          containers: [
            {
              name: 'demo',
              image: 'nginx:latest',
              resources: {
                limits: {
                  cpu: '100m',
                  memory: '128Mi'
                }
              },
              ports: [
                {
                  name: 'web',
                  containerPort: 80,
                  protocol: 'TCP'
                },
                {
                  name: 'api',
                  containerPort: 81,
                  protocol: 'TCP'
                }
              ]
            }
          ],
          volumes: []
        }
      }
    }
  } as DeployKindsType);

const createService = (name = 'demo', ports = [80, 81]): DeployKindsType =>
  ({
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name,
      labels: {}
    },
    spec: {
      ports: ports.map((port) => ({
        name: port === 80 ? 'web' : `p-${port}`,
        port,
        targetPort: port,
        protocol: 'TCP'
      })),
      selector: {
        app: name
      }
    }
  } as DeployKindsType);

const createNodePortService = (
  appProtocol?: string,
  port = 80,
  nodePort = 30080
): DeployKindsType =>
  ({
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: 'demo-nodeport',
      labels: {}
    },
    spec: {
      type: 'NodePort',
      ports: [
        {
          name: 'web',
          port,
          targetPort: port,
          protocol: 'TCP',
          nodePort,
          ...(appProtocol ? { appProtocol } : {})
        }
      ],
      selector: {
        app: 'demo'
      }
    }
  } as DeployKindsType);

const createIngress = (): DeployKindsType =>
  ({
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
    metadata: {
      name: 'network-demo',
      labels: {
        'cloud.sealos.io/app-deploy-manager-domain': 'demo',
        'cloud.sealos.io/app-deploy-manager-port': '80'
      },
      annotations: {
        'nginx.ingress.kubernetes.io/backend-protocol': 'HTTP'
      }
    },
    spec: {
      rules: [
        {
          host: 'demo.192.168.13.209.nip.io',
          http: {
            paths: [
              {
                path: '/web',
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: 'demo',
                    port: {
                      number: 80
                    }
                  }
                }
              },
              {
                path: '/api',
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: 'demo',
                    port: {
                      number: 81
                    }
                  }
                }
              }
            ]
          }
        }
      ]
    }
  } as DeployKindsType);

describe('adaptAppDetail', () => {
  it('preserves the governing Service name of an existing StatefulSet in edit data', async () => {
    const statefulSet = createDeployment() as any;
    statefulSet.kind = 'StatefulSet';
    statefulSet.spec.serviceName = 'demo-governing';

    const detail = await adaptAppDetail([statefulSet, createService('demo-governing')], {
      SEALOS_DOMAIN: '192.168.13.209.nip.io',
      SEALOS_USER_DOMAINS: []
    });

    expect(detail.statefulSetServiceName).toBe('demo-governing');
    expect(adaptEditAppData(detail).statefulSetServiceName).toBe('demo-governing');
  });

  it('keeps a multi-path ingress as one public network with route rules', async () => {
    const app = await adaptAppDetail([createDeployment(), createService(), createIngress()], {
      SEALOS_DOMAIN: '192.168.13.209.nip.io',
      SEALOS_USER_DOMAINS: [
        {
          name: '192.168.13.209.nip.io',
          secretName: 'wildcard-cert'
        }
      ]
    });

    const publicNetworks = app.networks.filter((network) => network.openPublicDomain);

    expect(publicNetworks).toHaveLength(1);
    expect(publicNetworks[0]).toMatchObject({
      networkName: 'network-demo',
      port: 80,
      publicDomain: 'demo',
      domain: '192.168.13.209.nip.io',
      customDomain: ''
    });
    expect(publicNetworks[0].routes).toEqual([
      {
        path: '/web',
        pathType: 'Prefix',
        serviceName: 'demo',
        servicePort: 80
      },
      {
        path: '/api',
        pathType: 'Prefix',
        serviceName: 'demo',
        servicePort: 81
      }
    ]);
    expect(app.networks.find((network) => network.port === 81)?.openPublicDomain).toBe(false);
  });

  it('uses the ingress owner port label even when the first route targets another backend', async () => {
    const ingress = createIngress() as any;
    ingress.spec.rules[0].http.paths = [...ingress.spec.rules[0].http.paths].reverse();

    const app = await adaptAppDetail([createDeployment(), createService(), ingress], {
      SEALOS_DOMAIN: '192.168.13.209.nip.io',
      SEALOS_USER_DOMAINS: [
        {
          name: '192.168.13.209.nip.io',
          secretName: 'wildcard-cert'
        }
      ]
    });

    const publicNetworks = app.networks.filter((network) => network.openPublicDomain);

    expect(publicNetworks).toHaveLength(1);
    expect(publicNetworks[0].port).toBe(80);
    expect(publicNetworks[0].routes?.map((route) => route.servicePort)).toEqual([81, 80]);
    expect(app.networks.find((network) => network.port === 81)?.openPublicDomain).toBe(false);
  });

  it('can expose backend service candidates without treating them as current app ports', async () => {
    const app = await adaptAppDetail([createDeployment(), createService(), createIngress()], {
      SEALOS_DOMAIN: '192.168.13.209.nip.io',
      SEALOS_USER_DOMAINS: [
        {
          name: '192.168.13.209.nip.io',
          secretName: 'wildcard-cert'
        }
      ],
      backendServices: [createService() as any, createService('api-demo', [8080]) as any]
    });

    expect(app.serviceList).toEqual([
      {
        name: 'demo',
        ports: [
          {
            name: 'web',
            port: 80,
            protocol: 'TCP'
          },
          {
            name: 'p-81',
            port: 81,
            protocol: 'TCP'
          }
        ]
      },
      {
        name: 'api-demo',
        ports: [
          {
            name: 'p-8080',
            port: 8080,
            protocol: 'TCP'
          }
        ]
      }
    ]);
    expect(app.networks.map((network) => network.port)).toEqual([80, 81]);
  });

  it('keeps TCP NodePort ports as transport protocol when no ServicePort appProtocol exists', async () => {
    const app = await adaptAppDetail([createDeployment(), createNodePortService()], {
      SEALOS_DOMAIN: '192.168.13.209.nip.io',
      SEALOS_USER_DOMAINS: [
        {
          name: '192.168.13.209.nip.io',
          secretName: 'wildcard-cert'
        }
      ]
    });

    expect(app.networks[0]).toMatchObject({
      port: 80,
      protocol: 'TCP',
      appProtocol: undefined,
      openNodePort: true,
      openPublicDomain: false
    });
  });

  it('restores application protocol for IP:port ports from ServicePort appProtocol', async () => {
    const app = await adaptAppDetail([createDeployment(), createNodePortService('http')], {
      SEALOS_DOMAIN: '192.168.13.209.nip.io',
      SEALOS_USER_DOMAINS: [
        {
          name: '192.168.13.209.nip.io',
          secretName: 'wildcard-cert'
        }
      ]
    });

    expect(app.networks[0]).toMatchObject({
      port: 80,
      protocol: 'TCP',
      appProtocol: 'HTTP',
      openNodePort: true,
      openPublicDomain: false
    });
  });
});
