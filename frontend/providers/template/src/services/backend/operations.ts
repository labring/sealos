import {
  AppsV1Api,
  BatchV1Api,
  CustomObjectsApi,
  V1CronJob,
  CoreV1Api,
  RbacAuthorizationV1Api,
  NetworkingV1Api,
  AutoscalingV2Api
} from '@kubernetes/client-node';
import { CRDMeta, getK8s } from './kubernetes';
import { TemplateInstanceType } from '@/types/app';
import { templateDeployKey, dbProviderKey, deployManagerKey, appDeployKey } from '@/constants/keys';
import { adaptAppListItem, adaptCronJobList, adaptObjectStorageItem } from '@/utils/adapt';
import { DBListItemType } from '@/types/db';
import { ObjectStorageCR } from '@/types/objectStorage';
import { IncomingMessage } from 'http';
import pluralize from 'pluralize';

export async function getInstance(api: CustomObjectsApi, namespace: string, instanceName: string) {
  const InstanceCRD: CRDMeta = {
    group: 'app.sealos.io',
    version: 'v1',
    namespace: namespace,
    plural: 'instances'
  };

  const result = await api.getNamespacedCustomObject(
    InstanceCRD.group,
    InstanceCRD.version,
    InstanceCRD.namespace,
    InstanceCRD.plural,
    instanceName
  );

  return result.body as TemplateInstanceType;
}

export async function getObjectStorage(
  api: CustomObjectsApi,
  namespace: string,
  instanceName: string
) {
  const labelSelectorKey = `${templateDeployKey}=${instanceName}`;

  const result = await api.listNamespacedCustomObject(
    'objectstorage.sealos.io',
    'v1',
    namespace,
    'objectstoragebuckets',
    undefined,
    undefined,
    undefined,
    undefined,
    labelSelectorKey
  );

  const data = (((result.body as any)?.items ?? []) as ObjectStorageCR[])?.map(
    adaptObjectStorageItem
  );
  return data;
}

export async function getCronJobs(api: BatchV1Api, namespace: string, instanceName: string) {
  const labelSelectorKey = `${templateDeployKey}=${instanceName}`;

  const result = await api.listNamespacedCronJob(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    labelSelectorKey
  );

  const data = (((result.body as any)?.items as V1CronJob[]) ?? []).map(adaptCronJobList);

  return data;
}

export async function getSecrets(api: CoreV1Api, namespace: string, instanceName: string) {
  const labelSelector = `${templateDeployKey}=${instanceName}`;

  const result = await api.listNamespacedSecret(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    labelSelector
  );

  return result.body.items;
}

export async function getJobs(api: BatchV1Api, namespace: string, instanceName: string) {
  const labelSelector = `${templateDeployKey}=${instanceName}`;

  const result = await api.listNamespacedJob(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    labelSelector
  );

  return result.body.items;
}

export async function getCertIssuers(
  api: CustomObjectsApi,
  namespace: string,
  instanceName: string
) {
  const labelSelector = `${templateDeployKey}=${instanceName}`;

  const result = (await api.listNamespacedCustomObject(
    'cert-manager.io',
    'v1',
    namespace,
    'issuers',
    undefined,
    undefined,
    undefined,
    undefined,
    labelSelector
  )) as {
    response: IncomingMessage;
    body: {
      items: { kind?: string }[];
      kind: 'IssuerList';
    };
  };

  return result.body.items.map((item) => ({
    ...item,
    kind: item.kind ? item.kind : result.body.kind.replace('List', '')
  }));
}

export async function getAppCRs(api: CustomObjectsApi, namespace: string, instanceName: string) {
  const labelSelector = `${templateDeployKey}=${instanceName}`;

  const appCRD: CRDMeta = {
    group: 'app.sealos.io',
    version: 'v1',
    namespace: namespace,
    plural: 'apps'
  };

  const result = (await api.listNamespacedCustomObject(
    appCRD.group,
    appCRD.version,
    appCRD.namespace,
    appCRD.plural,
    undefined,
    undefined,
    undefined,
    undefined,
    labelSelector
  )) as {
    response: IncomingMessage;
    body: {
      items: { kind?: string }[];
      kind: 'AppList';
    };
  };

  return result.body.items.map((item) => ({
    ...item,
    kind: item.kind ? item.kind : result.body.kind.replace('List', '')
  }));
}

