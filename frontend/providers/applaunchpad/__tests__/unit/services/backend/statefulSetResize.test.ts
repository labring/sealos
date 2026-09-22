import { describe, expect, it, vi } from 'vitest';
import { V1LabelSelector } from '@kubernetes/client-node';
import { recreateStatefulSetForExpansion } from '@/services/backend/statefulSetResize';

function fixture() {
  const current: any = {
    metadata: { name: 'demo', namespace: 'test', uid: 'old', resourceVersion: '10' },
    spec: {
      serviceName: 'demo',
      selector: { matchLabels: { app: 'demo' } },
      replicas: 1,
      template: { metadata: { labels: { app: 'demo' } }, spec: { containers: [] } },
      volumeClaimTemplates: [
        {
          metadata: { name: 'data', annotations: { path: '/data', value: '1' } },
          spec: { accessModes: ['ReadWriteOnce'], resources: { requests: { storage: '1Gi' } } }
        }
      ]
    }
  };
  const desired = structuredClone(current);
  current.spec.selector = Object.assign(new V1LabelSelector(), current.spec.selector);
  desired.spec.volumeClaimTemplates[0].metadata.annotations.value = '2';
  desired.spec.volumeClaimTemplates[0].spec.resources.requests.storage = '2Gi';
  const api: any = {
    readNamespacedStatefulSet: vi
      .fn()
      .mockResolvedValueOnce({ body: current })
      .mockRejectedValue({ body: { code: 404 } }),
    replaceNamespacedStatefulSet: vi.fn().mockResolvedValue({}),
    deleteNamespacedStatefulSet: vi.fn().mockResolvedValue({}),
    createNamespacedStatefulSet: vi.fn().mockResolvedValue({})
  };
  return { current, desired, api };
}

describe('StatefulSet expansion', () => {
  it('validates mutable changes, orphans existing pods and recreates with the larger template', async () => {
    const { api, desired, current } = fixture();
    expect(await recreateStatefulSetForExpansion(api, 'test', 'demo', desired)).toBe(true);
    expect(api.replaceNamespacedStatefulSet).toHaveBeenCalledWith(
      'demo',
      'test',
      expect.objectContaining({
        spec: expect.objectContaining({ volumeClaimTemplates: current.spec.volumeClaimTemplates })
      }),
      undefined,
      'All'
    );
    expect(api.deleteNamespacedStatefulSet).toHaveBeenCalledWith(
      'demo',
      'test',
      undefined,
      undefined,
      undefined,
      undefined,
      'Orphan',
      { preconditions: { uid: 'old', resourceVersion: '10' } }
    );
    const created = api.createNamespacedStatefulSet.mock.calls[0][1];
    expect(created.spec.volumeClaimTemplates[0].spec.resources.requests.storage).toBe('2Gi');
    expect(created.metadata.uid).toBeUndefined();
    expect(created.metadata.resourceVersion).toBeUndefined();
  });

  it.each(['shrink', 'storage-class', 'selector'])(
    'does not recreate for %s changes',
    async (change) => {
      const { api, desired } = fixture();
      if (change === 'shrink')
        desired.spec.volumeClaimTemplates[0].spec.resources.requests.storage = '500Mi';
      if (change === 'storage-class')
        desired.spec.volumeClaimTemplates[0].spec.storageClassName = 'other';
      if (change === 'selector') desired.spec.selector.matchLabels.app = 'other';
      expect(await recreateStatefulSetForExpansion(api, 'test', 'demo', desired)).toBe(false);
      expect(api.deleteNamespacedStatefulSet).not.toHaveBeenCalled();
    }
  );

  it('does not delete when validation fails', async () => {
    const { api, desired } = fixture();
    api.replaceNamespacedStatefulSet.mockRejectedValue(new Error('validation failed'));
    await expect(recreateStatefulSetForExpansion(api, 'test', 'demo', desired)).rejects.toThrow(
      'validation failed'
    );
    expect(api.deleteNamespacedStatefulSet).not.toHaveBeenCalled();
  });

  it('restores the original controller if creation fails', async () => {
    const { api, desired } = fixture();
    api.createNamespacedStatefulSet.mockRejectedValueOnce(new Error('create failed'));
    await expect(recreateStatefulSetForExpansion(api, 'test', 'demo', desired)).rejects.toThrow(
      'create failed'
    );
    expect(api.createNamespacedStatefulSet).toHaveBeenCalledTimes(2);
    expect(
      api.createNamespacedStatefulSet.mock.calls[1][1].spec.volumeClaimTemplates[0].spec.resources
        .requests.storage
    ).toBe('1Gi');
  });
});
