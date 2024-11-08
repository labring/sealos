import { authAppToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    if (process.env.GUIDE_ENABLED !== 'true')
      jsonRes(res, {
        code: 500
      });

    const token = await authAppToken(req.headers);
    if (!token) {
      return jsonRes(res, { code: 401, message: 'token is valid' });
    }

    const url = process.env.BILLING_URL;
    if (!url) {
      return jsonRes(res, { code: 500, message: 'billing is error' });
    }

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

    const rechargeOptions = Object.entries(result?.discount?.firstRechargeDiscount ?? {}).map(
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
    jsonRes(res, {
      code: 500,
      error: '/api/guide/getBonus error'
    });
  }
}
