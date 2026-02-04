import type { AutoscalingV2Api, CustomObjectsApi } from '@kubernetes/client-node';
import type { IncomingMessage } from 'http';

import { ownerReferencesKey, ownerReferencesReadyValue, templateDeployKey } from '@/constants/keys';
import type { TemplateInstanceType } from '@/types/app';
import { getK8s } from '@/services/backend/kubernetes';
import * as operations from '@/services/backend/operations';

type AnyResource = { metadata?: { name?: string } } & Record<string, any>;

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
 * IMPORTANT: This is intentionally comprehensive and should mirror the resource categories
 * currently shown on the Instance detail page.
 */
export async function legacyDeleteInstanceAll(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  instanceName: string
): Promise<void> {
  const ns = k8s.namespace;

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
  await deleteResourcesBatch(
    operations.getPersistentVolumeClaims(k8s.k8sCore, ns, instanceName),
    (name: string) => operations.deletePersistentVolumeClaim(k8s.k8sCore, ns, name),
    'An error occurred whilst deleting PersistentVolumeClaims.'
  );

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
