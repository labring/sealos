import { generateBillingToken, verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

type AccountServiceResponse = {
  account?: {
    Balance?: number;
    DeductionBalance?: number;
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token is invaild' });

    const billingUrl = global.AppConfig.desktop.auth.billingUrl;
    if (!billingUrl) {
      return jsonRes(res, { code: 500, message: 'Billing service not configured' });
    }

    const billingToken = generateBillingToken({
      userUid: payload.userUid,
      userId: payload.userId
    });

    const response = await fetch(`${billingUrl}/account/v1alpha1/account`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${billingToken}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip,deflate,compress'
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      return jsonRes(res, { code: response.status, message: 'failed to get account balance' });
    }

    const data = (await response.json()) as AccountServiceResponse;
    if (!data?.account) return jsonRes(res, { code: 404, message: 'user is not found' });

    return jsonRes<{ balance: number; deductionBalance: number }>(res, {
      data: {
        balance: Number(data.account.Balance || 0),
        deductionBalance: Number(data.account.DeductionBalance || 0)
      }
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, data: 'get amount error' });
  }
}
