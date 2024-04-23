import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { createOrder } from '@/services/db/workorder';
import { WorkOrderDB, WorkOrderStatus, WorkOrderType } from '@/types/workorder';
import { customAlphabet } from 'nanoid';
import { NextApiRequest, NextApiResponse } from 'next';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

export type CreateWorkOrderParams = {
  type: WorkOrderType;
  description: string;
  appendix?: string[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { type, description, appendix } = req.body as CreateWorkOrderParams;
    const { userId } = await verifyAccessToken(req);

    const payload: WorkOrderDB = {
      userId: userId,
      orderId: nanoid(),
      type,
      updateTime: new Date(),
      createTime: new Date(),
      description,
      status: WorkOrderStatus.Pending,
      appendix,
      manualHandling: {
        isManuallyHandled: false
      }
    };

    await createOrder({ order: payload });

    return jsonRes(res, {
      data: {
        orderId: payload.orderId
      }
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, data: error });
  }
}
