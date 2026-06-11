import type {
  AppsV1Api,
  AutoscalingV2Api,
  CoreV1Api,
  CustomObjectsApi,
  KubernetesObject
} from '@kubernetes/client-node';
import type { IncomingMessage } from 'http';

import {
  legacyAppLabelKey,
  ownerReferencesKey,
  ownerReferencesReadyValue,
  templateDeployKey
} from '@/constants/keys';
import type { TemplateInstanceType } from '@/types/app';
import { getK8s } from '@/services/backend/kubernetes';
import * as operations from '@/services/backend/operations';

type AnyResource = { metadata?: { name?: string } } & Record<string, any>;
type StatefulSetResource = KubernetesObject & {
  spec?: {
    replicas?: number;
    persistentVolumeClaimRetentionPolicy?: {
      whenDeleted?: string;
    };
    volumeClaimTemplates?: Array<{
      metadata?: {
        name?: string;
        labels?: Record<string, string>;
      };
    }>;
  };
};
type StatefulSetPvcCleanupMode =
  | 'legacy'
  | 'owner-reference-only'
  | 'labeled-pvc'
  | 'native-retention';
type StatefulSetPvcCleanupTarget = {
  statefulSet: StatefulSetResource;
  statefulSetName: string;
  mode: StatefulSetPvcCleanupMode;
};

const pvcCleanupLogPrefix = '[template pvc cleanup]';

async function deleteResourcesBatch<T extends AnyResource>(
  resourcesPromise: Promise<T[]>,
  deleteOperation: (name: string) => Promise<any>,
  errorMessage: string
): Promise<void> {
  const resourceNames = await resourcesPromise
    .then((resources) =>
      resources
        .map((item) => item?.metadata?.name)
        .filter((name): name is string => typeof name === 'string' && name.length > 0)
    )
    .catch((error) => {
      if (error?.statusCode === 404) return [];
      throw error;
    });

  const deleteResults = await Promise.allSettled(
    resourceNames.map((name) => deleteOperation(name))
  );

  for (const result of deleteResults) {
    if (result.status === 'rejected' && +result?.reason?.body?.code !== 404) {
      throw result?.reason?.body || result?.reason || new Error(errorMessage);
    }
  }
}

export function isInstanceOwnerReferencesReady(instance: TemplateInstanceType): boolean {
  const labels = (instance as any)?.metadata?.labels as Record<string, string> | undefined;
  return labels?.[ownerReferencesKey] === ownerReferencesReadyValue;
}

export async function getInstanceOrThrow404(
  api: CustomObjectsApi,
  namespace: string,
  instanceName: string
): Promise<TemplateInstanceType> {
  return operations.getInstance(api, namespace, instanceName);
}

export async function deleteInstanceOnly(
  api: CustomObjectsApi,
  namespace: string,
  instanceName: string
): Promise<void> {
  await operations.deleteInstance(api, namespace, instanceName);
}

export async function deleteOwnerReferencedInstance(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  instanceName: string
): Promise<void> {
  const ns = k8s.namespace;
  const statefulSets = await listStatefulSetsByInstance(k8s.k8sApp, ns, instanceName).catch(
    (error) => {
      if (isK8sNotFound(error)) return [];
      throw error;
    }
  );

  await deleteResourcesBatch(
    Promise.resolve(statefulSets),
    (name: string) => operations.deleteStatefulSet(k8s.k8sApp, ns, name),
    'An error occurred whilst deleting StatefulSets.'
  );
  await deleteInstancePersistentVolumeClaims(k8s, instanceName, statefulSets);
  await deleteInstanceOnly(k8s.k8sCustomObjects, ns, instanceName);
}

export async function legacyDeletePersistentVolumeClaimsOnly(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  instanceName: string
): Promise<void> {
  await deleteInstancePersistentVolumeClaims(k8s, instanceName);
}

function isK8sNotFound(error: any): boolean {
  return +error?.body?.code === 404 || +error?.code === 404 || +error?.statusCode === 404;
}