export async function getRoles(
  api: RbacAuthorizationV1Api,
  namespace: string,
  instanceName: string
) {
  const labelSelector = `${templateDeployKey}=${instanceName}`;

  const result = await api.listNamespacedRole(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    `${labelSelector},!${dbProviderKey}`
  );

  return result.body.items;
}

export async function getRoleBindings(
  api: RbacAuthorizationV1Api,
  namespace: string,
  instanceName: string
) {
  const labelSelector = `${templateDeployKey}=${instanceName}`;

  const result = await api.listNamespacedRoleBinding(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    `${labelSelector},!${dbProviderKey}`
  );

  return result.body.items;
}

export async function getServiceAccounts(api: CoreV1Api, namespace: string, instanceName: string) {
  const labelSelector = `${templateDeployKey}=${instanceName}`;

  const result = await api.listNamespacedServiceAccount(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    `${labelSelector},!${dbProviderKey}`
  );

  return result.body.items;
}

export async function getConfigMaps(api: CoreV1Api, namespace: string, instanceName: string) {
  const labelSelector = `${templateDeployKey}=${instanceName}`;

  const result = await api.listNamespacedConfigMap(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    `${labelSelector},!${dbProviderKey},!${deployManagerKey}`
  );

  return result.body.items;
}

export async function getPrometheusRules(
  api: CustomObjectsApi,
  namespace: string,
  instanceName: string
) {
  const labelSelector = `${templateDeployKey}=${instanceName}`;

  const result = (await api.listNamespacedCustomObject(
    'monitoring.coreos.com',
    'v1',
    namespace,
    'prometheusrules',
    undefined,
    undefined,
    undefined,
    undefined,
    labelSelector
  )) as {
    response: IncomingMessage;
    body: {
      items: { kind?: string }[];
      kind: 'PromehteusRuleList';
    };
  };

  return result.body.items.map((item) => ({
    ...item,
    kind: item.kind ? item.kind : result.body.kind.replace('List', '')
  }));
}

export async function getPrometheuses(
  api: CustomObjectsApi,
  namespace: string,
  instanceName: string
) {
  const labelSelector = `${templateDeployKey}=${instanceName}`;

  const result = (await api.listNamespacedCustomObject(
    'monitoring.coreos.com',
    'v1',
    namespace,
    'prometheuses',
    undefined,
    undefined,
    undefined,
    undefined,
    labelSelector
  )) as {
    response: IncomingMessage;
    body: {
      items: { kind?: string }[];
      kind: 'PromehteusList';
    };
  };

  return result.body.items.map((item) => ({
    ...item,
    kind: item.kind ? item.kind : result.body.kind.replace('List', '')
  }));
}

export async function getPersistentVolumeClaims(
  api: CoreV1Api,
  namespace: string,
  instanceName: string
) {
  const labelSelector = `${templateDeployKey}=${instanceName}`;

  const result = await api.listNamespacedPersistentVolumeClaim(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    labelSelector
  );

  return result.body.items;
}

export async function getServiceMonitors(
  api: CustomObjectsApi,
  namespace: string,
  instanceName: string
) {
  const labelSelector = `${templateDeployKey}=${instanceName}`;

  const result = (await api.listNamespacedCustomObject(
    'monitoring.coreos.com',
    'v1',
    namespace,
    'servicemonitors',
    undefined,
    undefined,
    undefined,
    undefined,
    labelSelector
  )) as {
    response: IncomingMessage;
    body: {
      items: { kind?: string }[];
      kind: 'ServiceMonitorList';
    };
  };

  return result.body.items.map((item) => ({
    ...item,
    kind: item.kind ? item.kind : result.body.kind.replace('List', '')
  }));
}

export async function getProbes(api: CustomObjectsApi, namespace: string, instanceName: string) {
  const labelSelector = `${templateDeployKey}=${instanceName}`;

  const result = (await api.listNamespacedCustomObject(
    'monitoring.coreos.com',
    'v1',
    namespace,
    'probes',
    undefined,
    undefined,
    undefined,
    undefined,
    labelSelector
  )) as {
    response: IncomingMessage;
    body: {
      items: { kind?: string }[];
      kind: 'ProbeList';
    };
  };

  return result.body.items.map((item) => ({
    ...item,
    kind: item.kind ? item.kind : result.body.kind.replace('List', '')
  }));
}

