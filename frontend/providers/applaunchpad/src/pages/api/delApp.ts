import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
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
  const { k8sApp, k8sCore, k8sAutoscaling, k8sNetworkingApp, namespace, k8sCustomObjects } =
    await getK8s({
      kubeconfig: await authSession(req.headers)
    });

  /* delete all sources */
  const delDependent = await Promise.allSettled([
    k8sCore.deleteNamespacedService(name, namespace), // delete service
    k8sCore.deleteNamespacedConfigMap(name, namespace), // delete configMap
    k8sCore.deleteNamespacedSecret(name, namespace), // delete secret
    k8sNetworkingApp.deleteCollectionNamespacedIngress(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `${appDeployKey}=${name}`
    ), // delete Ingress
    k8sCustomObjects.deleteNamespacedCustomObject(
      // delete Issuer
      'cert-manager.io',
      'v1',
      namespace,
      'issuers',
      name
    ),
    k8sCustomObjects.deleteNamespacedCustomObject(
      // delete Certificate
      'cert-manager.io',
      'v1',
      namespace,
      'certificates',
      name
    ),
    k8sCore.deleteCollectionNamespacedPersistentVolumeClaim(
      // delete pvc
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
      throw new Error('删除 App 异常');
    }
  });

  // delete deploy and statefulSet
  const delApp = await Promise.allSettled([
    k8sApp.deleteNamespacedDeployment(name, namespace), // delete deploy
    k8sApp.deleteNamespacedStatefulSet(name, namespace) // delete stateFuleSet
  ]);

  /* find not 404 error */
  delApp.forEach((item) => {
    console.log(item, 'delApp err');
    if (item.status === 'rejected' && +item?.reason?.body?.code !== 404) {
      throw new Error(item?.reason?.body);
    }
  });
}
