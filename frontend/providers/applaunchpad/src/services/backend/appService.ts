import { appDeployKey, pauseKey, minReplicasKey, maxReplicasKey } from '@/constants/app';
import { formData2Yamls } from '@/pages/app/edit';
import { serverLoadInitData } from '@/store/static';
import { AppEditType } from '@/types/app';
import { UserQuotaItemType } from '@/types/user';
import { json2HPA } from '@/utils/deployYaml2Json';
import { str2Num } from '@/utils/tools';
import { adaptAppDetail } from '@/utils/adapt';
import { DeployKindsType, AppDetailType } from '@/types/app';
import { z } from 'zod';
import { LaunchpadApplicationSchema, resourceConverters } from '@/types/schema';
import { transformFromLegacySchema } from '@/types/request_schema';
import {
  PatchUtils,
  KubeConfig,
  KubernetesObjectApi,
  CoreV1Api,
  AppsV1Api,
  AutoscalingV2Api,
  NetworkingV1Api,
  CustomObjectsApi,
  Metrics,
  Exec,
  V1Deployment,
  V1StatefulSet,
  KubernetesObject,
  User
} from '@kubernetes/client-node';

export interface K8sContext {
  kc: KubeConfig;
  apiClient: KubernetesObjectApi;
  k8sCore: CoreV1Api;
  k8sApp: AppsV1Api;
  k8sAutoscaling: AutoscalingV2Api;
  k8sNetworkingApp: NetworkingV1Api;
  k8sCustomObjects: CustomObjectsApi;
  metricsClient: Metrics;
  k8sExec: Exec;
  kube_user: User | null;
  namespace: string;
  applyYamlList: (yamlList: string[], type: 'create' | 'replace') => Promise<KubernetesObject[]>;
  getDeployApp: (appName: string) => Promise<V1Deployment | V1StatefulSet>;
  getUserQuota: () => Promise<UserQuotaItemType[]>;
  getUserBalance: () => Promise<number>;
}

/**
 * Get application details by application name
 * @param appName Application name
 * @param k8s Kubernetes context containing clients and configuration
 * @returns Promise<PromiseSettledResult<any>[]> Query results of application-related resources
 */
export async function getAppByName(appName: string, k8s: K8sContext) {
  const { k8sApp, k8sCore, k8sNetworkingApp, k8sAutoscaling, namespace } = k8s;

  const response = await Promise.allSettled([
    k8sApp.readNamespacedDeployment(appName, namespace),
    k8sApp.readNamespacedStatefulSet(appName, namespace),
    k8sCore.readNamespacedConfigMap(appName, namespace).catch((err: any) => {
      // This .catch will prevent unhandledRejection
      // Need to re-throw the error to let Promise.allSettled correctly identify it as rejection
      return Promise.reject(err);
    }),
    k8sCore
      .listNamespacedService(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `${appDeployKey}=${appName}`
      )
      .then((res: any) => ({
        body: res.body.items.map((item: any) => ({
          ...item,
          apiVersion: res.body.apiVersion, // item does not contain apiversion and kind
          kind: 'Service'
        }))
      })),
    k8sNetworkingApp
      .listNamespacedIngress(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `${appDeployKey}=${appName}`
      )
      .then((res: any) => ({
        body: res.body.items.map((item: any) => ({
          ...item,
          apiVersion: res.body.apiVersion, // item does not contain apiversion and kind
          kind: 'Ingress'
        }))
      })),
    k8sCore.readNamespacedSecret(appName, namespace),
    k8sAutoscaling.readNamespacedHorizontalPodAutoscaler(appName, namespace)
  ]);

  return response;
}

/**
 * Create a new application with the provided configuration
 * @param appForm Application form data
 * @param k8s Kubernetes context containing clients and configuration
 */
export async function createApp(appForm: AppEditType, k8s: K8sContext) {
  serverLoadInitData();

  const { applyYamlList } = k8s;

  appForm.networks = appForm.networks.map((network: any) => ({
    ...network,
    domain: global.AppConfig.cloud.domain
  }));

  const parseYamls = formData2Yamls(appForm);
  const yamls = parseYamls.map((item) => item.value);

  await applyYamlList(yamls, 'create');
}

