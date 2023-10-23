import { authSession } from '@/services/backend/auth';
import { hasIssuedLicense } from '@/services/backend/db/license';
import { getPaymentByID, updatePaymentAndIssueLicense } from '@/services/backend/db/payment';
import { jsonRes } from '@/services/backend/response';
import { getSealosPay } from '@/services/pay';
import { PaymentResult, PaymentStatus } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // test
    // const _token = generateLicenseToken({ type: 'Account', data: { amount: 299 } });

    const { orderID } = req.body as { orderID: string };
    const userInfo = await authSession(req.headers);
    if (!userInfo) {
      return jsonRes(res, { code: 401, message: 'token verify error' });
    }
    const { sealosPayUrl, sealosPayID, sealosPayKey } = getSealosPay();
    if (!sealosPayUrl) {
      return jsonRes(res, { code: 500, message: 'sealos payment has not been activated' });
    }

    const payment = await getPaymentByID({ uid: userInfo.uid, orderID: orderID });

    if (!payment) {
      return jsonRes(res, { code: 400, message: 'No order found' });
    }
    const issuedLicense = await hasIssuedLicense({ uid: userInfo.uid, orderID: orderID });
    if (issuedLicense) {
      return jsonRes(res, { code: 400, message: 'orderID cannot be reused' });
    }

    const result: PaymentResult = await fetch(`${sealosPayUrl}/v1alpha1/pay/status`, {
      method: 'POST',
      body: JSON.stringify({
        appID: +sealosPayID,
        sign: sealosPayKey,
        orderID: payment?.orderID,
        payMethod: payment?.payMethod,
        tradeNO: payment?.tradeNO,
        user: userInfo.uid,
        sessionID: payment?.sessionID
      })
    }).then((res) => res.json());

    if (result.status === PaymentStatus.PaymentSuccess) {
      await updatePaymentAndIssueLicense({
        uid: userInfo.uid,
        amount: payment.amount,
        quota: payment.amount,
        payMethod: payment.payMethod,
        // pay status
        orderID: orderID,
        status: result.status,
        type: 'Account'
      });
    }

    return jsonRes(res, {
      data: result
    });
  } catch (error) {
    console.error(error, '===payment error===\n');
    jsonRes(res, { code: 500, data: error });
  }
}
