import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { appDeployKey } from '@/constants/app';
import { adaptAppDetail } from '@/utils/adapt';
import { getServerEnv } from './platform/getInitData';
import { DeployKindsType } from '@/types/app';
import { MOCK_APP_DETAIL } from '@/mock/apps';

export const config = {
  api: {
    responseLimit: false
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { appName, mock } = req.query as { appName: string; mock?: string };
    if (!appName) {
      throw new Error('appName is empty');
    }

    if (mock === 'true') {
      return jsonRes(res, {
        data: MOCK_APP_DETAIL
      });
    }

    const response = await GetAppByAppName({ appName, req });

    // Check for errors other than 404
    const responseData = response
      .map((item) => {
        if (item.status === 'fulfilled') return item.value.body;
        if (item.status === 'rejected' && item.reason?.body?.code === 404) return '';
        console.error('API请求错误:', item.reason);
        return '';
      })
      .filter((item) => item)
      .flat();

    const data = adaptAppDetail(responseData as DeployKindsType[], getServerEnv(global.AppConfig));

    jsonRes(res, {
      data: data
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export async function GetAppByAppName({
  appName,
  req
}: { appName: string } & { req: NextApiRequest }) {
  const { k8sApp, k8sCore, k8sNetworkingApp, k8sAutoscaling, namespace } = await getK8s({
    kubeconfig: await authSession(req.headers)
  });

  const response = await Promise.allSettled([
    k8sApp.readNamespacedDeployment(appName, namespace),
    k8sApp.readNamespacedStatefulSet(appName, namespace),
    k8sCore.readNamespacedConfigMap(appName, namespace).catch((err) => {
      // This .catch will prevent unhandledRejection
      // Need to re-throw the error to let Promise.allSettled correctly identify it as rejection
      return Promise.reject(err);
    }),
    k8sCore
      .listNamespacedService(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `${appDeployKey}=${appName}`
      )
      .then((res) => ({
        body: res.body.items.map((item) => ({
          ...item,
          apiVersion: res.body.apiVersion, // item does not contain apiversion and kind
          kind: 'Service'
        }))
      })),
    k8sNetworkingApp
      .listNamespacedIngress(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `${appDeployKey}=${appName}`
      )
      .then((res) => ({
        body: res.body.items.map((item) => ({
          ...item,
          apiVersion: res.body.apiVersion, // item does not contain apiversion and kind
          kind: 'Ingress'
        }))
      })),
    k8sCore.readNamespacedSecret(appName, namespace),
    k8sAutoscaling.readNamespacedHorizontalPodAutoscaler(appName, namespace)
  ]);

  return response;
}
