import { authSession } from '@/services/backend/auth';
import { createClusterRecord } from '@/services/backend/db/cluster';
import { getPaymentByID } from '@/services/backend/db/payment';
import { jsonRes } from '@/services/backend/response';
import { ClusterType, CreateClusterParams, PaymentStatus } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { type = ClusterType.Standard, orderID } = req.body as CreateClusterParams;

    const userInfo = await authSession(req.headers);
    if (!userInfo) {
      return jsonRes(res, { code: 401, message: 'token verify error' });
    }

    if (type === ClusterType.Enterprise && orderID) {
      const payment = await getPaymentByID({ uid: userInfo.uid, orderID: orderID });
      if (!payment) {
        return jsonRes(res, { code: 400, message: 'No order found' });
      }
      if (payment.status !== PaymentStatus.PaymentSuccess) {
        return jsonRes(res, {
          code: 400,
          message: 'Unpaid'
        });
      }
      const result = await createClusterRecord({
        uid: userInfo.uid,
        type: type,
        orderID: orderID
      });

      return jsonRes(res, {
        data: result
      });
    }

    if (type === ClusterType.Standard) {
      const result = await createClusterRecord({
        uid: userInfo.uid,
        type: type
      });
      return jsonRes(res, {
        data: result
      });
    }

    return jsonRes(res, {
      code: 400,
      message: 'Request parameter error'
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
