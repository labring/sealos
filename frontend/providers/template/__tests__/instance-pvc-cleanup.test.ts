import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { legacyAppLabelKey, templateDeployKey } from '@/constants/keys';
import { deleteInstancePersistentVolumeClaims } from '@/services/backend/instanceDelete';

function createK8sMock(statefulSets: any[] = []) {
  return {
    namespace: 'ns-test',
    k8sApp: {
      listNamespacedStatefulSet: vi.fn().mockResolvedValue({
        body: {
          items: statefulSets
        }
      })
    },
    k8sCore: {
      deleteCollectionNamespacedPersistentVolumeClaim: vi.fn().mockResolvedValue({}),
      deleteNamespacedPersistentVolumeClaim: vi.fn().mockResolvedValue({})
    }
  } as any;
}

function expectStatefulSetModeLogged(
  consoleLogSpy: ReturnType<typeof vi.spyOn>,
  statefulSetName: string,
  inferredMode: string,
  extraFields: Record<string, unknown> = {}
) {
  expect(consoleLogSpy).toHaveBeenCalledWith(
    '[template pvc cleanup]',
    'statefulset identified',
    expect.objectContaining({
      statefulSetName,
      inferredMode,
      ...extraFields
    })
  );
}

function expectSelectorDelete(k8s: any, selector: string) {
  expect(k8s.k8sCore.deleteCollectionNamespacedPersistentVolumeClaim).toHaveBeenCalledWith(
    'ns-test',
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    selector
  );
}