export async function getServices(api: CoreV1Api, namespace: string, instanceName: string) {
  const labelSelector = `${templateDeployKey}=${instanceName}`;

  const result = await api.listNamespacedService(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    labelSelector
  );

  return result.body.items;
}

export async function getDevboxes(api: CustomObjectsApi, namespace: string, instanceName: string) {
  const labelSelector = `${templateDeployKey}=${instanceName}`;

  const result = (await api.listNamespacedCustomObject(
    'devbox.sealos.io',
    'v1alpha1',
    namespace,
    'devboxes',
    undefined,
    undefined,
    undefined,
    undefined,
    labelSelector
  )) as {
    response: IncomingMessage;
    body: {
      items: { kind?: string }[];
      kind: 'DevboxList';
    };
  };

  return result.body.items.map((item) => ({
    ...item,
    kind: item.kind ? item.kind : result.body.kind.replace('List', '')
  }));
}

export async function getDatabaseBackups(
  api: CustomObjectsApi,
  namespace: string,
  databaseName: string
) {
  const group = 'dataprotection.kubeblocks.io';
  const version = 'v1alpha1';
  const plural = 'backups';
  const labelSelector = `${templateDeployKey}=${databaseName}`;

  const result = await api.listNamespacedCustomObject(
    group,
    version,
    namespace,
    plural,
    undefined,
    undefined,
    undefined,
    undefined,
    labelSelector
  );

  return (result.body as any).items;
}

// Deletion operations

export async function deleteInstance(
  api: CustomObjectsApi,
  namespace: string,
  instanceName: string
) {
  const InstanceCRD: CRDMeta = {
    group: 'app.sealos.io',
    version: 'v1',
    namespace: namespace,
    plural: 'instances'
  };

  await api.deleteNamespacedCustomObject(
    InstanceCRD.group,
    InstanceCRD.version,
    InstanceCRD.namespace,
    InstanceCRD.plural,
    instanceName
  );
}

export async function deleteAppCR(api: CustomObjectsApi, namespace: string, resourceName: string) {
  const customResource: CRDMeta = {
    group: 'app.sealos.io',
    version: 'v1',
    namespace: namespace,
    plural: 'apps'
  };

  await api.deleteNamespacedCustomObject(
    customResource.group,
    customResource.version,
    customResource.namespace,
    customResource.plural,
    resourceName
  );
}

export async function deleteCronJob(api: BatchV1Api, namespace: string, resourceName: string) {
  await api.deleteNamespacedCronJob(resourceName, namespace);
}

export async function deleteSecret(api: CoreV1Api, namespace: string, resourceName: string) {
  await api.deleteNamespacedSecret(resourceName, namespace);
}

export async function deleteConfigMap(api: CoreV1Api, namespace: string, resourceName: string) {
  await api.deleteNamespacedConfigMap(resourceName, namespace);
}

export async function deleteJob(api: BatchV1Api, namespace: string, resourceName: string) {
  const deleteOptions = {
    propagationPolicy: 'Foreground'
  };

  await api.deleteNamespacedJob(
    resourceName,
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    deleteOptions.propagationPolicy,
    deleteOptions
  );
}

export async function deleteCertIssuer(
  api: CustomObjectsApi,
  namespace: string,
  resourceName: string
) {
  const customResource: CRDMeta = {
    group: 'cert-manager.io',
    version: 'v1',
    namespace: namespace,
    plural: 'issuers'
  };

  await api.deleteNamespacedCustomObject(
    customResource.group,
    customResource.version,
    customResource.namespace,
    customResource.plural,
    resourceName
  );
}

export async function deleteCertificate(
  api: CustomObjectsApi,
  namespace: string,
  resourceName: string
) {
  await api.deleteNamespacedCustomObject(
    'cert-manager.io',
    'v1',
    namespace,
    'certificates',
    resourceName
  );
}

export async function deleteRole(
  api: RbacAuthorizationV1Api,
  namespace: string,
  resourceName: string
) {
  await api.deleteNamespacedRole(resourceName, namespace);
}

export async function deleteRoleBinding(
  api: RbacAuthorizationV1Api,
  namespace: string,
  resourceName: string
) {
  await api.deleteNamespacedRoleBinding(resourceName, namespace);
}

export async function deleteServiceAccount(
  api: CoreV1Api,
  namespace: string,
  resourceName: string
) {
  await api.deleteNamespacedServiceAccount(resourceName, namespace);
}

