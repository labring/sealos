import { afterEach, describe, expect, it } from 'vitest';
import {
  CreateLaunchpadRequestSchema as V1CreateLaunchpadRequestSchema,
  UpdateAppResourcesSchema as V1UpdateAppResourcesSchema,
  transformFromLegacySchema as transformFromLegacySchemaV1,
  transformToLegacySchema as transformToLegacySchemaV1
} from '@/types/request_schema';
import {
  CreateLaunchpadRequestSchema as V2CreateLaunchpadRequestSchema,
  UpdateAppResourcesSchema as V2UpdateAppResourcesSchema,
  transformFromLegacySchema as transformFromLegacySchemaV2,
  transformToLegacySchema as transformToLegacySchemaV2
} from '@/types/v2alpha/request_schema';
import {
  PUBLIC_DOMAIN_PREFIX_MAX_LENGTH,
  PUBLIC_DOMAIN_PREFIX_MIN_LENGTH
} from '@/utils/public-domain';

function setCustomPublicDomainPrefixEnabled(enabled: boolean) {
  (globalThis as any).AppConfig = {
    cloud: {
      domain: 'cloud.example.com'
    },
    launchpad: {
      publicDomain: {
        customPrefixEnabled: enabled,
        reservedPrefixes: []
      }
    }
  };
}

function createLegacyApp() {
  return {
    appName: 'demo',
    imageName: 'nginx:latest',
    secret: { use: false },
    runCMD: '',
    cmdParam: '',
    hpa: { use: false },
    replicas: 1,
    cpu: 200,
    memory: 512,
    networks: [
      {
        serviceName: 'service-demo',
        networkName: 'network-demo',
        portName: 'port-demo',
        port: 80,
        protocol: 'TCP',
        appProtocol: 'HTTP',
        openPublicDomain: true,
        publicDomain: 'demo-prefix',
        customDomain: '',
        domain: 'cloud.example.com',
        openNodePort: false
      }
    ],
    envs: [],
    configMapList: [],
    storeList: [],
    kind: 'deployment',
    id: 'demo-id',
    createTime: '2026-06-16 00:00',
    status: { value: 'Running' },
    openapi: {
      status: {
        observedGeneration: 1,
        replicas: 1,
        availableReplicas: 1,
        updatedReplicas: 1,
        isPause: false
      }
    }
  } as any;
}

