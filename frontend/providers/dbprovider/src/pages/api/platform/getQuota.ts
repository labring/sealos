import type { NextApiRequest, NextApiResponse } from 'next';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // source price
    const { getUserQuota, getUserBalance } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const [quota, balance] = await Promise.all([getUserQuota(), getUserBalance()]);

    jsonRes(res, {
      data: {
        quota,
        balance
      }
    });
  } catch (error) {
    jsonRes(res, { code: 500, message: 'get price error' });
  }
}
