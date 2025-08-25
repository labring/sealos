import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { updateOrder } from '@/services/db/workorder';
import { WorkOrderDB, WorkOrderStatus } from '@/types/workorder';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req);
    if (!payload) {
      return jsonRes(res, {
        code: 401,
        message: "'token is invaild'"
      });
    }
    const { orderId, updates } = req.body as {
      updates: Partial<WorkOrderDB>;
      orderId: string;
    };

    const isCompleted = updates.status === WorkOrderStatus.Completed;
    const isDeleted = updates.status === WorkOrderStatus.Deleted;

    const result = await updateOrder({
      orderId,
      userId: payload.userId,
      updates: {
        ...updates,
        ...(isCompleted && { closedBy: payload.userId }),
        ...(isDeleted && {
          deletedBy: payload.userId
        })
      }
    });

    jsonRes(res, {
      data: result
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
