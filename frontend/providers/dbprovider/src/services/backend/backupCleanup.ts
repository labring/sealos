import * as k8s from '@kubernetes/client-node';

const dataProtectionGroup = 'dataprotection.kubeblocks.io';
const dataProtectionVersion = 'v1alpha1';
const backupRepoNameLabel = 'dataprotection.kubeblocks.io/backup-repo-name';

type K8sObjectList = {
  items?: unknown[];
};

type BackupObject = {
  metadata?: {
    labels?: Record<string, string>;
  };
  status?: {
    persistentVolumeClaimName?: string;
  };
};

type BackupCleanupInfo = {
  pvcName?: string;
  repoName?: string;
};

type DeleteBackupParams = {
  backupName: string;
  k8sCore: k8s.CoreV1Api;
  k8sCustomObjects: k8s.CustomObjectsApi;
  namespace: string;
};

type WaitBackupDeletedOptions = {
  maxAttempts?: number;
  intervalMs?: number;
};

const isNotFoundError = (err: any) =>
  err?.response?.statusCode === 404 ||
  err?.statusCode === 404 ||
  err?.body?.code === 404 ||
  err?.body?.reason === 'NotFound';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getBackupCleanupInfo({
  backupName,
  k8sCustomObjects,
  namespace
}: Omit<DeleteBackupParams, 'k8sCore'>): Promise<BackupCleanupInfo> {
  try {
    const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
      dataProtectionGroup,
      dataProtectionVersion,
      namespace,
      'backups',
      backupName
    )) as { body: BackupObject };

    return {
      pvcName: body.status?.persistentVolumeClaimName,
      repoName: body.metadata?.labels?.[backupRepoNameLabel]
    };
  } catch (err) {
    if (isNotFoundError(err)) return {};
    throw err;
  }
}

async function waitBackupDeleted({
  backupName,
  k8sCustomObjects,
  namespace,
  maxAttempts = 180,
  intervalMs = 1000
}: Omit<DeleteBackupParams, 'k8sCore'> & WaitBackupDeletedOptions) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await k8sCustomObjects.getNamespacedCustomObject(
        dataProtectionGroup,
        dataProtectionVersion,
        namespace,
        'backups',
        backupName
      );
    } catch (err) {
      if (isNotFoundError(err)) return true;
      throw err;
    }
    await wait(intervalMs);
  }

  return false;
}

async function hasDataProtectionObjects({
  k8sCustomObjects,
  namespace,
  plural,
  repoName
}: Pick<DeleteBackupParams, 'k8sCustomObjects' | 'namespace'> & {
  plural: 'backups' | 'restores';
  repoName: string;
}) {
  const { body } = (await k8sCustomObjects.listNamespacedCustomObject(
    dataProtectionGroup,
    dataProtectionVersion,
    namespace,
    plural,
    undefined,
    undefined,
    undefined,
    undefined,
    `${backupRepoNameLabel}=${repoName}`
  )) as { body: K8sObjectList };

  return Boolean(body.items?.length);
}

async function cleanupBackupRepoPVC({
  k8sCore,
  k8sCustomObjects,
  namespace,
  pvcName,
  repoName
}: Pick<DeleteBackupParams, 'k8sCore' | 'k8sCustomObjects' | 'namespace'> & {
  pvcName?: string;
  repoName: string;
}) {
  const [hasBackups, hasRestores] = await Promise.all([
    hasDataProtectionObjects({ k8sCustomObjects, namespace, plural: 'backups', repoName }),
    hasDataProtectionObjects({ k8sCustomObjects, namespace, plural: 'restores', repoName })
  ]);

  if (hasBackups || hasRestores) return;

  if (pvcName) {
    try {
      const { body: pvc } = await k8sCore.readNamespacedPersistentVolumeClaim(pvcName, namespace);
      const ownedByBackupRepo = pvc.metadata?.ownerReferences?.some(
        (owner) => owner.kind === 'BackupRepo' && owner.name === repoName
      );

      if (ownedByBackupRepo && pvc.metadata?.labels?.[backupRepoNameLabel] === repoName) {
        await k8sCore.deleteNamespacedPersistentVolumeClaim(pvcName, namespace);
      }
    } catch (err) {
      if (!isNotFoundError(err)) throw err;
    }
    return;
  }

  const { body } = await k8sCore.listNamespacedPersistentVolumeClaim(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    `${backupRepoNameLabel}=${repoName}`
  );

  await Promise.all(
    (body.items || []).map(async (pvc) => {
      const name = pvc.metadata?.name;
      const ownedByBackupRepo = pvc.metadata?.ownerReferences?.some(
        (owner) => owner.kind === 'BackupRepo' && owner.name === repoName
      );

      if (!name || !ownedByBackupRepo) return;

      try {
        await k8sCore.deleteNamespacedPersistentVolumeClaim(name, namespace);
      } catch (err) {
        if (!isNotFoundError(err)) throw err;
      }
    })
  );
}

async function cleanupBackupRepoPVCAfterBackupDeleted({
  backupName,
  k8sCore,
  k8sCustomObjects,
  namespace,
  pvcName,
  repoName
}: DeleteBackupParams & BackupCleanupInfo & { repoName: string }) {
  const backupDeleted = await waitBackupDeleted({ backupName, k8sCustomObjects, namespace });
  if (!backupDeleted) return;

  await cleanupBackupRepoPVC({ k8sCore, k8sCustomObjects, namespace, pvcName, repoName });
}

export async function deleteBackupAndCleanupRepoPVC({
  backupName,
  k8sCore,
  k8sCustomObjects,
  namespace
}: DeleteBackupParams) {
  const { pvcName, repoName } = await getBackupCleanupInfo({
    backupName,
    k8sCustomObjects,
    namespace
  });

  const result = await k8sCustomObjects.deleteNamespacedCustomObject(
    dataProtectionGroup,
    dataProtectionVersion,
    namespace,
    'backups',
    backupName
  );

  if (!repoName) return result;

  cleanupBackupRepoPVCAfterBackupDeleted({
    backupName,
    k8sCore,
    k8sCustomObjects,
    namespace,
    pvcName,
    repoName
  }).catch((err) => {
    console.error('Failed to cleanup backup repo PVC', err?.body || err);
  });

  return result;
}