export async function deletePersistentVolumeClaim(
  api: CoreV1Api,
  namespace: string,
  resourceName: string
) {
  await api.deleteNamespacedPersistentVolumeClaim(resourceName, namespace);
}

export async function deleteService(api: CoreV1Api, namespace: string, resourceName: string) {
  await api.deleteNamespacedService(resourceName, namespace);
}

export async function deleteHorizontalPodAutoscaler(
  api: AutoscalingV2Api,
  namespace: string,
  resourceName: string
) {
  await api.deleteNamespacedHorizontalPodAutoscaler(resourceName, namespace);
}

export async function deleteDatabaseBackup(
  api: CustomObjectsApi,
  namespace: string,
  resourceName: string
) {
  const group = 'dataprotection.kubeblocks.io';
  const version = 'v1alpha1';
  const plural = 'backups';

  await api.deleteNamespacedCustomObject(group, version, namespace, plural, resourceName);
}

export async function deleteDeployment(api: AppsV1Api, namespace: string, resourceName: string) {
  await api.deleteNamespacedDeployment(resourceName, namespace);
}

export async function deleteStatefulSet(api: AppsV1Api, namespace: string, resourceName: string) {
  await api.deleteNamespacedStatefulSet(resourceName, namespace);
}

export async function deleteCustomResource(
  api: CustomObjectsApi,
  namespace: string,
  instanceName: string,
  kind: string,
  group: string,
  version: string
) {
  const plural = pluralize.plural(kind.toLocaleLowerCase());
  await api.deleteNamespacedCustomObject(group, version, namespace, plural, instanceName);
}

export async function deleteObjectStorage(
  api: CustomObjectsApi,
  namespace: string,
  resourceName: string
) {
  await api.deleteNamespacedCustomObject(
    'objectstorage.sealos.io',
    'v1',
    namespace,
    'objectstoragebuckets',
    resourceName
  );
}

export async function deletePrometheusRule(
  api: CustomObjectsApi,
  namespace: string,
  resourceName: string
) {
  await api.deleteNamespacedCustomObject(
    'monitoring.coreos.com',
    'v1',
    namespace,
    'prometheusrules',
    resourceName
  );
}

export async function deletePrometheus(
  api: CustomObjectsApi,
  namespace: string,
  resourceName: string
) {
  await api.deleteNamespacedCustomObject(
    'monitoring.coreos.com',
    'v1',
    namespace,
    'prometheuses',
    resourceName
  );
}

export async function deleteServiceMonitor(
  api: CustomObjectsApi,
  namespace: string,
  resourceName: string
) {
  await api.deleteNamespacedCustomObject(
    'monitoring.coreos.com',
    'v1',
    namespace,
    'servicemonitors',
    resourceName
  );
}

export async function deleteProbe(api: CustomObjectsApi, namespace: string, resourceName: string) {
  await api.deleteNamespacedCustomObject(
    'monitoring.coreos.com',
    'v1',
    namespace,
    'probes',
    resourceName
  );
}

// App level operations

export async function getCertIssuersInApp(
  api: CustomObjectsApi,
  namespace: string,
  appName: string
) {
  const result = await api.listNamespacedCustomObject(
    'cert-manager.io',
    'v1',
    namespace,
    'issuers',
    undefined,
    undefined,
    undefined,
    undefined,
    `${appDeployKey}=${appName}`
  );

  return (result.body as any).items;
}

export async function getCertificatesInApp(
  api: CustomObjectsApi,
  namespace: string,
  appName: string
) {
  const result = await api.listNamespacedCustomObject(
    'cert-manager.io',
    'v1',
    namespace,
    'certificates',
    undefined,
    undefined,
    undefined,
    undefined,
    `${appDeployKey}=${appName}`
  );

  return (result.body as any).items;
}

export async function deleteServicesInApp(api: CoreV1Api, namespace: string, appName: string) {
  await api.deleteCollectionNamespacedService(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    `${appDeployKey}=${appName}`
  );
}

export async function deleteIngressesInApp(
  api: NetworkingV1Api,
  namespace: string,
  appName: string
) {
  await api.deleteCollectionNamespacedIngress(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    `${appDeployKey}=${appName}`
  );
}

