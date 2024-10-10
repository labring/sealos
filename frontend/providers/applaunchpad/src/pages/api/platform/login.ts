import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { username, password } = req.body;

    if (
      username === process.env.LAUNCHPAD_USERNAME &&
      password === process.env.LAUNCHPAD_PASSWORD
    ) {
      jsonRes(res, { data: { success: true } });
    } else {
      throw new Error('用户名或密码错误');
    }
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
