import type { NextApiRequest, NextApiResponse } from 'next';
import { appDeployKey } from '@/constants/app';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import type { ApiResp } from '@/services/kubernet';
import type { AppEditType } from '@/types/app';

export type BackendServiceItem = NonNullable<AppEditType['serviceList']>[number];

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const {
      body: { items: services }
    } = await k8sCore.listNamespacedService(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      appDeployKey
    );

    const data: BackendServiceItem[] = services.map((service) => ({
      name: service.metadata?.name || '',
      ports:
        service.spec?.ports?.map((port) => ({
          name: port.name,
          port: port.port,
          protocol: port.protocol as BackendServiceItem['ports'][number]['protocol']
        })) || []
    }));

    jsonRes(res, { data });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
