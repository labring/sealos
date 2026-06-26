import { describe, expect, it } from 'vitest';
import {
  json2DeployCr,
  json2Ingress,
  json2Secret,
  json2Service,
  yamlString2Objects
} from '@/utils/deployYaml2Json';
import type { AppEditType } from '@/types/app';

const createApp = (customDomain = ''): AppEditType =>
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
        openPublicDomain: true,
        publicDomain: 'demo',
        customDomain,
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
    configMapList: [],
    storeList: [],
    labels: {},
    volumes: [],
    volumeMounts: [],
    kind: 'deployment'
  } as AppEditType);

describe('json2Ingress', () => {
  it('keeps tls and custom domain cert-manager resources in https mode', () => {
    const objects = yamlString2Objects(
      json2Ingress(createApp('custom.example.com'), {
        disableHttps: false
      })
    ) as any[];

    expect(objects.map((item) => item.kind)).toEqual(['Ingress', 'Issuer', 'Certificate']);
    expect(objects[0].spec.tls).toEqual([
      {
        hosts: ['custom.example.com'],
        secretName: 'demo-web'
      }
    ]);
  });

  it('omits tls, ssl redirect annotations, and cert-manager resources in http-only mode', () => {
    const objects = yamlString2Objects(
      json2Ingress(createApp('custom.example.com'), {
        disableHttps: true
      })
    ) as any[];

    expect(objects.map((item) => item.kind)).toEqual(['Ingress']);
    expect(objects[0].spec.tls).toBeUndefined();
    expect(
      objects[0].metadata.annotations['nginx.ingress.kubernetes.io/ssl-redirect']
    ).toBeUndefined();
  });

  it('normalizes custom domain before writing ingress host and certificate dns name', () => {
    const objects = yamlString2Objects(
      json2Ingress(createApp('Codex-ms100066-launch.192.168.13.29.nip.io.'), {
        disableHttps: false
      })
    ) as any[];

    expect(objects[0].spec.rules[0].host).toBe('codex-ms100066-launch.192.168.13.29.nip.io');
    expect(objects[0].spec.tls[0].hosts).toEqual(['codex-ms100066-launch.192.168.13.29.nip.io']);
    expect(objects[2].spec.dnsNames).toEqual(['codex-ms100066-launch.192.168.13.29.nip.io']);
  });

  it('normalizes configured app domain before writing generated ingress host', () => {
    const app = createApp();
    app.networks[0].domain = '192.168.13.29.nip.io.';

    const objects = yamlString2Objects(
      json2Ingress(app, {
        disableHttps: false
      })
    ) as any[];

    expect(objects.map((item) => item.kind)).toEqual(['Ingress']);
    expect(objects[0].spec.rules[0].host).toBe('demo.192.168.13.29.nip.io');
    expect(objects[0].spec.tls[0].hosts).toEqual(['demo.192.168.13.29.nip.io']);
  });

  it('labels the ingress owner port for stable route rule round trips', () => {
    const app = createApp();
    app.networks[0].routes = [
      {
        path: '/api',
        pathType: 'Prefix',
        serviceName: 'demo',
        servicePort: 81
      }
    ];

    const objects = yamlString2Objects(
      json2Ingress(app, {
        disableHttps: false
      })
    ) as any[];

    expect(objects[0].metadata.labels['cloud.sealos.io/app-deploy-manager-port']).toBe('80');
  });

  it('writes configured route rules into ingress paths', () => {
    const app = createApp();
    app.networks[0].routes = [
      {
        path: '/web',
        pathType: 'Prefix',
        serviceName: 'demo',
        servicePort: 80
      },
      {
        path: '/api',
        pathType: 'Exact',
        serviceName: 'demo-api',
        servicePort: 81
      }
    ];

    const objects = yamlString2Objects(
      json2Ingress(app, {
        disableHttps: true
      })
    ) as any[];

    expect(objects[0].spec.rules[0].host).toBe('demo.cloud.example.com');
    expect(objects[0].spec.rules[0].http.paths).toEqual([
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
        pathType: 'Exact',
        backend: {
          service: {
            name: 'demo-api',
            port: {
              number: 81
            }
          }
        }
      }
    ]);
  });

  it('syncs the default main service route port with the network port', () => {
    const app = createApp();
    app.networks[0].port = 8080;
    app.networks[0].routes = [
      {
        path: '/',
        pathType: 'Prefix',
        serviceName: '',
        servicePort: 80
      },
      {
        path: '/test',
        pathType: 'Prefix',
        serviceName: '',
        servicePort: 80
      }
    ];

    const objects = yamlString2Objects(
      json2Ingress(app, {
        disableHttps: true
      })
    ) as any[];

    expect(
      objects[0].spec.rules[0].http.paths.map((path: any) => path.backend.service.port.number)
    ).toEqual([8080, 8080]);
  });

  it('preserves route rules that target another backend service port', () => {
    const app = createApp();
    app.networks[0].port = 8080;
    app.networks[0].routes = [
      {
        path: '/',
        pathType: 'Prefix',
        serviceName: 'demo-api',
        servicePort: 80
      }
    ];

    const objects = yamlString2Objects(
      json2Ingress(app, {
        disableHttps: true
      })
    ) as any[];

    expect(objects[0].spec.rules[0].http.paths[0].backend.service).toEqual({
      name: 'demo-api',
      port: {
        number: 80
      }
    });
  });

  it('preserves main service route ports that still exist on another network port', () => {
    const app = createApp();
    app.networks = [
      {
        ...app.networks[0],
        port: 8080,
        routes: [
          {
            path: '/',
            pathType: 'Prefix',
            serviceName: '',
            servicePort: 80
          }
        ]
      },
      {
        ...app.networks[0],
        networkName: 'demo-web-80',
        portName: 'web-80',
        port: 80,
        openPublicDomain: false
      }
    ];

    const objects = yamlString2Objects(
      json2Ingress(app, {
        disableHttps: true
      })
    ) as any[];

    expect(objects[0].spec.rules[0].http.paths[0].backend.service.port.number).toBe(80);
  });

  it('does not require custom domains for generated public domains or node ports', () => {
    const app = createApp();
    app.networks = [
      {
        ...app.networks[0],
        customDomain: ''
      },
      {
        ...app.networks[0],
        networkName: 'demo-tcp',
        portName: 'tcp',
        port: 8080,
        protocol: 'TCP',
        appProtocol: undefined,
        openPublicDomain: false,
        openNodePort: true,
        nodePort: 30080,
        customDomain: ''
      }
    ];

    const objects = yamlString2Objects(
      json2Ingress(app, {
        disableHttps: true
      })
    ) as any[];

    expect(objects).toHaveLength(1);
    expect(objects[0].metadata.name).toBe('demo-web');
    expect(objects[0].spec.rules[0].host).toBe('demo.cloud.example.com');
  });
});

