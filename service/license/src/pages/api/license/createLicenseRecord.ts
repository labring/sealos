import { authSession } from '@/services/backend/auth';
import { createLicenseRecord, generateLicenseToken } from '@/services/backend/db/license';
import { jsonRes } from '@/services/backend/response';
import { LicensePayload } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(resp, { code: 401, message: 'token verify error' });

    const { orderID, amount, quota, payMethod, type } = req.body as LicensePayload;

    const _token = generateLicenseToken({ type: type, data: { amount: quota } });

    const record = {
      uid: payload.uid,
      amount: amount,
      token: _token,
      orderID: orderID,
      quota: quota,
      payMethod: payMethod,
      type: type
    };

    const result = await createLicenseRecord(record);

    return jsonRes(resp, {
      data: result
    });
  } catch (error) {
    jsonRes(resp, { code: 500, data: error });
  }
}
