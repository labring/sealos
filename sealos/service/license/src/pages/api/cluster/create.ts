import { freeClusterForm } from '@/constant/product';
import { authSession } from '@/services/backend/auth';
import { createClusterRecord } from '@/services/backend/db/cluster';
import { getPaymentByID } from '@/services/backend/db/payment';
import { jsonRes } from '@/services/backend/response';
import { ClusterType, CreateClusterParams, PaymentStatus } from '@/types';
import { calculatePrice } from '@/utils/tools';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      type = ClusterType.Standard,
      orderID,
      cpu,
      memory,
      name,
      months
    } = req.body as CreateClusterParams;

    const userInfo = await authSession(req.headers);
    if (!userInfo) {
      return jsonRes(res, { code: 401, message: 'token verify error' });
    }

    if (orderID) {
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
      const price = calculatePrice({ cpu, months, memory }, freeClusterForm);
      if (payment.amount !== price) {
        return jsonRes(res, { code: 400, message: 'mismatch between order and cluster size' });
      }
    }

    const result = await createClusterRecord({
      uid: userInfo.uid,
      type: type,
      orderID: orderID,
      cpu,
      memory,
      months,
      name
    });

    return jsonRes(res, {
      data: result
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
