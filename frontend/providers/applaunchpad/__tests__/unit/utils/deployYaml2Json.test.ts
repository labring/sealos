import { describe, expect, it } from 'vitest';
import { json2Ingress, yamlString2Objects } from '@/utils/deployYaml2Json';
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

    expect(objects[0].spec.rules[0].host).toBe(
      'codex-ms100066-launch.192.168.13.29.nip.io'
    );
    expect(objects[0].spec.tls[0].hosts).toEqual([
      'codex-ms100066-launch.192.168.13.29.nip.io'
    ]);
    expect(objects[2].spec.dnsNames).toEqual([
      'codex-ms100066-launch.192.168.13.29.nip.io'
    ]);
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
});
