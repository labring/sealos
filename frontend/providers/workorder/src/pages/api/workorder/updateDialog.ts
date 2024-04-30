import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { addDialogToOrder, updateOrder } from '@/services/db/workorder';
import { WorkOrderStatus } from '@/types/workorder';
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
    const {
      orderId,
      content,
      isRobot = false
    } = req.body as {
      orderId: string;
      content: string;
      isRobot: boolean;
    };

    // If the admin replies, it is being processed.
    if (payload.isAdmin) {
      await updateOrder({
        orderId,
        userId: payload.userId,
        updates: {
          status: WorkOrderStatus.Processing,
          manualHandling: { isManuallyHandled: true, handlingTime: new Date() }
        }
      });
    }

    const result = await addDialogToOrder({
      orderId,
      userId: payload.userId,
      dialog: {
        userId: isRobot ? 'robot' : payload.userId,
        time: new Date(),
        content: content,
        isAdmin: payload.isAdmin,
        isAIBot: isRobot
      }
    });

    jsonRes(res, {
      data: result
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
