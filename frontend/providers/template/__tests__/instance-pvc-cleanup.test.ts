import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { legacyAppLabelKey, templateDeployKey } from '@/constants/keys';
import {
  deleteInstancePersistentVolumeClaims,
  deleteOwnerReferencedInstance,
  legacyDeleteInstanceAll
} from '@/services/backend/instanceDelete';
import * as operations from '@/services/backend/operations';

vi.mock('@/services/backend/operations', () => ({
  deleteInstance: vi.fn(),
  deleteStatefulSet: vi.fn(),
  getAppLaunchpad: vi.fn().mockResolvedValue([]),
  deleteAppLaunchpad: vi.fn().mockResolvedValue({}),
  getDatabases: vi.fn().mockResolvedValue([]),
  deleteDatabase: vi.fn(),
  getAppCRs: vi.fn().mockResolvedValue([]),
  deleteAppCR: vi.fn(),
  getDevboxes: vi.fn().mockResolvedValue([]),
  deleteCustomResource: vi.fn(),
  getJobs: vi.fn().mockResolvedValue([]),
  deleteJob: vi.fn(),
  getSecrets: vi.fn().mockResolvedValue([]),
  deleteSecret: vi.fn(),
  getConfigMaps: vi.fn().mockResolvedValue([]),
  deleteConfigMap: vi.fn(),
  getRoles: vi.fn().mockResolvedValue([]),
  deleteRole: vi.fn(),
  getRoleBindings: vi.fn().mockResolvedValue([]),
  deleteRoleBinding: vi.fn(),
  getServiceAccounts: vi.fn().mockResolvedValue([]),
  deleteServiceAccount: vi.fn(),
  getCertIssuers: vi.fn().mockResolvedValue([]),
  deleteCertIssuer: vi.fn(),
  deleteCertificate: vi.fn(),
  deleteHorizontalPodAutoscaler: vi.fn(),
  getPrometheusRules: vi.fn().mockResolvedValue([]),
  deletePrometheusRule: vi.fn(),
  getPrometheuses: vi.fn().mockResolvedValue([]),
  deletePrometheus: vi.fn(),
  getServiceMonitors: vi.fn().mockResolvedValue([]),
  deleteServiceMonitor: vi.fn(),
  getProbes: vi.fn().mockResolvedValue([]),
  deleteProbe: vi.fn(),
  getServices: vi.fn().mockResolvedValue([]),
  deleteService: vi.fn()
}));

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
    k8sBatch: {
      listNamespacedCronJob: vi.fn().mockResolvedValue({ body: { items: [] } })
    },
    k8sAutoscaling: {
      listNamespacedHorizontalPodAutoscaler: vi.fn().mockResolvedValue({ body: { items: [] } })
    },
    k8sCustomObjects: {
      listNamespacedCustomObject: vi.fn().mockResolvedValue({ body: { items: [] } })
    },
    k8sCore: {
      deleteCollectionNamespacedPersistentVolumeClaim: vi.fn().mockResolvedValue({}),
      deleteNamespacedPersistentVolumeClaim: vi.fn().mockResolvedValue({})
    },
    k8sAuth: {
      listNamespacedRole: vi.fn().mockResolvedValue({ body: { items: [] } }),
      listNamespacedRoleBinding: vi.fn().mockResolvedValue({ body: { items: [] } })
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

  it('handles labeled PVC cleanup mode with instance label only', async () => {
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
    expect(k8s.k8sCore.deleteCollectionNamespacedPersistentVolumeClaim).toHaveBeenCalledTimes(1);
    expect(k8s.k8sCore.deleteNamespacedPersistentVolumeClaim).not.toHaveBeenCalled();
  });

  it('keeps instance legacy label fallback when no StatefulSets are found by instance label', async () => {
    const k8s = createK8sMock();

    await deleteInstancePersistentVolumeClaims(k8s, 'instance-a');

    expectSelectorDelete(k8s, `${templateDeployKey}=instance-a`);
    expectSelectorDelete(k8s, `${legacyAppLabelKey}=instance-a`);
    expect(k8s.k8sCore.deleteCollectionNamespacedPersistentVolumeClaim).toHaveBeenCalledTimes(2);
    expect(k8s.k8sCore.deleteNamespacedPersistentVolumeClaim).not.toHaveBeenCalled();
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

describe('template instance deletion ordering', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(operations.deleteInstance).mockResolvedValue(undefined);
    vi.mocked(operations.deleteStatefulSet).mockResolvedValue(undefined);
    vi.mocked(operations.getAppLaunchpad).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('foreground deletes owner-referenced StatefulSets before cleaning PVCs', async () => {
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

    await deleteOwnerReferencedInstance(k8s, 'instance-a');

    expect(k8s.k8sApp.listNamespacedStatefulSet).toHaveBeenCalledWith(
      'ns-test',
      undefined,
      undefined,
      undefined,
      undefined,
      `${templateDeployKey}=instance-a`
    );
    expect(operations.deleteStatefulSet).toHaveBeenCalledWith(k8s.k8sApp, 'ns-test', 'mysql');
    expect(k8s.k8sCore.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledWith(
      'data-mysql-0',
      'ns-test'
    );
    expect(vi.mocked(operations.deleteStatefulSet).mock.invocationCallOrder[0]).toBeLessThan(
      k8s.k8sCore.deleteNamespacedPersistentVolumeClaim.mock.invocationCallOrder[0]
    );
    expect(vi.mocked(operations.deleteInstance).mock.invocationCallOrder[0]).toBeGreaterThan(
      k8s.k8sCore.deleteNamespacedPersistentVolumeClaim.mock.invocationCallOrder[0]
    );
  });

  it('foreground deletes legacy AppLaunchpad StatefulSets before final PVC cleanup', async () => {
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
    vi.mocked(operations.getAppLaunchpad).mockResolvedValue([{ metadata: { name: 'mysql' } }]);

    await legacyDeleteInstanceAll(k8s, 'instance-a');

    expect(operations.deleteAppLaunchpad).toHaveBeenCalledWith(k8s, 'ns-test', 'mysql');
    expect(k8s.k8sCore.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledWith(
      'data-mysql-0',
      'ns-test'
    );
    expect(vi.mocked(operations.deleteAppLaunchpad).mock.invocationCallOrder[0]).toBeLessThan(
      k8s.k8sCore.deleteNamespacedPersistentVolumeClaim.mock.invocationCallOrder[0]
    );
  });

  void consoleLogSpy;
  void consoleErrorSpy;
});
