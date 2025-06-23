import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { maxReplicasKey, minReplicasKey, pauseKey, appDeployKey } from '@/constants/app';
import { json2HPA } from '@/utils/deployYaml2Json';
import { AppEditType } from '@/types/app';
import { NetworkingV1Api, PatchUtils } from '@kubernetes/client-node';

type UpdateReplicaParams = {
  appName: string;
  replica: string;
};

async function handleIngress(
  k8sNetworkingApp: NetworkingV1Api,
  namespace: string,
  appName: string,
  fromClass: string,
  toClass: string
): Promise<any[]> {
  const ingressPromises: Promise<any>[] = [];

  try {
    const { body: ingress } = await k8sNetworkingApp.listNamespacedIngress(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `${appDeployKey}=${appName}`
    );

    if (ingress?.items?.length > 0) {
      for (const ingressItem of ingress.items) {
        if (ingressItem?.metadata?.name) {
          const patchData: Record<string, any> = {};

          if (ingressItem.metadata?.annotations?.['kubernetes.io/ingress.class'] === fromClass) {
            patchData.metadata = {
              annotations: {
                'kubernetes.io/ingress.class': toClass
              }
            };
          }

          if (ingressItem.spec?.ingressClassName === fromClass) {
            patchData.spec = {
              ingressClassName: toClass
            };
          }

          if (Object.keys(patchData).length > 0) {
            ingressPromises.push(
              k8sNetworkingApp.patchNamespacedIngress(
                ingressItem.metadata.name,
                namespace,
                patchData,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }
              )
            );
          }
        }
      }
    }
  } catch (error: any) {
    if (error?.statusCode !== 404) {
      return Promise.reject(`not found ingress: ${error.message}`);
    }
  }

  return ingressPromises;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { appName, replica } = req.body as UpdateReplicaParams;

    if (!appName) {
      throw new Error('appName is empty');
    }

    let result;

    if (Number(replica) === 0) {
      result = await PauseApp({ appName, replica, req });
    } else {
      result = await StartApp({ appName, replica, req });
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
  req
}: UpdateReplicaParams & { req: NextApiRequest }) {
  const { apiClient, k8sAutoscaling, getDeployApp, namespace, k8sNetworkingApp } = await getK8s({
    kubeconfig: await authSession(req.headers)
  });

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
    requestQueue.push(k8sAutoscaling.deleteNamespacedHorizontalPodAutoscaler(appName, namespace));
  } catch (error: any) {
    if (error?.statusCode !== 404) {
      return Promise.reject('not found hpa');
    }
  }

  // handle ingress - change nginx to pause
  const ingressPromises = await handleIngress(
    k8sNetworkingApp,
    namespace,
    appName,
    'nginx',
    'pause'
  );
  requestQueue.push(...ingressPromises);

  // replace source file
  app.metadata.annotations[pauseKey] = JSON.stringify(restartAnnotations);
  app.spec.replicas = 0;

  requestQueue.push(apiClient.replace(app));

  return (await Promise.all(requestQueue)).map((item) => item?.body || item);
}

export async function StartApp({
  appName,
  replica,
  req
}: UpdateReplicaParams & { req: NextApiRequest }) {
  const { apiClient, getDeployApp, applyYamlList, namespace, k8sNetworkingApp } = await getK8s({
    kubeconfig: await authSession(req.headers)
  });

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

  // handle ingress - change pause to nginx
  const ingressPromises = await handleIngress(
    k8sNetworkingApp,
    namespace,
    appName,
    'pause',
    'nginx'
  );
  requestQueue.push(...ingressPromises);

  return (await Promise.all(requestQueue)).map((item) => item?.body || item);
}
