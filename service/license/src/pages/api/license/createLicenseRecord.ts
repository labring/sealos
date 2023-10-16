import { authSession } from '@/services/backend/auth';
import { createLicenseRecord } from '@/services/backend/db/license';
import { jsonRes } from '@/services/backend/response';
import { LicensePayload } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(resp, { code: 401, message: 'token verify error' });

    const { token, orderID, amount, quota, paymentMethod } = req.body as LicensePayload;

    const record = {
      uid: payload.user.nsid,
      amount: amount,
      token: token,
      orderID: orderID,
      quota: quota,
      paymentMethod: paymentMethod
    };

    const result = await createLicenseRecord(record);

    return jsonRes(resp, {
      data: result
    });
  } catch (error) {
    jsonRes(resp, { code: 500, data: error });
  }
}
