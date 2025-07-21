import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { NextApiRequest, NextApiResponse } from 'next';
import * as operations from '@/services/backend/operations';

// Helper function to delete resources with error handling
async function deleteResourcesBatch<T>(
  resourcesPromise: Promise<T[]>,
  deleteOperation: (name: string) => Promise<any>,
  errorMessage: string
): Promise<void> {
  const resourceNames = await resourcesPromise
    .then((resources) =>
      resources.map((item: any) => item?.metadata?.name).filter((name) => !!name)
    )
    .catch((error) => {
      if (error?.statusCode === 404) {
        return [];
      }
      throw error;
    });

  const deleteResults = await Promise.allSettled(
    resourceNames.map((name: string) => deleteOperation(name))
  );

  for (const result of deleteResults) {
    if (result.status === 'rejected' && +result?.reason?.body?.code !== 404) {
      throw new Error(errorMessage);
    }
  }
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ! ===== Validate against schema!
  const instanceName = req.query['instance-name'] as string;

  // const client = await getK8s({
  //   kubeconfig: await authSession(req.headers)
  // });

  const kubeConfig = await authSession(req.headers).catch((error) => {
    if (error === ResponseCode.UNAUTHORIZED) {
      return res.status(401).json({ message: ResponseMessages[ResponseCode.UNAUTHORIZED] });
    }
    return res.status(500).json({ message: ResponseMessages[ResponseCode.SERVER_ERROR] });
  });

  if (!kubeConfig) {
    return res.status(401).json({ message: ResponseMessages[ResponseCode.UNAUTHORIZED] });
  }

  console.log('kubeConfig', kubeConfig);

  const k8s = await getK8s({
    kubeconfig: kubeConfig
  });

  // ! ======================= For testing
  if (req.method === 'GET') {
    const data = {
      Instance: await operations
        .getInstance(k8s.k8sCustomObjects, k8s.namespace, instanceName as string)
        .catch((err) => {
          console.log('err', err);
          return null;
        }),
      AppLaunchpad: await operations
        .getAppLaunchpad(k8s.k8sApp, k8s.namespace, instanceName as string)
        .catch((err) => {
          console.log('err', err);
          return null;
        }),
      Databases: await operations
        .getDatabases(k8s.k8sCustomObjects, k8s.namespace, instanceName as string)
        .catch((err) => {
          console.log('err', err);
          return null;
        }),
      ObjectStorage: await operations
        .getObjectStorage(k8s.k8sCustomObjects, k8s.namespace, instanceName as string)
        .catch((err) => {
          console.log('err', err);
          return null;
        }),
      CronJobs: await operations.getCronJobs(k8s.k8sBatch, k8s.namespace, instanceName as string),
      Secrets: await operations.getSecrets(k8s.k8sCore, k8s.namespace, instanceName as string),
      Jobs: await operations.getJobs(k8s.k8sBatch, k8s.namespace, instanceName as string),
      CertIssuers: await operations
        .getCertIssuers(k8s.k8sCustomObjects, k8s.namespace, instanceName as string)
        .catch((err) => {
          console.log('err', err);
          return null;
        }),
      AppCRs: await operations
        .getAppCRs(k8s.k8sCustomObjects, k8s.namespace, instanceName as string)
        .catch((err) => {
          console.log('err', err);
          return null;
        }),
      Roles: await operations.getRoles(k8s.k8sAuth, k8s.namespace, instanceName as string),
      RoleBindings: await operations
        .getRoleBindings(k8s.k8sAuth, k8s.namespace, instanceName as string)
        .catch((err) => {
          console.log('err', err);
          return null;
        }),
      ServiceAccounts: await operations
        .getServiceAccounts(k8s.k8sCore, k8s.namespace, instanceName as string)
        .catch((err) => {
          console.log('err', err);
          return null;
        }),
      ConfigMaps: await operations
        .getConfigMaps(k8s.k8sCore, k8s.namespace, instanceName as string)
        .catch((err) => {
          console.log('err', err);
          return null;
        }),
      PrometheusRules: await operations
        .getPrometheusRules(k8s.k8sCustomObjects, k8s.namespace, instanceName as string)
        .catch((err) => {
          console.log('err', err);
          return null;
        }),
      Prometheuses: await operations
        .getPrometheuses(k8s.k8sCustomObjects, k8s.namespace, instanceName as string)
        .catch((err) => {
          console.log('err', err);
          return null;
        }),
      PersistentVolumeClaims: await operations
        .getPersistentVolumeClaims(k8s.k8sCore, k8s.namespace, instanceName as string)
        .catch((err) => {
          console.log('err', err);
          return null;
        }),
      ServiceMonitors: await operations
        .getServiceMonitors(k8s.k8sCustomObjects, k8s.namespace, instanceName as string)
        .catch((err) => {
          console.log('err', err);
          return null;
        }),
      Probes: await operations
        .getProbes(k8s.k8sCustomObjects, k8s.namespace, instanceName as string)
        .catch((err) => {
          console.log('err', err);
          return null;
        }),
      Services: await operations
        .getServices(k8s.k8sCore, k8s.namespace, instanceName as string)
        .catch((err) => {
          console.log('err', err);
          return null;
        })
    };

    res.status(200).json({ data });
  }

  if (req.method === 'DELETE') {
    // Instance
    try {
      const instance = await operations.getInstance(
        k8s.k8sCustomObjects,
        k8s.namespace,
        instanceName
      );
      await operations.deleteInstance(k8s.k8sCustomObjects, k8s.namespace, instance.metadata.name);
    } catch (error: any) {
      if (error?.body?.code !== 404) {
        throw new Error(error?.message || 'An error occurred whilst deleting instance.');
      }
    }

    // AppLaunchpad
    await deleteResourcesBatch(
      operations.getAppLaunchpad(k8s.k8sApp, k8s.namespace, instanceName),
      (name: string) => operations.deleteAppLaunchpad(k8s, k8s.namespace, name),
      'An error occurred whilst deleting App Launchpad.'
    );

    // Databases
    await deleteResourcesBatch(
      operations.getDatabases(k8s.k8sCustomObjects, k8s.namespace, instanceName),
      (name: string) => operations.deleteDatabase(k8s, k8s.namespace, name),
      'An error occurred whilst deleting Databases.'
    );

    // App CR
    await deleteResourcesBatch(
      operations.getAppCRs(k8s.k8sCustomObjects, k8s.namespace, instanceName),
      (name: string) => operations.deleteAppCR(k8s.k8sCustomObjects, k8s.namespace, name),
      'An error occurred whilst deleting App CR.'
    );

    // ObjectStorage
    await deleteResourcesBatch(
      operations.getObjectStorage(k8s.k8sCustomObjects, k8s.namespace, instanceName),
      (name: string) => operations.deleteObjectStorage(k8s.k8sCustomObjects, k8s.namespace, name),
      'An error occurred whilst deleting Object Storage.'
    );

    // CronJobs
    await deleteResourcesBatch(
      operations.getCronJobs(k8s.k8sBatch, k8s.namespace, instanceName),
      (name: string) => operations.deleteCronJob(k8s.k8sBatch, k8s.namespace, name),
      'An error occurred whilst deleting CronJobs.'
    );

    // Secrets
    await deleteResourcesBatch(
      operations.getSecrets(k8s.k8sCore, k8s.namespace, instanceName),
      (name: string) => operations.deleteSecret(k8s.k8sCore, k8s.namespace, name),
      'An error occurred whilst deleting Secrets.'
    );

    // Jobs
    await deleteResourcesBatch(
      operations.getJobs(k8s.k8sBatch, k8s.namespace, instanceName),
      (name: string) => operations.deleteJob(k8s.k8sBatch, k8s.namespace, name),
      'An error occurred whilst deleting Jobs.'
    );

    // CertIssuers
    await deleteResourcesBatch(
      operations.getCertIssuers(k8s.k8sCustomObjects, k8s.namespace, instanceName),
      (name: string) => operations.deleteCertIssuer(k8s.k8sCustomObjects, k8s.namespace, name),
      'An error occurred whilst deleting CertIssuers.'
    );

    // Roles
    await deleteResourcesBatch(
      operations.getRoles(k8s.k8sAuth, k8s.namespace, instanceName),
      (name: string) => operations.deleteRole(k8s.k8sAuth, k8s.namespace, name),
      'An error occurred whilst deleting Roles.'
    );

    // RoleBindings
    await deleteResourcesBatch(
      operations.getRoleBindings(k8s.k8sAuth, k8s.namespace, instanceName),
      (name: string) => operations.deleteRoleBinding(k8s.k8sAuth, k8s.namespace, name),
      'An error occurred whilst deleting RoleBindings.'
    );

    // ServiceAccounts
    await deleteResourcesBatch(
      operations.getServiceAccounts(k8s.k8sCore, k8s.namespace, instanceName),
      (name: string) => operations.deleteServiceAccount(k8s.k8sCore, k8s.namespace, name),
      'An error occurred whilst deleting ServiceAccounts.'
    );

    // ConfigMaps
    await deleteResourcesBatch(
      operations.getConfigMaps(k8s.k8sCore, k8s.namespace, instanceName),
      (name: string) => operations.deleteConfigMap(k8s.k8sCore, k8s.namespace, name),
      'An error occurred whilst deleting ConfigMaps.'
    );

    // PrometheusRules
    await deleteResourcesBatch(
      operations.getPrometheusRules(k8s.k8sCustomObjects, k8s.namespace, instanceName),
      (name: string) => operations.deletePrometheusRule(k8s.k8sCustomObjects, k8s.namespace, name),
      'An error occurred whilst deleting PrometheusRules.'
    );

    // Prometheuses
    await deleteResourcesBatch(
      operations.getPrometheuses(k8s.k8sCustomObjects, k8s.namespace, instanceName),
      (name: string) => operations.deletePrometheus(k8s.k8sCustomObjects, k8s.namespace, name),
      'An error occurred whilst deleting Prometheuses.'
    );

    // PersistentVolumeClaims
    await deleteResourcesBatch(
      operations.getPersistentVolumeClaims(k8s.k8sCore, k8s.namespace, instanceName),
      (name: string) => operations.deletePersistentVolumeClaim(k8s.k8sCore, k8s.namespace, name),
      'An error occurred whilst deleting PersistentVolumeClaims.'
    );

    // ServiceMonitors
    await deleteResourcesBatch(
      operations.getServiceMonitors(k8s.k8sCustomObjects, k8s.namespace, instanceName),
      (name: string) => operations.deleteServiceMonitor(k8s.k8sCustomObjects, k8s.namespace, name),
      'An error occurred whilst deleting ServiceMonitors.'
    );

    // Probes
    await deleteResourcesBatch(
      operations.getProbes(k8s.k8sCustomObjects, k8s.namespace, instanceName),
      (name: string) => operations.deleteProbe(k8s.k8sCustomObjects, k8s.namespace, name),
      'An error occurred whilst deleting Probes.'
    );

    // Services
    await deleteResourcesBatch(
      operations.getServices(k8s.k8sCore, k8s.namespace, instanceName),
      (name: string) => operations.deleteService(k8s.k8sCore, k8s.namespace, name),
      'An error occurred whilst deleting Services.'
    );

    return res.status(200).json({});
  }

  res.status(405).json({ message: 'Method not allowed' });
}
