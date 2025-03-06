import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession, getAdminAuthorization } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { pauseKey, stopKey } from '@/constants/app';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const reqNamespace = req.query.namespace as string;
  try {
    const { appName, isStop } = req.query as {
      appName: string;
      isStop: 'true' | 'none' | 'recover';
    };
    if (!appName) {
      throw new Error('appName is empty');
    }
    const { apiClient, k8sAutoscaling, getDeployApp, namespace } = await getK8s({
      kubeconfig: await getAdminAuthorization(req.headers)
    });

    const app = await getDeployApp(appName, reqNamespace);
    if (!app.metadata?.name || !app?.metadata?.annotations || !app.spec) {
      throw new Error('app data error');
    }

    console.log(isStop, appName);

    if (isStop === 'true') {
      app.metadata.annotations[stopKey] = 'stop';
      await apiClient.replace(app);
      return jsonRes(res, { data: 'success stop' });
    } else if (isStop === 'recover') {
      if (app.metadata.annotations[stopKey]) {
        delete app.metadata.annotations[stopKey];
      }
      await apiClient.replace(app);
      return jsonRes(res, { data: 'success recover' });
    }

    // store restart data
    const restartAnnotations: Record<string, string> = {
      target: '',
      value: ''
    };

    const requestQueue: Promise<any>[] = [];

    // check whether there are hpa
    try {
      const { body: hpa } = await k8sAutoscaling.readNamespacedHorizontalPodAutoscaler(
        appName,
        reqNamespace
      );

      restartAnnotations.target = hpa?.spec?.metrics?.[0]?.resource?.name || 'cpu';
      restartAnnotations.value = `${
        hpa?.spec?.metrics?.[0]?.resource?.target?.averageUtilization || 50
      }`;

      requestQueue.push(
        k8sAutoscaling.deleteNamespacedHorizontalPodAutoscaler(appName, reqNamespace)
      ); // delete HorizontalPodAutoscaler
    } catch (error: any) {
      if (error?.statusCode !== 404) {
        return Promise.reject('无法读取到hpa');
      }
    }

    // replace source file
    app.metadata.annotations[pauseKey] = JSON.stringify(restartAnnotations);
    app.spec.replicas = 0;

    requestQueue.push(apiClient.replace(app));

    await Promise.all(requestQueue);

    jsonRes(res);
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