/**
 * Start an application by restoring its replicas and HPA configuration
 * @param appName Application name
 * @param k8s Kubernetes context containing clients and configuration
 */
export async function startApp(appName: string, k8s: K8sContext) {
  const { apiClient, getDeployApp, applyYamlList, namespace, k8sNetworkingApp } = k8s;

  const app = await getDeployApp(appName);

  if (!app.metadata?.name || !app?.metadata?.annotations || !app.spec) {
    throw new Error('app data error');
  }

  if (!app.metadata.annotations[pauseKey]) {
    throw new Error('app is running');
  }

  const pauseData: {
    target: string;
    value: string;
  } = JSON.parse(app.metadata.annotations[pauseKey]);

  delete app.metadata.annotations[pauseKey];
  app.spec.replicas = app.metadata.annotations[minReplicasKey]
    ? +app.metadata.annotations[minReplicasKey]
    : 1;

  const requestQueue: Promise<any>[] = [apiClient.replace(app)];
  if (pauseData.target) {
    const hpaYaml = json2HPA({
      appName,
      hpa: {
        use: true,
        target: pauseData.target,
        value: pauseData.value,
        minReplicas: app.metadata.annotations[minReplicasKey]
          ? app.metadata.annotations[minReplicasKey]
          : '1',
        maxReplicas: app.metadata.annotations[maxReplicasKey]
          ? app.metadata.annotations[maxReplicasKey]
          : '2'
      }
    } as unknown as AppEditType);

    requestQueue.push(applyYamlList([hpaYaml], 'create'));
  }

  try {
    const { body: ingress } = await k8sNetworkingApp.listNamespacedIngress(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `${appDeployKey}=${appName}`
    );
    if (ingress?.items?.length > 0) {
      for (const ingressItem of ingress.items) {
        if (ingressItem?.metadata?.name) {
          const patchData: Record<string, any> = {};
          if (ingressItem.metadata?.annotations?.['kubernetes.io/ingress.class'] === 'pause') {
            patchData.metadata = {
              annotations: {
                'kubernetes.io/ingress.class': 'nginx'
              }
            };
          }
          if (ingressItem.spec?.ingressClassName === 'pause') {
            patchData.spec = {
              ingressClassName: 'nginx'
            };
          }

          if (Object.keys(patchData).length > 0) {
            requestQueue.push(
              k8sNetworkingApp.patchNamespacedIngress(
                ingressItem.metadata.name,
                namespace,
                patchData,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
              )
            );
          }
        }
      }
    }
  } catch (error: any) {
    if (error?.statusCode !== 404) {
      return Promise.reject('无法读取到ingress');
    }
  }

  await Promise.all(requestQueue);
}

/**
 * Pause an application by setting replicas to 0 and storing current configuration
 * @param appName Application name
 * @param k8s Kubernetes context containing clients and configuration
 */