describe('json2Service', () => {
  it('fills a stable service port name when portName is missing', () => {
    const app = createApp();
    app.networks[0].portName = '';

    const objects = yamlString2Objects(json2Service(app)) as any[];

    expect(objects[0].spec.ports[0].name).toBe('p-t-80-0');
  });

  it('deduplicates generated service port names for repeated ports', () => {
    const app = createApp();
    app.networks = [
      { ...app.networks[0], portName: '', port: 80 },
      { ...app.networks[0], portName: 'p-t-80-0', port: 80 },
      { ...app.networks[0], portName: '', port: 80 }
    ];

    const objects = yamlString2Objects(json2Service(app)) as any[];
    const portNames = objects[0].spec.ports.map((port: any) => port.name);

    expect(portNames).toEqual(['p-t-80-0', 'p-t-80-1', 'p-t-80-2']);
    expect(new Set(portNames).size).toBe(portNames.length);
  });
});

describe('json2DeployCr', () => {
  it('deduplicates generated container port names for repeated ports', () => {
    const app = createApp();
    app.networks = [
      { ...app.networks[0], portName: '', port: 80 },
      { ...app.networks[0], portName: 'p-t-80-0', port: 80 },
      { ...app.networks[0], portName: '', port: 80 }
    ];

    const objects = yamlString2Objects(json2DeployCr(app, 'deployment')) as any[];
    const portNames = objects[0].spec.template.spec.containers[0].ports.map(
      (port: any) => port.name
    );

    expect(portNames).toEqual(['p-t-80-0', 'p-t-80-1', 'p-t-80-2']);
    expect(new Set(portNames).size).toBe(portNames.length);
  });
});

describe('json2Secret', () => {
  it('keeps registry credentials in deploy yaml by default', () => {
    const app = createApp();
    app.secret = {
      use: true,
      username: 'demo-user',
      password: 'real-password',
      serverAddress: 'registry.example.com'
    };

    const objects = yamlString2Objects(json2Secret(app)) as any[];
    const dockerconfigjson = Buffer.from(objects[0].data['.dockerconfigjson'], 'base64').toString();

    expect(dockerconfigjson).toContain('real-password');
  });

  it('masks registry password in display yaml', () => {
    const app = createApp();
    app.secret = {
      use: true,
      username: 'demo-user',
      password: 'real-password',
      serverAddress: 'registry.example.com'
    };

    const secretYaml = json2Secret(app, undefined, { maskPassword: true });

    expect(secretYaml).toContain('.dockerconfigjson: ********');
    expect(secretYaml).not.toContain(".dockerconfigjson: '********'");
  });
});
