import { authSession } from '@/service/backend/auth';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    if (!global.AppConfig.costCenter.transferEnabled) {
      throw new Error('transfer is not enabled');
    }
    // console.log(global)
    const { amount, to: toUser } = req.body;
    const kc = await authSession(req.headers);

    if (!kc || amount <= 0) {
      return jsonRes(resp, {
        code: 400,
        message: 'Amount cannot be less than 0'
      });
    }

    const kubeUser = kc.getCurrentUser();
    if (kubeUser === null) {
      return jsonRes(resp, { code: 401, message: 'user not found' });
    }
    const base = global.AppConfig.costCenter.components.accountService.url;
    const body = JSON.stringify({
      kubeConfig: kc.exportConfig(),
      owner: kubeUser.name,
      toUser,
      amount
    });
    const response = await fetch(base + '/account/v1alpha1/transfer', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok || response.status !== 200) {
      return jsonRes(resp, {
        code: 409,
        message: 'transfer failed'
      });
    }
    return jsonRes(resp, {
      code: 200,
      message: 'transfer success'
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'transfer error' });
  }
}