function getK8sErrorBody(error: any, fallbackMessage: string): unknown {
  return error?.body || error || new Error(fallbackMessage);
}

async function listStatefulSetsByInstance(
  api: AppsV1Api,
  namespace: string,
  instanceName: string
): Promise<StatefulSetResource[]> {
  const selector = `${templateDeployKey}=${instanceName}`;
  const result = await api.listNamespacedStatefulSet(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    selector
  );

  return (result.body?.items ?? []) as StatefulSetResource[];
}

async function deletePersistentVolumeClaimsBySelector(
  api: CoreV1Api,
  namespace: string,
  selector: string,
  strategy: string
): Promise<void> {
  console.log(pvcCleanupLogPrefix, 'selector delete', { strategy, selector });

  try {
    await api.deleteCollectionNamespacedPersistentVolumeClaim(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      selector
    );
  } catch (error: any) {
    if (isK8sNotFound(error)) return;

    console.error(pvcCleanupLogPrefix, 'selector delete failed', {
      strategy,
      selector,
      error: getK8sErrorBody(error, 'An error occurred whilst deleting PersistentVolumeClaims.')
    });
    throw getK8sErrorBody(error, 'An error occurred whilst deleting PersistentVolumeClaims.');
  }
}

async function deletePersistentVolumeClaimByName(
  api: CoreV1Api,
  namespace: string,
  statefulSetName: string,
  pvcName: string
): Promise<void> {
  console.log(pvcCleanupLogPrefix, 'inferred pvc delete', { statefulSetName, pvcName });

  try {
    await api.deleteNamespacedPersistentVolumeClaim(pvcName, namespace);
  } catch (error: any) {
    if (isK8sNotFound(error)) return;

    console.error(pvcCleanupLogPrefix, 'inferred pvc delete failed', {
      statefulSetName,
      pvcName,
      error: getK8sErrorBody(error, 'An error occurred whilst deleting PersistentVolumeClaims.')
    });
    throw getK8sErrorBody(error, 'An error occurred whilst deleting PersistentVolumeClaims.');
  }
}

function inferStatefulSetPvcCleanupMode(
  statefulSet: StatefulSetResource,
  instanceName: string
): StatefulSetPvcCleanupMode {
  const volumeClaimTemplates = statefulSet.spec?.volumeClaimTemplates ?? [];
  const hasTemplateDeployLabelInVolumeClaimTemplates =
    volumeClaimTemplates.length > 0 &&
    volumeClaimTemplates.every(
      (template) => template.metadata?.labels?.[templateDeployKey] === instanceName
    );
  const hasOwnerReference = (statefulSet.metadata?.ownerReferences ?? []).length > 0;
  const retentionWhenDeleted = statefulSet.spec?.persistentVolumeClaimRetentionPolicy?.whenDeleted;

  if (retentionWhenDeleted === 'Delete') return 'native-retention';
  if (hasTemplateDeployLabelInVolumeClaimTemplates) return 'labeled-pvc';
  if (hasOwnerReference) return 'owner-reference-only';
  return 'legacy';
}

