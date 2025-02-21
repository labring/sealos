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
      k8sCore.deleteCollectionNamespacedService(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        `${appDeployKey}=${instanceName}`
      ),
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
      k8sCustomObjects
        .listNamespacedCustomObject(
          'cert-manager.io',
          'v1',
          namespace,
          'issuers',
          undefined,
          undefined,
          undefined,
          undefined,
          `${appDeployKey}=${instanceName}`
        )
        .then(async (res: any) => {
          const items = res.body.items || [];
          console.log(items.map((item: any) => item.metadata.name));
          return Promise.all(
            items.map((item: any) =>
              k8sCustomObjects.deleteNamespacedCustomObject(
                'cert-manager.io',
                'v1',
                namespace,
                'issuers',
                item.metadata.name
              )
            )
          );
        }),
      k8sCustomObjects
        .listNamespacedCustomObject(
          'cert-manager.io',
          'v1',
          namespace,
          'certificates',
          undefined,
          undefined,
          undefined,
          undefined,
          `${appDeployKey}=${instanceName}`
        )
        .then(async (res: any) => {
          const items = res.body.items || [];
          return Promise.all(
            items.map((item: any) =>
              k8sCustomObjects.deleteNamespacedCustomObject(
                'cert-manager.io',
                'v1',
                namespace,
                'certificates',
                item.metadata.name
              )
            )
          );
        }),
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