describe('request schema publicDomain feature gate', () => {
  afterEach(() => {
    delete (globalThis as any).AppConfig;
  });

  it('omits v1 publicDomain prefixes from GET responses when custom prefixes are disabled', () => {
    setCustomPublicDomainPrefixEnabled(false);

    const response = transformFromLegacySchemaV1(createLegacyApp());

    expect(response.ports?.[0]).not.toHaveProperty('publicDomain');
    expect(
      V1UpdateAppResourcesSchema.safeParse({
        resource: { cpu: 0.2 },
        ports: response.ports
      }).success
    ).toBe(true);
  });

  it('omits v2alpha publicDomain prefixes from GET responses when custom prefixes are disabled', () => {
    setCustomPublicDomainPrefixEnabled(false);

    const response = transformFromLegacySchemaV2(createLegacyApp(), 'demo', 'ns-demo');

    expect(response.ports?.[0]).not.toHaveProperty('publicDomain');
    expect(
      V2UpdateAppResourcesSchema.safeParse({
        quota: { cpu: 0.2 },
        ports: response.ports
      }).success
    ).toBe(true);
  });

  it('still rejects explicit custom prefixes while the feature gate is disabled', () => {
    setCustomPublicDomainPrefixEnabled(false);

    expect(
      V1UpdateAppResourcesSchema.safeParse({
        ports: [{ portName: 'port-demo', publicDomain: 'demo-prefix' }]
      }).success
    ).toBe(false);
    expect(
      V2UpdateAppResourcesSchema.safeParse({
        ports: [{ portName: 'port-demo', publicDomain: 'demo-prefix' }]
      }).success
    ).toBe(false);
  });

  it('keeps publicDomain prefixes in responses when custom prefixes are enabled', () => {
    setCustomPublicDomainPrefixEnabled(true);

    expect(transformFromLegacySchemaV1(createLegacyApp()).ports?.[0]).toHaveProperty(
      'publicDomain',
      'demo-prefix'
    );
    expect(
      transformFromLegacySchemaV2(createLegacyApp(), 'demo', 'ns-demo').ports?.[0]
    ).toHaveProperty('publicDomain', 'demo-prefix');
  });

  it('returns the DNS label length range for invalid explicit prefixes', () => {
    setCustomPublicDomainPrefixEnabled(true);

    const tooLongPrefix = 'a'.repeat(PUBLIC_DOMAIN_PREFIX_MAX_LENGTH + 1);
    const expectedRange = `${PUBLIC_DOMAIN_PREFIX_MIN_LENGTH}-${PUBLIC_DOMAIN_PREFIX_MAX_LENGTH}`;
    const v1Result = V1UpdateAppResourcesSchema.safeParse({
      ports: [{ portName: 'port-demo', publicDomain: tooLongPrefix }]
    });
    const v2Result = V2UpdateAppResourcesSchema.safeParse({
      ports: [{ portName: 'port-demo', publicDomain: tooLongPrefix }]
    });

    expect(v1Result.success).toBe(false);
    if (!v1Result.success) {
      expect(v1Result.error.issues.map((issue) => issue.message).join('\n')).toContain(
        expectedRange
      );
    }

    expect(v2Result.success).toBe(false);
    if (!v2Result.success) {
      expect(v2Result.error.issues.map((issue) => issue.message).join('\n')).toContain(
        expectedRange
      );
    }
  });

  it('creates v1 HTTP ports with IP:port access mode as NodePort networks', () => {
    setCustomPublicDomainPrefixEnabled(false);

    const parsed = V1CreateLaunchpadRequestSchema.parse({
      name: 'demo',
      image: { imageName: 'nginx:latest' },
      resource: { replicas: 1, cpu: 0.2, memory: 0.5 },
      ports: [
        {
          number: 80,
          protocol: 'HTTP',
          accessMode: 'nodePort',
          exposesPublicDomain: true
        }
      ]
    });
    const legacy = transformToLegacySchemaV1(parsed);

    expect(legacy.networks[0]).toMatchObject({
      port: 80,
      protocol: 'TCP',
      appProtocol: 'HTTP',
      openPublicDomain: false,
      publicDomain: '',
      openNodePort: true
    });
  });

  it('creates v2alpha HTTP ports with IP:port access mode as NodePort networks', () => {
    setCustomPublicDomainPrefixEnabled(false);

    const parsed = V2CreateLaunchpadRequestSchema.parse({
      name: 'demo',
      image: { imageName: 'nginx:latest' },
      quota: { replicas: 1, cpu: 0.2, memory: 0.5 },
      ports: [
        {
          number: 80,
          protocol: 'http',
          accessMode: 'nodePort',
          isPublic: true
        }
      ]
    });
    const legacy = transformToLegacySchemaV2(parsed);

    expect(legacy.networks[0]).toMatchObject({
      port: 80,
      protocol: 'TCP',
      appProtocol: 'HTTP',
      openPublicDomain: false,
      publicDomain: '',
      openNodePort: true
    });
  });

  it('rejects publicDomain prefixes for IP:port access mode', () => {
    setCustomPublicDomainPrefixEnabled(true);

    expect(
      V1UpdateAppResourcesSchema.safeParse({
        ports: [
          {
            portName: 'port-demo',
            protocol: 'HTTP',
            accessMode: 'nodePort',
            publicDomain: 'demo-prefix'
          }
        ]
      }).success
    ).toBe(false);
    expect(
      V2UpdateAppResourcesSchema.safeParse({
        ports: [
          {
            portName: 'port-demo',
            protocol: 'http',
            accessMode: 'nodePort',
            publicDomain: 'demo-prefix'
          }
        ]
      }).success
    ).toBe(false);
  });

  it('rejects domain access mode for transport protocol ports', () => {
    setCustomPublicDomainPrefixEnabled(false);

    expect(
      V1CreateLaunchpadRequestSchema.safeParse({
        name: 'demo',
        image: { imageName: 'nginx:latest' },
        resource: { replicas: 1, cpu: 0.2, memory: 0.5 },
        ports: [
          {
            number: 80,
            protocol: 'TCP',
            accessMode: 'domain',
            exposesPublicDomain: true
          }
        ]
      }).success
    ).toBe(false);
    expect(
      V2CreateLaunchpadRequestSchema.safeParse({
        name: 'demo',
        image: { imageName: 'nginx:latest' },
        quota: { replicas: 1, cpu: 0.2, memory: 0.5 },
        ports: [
          {
            number: 80,
            protocol: 'tcp',
            accessMode: 'domain',
            isPublic: true
          }
        ]
      }).success
    ).toBe(false);
    expect(
      V1UpdateAppResourcesSchema.safeParse({
        ports: [{ portName: 'port-demo', protocol: 'TCP', accessMode: 'domain' }]
      }).success
    ).toBe(false);
    expect(
      V2UpdateAppResourcesSchema.safeParse({
        ports: [{ portName: 'port-demo', protocol: 'tcp', accessMode: 'domain' }]
      }).success
    ).toBe(false);
  });

  it('creates transport protocol ports without a synthetic HTTP appProtocol', () => {
    setCustomPublicDomainPrefixEnabled(false);

    const v1Legacy = transformToLegacySchemaV1(
      V1CreateLaunchpadRequestSchema.parse({
        name: 'demo',
        image: { imageName: 'nginx:latest' },
        resource: { replicas: 1, cpu: 0.2, memory: 0.5 },
        ports: [
          {
            number: 6379,
            protocol: 'TCP',
            accessMode: 'nodePort',
            exposesPublicDomain: false
          }
        ]
      })
    );
    const v2Legacy = transformToLegacySchemaV2(
      V2CreateLaunchpadRequestSchema.parse({
        name: 'demo',
        image: { imageName: 'nginx:latest' },
        quota: { replicas: 1, cpu: 0.2, memory: 0.5 },
        ports: [
          {
            number: 6379,
            protocol: 'tcp',
            accessMode: 'nodePort',
            isPublic: false
          }
        ]
      })
    );

    expect(v1Legacy.networks[0]).toMatchObject({
      protocol: 'TCP',
      appProtocol: undefined,
      openNodePort: true
    });
    expect(v2Legacy.networks[0]).toMatchObject({
      protocol: 'TCP',
      appProtocol: undefined,
      openNodePort: true
    });
  });
});
