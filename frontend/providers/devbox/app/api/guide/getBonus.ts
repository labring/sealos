import { authAppToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const token = await authAppToken(req.headers);
    if (!token) {
      return jsonRes(res, { code: 401, message: '令牌无效' });
    }

    const url = global.AppConfig.launchpad.components.billing.url;

    const response = await fetch(`${url}/account/v1alpha1/recharge-discount`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const result: {
      discount: {
        firstRechargeDiscount: Record<string, string>;
      };
    } = await response.json();

    const rechargeOptions = Object.entries(result.discount.firstRechargeDiscount).map(
      ([amount, rate]) => ({
        amount: Number(amount),
        gift: Math.floor((Number(amount) * Number(rate)) / 100)
      })
    );

    jsonRes(res, {
      code: 200,
      data: rechargeOptions
    });
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
