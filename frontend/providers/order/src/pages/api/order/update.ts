import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { updateOrder } from '@/services/db/order';
import { OrderDB } from '@/types/order';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const { orderID, updates } = req.body as {
      updates: Partial<OrderDB>;
      orderID: string;
    };

    const result = await updateOrder({
      orderID,
      userID: namespace,
      updates
    });

    return jsonRes(res, {
      data: result
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
