import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import { checkSealosUserIsRealName } from '@/utils/tools';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    if (!global.AppConfig.costCenter.giftCodeEnabled) {
      throw new Error('gift code is not enabled');
    }
    const { code } = req.body;

    if (!code) {
      return jsonRes(resp, {
        code: 400,
        message: 'code is required'
      });
    }

    if (code.length !== 24) {
      return jsonRes(resp, {
        code: 400,
        message: 'code is invalid'
      });
    }
    const body = {
      code
    };
    const client = await makeAPIClientByHeader(req, resp);
    if (!client) return;

    const isRealName = await checkSealosUserIsRealName(client);
    if (!isRealName) {
      return jsonRes(resp, {
        code: 403,
        message: 'recharge is not allowed for non-real-name user'
      });
    }

    const response = await client.post('/account/v1alpha1/gift-code/use', body);
    const responseData = await response.data;
    if (response.status !== 200) {
      return jsonRes(resp, {
        code: 409,
        message: responseData?.error || 'use gift code failed'
      });
    }
    return jsonRes(resp, {
      code: 200,
      message: responseData?.message || 'use gift code success'
    });
  } catch (error) {
    console.error(error);
    jsonRes(resp, { code: 500, message: 'use gift code error' });
  }
}
