import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { pauseKey, minReplicasKey, maxReplicasKey } from '@/constants/app';
import { json2HPA } from '@/utils/deployYaml2Json';
import { AppEditType } from '@/types/app';

/* start app. */
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { appName } = req.query as { appName: string };
    if (!appName) {
      throw new Error('appName is empty');
    }
    const { apiClient, getDeployApp, applyYamlList } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

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

    // replace source file
    delete app.metadata.annotations[pauseKey];
    app.spec.replicas = app.metadata.annotations[minReplicasKey]
      ? +app.metadata.annotations[minReplicasKey]
      : 1;

    const requestQueue: Promise<any>[] = [apiClient.replace(app)];
    // create hpa
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

    await Promise.all(requestQueue);

    jsonRes(res);
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
