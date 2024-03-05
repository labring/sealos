import { jsonRes } from '@/services/backend/response';
import { createOrder } from '@/services/db/order';
import { OrderDB, OrderType } from '@/types/order';
import { NextApiRequest, NextApiResponse } from 'next';
import { getK8s } from '@/services/backend/kubernetes';
import { authSession } from '@/services/backend/auth';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

export type CreateOrderParams = {
  type: OrderType;
  description: string;
  appendix?: string[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { type, description, appendix } = req.body as CreateOrderParams;
    const { namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const payload: OrderDB = {
      userID: namespace,
      orderID: nanoid(),
      type,
      updateTime: new Date(),
      createTime: new Date(),
      description,
      status: 'pending',
      appendix
    };

    const result = await createOrder({ order: payload });

    return jsonRes(res, {
      data: result
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, data: error });
  }
}
