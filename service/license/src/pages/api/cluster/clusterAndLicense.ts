import { authSession } from '@/services/backend/auth';
import { createClusterAndLicense } from '@/services/backend/db/cluster';
import { generateLicenseToken } from '@/services/backend/db/license';
import { getPaymentByID } from '@/services/backend/db/payment';
import { jsonRes } from '@/services/backend/response';
import { CreateClusterParams, LicenseRecordPayload, PaymentStatus } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { orderID, type } = req.body as CreateClusterParams;

    const userInfo = await authSession(req.headers);
    if (!userInfo) {
      return jsonRes(res, { code: 401, message: 'token verify error' });
    }
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

    const _token = generateLicenseToken({ type: 'Account', data: { amount: payment.amount } });
    const record: LicenseRecordPayload = {
      uid: userInfo.uid,
      amount: payment.amount,
      token: _token,
      orderID: orderID,
      quota: payment.amount,
      payMethod: payment.payMethod,
      type: 'Account'
    };

    const result = await createClusterAndLicense({
      licensePayload: record,
      clusterPayload: {
        uid: userInfo.uid,
        orderID: orderID,
        type: type
      }
    });

    return jsonRes(res, {
      data: result
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
