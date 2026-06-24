import { describe, expect, it } from 'vitest';
import type { AppEditType } from '@/types/app';
import { hydrateLegacyAppForm, hydrateLegacyAppFormData } from '@/utils/hydrateLegacyAppForm';
import {
  cpuMillicoresToQuantity,
  memoryMiToQuantity,
  storageGiToQuantity
} from '@/utils/resourceQuantity';

const createApp = (): AppEditType =>
  ({
    appName: 'demo',
    imageName: 'nginx:latest',
    runCMD: '',
    cmdParam: '',
    replicas: 1,
    cpu: cpuMillicoresToQuantity(100),
    memory: memoryMiToQuantity(128),
    networks: [],
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

describe('hydrateLegacyAppForm', () => {
  it('converts partial URL formData resources to Quantity values', () => {
    const formData = hydrateLegacyAppFormData({
      cpu: 2000,
      memory: '4096'
    } as unknown as Partial<AppEditType>);

    expect(formData.cpu?.toString()).toBe('2');
    expect(formData.memory?.toString()).toBe('4Gi');
  });

  it('converts legacy numeric resources to Quantity values', () => {
    const app = hydrateLegacyAppForm({
      ...createApp(),
      cpu: '500',
      memory: 1024,
      storeList: [
        {
          name: 'data',
          path: '/data',
          value: 2
        }
      ]
    } as unknown as AppEditType);

    expect(app.cpu.toString()).toBe('500m');
    expect(app.memory.toString()).toBe('1Gi');
    expect(app.storeList[0].value.toString()).toBe('2Gi');
  });

  it('keeps Quantity resources unchanged', () => {
    const cpu = cpuMillicoresToQuantity(300);
    const memory = memoryMiToQuantity(512);
    const storage = storageGiToQuantity(1);
    const app = hydrateLegacyAppForm({
      ...createApp(),
      cpu,
      memory,
      storeList: [
        {
          name: 'data',
          path: '/data',
          value: storage
        }
      ]
    });

    expect(app.cpu).toBe(cpu);
    expect(app.memory).toBe(memory);
    expect(app.storeList[0].value).toBe(storage);
  });
});