export async function deleteInstancePersistentVolumeClaims(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  instanceName: string,
  knownStatefulSets?: StatefulSetResource[]
): Promise<void> {
  const ns = k8s.namespace;

  console.log(pvcCleanupLogPrefix, 'cleanup start', { instanceName, namespace: ns });

  const statefulSets =
    knownStatefulSets ??
    (await listStatefulSetsByInstance(k8s.k8sApp, ns, instanceName).catch((error) => {
      if (isK8sNotFound(error)) return [];
      throw error;
    }));

  // ? PVC cleanup modes:
  // * 1. legacy: resources do not have Instance ownerReference.
  // * 2. ownerReference only: resources are owned by Instance, but StatefulSet PVCs lack templateDeployKey.
  // * 3. labeled PVC: volumeClaimTemplates/PVCs carry templateDeployKey and can be deleted by instance label.
  // * 4. native retention: StatefulSet uses persistentVolumeClaimRetentionPolicy.whenDeleted=Delete.

  // [TODO] Migrate instance creation to mode 4 in the future.
  // ? Ref: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#persistentvolumeclaim-retention

  const statefulSetCleanupTargets: StatefulSetPvcCleanupTarget[] = [];

  for (const statefulSet of statefulSets) {
    const statefulSetName = statefulSet.metadata?.name ?? '';
    const volumeClaimTemplates = statefulSet.spec?.volumeClaimTemplates ?? [];
    const volumeClaimTemplateNames = volumeClaimTemplates
      .map((template) => template.metadata?.name)
      .filter((name): name is string => typeof name === 'string' && name.length > 0);
    const hasTemplateDeployLabelInVolumeClaimTemplates =
      volumeClaimTemplates.length > 0 &&
      volumeClaimTemplates.every(
        (template) => template.metadata?.labels?.[templateDeployKey] === instanceName
      );
    const retentionWhenDeleted =
      statefulSet.spec?.persistentVolumeClaimRetentionPolicy?.whenDeleted;

    const inferredMode = inferStatefulSetPvcCleanupMode(statefulSet, instanceName);

    console.log(pvcCleanupLogPrefix, 'statefulset identified', {
      statefulSetName,
      ownerReferenceReady: (statefulSet.metadata?.ownerReferences ?? []).length > 0,
      retentionWhenDeleted,
      hasTemplateDeployLabelInVolumeClaimTemplates,
      volumeClaimTemplateNames,
      inferredMode
    });

    if (!statefulSetName) continue;
    statefulSetCleanupTargets.push({
      statefulSet,
      statefulSetName,
      mode: inferredMode
    });
  }

  await deletePersistentVolumeClaimsBySelector(
    k8s.k8sCore,
    ns,
    `${templateDeployKey}=${instanceName}`,
    'instance-label'
  );

  const needsLegacyPvcFallbacks =
    statefulSetCleanupTargets.some(({ mode }) => mode !== 'labeled-pvc') ||
    statefulSetCleanupTargets.length === 0;

  if (!needsLegacyPvcFallbacks) return;

  // Legacy fallback for old Applaunchpad-style PVCs that were labeled by application name.
  await deletePersistentVolumeClaimsBySelector(
    k8s.k8sCore,
    ns,
    `${legacyAppLabelKey}=${instanceName}`,
    'legacy-app-label-instance'
  );

  for (const { statefulSet, statefulSetName, mode } of statefulSetCleanupTargets) {
    if (mode === 'labeled-pvc') continue;

    // Legacy fallback for component-level StatefulSet PVCs, for example `app=mysql`.
    await deletePersistentVolumeClaimsBySelector(
      k8s.k8sCore,
      ns,
      `${legacyAppLabelKey}=${statefulSetName}`,
      'legacy-app-label-statefulset'
    );

    const replicas = statefulSet.spec?.replicas ?? 1;
    const volumeClaimTemplateNames = (statefulSet.spec?.volumeClaimTemplates ?? [])
      .map((template) => template.metadata?.name)
      .filter((name): name is string => typeof name === 'string' && name.length > 0);

    for (const claimTemplateName of volumeClaimTemplateNames) {
      for (let ordinal = 0; ordinal < replicas; ordinal++) {
        await deletePersistentVolumeClaimByName(
          k8s.k8sCore,
          ns,
          statefulSetName,
          `${claimTemplateName}-${statefulSetName}-${ordinal}`
        );
      }
    }
  }
}

async function listObjectStorageBucketsByInstance(
  api: CustomObjectsApi,
  namespace: string,
  instanceName: string
): Promise<{ metadata: { name: string } }[]> {
  const selector = `${templateDeployKey}=${instanceName}`;
  const result = (await api.listNamespacedCustomObject(
    'objectstorage.sealos.io',
    'v1',
    namespace,
    'objectstoragebuckets',
    undefined,
    undefined,
    undefined,
    undefined,
    selector
  )) as { response: IncomingMessage; body: { items: AnyResource[] } };
  return (result.body?.items ?? []) as any;
}

