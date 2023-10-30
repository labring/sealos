import { authSession } from '@/services/backend/auth';
import { createClusterAndLicense } from '@/services/backend/db/cluster';
import { generateLicenseToken } from '@/services/backend/db/license';
import { findRecentNopayOrder, updatePaymentAndIssueLicense } from '@/services/backend/db/payment';
import { jsonRes } from '@/services/backend/response';
import { getSealosPay } from '@/services/pay';
import {
  CheckWeChatType,
  ClusterType,
  LicenseRecordPayload,
  PaymentResult,
  PaymentStatus
} from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { type } = req.query as { type: CheckWeChatType };
    const userInfo = await authSession(req.headers);
    if (!userInfo) {
      return jsonRes(res, { code: 401, message: 'token verify error' });
    }

    const { sealosPayUrl, sealosPayID, sealosPayKey } = getSealosPay();
    if (!sealosPayUrl) {
      return jsonRes(res, { code: 500, message: 'sealos payment has not been activated' });
    }

    const payment = await findRecentNopayOrder({
      uid: userInfo.uid,
      payMethod: 'wechat',
      status: PaymentStatus.PaymentNotPaid
    });

    if (!payment) {
      return jsonRes(res, { code: 400, message: 'No order found' });
    }

    const result: PaymentResult = await fetch(`${sealosPayUrl}/v1alpha1/pay/status`, {
      method: 'POST',
      body: JSON.stringify({
        appID: 45141910007488120,
        sign: '076f82f8e996d7',
        orderID: payment?.orderID,
        payMethod: payment?.payMethod,
        tradeNO: payment?.tradeNO,
        user: userInfo.uid,
        sessionID: payment?.sessionID
      })
    }).then((res) => res.json());

    if (type === 'license' && result.status === PaymentStatus.PaymentSuccess) {
      await updatePaymentAndIssueLicense({
        uid: userInfo.uid,
        status: result.status,
        amount: payment.amount,
        quota: payment.amount,
        orderID: payment.orderID,
        payMethod: payment.payMethod,
        type: 'Account'
      });
    }

    if (type === 'cluster' && result.status === PaymentStatus.PaymentSuccess) {
      const _token = generateLicenseToken({ type: 'Account', data: { amount: payment.amount } });
      const record: LicenseRecordPayload = {
        uid: userInfo.uid,
        amount: payment.amount,
        token: _token,
        orderID: payment.orderID,
        quota: payment.amount,
        payMethod: payment.payMethod,
        type: 'Account'
      };
      await createClusterAndLicense({
        licensePayload: record,
        clusterPayload: {
          uid: userInfo.uid,
          orderID: payment.orderID,
          type: ClusterType.Enterprise
        }
      });
    }

    console.log('Handle wechat shutdown situation');
    return jsonRes(res, {
      data: result
    });
  } catch (error) {
    console.error(error, '===payment error===\n');
    jsonRes(res, { code: 500, data: error });
  }
}
