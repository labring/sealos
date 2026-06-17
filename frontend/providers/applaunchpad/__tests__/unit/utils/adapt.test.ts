import { describe, expect, it } from 'vitest';
import { adaptAppDetail } from '@/utils/adapt';
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

const createService = (): DeployKindsType =>
  ({
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: 'demo',
      labels: {}
    },
    spec: {
      ports: [
        {
          name: 'web',
          port: 80,
          targetPort: 80,
          protocol: 'TCP'
        },
        {
          name: 'api',
          port: 81,
          targetPort: 81,
          protocol: 'TCP'
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
});
