import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { appDeployKey } from '@/constants/keys';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { instanceName } = req.query as { instanceName: string };
    if (!instanceName) {
      throw new Error('deploy name is empty');
    }

    const { k8sApp, k8sCore, k8sAutoscaling, k8sNetworkingApp, namespace, k8sCustomObjects } =
      await getK8s({
        kubeconfig: await authSession(req.headers)
      });

    /* delete all sources */
    const delDependent = await Promise.allSettled([
      k8sCore.deleteNamespacedService(instanceName, namespace), // delete service
      k8sCore.deleteNamespacedConfigMap(instanceName, namespace), // delete configMap
      k8sCore.deleteNamespacedSecret(instanceName, namespace), // delete secret
      k8sNetworkingApp.deleteCollectionNamespacedIngress(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        `${appDeployKey}=${instanceName}`
      ), // delete Ingress
      k8sCustomObjects.deleteNamespacedCustomObject(
        // delete Issuer
        'cert-manager.io',
        'v1',
        namespace,
        'issuers',
        instanceName
      ),
      k8sCustomObjects.deleteNamespacedCustomObject(
        // delete Certificate
        'cert-manager.io',
        'v1',
        namespace,
        'certificates',
        instanceName
      ),
      k8sCore.deleteCollectionNamespacedPersistentVolumeClaim(
        // delete pvc
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        `app=${instanceName}`
      ),
      k8sAutoscaling.deleteNamespacedHorizontalPodAutoscaler(instanceName, namespace) // delete HorizontalPodAutoscaler
    ]);

    /* find not 404 error */
    delDependent.forEach((item) => {
      if (item.status === 'rejected' && +item?.reason?.body?.code !== 404) {
        throw new Error('删除 App 异常');
      }
    });

    // delete deploy and statefulSet
    const delApp = await Promise.allSettled([
      k8sApp.deleteNamespacedDeployment(instanceName, namespace), // delete deploy
      k8sApp.deleteNamespacedStatefulSet(instanceName, namespace) // delete stateFuleSet
    ]);

    /* find not 404 error */
    delApp.forEach((item) => {
      if (item.status === 'rejected' && +item?.reason?.body?.code !== 404) {
        throw new Error('删除 App 异常');
      }
    });

    jsonRes(res);
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