async function listCronJobsByInstance(
  api: Awaited<ReturnType<typeof getK8s>>['k8sBatch'],
  namespace: string,
  instanceName: string
): Promise<{ metadata: { name: string } }[]> {
  const selector = `${templateDeployKey}=${instanceName}`;
  const result = await api.listNamespacedCronJob(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    selector
  );
  return (result.body?.items ?? []) as any;
}

async function listCertificatesByInstance(
  api: CustomObjectsApi,
  namespace: string,
  instanceName: string
): Promise<{ metadata: { name: string } }[]> {
  const selector = `${templateDeployKey}=${instanceName}`;
  const result = (await api.listNamespacedCustomObject(
    'cert-manager.io',
    'v1',
    namespace,
    'certificates',
    undefined,
    undefined,
    undefined,
    undefined,
    selector
  )) as { response: IncomingMessage; body: { items: AnyResource[] } };
  return (result.body?.items ?? []) as any;
}

async function listHorizontalPodAutoscalersByInstance(
  api: AutoscalingV2Api,
  namespace: string,
  instanceName: string
): Promise<{ metadata: { name: string } }[]> {
  const selector = `${templateDeployKey}=${instanceName}`;
  const result = await api.listNamespacedHorizontalPodAutoscaler(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    selector
  );
  return (result.body?.items ?? []) as any;
}

/**
 * Legacy deletion (label-selector based) for instances without ownerReferences.
 *
 * IMPORTANT: This is intentionally comprehensive and should mirror (and extend) the resource
 * categories currently shown on the Instance detail page.
 *
 * @deprecated Use new ownerReference based deletion approach instead!
 */