describe('deleteInstancePersistentVolumeClaims', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deletes PVCs by instance label, legacy app labels, and inferred names', async () => {
    const k8s = createK8sMock([
      {
        metadata: {
          name: 'mysql'
        },
        spec: {
          replicas: 2,
          volumeClaimTemplates: [
            {
              metadata: {
                name: 'data'
              }
            }
          ]
        }
      }
    ]);

    await deleteInstancePersistentVolumeClaims(k8s, 'instance-a');

    expect(k8s.k8sApp.listNamespacedStatefulSet).toHaveBeenCalledWith(
      'ns-test',
      undefined,
      undefined,
      undefined,
      undefined,
      `${templateDeployKey}=instance-a`
    );
    expect(k8s.k8sCore.deleteCollectionNamespacedPersistentVolumeClaim).toHaveBeenCalledWith(
      'ns-test',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `${templateDeployKey}=instance-a`
    );
    expect(k8s.k8sCore.deleteCollectionNamespacedPersistentVolumeClaim).toHaveBeenCalledWith(
      'ns-test',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `${legacyAppLabelKey}=instance-a`
    );
    expect(k8s.k8sCore.deleteCollectionNamespacedPersistentVolumeClaim).toHaveBeenCalledWith(
      'ns-test',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `${legacyAppLabelKey}=mysql`
    );
    expect(k8s.k8sCore.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledWith(
      'data-mysql-0',
      'ns-test'
    );
    expect(k8s.k8sCore.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledWith(
      'data-mysql-1',
      'ns-test'
    );
  });

  it('handles legacy PVC cleanup mode with legacy app label and inferred PVC fallback', async () => {
    const k8s = createK8sMock([
      {
        metadata: {
          name: 'legacy-mysql'
        },
        spec: {
          volumeClaimTemplates: [{ metadata: { name: 'data' } }]
        }
      }
    ]);

    await deleteInstancePersistentVolumeClaims(k8s, 'instance-a');

    expectStatefulSetModeLogged(consoleLogSpy, 'legacy-mysql', 'legacy', {
      ownerReferenceReady: false,
      hasTemplateDeployLabelInVolumeClaimTemplates: false
    });
    expectSelectorDelete(k8s, `${templateDeployKey}=instance-a`);
    expectSelectorDelete(k8s, `${legacyAppLabelKey}=instance-a`);
    expectSelectorDelete(k8s, `${legacyAppLabelKey}=legacy-mysql`);
    expect(k8s.k8sCore.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledWith(
      'data-legacy-mysql-0',
      'ns-test'
    );
  });

  it('handles ownerReference-only PVC cleanup mode with legacy and inferred fallbacks', async () => {
    const k8s = createK8sMock([
      {
        metadata: {
          name: 'owner-only-mysql',
          ownerReferences: [{ name: 'instance-a' }]
        },
        spec: {
          volumeClaimTemplates: [{ metadata: { name: 'data' } }]
        }
      }
    ]);

    await deleteInstancePersistentVolumeClaims(k8s, 'instance-a');

    expectStatefulSetModeLogged(consoleLogSpy, 'owner-only-mysql', 'owner-reference-only', {
      ownerReferenceReady: true,
      hasTemplateDeployLabelInVolumeClaimTemplates: false
    });
    expectSelectorDelete(k8s, `${templateDeployKey}=instance-a`);
    expectSelectorDelete(k8s, `${legacyAppLabelKey}=instance-a`);
    expectSelectorDelete(k8s, `${legacyAppLabelKey}=owner-only-mysql`);
    expect(k8s.k8sCore.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledWith(
      'data-owner-only-mysql-0',
      'ns-test'
    );
  });

  it('handles labeled PVC cleanup mode with instance label first and compatibility fallbacks', async () => {
    const k8s = createK8sMock([
      {
        metadata: {
          name: 'labeled-mysql'
        },
        spec: {
          volumeClaimTemplates: [
            {
              metadata: {
                name: 'data',
                labels: {
                  [templateDeployKey]: 'instance-a'
                }
              }
            }
          ]
        }
      }
    ]);

    await deleteInstancePersistentVolumeClaims(k8s, 'instance-a');

    expectStatefulSetModeLogged(consoleLogSpy, 'labeled-mysql', 'labeled-pvc', {
      hasTemplateDeployLabelInVolumeClaimTemplates: true
    });
    expectSelectorDelete(k8s, `${templateDeployKey}=instance-a`);
    expectSelectorDelete(k8s, `${legacyAppLabelKey}=instance-a`);
    expectSelectorDelete(k8s, `${legacyAppLabelKey}=labeled-mysql`);
    expect(k8s.k8sCore.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledWith(
      'data-labeled-mysql-0',
      'ns-test'
    );
  });

  it('handles native retention PVC cleanup mode and still runs compatibility fallbacks', async () => {
    const k8s = createK8sMock([
      {
        metadata: {
          name: 'native-mysql'
        },
        spec: {
          persistentVolumeClaimRetentionPolicy: {
            whenDeleted: 'Delete'
          },
          volumeClaimTemplates: [{ metadata: { name: 'data' } }]
        }
      }
    ]);

    await deleteInstancePersistentVolumeClaims(k8s, 'instance-a');

    expectStatefulSetModeLogged(consoleLogSpy, 'native-mysql', 'native-retention', {
      retentionWhenDeleted: 'Delete'
    });
    expectSelectorDelete(k8s, `${templateDeployKey}=instance-a`);
    expectSelectorDelete(k8s, `${legacyAppLabelKey}=instance-a`);
    expectSelectorDelete(k8s, `${legacyAppLabelKey}=native-mysql`);
    expect(k8s.k8sCore.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledWith(
      'data-native-mysql-0',
      'ns-test'
    );
  });

  it('uses one replica by default and handles multiple StatefulSets and claim templates', async () => {
    const k8s = createK8sMock([
      {
        metadata: {
          name: 'mysql'
        },
        spec: {
          volumeClaimTemplates: [{ metadata: { name: 'data' } }, { metadata: { name: 'logs' } }]
        }
      },
      {
        metadata: {
          name: 'redis'
        },
        spec: {
          replicas: 2,
          volumeClaimTemplates: [{ metadata: { name: 'cache' } }]
        }
      }
    ]);

    await deleteInstancePersistentVolumeClaims(k8s, 'instance-a');

    expect(k8s.k8sCore.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledWith(
      'data-mysql-0',
      'ns-test'
    );
    expect(k8s.k8sCore.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledWith(
      'logs-mysql-0',
      'ns-test'
    );
    expect(k8s.k8sCore.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledWith(
      'cache-redis-0',
      'ns-test'
    );
    expect(k8s.k8sCore.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledWith(
      'cache-redis-1',
      'ns-test'
    );
  });

  it('ignores 404 errors while deleting inferred PVC names', async () => {
    const k8s = createK8sMock([
      {
        metadata: {
          name: 'mysql'
        },
        spec: {
          volumeClaimTemplates: [{ metadata: { name: 'data' } }]
        }
      }
    ]);
    k8s.k8sCore.deleteNamespacedPersistentVolumeClaim.mockRejectedValueOnce({
      body: {
        code: 404
      }
    });

    await expect(deleteInstancePersistentVolumeClaims(k8s, 'instance-a')).resolves.toBeUndefined();
  });

  it('throws non-404 errors while deleting inferred PVC names', async () => {
    const k8s = createK8sMock([
      {
        metadata: {
          name: 'mysql'
        },
        spec: {
          volumeClaimTemplates: [{ metadata: { name: 'data' } }]
        }
      }
    ]);
    const errorBody = {
      code: 500,
      message: 'delete failed'
    };
    k8s.k8sCore.deleteNamespacedPersistentVolumeClaim.mockRejectedValueOnce({
      body: errorBody
    });

    await expect(deleteInstancePersistentVolumeClaims(k8s, 'instance-a')).rejects.toBe(errorBody);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[template pvc cleanup]',
      'inferred pvc delete failed',
      expect.objectContaining({
        statefulSetName: 'mysql',
        pvcName: 'data-mysql-0',
        error: errorBody
      })
    );
  });

  it('throws non-404 errors while deleting PVCs by selector', async () => {
    const k8s = createK8sMock();
    const errorBody = {
      code: 403,
      message: 'forbidden'
    };
    k8s.k8sCore.deleteCollectionNamespacedPersistentVolumeClaim.mockRejectedValueOnce({
      body: errorBody
    });

    await expect(deleteInstancePersistentVolumeClaims(k8s, 'instance-a')).rejects.toBe(errorBody);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[template pvc cleanup]',
      'selector delete failed',
      expect.objectContaining({
        strategy: 'instance-label',
        selector: `${templateDeployKey}=instance-a`,
        error: errorBody
      })
    );
  });
});
