import { Config } from '@/config';
import { authAppToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!Config().template.features.guide) return jsonRes(res, { data: null });
    const token = await authAppToken(req.headers);
    if (!token) {
      return jsonRes(res, { code: 401, message: 'token is valid' });
    }

    const response = await fetch(
      `https://${Config().template.desktopDomain}/api/account/checkTask`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        }
      }
    );

    const result: {
      code: number;
      data: any;
      message: string;
    } = await response.json();

    if (result.code !== 200) {
      return jsonRes(res, { code: result.code, message: 'desktop api is err' });
    } else {
      return jsonRes(res, { data: result.data });
    }
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
