import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { pauseKey, appDeployKey } from '@/constants/app';
import {
  buildPauseData,
  hasSavedHpa,
  parsePauseData,
  type PauseData,
  resolveStartReplicas,
  restoreHPAYaml,
  shouldRestoreHpa
} from '@/utils/pauseResume';
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

  // Capture the live HPA spec verbatim so a later start re-applies the exact
  // policy; a repeat pause keeps the spec saved by the first one.
  let pauseData: PauseData = { target: '', value: '' };
  let foundHpa = false;

  const requestQueue: Promise<any>[] = [];

  // check whether there are hpa
  try {
    const { body: hpa } = await k8sAutoscaling.readNamespacedHorizontalPodAutoscaler(
      appName,
      namespace
    );
    pauseData = buildPauseData(hpa, app.kind);
    foundHpa = true;
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
  if (foundHpa || !hasSavedHpa(app.metadata.annotations[pauseKey])) {
    app.metadata.annotations[pauseKey] = JSON.stringify(pauseData);
  }
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

  const pauseData = parsePauseData(app.metadata.annotations[pauseKey]);
  const isResume = shouldRestoreHpa(pauseData);

  // An elastic (paused) app restores to the saved policy’s minReplicas,
  // otherwise honor the explicit replica request.
  app.spec.replicas = isResume
    ? resolveStartReplicas(pauseData, app.metadata.annotations)
    : +replica;

  const requestQueue: Promise<any>[] = [apiClient.replace(app)];

  if (isResume && pauseData) {
    delete app.metadata.annotations[pauseKey];
    const hpaYaml = restoreHPAYaml(appName, pauseData, app.kind);
    requestQueue.push(applyYamlList([hpaYaml], 'create'));
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