export async function legacyDeleteInstanceAll(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  instanceName: string
): Promise<void> {
  const ns = k8s.namespace;
  const statefulSets = await listStatefulSetsByInstance(k8s.k8sApp, ns, instanceName).catch(
    (error) => {
      if (isK8sNotFound(error)) return [];
      throw error;
    }
  );

  // Workloads and applaunchpad dependents
  await deleteResourcesBatch(
    operations.getAppLaunchpad(k8s.k8sApp, ns, instanceName),
    (name: string) => operations.deleteAppLaunchpad(k8s, ns, name),
    'An error occurred whilst deleting App Launchpad.'
  );

  // Databases (and their backups/dependents)
  await deleteResourcesBatch(
    operations.getDatabases(k8s.k8sCustomObjects, ns, instanceName),
    (name: string) => operations.deleteDatabase(k8s, ns, name),
    'An error occurred whilst deleting Databases.'
  );

  // App CR
  await deleteResourcesBatch(
    operations.getAppCRs(k8s.k8sCustomObjects, ns, instanceName),
    (name: string) => operations.deleteAppCR(k8s.k8sCustomObjects, ns, name),
    'An error occurred whilst deleting App CR.'
  );

  // ObjectStorageBucket
  await deleteResourcesBatch(
    listObjectStorageBucketsByInstance(k8s.k8sCustomObjects, ns, instanceName),
    (name: string) => operations.deleteObjectStorage(k8s.k8sCustomObjects, ns, name),
    'An error occurred whilst deleting Object Storage.'
  );

  // Devbox (custom resource)
  await deleteResourcesBatch(
    operations.getDevboxes(k8s.k8sCustomObjects, ns, instanceName),
    (name: string) =>
      operations.deleteCustomResource(
        k8s.k8sCustomObjects,
        ns,
        name,
        'Devbox',
        'devbox.sealos.io',
        'v1alpha1'
      ),
    'An error occurred whilst deleting Devboxes.'
  );

  // CronJobs
  await deleteResourcesBatch(
    listCronJobsByInstance(k8s.k8sBatch, ns, instanceName),
    (name: string) => operations.deleteCronJob(k8s.k8sBatch, ns, name),
    'An error occurred whilst deleting CronJobs.'
  );

  // Jobs
  await deleteResourcesBatch(
    operations.getJobs(k8s.k8sBatch, ns, instanceName),
    (name: string) => operations.deleteJob(k8s.k8sBatch, ns, name),
    'An error occurred whilst deleting Jobs.'
  );

  // Secrets
  await deleteResourcesBatch(
    operations.getSecrets(k8s.k8sCore, ns, instanceName),
    (name: string) => operations.deleteSecret(k8s.k8sCore, ns, name),
    'An error occurred whilst deleting Secrets.'
  );

  // ConfigMaps
  await deleteResourcesBatch(
    operations.getConfigMaps(k8s.k8sCore, ns, instanceName),
    (name: string) => operations.deleteConfigMap(k8s.k8sCore, ns, name),
    'An error occurred whilst deleting ConfigMaps.'
  );

  // RBAC
  await deleteResourcesBatch(
    operations.getRoles(k8s.k8sAuth, ns, instanceName),
    (name: string) => operations.deleteRole(k8s.k8sAuth, ns, name),
    'An error occurred whilst deleting Roles.'
  );
  await deleteResourcesBatch(
    operations.getRoleBindings(k8s.k8sAuth, ns, instanceName),
    (name: string) => operations.deleteRoleBinding(k8s.k8sAuth, ns, name),
    'An error occurred whilst deleting RoleBindings.'
  );
  await deleteResourcesBatch(
    operations.getServiceAccounts(k8s.k8sCore, ns, instanceName),
    (name: string) => operations.deleteServiceAccount(k8s.k8sCore, ns, name),
    'An error occurred whilst deleting ServiceAccounts.'
  );

  // Cert-manager resources (instance-level)
  await deleteResourcesBatch(
    operations.getCertIssuers(k8s.k8sCustomObjects, ns, instanceName),
    (name: string) => operations.deleteCertIssuer(k8s.k8sCustomObjects, ns, name),
    'An error occurred whilst deleting CertIssuers.'
  );
  await deleteResourcesBatch(
    listCertificatesByInstance(k8s.k8sCustomObjects, ns, instanceName),
    (name: string) => operations.deleteCertificate(k8s.k8sCustomObjects, ns, name),
    'An error occurred whilst deleting Certificates.'
  );

  // HPA (instance-level)
  await deleteResourcesBatch(
    listHorizontalPodAutoscalersByInstance(k8s.k8sAutoscaling, ns, instanceName),
    (name: string) => operations.deleteHorizontalPodAutoscaler(k8s.k8sAutoscaling, ns, name),
    'An error occurred whilst deleting HorizontalPodAutoscalers.'
  );

  // PVC
  await deleteInstancePersistentVolumeClaims(k8s, instanceName, statefulSets);

  // Monitoring (Prometheus Operator)
  await deleteResourcesBatch(
    operations.getPrometheusRules(k8s.k8sCustomObjects, ns, instanceName),
    (name: string) => operations.deletePrometheusRule(k8s.k8sCustomObjects, ns, name),
    'An error occurred whilst deleting PrometheusRules.'
  );
  await deleteResourcesBatch(
    operations.getPrometheuses(k8s.k8sCustomObjects, ns, instanceName),
    (name: string) => operations.deletePrometheus(k8s.k8sCustomObjects, ns, name),
    'An error occurred whilst deleting Prometheuses.'
  );
  await deleteResourcesBatch(
    operations.getServiceMonitors(k8s.k8sCustomObjects, ns, instanceName),
    (name: string) => operations.deleteServiceMonitor(k8s.k8sCustomObjects, ns, name),
    'An error occurred whilst deleting ServiceMonitors.'
  );
  await deleteResourcesBatch(
    operations.getProbes(k8s.k8sCustomObjects, ns, instanceName),
    (name: string) => operations.deleteProbe(k8s.k8sCustomObjects, ns, name),
    'An error occurred whilst deleting Probes.'
  );

  // Services
  await deleteResourcesBatch(
    operations.getServices(k8s.k8sCore, ns, instanceName),
    (name: string) => operations.deleteService(k8s.k8sCore, ns, name),
    'An error occurred whilst deleting Services.'
  );
}
