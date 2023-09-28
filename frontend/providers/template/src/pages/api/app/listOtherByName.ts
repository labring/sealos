import { templateDeployKey } from '@/constants/keys';
import { authSession } from '@/services/backend/auth';
import { CRDMeta, getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { AppCrdType } from '@/types/appCRD';
import { IncomingMessage } from 'http';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { instanceName } = req.query as { instanceName: string };
    const { namespace, k8sCore, k8sCustomObjects, k8sBatch } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });
    const labelSelector = `${templateDeployKey}=${instanceName}`;

    const appCRD: CRDMeta = {
      group: 'app.sealos.io',
      version: 'v1',
      namespace: namespace,
      plural: 'apps'
    };

    const secretPromise = k8sCore.listNamespacedSecret(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelector
    );

    const jobPromise = k8sBatch.listNamespacedJob(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelector
    );

    const appCrdResourcePromise = k8sCustomObjects.listNamespacedCustomObject(
      appCRD.group,
      appCRD.version,
      appCRD.namespace,
      appCRD.plural,
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelector
    ) as Promise<{
      response: IncomingMessage;
      body: {
        items: AppCrdType[];
        kind: 'AppList';
      };
    }>;

    // 使用 Promise.allSettled 获取所有结果 [secretResult, jobResult, customResourceResult]
    const result = await Promise.allSettled([secretPromise, jobPromise, appCrdResourcePromise]);
    const data = result
      .map((res) => {
        if (res.status === 'fulfilled') {
          return res.value.body.items.map((item) => {
            return {
              ...item,
              kind: item.kind ? item.kind : res.value?.body?.kind?.replace('List', '')
            };
          });
        }
      })
      .filter((item) => Array.isArray(item) && item.length > 0);

    jsonRes(res, { data: data });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
