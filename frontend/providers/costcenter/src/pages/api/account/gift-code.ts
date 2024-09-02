import { authSession } from '@/service/backend/auth';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    if (!global.AppConfig.costCenter.giftCodeEnabled) {
      throw new Error('gift code is not enabled');
    }
    const { code } = req.body;
    const kc = await authSession(req.headers);

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

    if (!kc) {
      return jsonRes(resp, {
        code: 400,
        message: 'kc is required'
      });
    }

    const kubeUser = kc.getCurrentUser();
    if (kubeUser === null) {
      return jsonRes(resp, { code: 401, message: 'user not found' });
    }

    const base = global.AppConfig.costCenter.components.accountService.url;
    const body = JSON.stringify({
      kubeConfig: kc.exportConfig(),
      code
    });

    const response = await fetch(base + '/account/v1alpha1/gift-code/use', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const responseData = await response.json();
    if (!response.ok || response.status !== 200) {
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
