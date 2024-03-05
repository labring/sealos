import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { getAllOrdersByUserID } from '@/services/db/order';
import { OrderStatus, OrderType } from '@/types/order';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      page = 1,
      pageSize = 10,
      orderStatus,
      orderType,
      startTime,
      endTime
    } = req.body as {
      page: number;
      pageSize: number;
      orderType?: 'all' | OrderType;
      orderStatus?: 'all' | OrderStatus;
      startTime?: Date;
      endTime?: Date;
    };

    const { namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    let result = await getAllOrdersByUserID({
      userID: namespace,
      page: page,
      pageSize: pageSize,
      orderStatus,
      orderType,
      startTime,
      endTime
    });

    return jsonRes(res, {
      data: result
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
