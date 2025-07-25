import type { NextApiRequest } from 'next';
import { getK8s } from './kubernetes';
import { authSession } from './auth';
import { appDeployKey } from '@/constants/app';
import { formData2Yamls } from '@/pages/app/edit';
import { serverLoadInitData } from '@/store/static';
import { AppEditType } from '@/types/app';

export interface AppServiceParams {
  appName: string;
  req: NextApiRequest;
}

export interface DeleteAppParams {
  name: string;
  req: NextApiRequest;
}

export interface CreateAppParams {
  appForm: AppEditType;
  req: NextApiRequest;
}

/**
 * Get application details by application name
 * @param params Parameters containing application name and request object
 * @returns Promise<PromiseSettledResult<any>[]> Query results of application-related resources
 */
export async function getAppByName({ appName, req }: AppServiceParams) {
  const { k8sApp, k8sCore, k8sNetworkingApp, k8sAutoscaling, namespace } = await getK8s({
    kubeconfig: await authSession(req.headers)
  });

  const response = await Promise.allSettled([
    k8sApp.readNamespacedDeployment(appName, namespace),
    k8sApp.readNamespacedStatefulSet(appName, namespace),
    k8sCore.readNamespacedConfigMap(appName, namespace).catch((err) => {
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
      .then((res) => ({
        body: res.body.items.map((item) => ({
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
      .then((res) => ({
        body: res.body.items.map((item) => ({
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
 * @param params Parameters containing application form data and request object
 */
export async function createApp({ appForm, req }: CreateAppParams) {
  // Load environment configuration
  serverLoadInitData();

  const { applyYamlList } = await getK8s({
    kubeconfig: await authSession(req.headers)
  });

  appForm.networks = appForm.networks.map((network) => ({
    ...network,
    domain: global.AppConfig.cloud.domain
  }));

  const parseYamls = formData2Yamls(appForm);
  const yamls = parseYamls.map((item) => item.value);

  await applyYamlList(yamls, 'create');
}

/**
 * Delete application and its related resources by application name
 * @param params Parameters containing application name and request object
 */
export async function deleteAppByName({ name, req }: DeleteAppParams) {
  const { k8sApp, k8sCore, k8sAutoscaling, k8sNetworkingApp, namespace, k8sCustomObjects } =
    await getK8s({
      kubeconfig: await authSession(req.headers)
    });

  // delete Certificate
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

  // delete Issuer
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
  /* find not 404 error */
  delIssuerAndCert.forEach((item) => {
    console.log(item, 'delIssuerAndCert err');
    if (item.status === 'rejected' && +item?.reason?.body?.code !== 404) {
      throw new Error(
        item?.reason?.body?.message || item?.reason?.body?.reason || 'Failed to delete app'
      );
    }
  });

  /* delete all sources */
  const delDependent = await Promise.allSettled([
    // delete service
    k8sCore.deleteCollectionNamespacedService(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `${appDeployKey}=${name}`
    ),
    k8sCore.deleteNamespacedConfigMap(name, namespace), // delete configMap
    k8sCore.deleteNamespacedSecret(name, namespace), // delete secret
    // delete Ingress
    k8sNetworkingApp.deleteCollectionNamespacedIngress(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `${appDeployKey}=${name}`
    ),
    // delete pvc
    k8sCore.deleteCollectionNamespacedPersistentVolumeClaim(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `app=${name}`
    ),
    k8sAutoscaling.deleteNamespacedHorizontalPodAutoscaler(name, namespace) // delete HorizontalPodAutoscaler
  ]);

  /* find not 404 error */
  delDependent.forEach((item) => {
    console.log(item, 'delApp err');
    if (item.status === 'rejected' && +item?.reason?.body?.code !== 404) {
      throw new Error(
        item?.reason?.body?.reason || item?.reason?.body?.message || 'Failed to delete app'
      );
    }
  });

  // delete deploy and statefulSet
  const delApp = await Promise.allSettled([
    k8sApp.deleteNamespacedDeployment(name, namespace), // delete deploy
    k8sApp.deleteNamespacedStatefulSet(name, namespace) // delete stateFuleSet
  ]);

  /* find not 404 error */
  delApp.forEach((item) => {
    console.log(item, 'delApp Deployment StatefulSet err');
    if (item.status === 'rejected' && +item?.reason?.body?.code !== 404) {
      throw new Error(
        item?.reason?.body?.reason || item?.reason?.body?.message || 'Failed to delete app'
      );
    }
  });
}
