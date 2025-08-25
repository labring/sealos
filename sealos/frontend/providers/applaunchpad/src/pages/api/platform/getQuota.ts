import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { UserQuotaItemType } from '@/types/user';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // source price
    const { getUserQuota } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const quota = await getUserQuota();
    const gpuEnabled = global.AppConfig.common.gpuEnabled;
    const filteredQuota = gpuEnabled ? quota : quota.filter((item) => item.type !== 'gpu');

    jsonRes<{
      quota: UserQuotaItemType[];
    }>(res, {
      data: {
        quota: filteredQuota
      }
    });
  } catch (error) {
    jsonRes(res, { code: 500, message: 'get price error' });
  }
}
