import { jsonRes } from '@/services/backend/response';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const data = (await req.json()) as {
      desktopToAppToken: string;
    };
    if (!data.desktopToAppToken) {
      return jsonRes({ code: 401, message: '令牌无效' });
    }

    const url = '';

    const response = await fetch(`${url}/account/v1alpha1/recharge-discount`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${data.desktopToAppToken}`
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

    return jsonRes({
      code: 200,
      data: rechargeOptions
    });
  } catch (err: any) {
    console.log(err);
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