export async function pauseApp(appName: string, k8s: K8sContext) {
  const { apiClient, k8sAutoscaling, getDeployApp, namespace, k8sNetworkingApp } = k8s;

  const app = await getDeployApp(appName);
  if (!app.metadata?.name || !app?.metadata?.annotations || !app.spec) {
    throw new Error('app data error');
  }

  const restartAnnotations: Record<string, string> = {
    target: '',
    value: ''
  };

  const requestQueue: Promise<any>[] = [];
  try {
    const { body: hpa } = await k8sAutoscaling.readNamespacedHorizontalPodAutoscaler(
      appName,
      namespace
    );

    restartAnnotations.target = hpa?.spec?.metrics?.[0]?.resource?.name || 'cpu';
    restartAnnotations.value = `${
      hpa?.spec?.metrics?.[0]?.resource?.target?.averageUtilization || 50
    }`;

    requestQueue.push(k8sAutoscaling.deleteNamespacedHorizontalPodAutoscaler(appName, namespace));
  } catch (error: any) {
    if (error?.statusCode !== 404) {
      return Promise.reject('not found hpa');
    }
  }

  try {
    const { body: ingress } = await k8sNetworkingApp.listNamespacedIngress(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `${appDeployKey}=${appName}`
    );
    if (ingress?.items?.length > 0) {
      for (const ingressItem of ingress.items) {
        if (ingressItem?.metadata?.name) {
          const patchData: Record<string, any> = {};
          if (ingressItem.metadata?.annotations?.['kubernetes.io/ingress.class'] === 'nginx') {
            patchData.metadata = {
              annotations: {
                'kubernetes.io/ingress.class': 'pause'
              }
            };
          }
          if (ingressItem.spec?.ingressClassName === 'nginx') {
            patchData.spec = {
              ingressClassName: 'pause'
            };
          }

          if (Object.keys(patchData).length > 0) {
            requestQueue.push(
              k8sNetworkingApp.patchNamespacedIngress(
                ingressItem.metadata.name,
                namespace,
                patchData,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
              )
            );
          }
        }
      }
    }
  } catch (error: any) {
    if (error?.statusCode !== 404) {
      return Promise.reject('无法读取到ingress');
    }
  }

  app.metadata.annotations[pauseKey] = JSON.stringify(restartAnnotations);
  app.spec.replicas = 0;

  requestQueue.push(apiClient.replace(app));

  await Promise.all(requestQueue);
}

/**
 * Delete application and its related resources by application name
 * @param name Application name
 * @param k8s Kubernetes context containing clients and configuration
 */
export async function deleteAppByName(name: string, k8s: K8sContext) {
  const { k8sApp, k8sCore, k8sAutoscaling, k8sNetworkingApp, namespace, k8sCustomObjects } = k8s;

  const certificatesList = (await k8sCustomObjects.listNamespacedCustomObject(
    'cert-manager.io',
    'v1',
    namespace,
    'certificates',
    undefined,
    undefined,
    undefined,
    undefined,
    `${appDeployKey}=${name}`
  )) as { body: { items: any[] } };
  const delCertList = certificatesList.body.items.map((item) =>
    k8sCustomObjects.deleteNamespacedCustomObject(
      'cert-manager.io',
      'v1',
      namespace,
      'certificates',
      item.metadata.name
    )
  );

  const issuersList = (await k8sCustomObjects.listNamespacedCustomObject(
    'cert-manager.io',
    'v1',
    namespace,
    'issuers',
    undefined,
    undefined,
    undefined,
    undefined,
    `${appDeployKey}=${name}`
  )) as { body: { items: any[] } };
  const delIssuerList = issuersList.body.items.map(async (item) =>
    k8sCustomObjects.deleteNamespacedCustomObject(
      'cert-manager.io',
      'v1',
      namespace,
      'issuers',
      item.metadata.name
    )
  );

  const delIssuerAndCert = await Promise.allSettled([...delCertList, ...delIssuerList]);
  delIssuerAndCert.forEach((item) => {
    console.log(item, 'delIssuerAndCert err');
    if (item.status === 'rejected' && +item?.reason?.body?.code !== 404) {
      throw new Error(
        item?.reason?.body?.message || item?.reason?.body?.reason || 'Failed to delete app'
      );
    }
  });

  const delDependent = await Promise.allSettled([
    k8sCore.deleteCollectionNamespacedService(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `${appDeployKey}=${name}`
    ),
    k8sCore.deleteNamespacedConfigMap(name, namespace),
    k8sCore.deleteNamespacedSecret(name, namespace),
    k8sNetworkingApp.deleteCollectionNamespacedIngress(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `${appDeployKey}=${name}`
    ),

    k8sCore.deleteCollectionNamespacedPersistentVolumeClaim(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `app=${name}`
    ),
    k8sAutoscaling.deleteNamespacedHorizontalPodAutoscaler(name, namespace)
  ]);

  delDependent.forEach((item) => {
    console.log(item, 'delApp err');
    if (item.status === 'rejected' && +item?.reason?.body?.code !== 404) {
      throw new Error(
        item?.reason?.body?.reason || item?.reason?.body?.message || 'Failed to delete app'
      );
    }
  });

  const delApp = await Promise.allSettled([
    k8sApp.deleteNamespacedDeployment(name, namespace),
    k8sApp.deleteNamespacedStatefulSet(name, namespace)
  ]);

  delApp.forEach((item) => {
    console.log(item, 'delApp Deployment StatefulSet err');
    if (item.status === 'rejected' && +item?.reason?.body?.code !== 404) {
      throw new Error(
        item?.reason?.body?.reason || item?.reason?.body?.message || 'Failed to delete app'
      );
    }
  });
}

