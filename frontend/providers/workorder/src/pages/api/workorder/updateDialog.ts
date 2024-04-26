import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { addDialogToOrder, updateOrder } from '@/services/db/workorder';
import { WorkOrderStatus } from '@/types/workorder';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId, isAdmin } = await verifyAccessToken(req);

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
    if (isAdmin) {
      await updateOrder({
        orderId,
        userId: userId,
        updates: {
          status: WorkOrderStatus.Processing,
          manualHandling: { isManuallyHandled: true, handlingTime: new Date() }
        }
      });
    }

    const result = await addDialogToOrder({
      orderId,
      userId: userId,
      dialog: {
        userId: isRobot ? 'robot' : userId,
        time: new Date(),
        content: content,
        isAdmin: isAdmin,
        isAIBot: isRobot
      }
    });

    return jsonRes(res, {
      data: result
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
