import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { shareStorageKey } from '@/constants/app';

export type SharePVCItem = {
  name: string;
  storageClassName: string;
  capacity: string;
  phase: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const {
      body: { items: pvcs }
    } = await k8sCore.listNamespacedPersistentVolumeClaim(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `${shareStorageKey}=true`
    );

    const data: SharePVCItem[] = pvcs
      .filter((pvc) => pvc.status?.phase === 'Bound')
      .map((pvc) => ({
        name: pvc.metadata?.name || '',
        storageClassName: pvc.spec?.storageClassName || '',
        capacity: pvc.status?.capacity?.storage || pvc.spec?.resources?.requests?.storage || '',
        phase: pvc.status?.phase || ''
      }));

    jsonRes(res, { data });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