/**
 * Update application resources using precise JSONPatch operations
 * @param appName Application name
 * @param updateData Object containing cpu, memory, replicas, runCMD, cmdParam, and/or imageName values to update
 * @param k8s Kubernetes context containing clients and configuration
 */
export async function updateAppResources(
  appName: string,
  updateData: {
    resource?: {
      cpu?: number;
      memory?: number;
      replicas?: number;
    };
    command?: string;
    args?: string;
    image?: string;
    env?: { name: string; value?: string; valueFrom?: any }[];
  },
  k8s: K8sContext
) {
  const { getDeployApp, k8sApp, k8sAutoscaling, apiClient, applyYamlList, namespace } = k8s;

  const app = await getDeployApp(appName);
  if (!app.metadata?.name || !app.spec) {
    throw new Error('app data error');
  }

  // Handle replicas update with special pause/start logic
  if (updateData.resource?.replicas !== undefined) {
    if (updateData.resource.replicas === 0) {
      // Pause logic: save HPA config and delete HPA
      const restartAnnotations: Record<string, string> = {
        target: '',
        value: ''
      };

      const requestQueue: Promise<any>[] = [];

      try {
        const { body: hpa } = await k8sAutoscaling.readNamespacedHorizontalPodAutoscaler(
          appName,
          namespace
        );
        restartAnnotations.target = hpa?.spec?.metrics?.[0]?.resource?.name || 'cpu';
        restartAnnotations.value = `${
          hpa?.spec?.metrics?.[0]?.resource?.target?.averageUtilization || 50
        }`;
        requestQueue.push(
          k8sAutoscaling.deleteNamespacedHorizontalPodAutoscaler(appName, namespace)
        );
      } catch (error: any) {
        if (error?.statusCode !== 404) {
          throw new Error('无法读取到hpa');
        }
      }

      app.metadata.annotations = app.metadata.annotations || {};
      app.metadata.annotations[pauseKey] = JSON.stringify(restartAnnotations);
      app.spec.replicas = 0;

      requestQueue.push(apiClient.replace(app));
      await Promise.all(requestQueue);
    } else {
      // Start logic: set replicas and restore HPA if needed
      const requestQueue: Promise<any>[] = [];

      app.spec.replicas = updateData.resource.replicas;

      if (app.metadata?.annotations?.[pauseKey]) {
        const pauseData: {
          target: string;
          value: string;
        } = JSON.parse(app.metadata.annotations[pauseKey]);

        delete app.metadata.annotations[pauseKey];

        if (pauseData.target) {
          const hpaYaml = json2HPA({
            appName,
            hpa: {
              use: true,
              target: pauseData.target,
              value: pauseData.value,
              minReplicas: app.metadata.annotations[minReplicasKey] || '1',
              maxReplicas: app.metadata.annotations[maxReplicasKey] || '2'
            }
          } as unknown as AppEditType);

          requestQueue.push(applyYamlList([hpaYaml], 'create'));
        }
      }

      requestQueue.push(apiClient.replace(app));
      await Promise.all(requestQueue);
    }
  }

  // Handle CPU/Memory/Command/Args/Image updates with JSONPatch
  const resourceUpdates =
    updateData.resource?.cpu !== undefined ||
    updateData.resource?.memory !== undefined ||
    updateData.command !== undefined ||
    updateData.args !== undefined ||
    updateData.image !== undefined ||
    updateData.env !== undefined;
  if (resourceUpdates) {
    const jsonPatch: Array<{
      op: 'replace';
      path: string;
      value: unknown;
    }> = [];

    if (updateData.resource?.cpu !== undefined) {
      const millicores = resourceConverters.cpuToMillicores(updateData.resource.cpu);
      jsonPatch.push(
        {
          op: 'replace',
          path: '/spec/template/spec/containers/0/resources/requests/cpu',
          value: `${str2Num(Math.floor(millicores * 0.1))}m`
        },
        {
          op: 'replace',
          path: '/spec/template/spec/containers/0/resources/limits/cpu',
          value: `${str2Num(millicores)}m`
        }
      );
    }

    if (updateData.resource?.memory !== undefined) {
      const memoryMB = resourceConverters.memoryToMB(updateData.resource.memory);
      jsonPatch.push(
        {
          op: 'replace',
          path: '/spec/template/spec/containers/0/resources/requests/memory',
          value: `${str2Num(Math.floor(memoryMB * 0.1))}Mi`
        },
        {
          op: 'replace',
          path: '/spec/template/spec/containers/0/resources/limits/memory',
          value: `${str2Num(memoryMB)}Mi`
        }
      );
    }

    if (updateData.command !== undefined) {
      // Convert string to array following the same logic as deployYaml2Json
      const commandArray = (() => {
        if (!updateData.command) return undefined;
        try {
          return JSON.parse(updateData.command);
        } catch (error) {
          return updateData.command.split(' ').filter((item) => item);
        }
      })();

      if (commandArray) {
        jsonPatch.push({
          op: 'replace',
          path: '/spec/template/spec/containers/0/command',
          value: commandArray
        });
      }
    }

    if (updateData.args !== undefined) {
      // Convert string to array following the same logic as deployYaml2Json
      const argsArray = (() => {
        if (!updateData.args) return undefined;
        try {
          return JSON.parse(updateData.args) as string[];
        } catch (error) {
          return [updateData.args];
        }
      })();

      if (argsArray) {
        jsonPatch.push({
          op: 'replace',
          path: '/spec/template/spec/containers/0/args',
          value: argsArray
        });
      }
    }

    if (updateData.image !== undefined) {
      jsonPatch.push({
        op: 'replace',
        path: '/spec/template/spec/containers/0/image',
        value: updateData.image
      });

      jsonPatch.push({
        op: 'replace',
        path: '/metadata/annotations/originImageName',
        value: updateData.image
      });
    }

    if (updateData.env !== undefined) {
      jsonPatch.push({
        op: 'replace',
        path: '/spec/template/spec/containers/0/env',
        value: updateData.env
      });
    }

    if (app.kind === 'Deployment') {
      await k8sApp.patchNamespacedDeployment(
        appName,
        namespace,
        jsonPatch,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH } }
      );
    } else if (app.kind === 'StatefulSet') {
      await k8sApp.patchNamespacedStatefulSet(
        appName,
        namespace,
        jsonPatch,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH } }
      );
    }
  }
}

export async function processAppResponse<T extends boolean = true>(
  response: PromiseSettledResult<any>[],
  transform?: T
): Promise<T extends false ? AppDetailType : z.infer<typeof LaunchpadApplicationSchema>> {
  const responseData = response
    .map((item: PromiseSettledResult<any>) => {
      if (item.status === 'fulfilled') return item.value.body;
      if (item.status === 'rejected' && +item.reason?.body?.code === 404) return null;
      if (item.status === 'rejected') {
        throw new Error(`Get APP Deployment Error: ${item.reason?.message || 'Unknown error'}`);
      }
      return null;
    })
    .filter((item): item is DeployKindsType => item !== null)
    .flat() as DeployKindsType[];

  const appDetailData: AppDetailType = await adaptAppDetail(responseData, {
    SEALOS_DOMAIN: global.AppConfig.cloud.domain,
    SEALOS_USER_DOMAINS: global.AppConfig.cloud.userDomains
  });

  if (transform === false) {
    return appDetailData as any;
  }

  const standardizedData = transformFromLegacySchema(appDetailData);
  return LaunchpadApplicationSchema.parse(standardizedData) as any;
}
