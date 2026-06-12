import { describe, expect, it } from 'vitest';
import { json2DeployCr, json2Ingress, yamlString2Objects } from '@/utils/deployYaml2Json';
import type { AppEditType } from '@/types/app';
import { deployPVCResizeKey } from '@/constants/app';
import {
  cpuMillicoresToQuantity,
  memoryMiToQuantity,
  storageGiToQuantity
} from '@/utils/resourceQuantity';

const createApp = (customDomain = ''): AppEditType =>
  ({
    appName: 'demo',
    imageName: 'nginx:latest',
    runCMD: '',
    cmdParam: '',
    replicas: 1,
    cpu: cpuMillicoresToQuantity(100),
    memory: memoryMiToQuantity(128),
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
  const userDomains = [{ name: 'cloud.example.com', secretName: 'wildcard-cert' }];

  it('keeps tls and custom domain cert-manager resources in https mode', () => {
    const objects = yamlString2Objects(
      json2Ingress(createApp('custom.example.com'), userDomains, {
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
      json2Ingress(createApp('custom.example.com'), userDomains, {
        disableHttps: true
      })
    ) as any[];

    expect(objects.map((item) => item.kind)).toEqual(['Ingress']);
    expect(objects[0].spec.tls).toBeUndefined();
    expect(
      objects[0].metadata.annotations['nginx.ingress.kubernetes.io/ssl-redirect']
    ).toBeUndefined();
  });
});

describe('json2DeployCr', () => {
  it('emits Quantity CPU and memory limits with 10 percent requests', () => {
    const objects = yamlString2Objects(
      json2DeployCr(
        {
          ...createApp(),
          cpu: cpuMillicoresToQuantity(500),
          memory: memoryMiToQuantity(1024)
        },
        'deployment'
      )
    ) as any[];

    const resources = objects[0].spec.template.spec.containers[0].resources;

    expect(resources.limits.cpu).toBe('500m');
    expect(resources.requests.cpu).toBe('50m');
    expect(resources.limits.memory).toBe('1Gi');
    expect(resources.requests.memory).toBe('102Mi');
  });

  it('emits PVC storage from Quantity values', () => {
    const objects = yamlString2Objects(
      json2DeployCr(
        {
          ...createApp(),
          storeList: [
            {
              name: 'data',
              path: '/data',
              value: storageGiToQuantity(2)
            }
          ],
          kind: 'statefulset'
        },
        'statefulset'
      )
    ) as any[];

    const template = objects[0].spec.volumeClaimTemplates[0];

    expect(template.metadata.annotations.value).toBe('2Gi');
    expect(template.spec.resources.requests.storage).toBe('2Gi');
    expect(objects[0].metadata.annotations[deployPVCResizeKey]).toBe('2Gi');
  });
});
