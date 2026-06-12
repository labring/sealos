import { describe, expect, it } from 'vitest';
import { Quantity } from '@sealos/shared';
import { transformFromLegacySchema, transformToLegacySchema } from '@/types/request_schema';
import {
  transformFromLegacySchema as transformFromLegacySchemaV2,
  transformToLegacySchema as transformToLegacySchemaV2
} from '@/types/v2alpha/request_schema';
import type { AppDetailType } from '@/types/app';

const baseV1Request = {
  name: 'demo',
  image: { imageName: 'nginx' },
  launchCommand: {},
  resource: {
    replicas: 1,
    cpu: 0.5,
    memory: 1
  },
  ports: [],
  env: [],
  storage: [],
  configMap: []
};

const baseV2Request = {
  name: 'demo',
  image: { imageName: 'nginx' },
  launchCommand: {},
  quota: {
    replicas: 1,
    cpu: 0.5,
    memory: 1
  },
  ports: [],
  env: [],
  storage: [],
  configMap: []
};

const baseDetail = {
  appName: 'demo',
  imageName: 'nginx',
  runCMD: '',
  cmdParam: '',
  replicas: 1,
  cpu: Quantity.parse('500m'),
  memory: Quantity.parse('1Gi'),
  networks: [],
  envs: [],
  hpa: {
    use: false,
    target: 'cpu',
    value: 50,
    minReplicas: 1,
    maxReplicas: 5
  },
  secret: {
    use: false,
    username: '',
    password: '',
    serverAddress: 'docker.io'
  },
  configMapList: [],
  storeList: [],
  labels: {},
  volumes: [],
  volumeMounts: [],
  kind: 'deployment',
  id: 'uid',
  createTime: '2024-01-01 00:00',
  status: {
    label: 'Running',
    value: 'running',
    color: '',
    backgroundColor: '',
    dotColor: ''
  },
  isPause: false,
  usedCpu: { name: '', xData: [], yData: [] },
  usedMemory: { name: '', xData: [], yData: [] },
  crYamlList: [],
  source: {
    hasSource: false,
    sourceName: '',
    sourceType: 'app_store'
  },
  openapi: {
    status: {
      observedGeneration: 1,
      replicas: 1,
      availableReplicas: 1,
      updatedReplicas: 1,
      isPause: false
    }
  }
} satisfies AppDetailType;

describe('v1 public schema transforms', () => {
  it('converts public numeric resources into internal Quantity values', () => {
    const legacy = transformToLegacySchema(baseV1Request);

    expect(legacy.cpu.toString()).toBe('500m');
    expect(legacy.memory.toString()).toBe('1Gi');
  });

  it('converts internal Quantity resources back to public numbers', () => {
    const response = transformFromLegacySchema(baseDetail);

    expect(response.resource.cpu).toBe(0.5);
    expect(response.resource.memory).toBe(1);
  });
});

describe('v2alpha public schema transforms', () => {
  it('converts public numeric quota into internal Quantity values', () => {
    const legacy = transformToLegacySchemaV2(baseV2Request);

    expect(legacy.cpu.toString()).toBe('500m');
    expect(legacy.memory.toString()).toBe('1Gi');
  });

  it('converts internal Quantity quota back to public numbers', () => {
    const response = transformFromLegacySchemaV2(baseDetail);

    expect(response.quota.cpu).toBe(0.5);
    expect(response.quota.memory).toBe(1);
  });
});
