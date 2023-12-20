import { authSession } from '@/services/backend/auth';
import { createPaymentRecord } from '@/services/backend/db/payment';
import { jsonRes } from '@/services/backend/response';
import { getSealosPay } from '@/services/pay';
import { PaymentDB, PaymentData, PaymentParams, PaymentStatus } from '@/types';
import { formatMoney } from '@/utils/tools';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { amount, currency, payMethod, stripeSuccessCallBackUrl, stripeErrorCallBackUrl } =
      req.body as PaymentParams;
    const STRIPE_CALLBACK_URL = process.env.STRIPE_CALLBACK_URL;
    const userInfo = await authSession(req.headers);
    if (!userInfo) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { sealosPayUrl, sealosPayID, sealosPayKey } = getSealosPay();
    if (!sealosPayUrl || !STRIPE_CALLBACK_URL)
      return jsonRes(res, { code: 500, message: 'sealos payment has not been activated' });

    const result: PaymentData = await fetch(`${sealosPayUrl}/v1alpha1/pay/session`, {
      method: 'POST',
      body: JSON.stringify({
        appID: +sealosPayID,
        sign: sealosPayKey,
        amount: amount,
        currency: currency,
        user: userInfo.uid,
        payMethod: payMethod,
        stripeSuccessUrl: `${STRIPE_CALLBACK_URL}${stripeSuccessCallBackUrl}`,
        stripeCancelUrl: `${STRIPE_CALLBACK_URL}${stripeErrorCallBackUrl}`
      })
    }).then((res) => res.json());

    let payRecord: PaymentDB = {
      ...result,
      uid: userInfo.uid,
      status: PaymentStatus.PaymentNotPaid,
      amount: formatMoney(parseInt(result.amount)),
      createdAt: new Date(),
      updatedAt: new Date(),
      payMethod: payMethod
    };

    await createPaymentRecord(payRecord);

    return jsonRes(res, {
      data: result
    });
  } catch (error) {
    console.error(error);
    jsonRes(res, { code: 500, data: error });
  }
}
