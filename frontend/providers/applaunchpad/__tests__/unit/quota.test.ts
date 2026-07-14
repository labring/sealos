import { readFileSync } from 'fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getUserQuota } from '@/api/platform';
import { defaultEditVal } from '@/constants/editApp';
import { getUserQuota as getKubernetesUserQuota } from '@/services/backend/kubernetes';
import { useUserStore } from '@/store/user';
import type { AppEditType } from '@/types/app';

vi.mock('@/api/platform', () => ({
  getResourcePrice: vi.fn(),
  getUserQuota: vi.fn()
}));

const getUserQuotaMock = vi.mocked(getUserQuota);

const createAppRequest = (overrides: Partial<AppEditType> = {}): AppEditType => ({
  ...defaultEditVal,
  gpu: { ...defaultEditVal.gpu! },
  hpa: { ...defaultEditVal.hpa },
  networks: defaultEditVal.networks.map((network) => ({ ...network })),
  storeList: [],
  ...overrides
});

describe('useUserStore quota guard', () => {
  beforeEach(() => {
    getUserQuotaMock.mockReset();
    useUserStore.setState({ userQuota: [] });
  });

  it('refreshes quota before checking a create request', async () => {
    useUserStore.setState({
      userQuota: [{ type: 'cpu', used: 0, limit: 100 }]
    });
    getUserQuotaMock.mockResolvedValue({
      quota: [{ type: 'cpu', used: 1.5, limit: 2 }]
    });

    const result = await useUserStore.getState().checkQuotaAllow(
      createAppRequest({
        cpu: 1000,
        replicas: 1
      })
    );

    expect(getUserQuotaMock).toHaveBeenCalledOnce();
    expect(result).toBe('app.The applied CPU exceeds the quota');
  });

  it('allows a request that exactly consumes the available quota', async () => {
    getUserQuotaMock.mockResolvedValue({
      quota: [{ type: 'cpu', used: 1.5, limit: 2 }]
    });

    const result = await useUserStore.getState().checkQuotaAllow(
      createAppRequest({
        cpu: 500,
        replicas: 1
      })
    );

    expect(result).toBe('');
  });

  it('checks ephemeral storage across the maximum replica count', async () => {
    getUserQuotaMock.mockResolvedValue({
      quota: [{ type: 'ephemeral-storage', used: 1, limit: 4 }]
    });

    const result = await useUserStore.getState().checkQuotaAllow(
      createAppRequest({
        ephemeralStorage: 2,
        hpa: {
          ...defaultEditVal.hpa,
          use: true,
          maxReplicas: 2
        }
      })
    );

    expect(result).toBe('app.The applied ephemeral storage exceeds the quota');
  });

  it('checks only the additional ephemeral storage when updating an app', async () => {
    getUserQuotaMock.mockResolvedValue({
      quota: [{ type: 'ephemeral-storage', used: 3, limit: 4 }]
    });
    const hpa = {
      ...defaultEditVal.hpa,
      use: true,
      maxReplicas: 2
    };

    const result = await useUserStore
      .getState()
      .checkQuotaAllow(
        createAppRequest({ ephemeralStorage: 3, hpa }),
        createAppRequest({ ephemeralStorage: 2.5, hpa })
      );

    expect(result).toBe('');
  });

  it('does not fall back to stale quota when refreshing quota fails', async () => {
    useUserStore.setState({
      userQuota: [{ type: 'cpu', used: 0, limit: 100 }]
    });
    getUserQuotaMock.mockRejectedValue(new Error('quota unavailable'));

    await expect(
      useUserStore.getState().checkQuotaAllow(createAppRequest({ cpu: 1000, replicas: 1 }))
    ).rejects.toThrow('quota unavailable');
  });
});

describe('getUserQuota', () => {
  it('omits undeclared resources while retaining explicit zero quotas', async () => {
    const readNamespacedResourceQuota = vi.fn().mockResolvedValue({
      body: {
        status: {
          hard: {
            'limits.cpu': '2',
            'services.nodeports': '0'
          },
          used: {
            'limits.cpu': '500m',
            'services.nodeports': '0'
          }
        }
      }
    });
    const kubeConfig = {
      makeApiClient: vi.fn(() => ({ readNamespacedResourceQuota }))
    };

    const result = await getKubernetesUserQuota(kubeConfig as any, 'ns-test');

    expect(result).toEqual([
      { type: 'cpu', limit: 2, used: 0.5 },
      { type: 'nodeports', limit: 0, used: 0 }
    ]);
  });
});

describe('quota form state', () => {
  it('uses the per-PVC cap when workspace storage quota is undeclared', () => {
    const source = readFileSync(
      new URL('../../src/pages/app/edit/components/Form.tsx', import.meta.url),
      'utf8'
    );

    expect(source).toContain('if (!storageQuota) return PVC_STORAGE_MAX;');
  });
});
