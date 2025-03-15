import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession,getAdminAuthorization } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { appDeployKey } from '@/constants/app';

export type DeleteAppParams = { name: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name } = req.query as DeleteAppParams;
    if (!name) {
      throw new Error('deploy name is empty');
    }

    await DeleteAppByName({ name, req });

    jsonRes(res, {
      message: 'successfully deleted'
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export async function DeleteAppByName({ name, req }: DeleteAppParams & { req: NextApiRequest }) {
  const reqNamespace = req.query.namespace as string;
  const { k8sApp, k8sCore, k8sAutoscaling, k8sNetworkingApp, namespace, k8sCustomObjects } =
    await getK8s({
      kubeconfig: await getAdminAuthorization(req.headers)
    });

  // delete Certificate
  const certificatesList = (await k8sCustomObjects.listNamespacedCustomObject(
    'cert-manager.io',
    'v1',
    reqNamespace,
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
      reqNamespace,
      'certificates',
      item.metadata.name
    )
  );

  // delete Issuer
  const issuersList = (await k8sCustomObjects.listNamespacedCustomObject(
    'cert-manager.io',
    'v1',
    reqNamespace,
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
      reqNamespace,
      'issuers',
      item.metadata.name
    )
  );

  const delIssuerAndCert = await Promise.allSettled([...delCertList, ...delIssuerList]);
  /* find not 404 error */
  delIssuerAndCert.forEach((item) => {
    console.log(item, 'delIssuerAndCert err');
    if (item.status === 'rejected' && +item?.reason?.body?.code !== 404) {
      throw new Error(item?.reason?.body?.message || item?.reason?.body?.reason || '删除 App 异常');
    }
  });

  /* delete all sources */
  const delDependent = await Promise.allSettled([
    // delete service
    k8sCore.deleteCollectionNamespacedService(
      reqNamespace,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `${appDeployKey}=${name}`
    ),
    k8sCore.deleteNamespacedService(name, reqNamespace),
    k8sCore.deleteNamespacedConfigMap(name, reqNamespace), // delete configMap
    k8sCore.deleteNamespacedSecret(name, reqNamespace), // delete secret
    // delete Ingress
    k8sNetworkingApp.deleteCollectionNamespacedIngress(
      reqNamespace,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `${appDeployKey}=${name}`
    ),
    // delete pvc
    k8sCore.deleteCollectionNamespacedPersistentVolumeClaim(
      reqNamespace,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `app=${name}`
    ),
    k8sAutoscaling.deleteNamespacedHorizontalPodAutoscaler(name, reqNamespace) // delete HorizontalPodAutoscaler
  ]);

  /* find not 404 error */
  delDependent.forEach((item) => {
    console.log(item, 'delApp err');
    if (item.status === 'rejected' && +item?.reason?.body?.code !== 404) {
      throw new Error(item?.reason?.body?.reason || item?.reason?.body?.message || '删除 App 异常');
    }
  });

  // delete deploy and statefulSet
  const delApp = await Promise.allSettled([
    k8sApp.deleteNamespacedDeployment(name, reqNamespace), // delete deploy
    k8sApp.deleteNamespacedStatefulSet(name, reqNamespace) // delete stateFuleSet
  ]);

  /* find not 404 error */
  delApp.forEach((item) => {
    console.log(item, 'delApp Deployment StatefulSet err');
    if (item.status === 'rejected' && +item?.reason?.body?.code !== 404) {
      throw new Error(item?.reason?.body?.reason || item?.reason?.body?.message || '删除 App 异常');
    }
  });
}
