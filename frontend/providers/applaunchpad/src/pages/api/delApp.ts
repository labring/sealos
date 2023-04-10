import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name } = req.query as { name: string };
    if (!name) {
      throw new Error('deploy name is empty');
    }

    const { k8sApp, k8sCore, k8sAutoscaling, k8sNetworkingApp, namespace, k8sCustomObjects } =
      await getK8s({
        kubeconfig: await authSession(req.headers)
      });

    /* delete all sources */
    const response = await Promise.allSettled([
      k8sApp.deleteNamespacedDeployment(name, namespace), // delete deploy
      k8sApp.deleteNamespacedStatefulSet(name, namespace), // delete stateFuleSet
      k8sCore.deleteNamespacedService(name, namespace), // delete service
      k8sCore.deleteNamespacedConfigMap(name, namespace), // delete configMap
      k8sCore.deleteNamespacedSecret(name, namespace), // delete secret
      k8sNetworkingApp.deleteNamespacedIngress(name, namespace), // delete Ingress
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
    response.forEach((item) => {
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