export async function deletePersistentVolumeClaimsInApp(
  api: CoreV1Api,
  namespace: string,
  appName: string
) {
  await api.deleteCollectionNamespacedPersistentVolumeClaim(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    // ! Why `app` here?
    `app=${appName}`
  );
}

// Resource with dependents

export async function getAppLaunchpad(api: AppsV1Api, namespace: string, instanceName: string) {
  const labelSelectorKey = `${templateDeployKey}=${instanceName}`;

  const response = await Promise.allSettled([
    api.listNamespacedDeployment(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelectorKey
    ),
    api.listNamespacedStatefulSet(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelectorKey
    )
  ]);

  const apps = response
    .filter((item) => item.status === 'fulfilled')
    .map((item: any) => item?.value?.body?.items)
    .filter((item) => item)
    .flat();

  const data = apps;
  return data;
}

export async function deleteAppLaunchpad(
  apis: Awaited<ReturnType<typeof getK8s>>,
  namespace: string,
  resourceName: string
) {
  const issuers = await getCertIssuersInApp(apis.k8sCustomObjects, namespace, resourceName);
  const certificates = await getCertificatesInApp(apis.k8sCustomObjects, namespace, resourceName);

  const delDependentResult = await Promise.allSettled([
    deleteServicesInApp(apis.k8sCore, namespace, resourceName),
    deleteConfigMap(apis.k8sCore, namespace, resourceName),
    deleteSecret(apis.k8sCore, namespace, resourceName),
    deleteIngressesInApp(apis.k8sNetworkingApp, namespace, resourceName),
    ...issuers.map((item: any) =>
      deleteCertIssuer(apis.k8sCustomObjects, namespace, item.metadata.name)
    ),
    ...certificates.map((item: any) =>
      deleteCertificate(apis.k8sCustomObjects, namespace, item.metadata.name)
    ),
    deletePersistentVolumeClaimsInApp(apis.k8sCore, namespace, resourceName),
    deleteHorizontalPodAutoscaler(apis.k8sAutoscaling, namespace, resourceName)
  ]);

  // Throw if any operation failed
  delDependentResult.forEach((result) => {
    if (result.status === 'rejected' && +result?.reason?.body?.code !== 404) {
      throw new Error('Error deleting App Launchpad dependent resources', {
        cause: result?.reason
      });
    }
  });

  const delAppLaunchpadResult = await Promise.allSettled([
    deleteDeployment(apis.k8sApp, namespace, resourceName),
    deleteStatefulSet(apis.k8sApp, namespace, resourceName)
  ]);

  delAppLaunchpadResult.forEach((result) => {
    if (result.status === 'rejected' && +result?.reason?.body?.code !== 404) {
      throw new Error('Error deleting App Launchpad', {
        cause: result?.reason
      });
    }
  });
}

export async function getDatabases(api: CustomObjectsApi, namespace: string, instanceName: string) {
  const labelSelectorKey = `${templateDeployKey}=${instanceName}`;

  const result = await api.listNamespacedCustomObject(
    'apps.kubeblocks.io',
    'v1alpha1',
    namespace,
    'clusters',
    undefined,
    undefined,
    undefined,
    undefined,
    labelSelectorKey
  );

  return ((result.body as any)?.items as DBListItemType[]) ?? [];
}

export async function deleteDatabase(
  apis: Awaited<ReturnType<typeof getK8s>>,
  namespace: string,
  resourceName: string
) {
  // Delete all backups
  const backups = await getDatabaseBackups(apis.k8sCustomObjects, namespace, resourceName);
  await Promise.all(
    backups.map((item: any) =>
      deleteDatabaseBackup(apis.k8sCustomObjects, namespace, item.metadata.name)
    )
  );

  // Delete export service
  await deleteService(apis.k8sCore, namespace, `${resourceName}-export`).catch((err) => {
    if (err?.body?.code !== 404) {
      throw new Error(err?.message || 'Delete DB Service Export Error');
    }
  });

  // Delete role and relevant resources
  await Promise.all([
    deleteRole(apis.k8sAuth, namespace, resourceName),
    deleteRoleBinding(apis.k8sAuth, namespace, resourceName),
    deleteServiceAccount(apis.k8sCore, namespace, resourceName)
  ]);

  // Delete cluster
  await deleteCustomResource(
    apis.k8sCustomObjects,
    namespace,
    resourceName,
    'Cluster',
    'apps.kubeblocks.io',
    'v1alpha1'
  );
}
