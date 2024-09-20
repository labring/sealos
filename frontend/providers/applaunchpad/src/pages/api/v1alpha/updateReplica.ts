import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { maxReplicasKey, minReplicasKey, pauseKey } from '@/constants/app';
import { json2HPA } from '@/utils/deployYaml2Json';
import { AppEditType } from '@/types/app';

type UpdateReplicaParams = {
  appName: string;
  replica: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { appName, replica } = req.body as UpdateReplicaParams;

    if (!appName) {
      throw new Error('appName is empty');
    }

    const kubeconfig = await authSession(req.headers);
    const k8sContext = await getK8s({ kubeconfig });

    let result;

    if (Number(replica) === 0) {
      result = await PauseApp({ appName, replica, k8sContext });
    } else {
      result = await StartApp({ appName, replica, k8sContext });
    }

    jsonRes(res, { data: result });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export async function PauseApp({
  appName,
  replica,
  k8sContext
}: UpdateReplicaParams & { k8sContext: Awaited<ReturnType<typeof getK8s>> }) {
  const { apiClient, k8sAutoscaling, getDeployApp, namespace } = k8sContext;

  const app = await getDeployApp(appName);
  if (!app.metadata?.name || !app?.metadata?.annotations || !app.spec) {
    throw new Error('app data error');
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
      namespace
    );
    restartAnnotations.target = hpa?.spec?.metrics?.[0]?.resource?.name || 'cpu';
    restartAnnotations.value = `${
      hpa?.spec?.metrics?.[0]?.resource?.target?.averageUtilization || 50
    }`;
    requestQueue.push(k8sAutoscaling.deleteNamespacedHorizontalPodAutoscaler(appName, namespace)); // delete HorizontalPodAutoscaler
  } catch (error: any) {
    if (error?.statusCode !== 404) {
      return Promise.reject('无法读取到hpa');
    }
  }

  // replace source file
  app.metadata.annotations[pauseKey] = JSON.stringify(restartAnnotations);
  app.spec.replicas = 0;

  requestQueue.push(apiClient.replace(app));

  return (await Promise.all(requestQueue)).map((item) => item?.body || item);
}

export async function StartApp({
  appName,
  replica,
  k8sContext
}: UpdateReplicaParams & { k8sContext: Awaited<ReturnType<typeof getK8s>> }) {
  const { apiClient, getDeployApp, applyYamlList } = k8sContext;

  const app = await getDeployApp(appName);

  if (!app.metadata?.name || !app?.metadata?.annotations || !app.spec) {
    throw new Error('app data error');
  }

  app.spec.replicas = +replica;

  const requestQueue: Promise<any>[] = [apiClient.replace(app)];

  if (app.metadata.annotations[pauseKey]) {
    const pauseData: {
      target: string;
      value: string;
    } = JSON.parse(app.metadata.annotations[pauseKey]);

    // replace source file
    delete app.metadata.annotations[pauseKey];
    console.log(pauseData, 'pauseData');
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
  }

  return (await Promise.all(requestQueue)).map((item) => item?.body || item);
}
