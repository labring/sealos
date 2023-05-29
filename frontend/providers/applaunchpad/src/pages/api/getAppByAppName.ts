import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { appName } = req.query as { appName: string };
    if (!appName) {
      throw new Error('appName is empty');
    }

    const { k8sApp, k8sCore, k8sNetworkingApp, k8sAutoscaling, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const response = await Promise.allSettled([
      k8sApp.readNamespacedDeployment(appName, namespace),
      k8sApp.readNamespacedStatefulSet(appName, namespace),
      k8sCore.readNamespacedService(appName, namespace),
      k8sCore.readNamespacedConfigMap(appName, namespace),
      k8sNetworkingApp.readNamespacedIngress(appName, namespace),
      k8sCore.readNamespacedSecret(appName, namespace),
      k8sAutoscaling.readNamespacedHorizontalPodAutoscaler(appName, namespace)
    ]);

    // Check for errors other than 404
    const responseData = response
      .map((item) => {
        if (item.status === 'fulfilled') return item.value.body;
        if (+item.reason?.body?.code === 404) return '';
        throw new Error('Get APP Deployment Error');
      })
      .filter((item) => item);

    jsonRes(res, {
      data: responseData
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
