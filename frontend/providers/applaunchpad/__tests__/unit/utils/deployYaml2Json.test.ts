import { describe, expect, it } from 'vitest';
import { compare } from 'fast-json-patch';
import {
  alignImageRegistrySecret,
  getBoundImageRegistryCredentials,
  getImageRegistryAddress,
  json2DeployCr,
  json2Ingress,
  json2Secret,
  resolveImageRegistryBinding,
  json2Service,
  yamlString2Objects
} from '@/utils/deployYaml2Json';
import type { AppEditType } from '@/types/app';
import { resolveAppImageName } from '@/utils/adapt';
import { rebindMainServiceRoutes } from '@/utils/network-routes';

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

  it('uses the configured certificate secret without cert-manager resources in certificate mode', () => {
    const objects = yamlString2Objects(
      json2Ingress(createApp('custom.example.com'), {
        disableHttps: false,
        customDomainMode: 'certificate',
        customDomainCertificateSecretName: 'wildcard-cert'
      })
    ) as any[];

    expect(objects.map((item) => item.kind)).toEqual(['Ingress']);
    expect(objects[0].spec.rules[0].host).toBe('custom.example.com');
    expect(objects[0].spec.tls).toEqual([
      {
        hosts: ['custom.example.com'],
        secretName: 'wildcard-cert'
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

  it('writes a regenerated main service name after stale route bindings are removed', () => {
    const app = createApp();
    app.networks[0].serviceName = '';
    app.networks[0].port = 8080;
    app.networks[0].routes = rebindMainServiceRoutes({
      routes: [
        {
          path: '/',
          pathType: 'Prefix',
          serviceName: 'demo-old-service',
          servicePort: 8080
        },
        {
          path: '/api',
          pathType: 'Prefix',
          serviceName: 'demo-api',
          servicePort: 8081
        }
      ],
      previousServiceName: 'demo-old-service'
    });

    const objects = yamlString2Objects(
      json2Ingress(app, {
        disableHttps: true
      })
    ) as any[];
    const paths = objects[0].spec.rules[0].http.paths;

    expect(paths[0].backend.service.name).not.toBe('demo-old-service');
    expect(paths[0].backend.service.name).toMatch(/^demo-[a-z]{12}$/);
    expect(paths[1].backend.service.name).toBe('demo-api');
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

  it('does not create ingress for HTTP ports exposed through NodePort', () => {
    const app = createApp();
    app.networks[0] = {
      ...app.networks[0],
      appProtocol: 'HTTP',
      openPublicDomain: false,
      openNodePort: true,
      nodePort: 30080,
      publicDomain: '',
      customDomain: ''
    };

    const objects = yamlString2Objects(
      json2Ingress(app, {
        disableHttps: false
      })
    ) as any[];

    expect(objects).toHaveLength(0);
  });

  it('uses an RFC 1035-safe generated backend service name for legacy numeric app names', () => {
    const app = createApp('custom.example.com');
    app.appName = '1hello-world';

    const objects = yamlString2Objects(
      json2Ingress(app, {
        disableHttps: true
      })
    ) as any[];

    expect(objects[0].spec.rules[0].http.paths[0].backend.service.name).toMatch(
      /^app-1hello-world-[a-z]{12}$/
    );
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

  it('uses an RFC 1035-safe generated service name for legacy numeric app names', () => {
    const app = createApp();
    app.appName = '111111hello-world';
    app.networks[0].openNodePort = true;
    app.networks[0].nodePort = 30080;

    const objects = yamlString2Objects(json2Service(app)) as any[];

    expect(objects[0].metadata.name).toMatch(/^app-111111hello-world-nodeport-[a-z]{12}$/);
  });

  it('renders application-protocol IP:port access as a NodePort service', () => {
    const app = createApp();
    app.networks[0] = {
      ...app.networks[0],
      appProtocol: 'HTTP',
      openPublicDomain: false,
      openNodePort: true,
      nodePort: 30080,
      publicDomain: '',
      customDomain: ''
    };

    const objects = yamlString2Objects(json2Service(app)) as any[];

    expect(objects).toHaveLength(1);
    expect(objects[0].spec.type).toBe('NodePort');
    expect(objects[0].spec.ports[0]).toMatchObject({
      port: 80,
      targetPort: 80,
      protocol: 'TCP',
      appProtocol: 'http',
      nodePort: 30080
    });
  });

  it('can render only the ClusterIP service when repairing ingress backends', () => {
    const app = createApp();
    app.networks = [
      app.networks[0],
      {
        ...app.networks[0],
        networkName: 'demo-nodeport',
        portName: 'nodeport',
        port: 8080,
        openPublicDomain: false,
        openNodePort: true,
        nodePort: 30080
      }
    ];

    const objects = yamlString2Objects(
      json2Service(app, undefined, {
        includeNodePort: false
      })
    ) as any[];

    expect(objects).toHaveLength(1);
    expect(objects[0].kind).toBe('Service');
    expect(objects[0].spec.type).toBeUndefined();
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

  it('does not change the pod template when only StatefulSet replicas change', () => {
    const app = createApp();
    app.kind = 'statefulset';

    const oldStatefulSet = yamlString2Objects(json2DeployCr(app, 'statefulset'))[0] as any;
    const newStatefulSet = yamlString2Objects(
      json2DeployCr({ ...app, replicas: 2 }, 'statefulset')
    )[0] as any;

    const paths = compare(oldStatefulSet, newStatefulSet).map((operation) => operation.path);

    expect(paths).toContain('/spec/replicas');
    expect(paths).not.toContain('/spec/template/metadata/labels/restartTime');
    expect(paths.some((path) => path.startsWith('/spec/template'))).toBe(false);
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

  it.each([
    ['hub.example.com/team/app:v1', 'hub.example.com'],
    ['192.168.1.10:5000/team/app:v1', '192.168.1.10:5000'],
    ['team/app:v1', 'docker.io'],
    ['app:v1', 'docker.io']
  ])('resolves the registry for %s as %s', (imageName, registry) => {
    expect(getImageRegistryAddress(imageName)).toBe(registry);
  });

  it('uses the complete image as-is and derives the pull secret registry', () => {
    const app = createApp();
    app.imageName = 'hub.example.com/team/app:v1';
    app.secret = {
      use: true,
      username: 'demo-user',
      password: 'real-password',
      serverAddress: ''
    };

    const deployment = yamlString2Objects(json2DeployCr(app, 'deployment'))[0] as any;
    const secret = yamlString2Objects(json2Secret(app))[0] as any;
    const dockerconfigjson = JSON.parse(
      Buffer.from(secret.data['.dockerconfigjson'], 'base64').toString()
    );

    expect(deployment.spec.template.spec.containers[0].image).toBe('hub.example.com/team/app:v1');
    expect(Object.keys(dockerconfigjson.auths)).toEqual(['hub.example.com']);
  });

  it('uses docker.io for the pull secret of a short image reference', () => {
    const app = createApp();
    app.imageName = 'team/app:v1';
    const secret = yamlString2Objects(json2Secret(app))[0] as any;
    const dockerconfigjson = JSON.parse(
      Buffer.from(secret.data['.dockerconfigjson'], 'base64').toString()
    );

    expect(dockerconfigjson.auths).toHaveProperty('docker.io');
  });

  it('keeps the API contract for a short image and a separate private registry', () => {
    const app = createApp();
    app.imageName = 'team/app:v1';
    app.secret = {
      use: true,
      username: 'demo-user',
      password: 'real-password',
      serverAddress: 'registry.example.com'
    };

    const deployment = yamlString2Objects(json2DeployCr(app, 'deployment'))[0] as any;
    const secret = yamlString2Objects(json2Secret(app))[0] as any;
    const dockerconfigjson = JSON.parse(
      Buffer.from(secret.data['.dockerconfigjson'], 'base64').toString()
    );

    expect(deployment.spec.template.spec.containers[0].image).toBe(
      'registry.example.com/team/app:v1'
    );
    expect(Object.keys(dockerconfigjson.auths)).toEqual(['registry.example.com']);
  });

  it('rejects credentials that belong to a different explicit registry', () => {
    const app = createApp();
    app.imageName = 'new-registry.example.com/team/app:v1';
    app.secret = {
      use: true,
      username: 'demo-user',
      password: 'real-password',
      serverAddress: 'old-registry.example.com'
    };

    const deployment = yamlString2Objects(json2DeployCr(app, 'deployment'))[0] as any;
    expect(deployment.spec.template.spec.containers[0].image).toBe(
      'new-registry.example.com/team/app:v1'
    );
    expect(() => json2Secret(app)).toThrow('registry credentials');
  });

  it('resolves API image updates using a separate private registry', () => {
    expect(
      resolveImageRegistryBinding({
        imageName: 'team/app:v2',
        credentialRegistry: 'registry.example.com',
        useCredentials: true,
        requireCredentialMatch: true
      })
    ).toEqual({
      imageName: 'registry.example.com/team/app:v2',
      registry: 'registry.example.com'
    });
  });

  it('ignores stale registry fields when private credentials are disabled', () => {
    const app = createApp();
    app.imageName = 'new-registry.example.com/team/app:v1';
    app.secret = {
      use: false,
      username: 'old-user',
      password: 'old-password',
      serverAddress: 'old-registry.example.com'
    };

    const deployment = yamlString2Objects(json2DeployCr(app, 'deployment'))[0] as any;
    expect(deployment.spec.template.spec.containers[0].image).toBe(
      'new-registry.example.com/team/app:v1'
    );
  });

  it('clears credentials when the image registry changes', () => {
    expect(
      alignImageRegistrySecret('new-registry.example.com/team/app:v1', {
        use: true,
        username: 'demo-user',
        password: 'real-password',
        serverAddress: 'old-registry.example.com'
      })
    ).toEqual({
      use: true,
      username: '',
      password: '',
      serverAddress: 'new-registry.example.com'
    });
  });

  it('keeps Docker Hub credentials stored under the legacy auth key', () => {
    const secret = {
      use: true,
      username: 'demo-user',
      password: 'real-password',
      serverAddress: 'https://index.docker.io/v1/'
    };

    expect(alignImageRegistrySecret('team/app:v1', secret)).toBe(secret);
    expect(getBoundImageRegistryCredentials('team/app:v1', secret)).toEqual({
      username: 'demo-user',
      password: 'real-password',
      serverAddress: 'docker.io'
    });
  });

  it('accepts Docker Hub aliases in explicit image and credential registries', () => {
    const app = createApp();
    app.imageName = 'index.docker.io/team/app:v1';
    app.secret = {
      use: true,
      username: 'demo-user',
      password: 'real-password',
      serverAddress: 'https://index.docker.io/v1/'
    };

    const deployment = yamlString2Objects(json2DeployCr(app, 'deployment'))[0] as any;
    const secret = yamlString2Objects(json2Secret(app))[0] as any;
    const dockerconfigjson = JSON.parse(
      Buffer.from(secret.data['.dockerconfigjson'], 'base64').toString()
    );

    expect(deployment.spec.template.spec.containers[0].image).toBe('index.docker.io/team/app:v1');
    expect(Object.keys(dockerconfigjson.auths)).toEqual(['docker.io']);
  });

  it.each(['registry-1.docker.io', 'registry.hub.docker.com'])(
    'preserves the explicit Docker registry hostname %s',
    (registry) => {
      const app = createApp();
      app.imageName = `${registry}/team/app:v1`;
      app.secret = {
        use: true,
        username: 'demo-user',
        password: 'real-password',
        serverAddress: registry
      };

      const secret = yamlString2Objects(json2Secret(app))[0] as any;
      const dockerconfigjson = JSON.parse(
        Buffer.from(secret.data['.dockerconfigjson'], 'base64').toString()
      );

      expect(Object.keys(dockerconfigjson.auths)).toEqual([registry]);
    }
  );

  it('preserves credentials scoped to the image repository path', () => {
    const app = createApp();
    app.imageName = 'registry.example.com/team/app:v1';
    app.secret = {
      use: true,
      username: 'demo-user',
      password: 'real-password',
      serverAddress: 'registry.example.com/team'
    };

    expect(alignImageRegistrySecret(app.imageName, app.secret)).toBe(app.secret);
    expect(getBoundImageRegistryCredentials(app.imageName, app.secret)).toEqual({
      username: 'demo-user',
      password: 'real-password',
      serverAddress: 'registry.example.com'
    });

    const secret = yamlString2Objects(json2Secret(app))[0] as any;
    const dockerconfigjson = JSON.parse(
      Buffer.from(secret.data['.dockerconfigjson'], 'base64').toString()
    );
    expect(Object.keys(dockerconfigjson.auths)).toEqual(['registry.example.com/team']);
  });

  it('rejects credentials scoped to a sibling image repository path', () => {
    const app = createApp();
    app.imageName = 'registry.example.com/team/app:v1';
    app.secret = {
      use: true,
      username: 'demo-user',
      password: 'real-password',
      serverAddress: 'registry.example.com/other-team'
    };

    expect(() => json2Secret(app)).toThrow('registry credentials');
  });

  it('does not expose credentials to an image registry they are not bound to', () => {
    expect(
      getBoundImageRegistryCredentials('new-registry.example.com/team/app:v1', {
        use: true,
        username: 'demo-user',
        password: 'real-password',
        serverAddress: 'old-registry.example.com'
      })
    ).toBeUndefined();
  });

  it('uses the deployed image when editing a legacy private registry app', () => {
    expect(
      resolveAppImageName({
        deployedImage: 'hub.example.com/team/app:v1',
        originImageName: 'team/app:v1',
        usesPrivateRegistry: true
      })
    ).toBe('hub.example.com/team/app:v1');
  });
});
