import { authSession } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    if (process.env.GUIDE_ENABLED !== 'true') return jsonRes(res, { data: null });
    const domain = process.env.SERVER_BASE_URL;
    const {id,...body} = req.body
    console.log(req.body,`${domain}/api/roles/${id}/menus`)
    const response = await fetch(`${domain}/api/roles/${id}/menus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body:JSON.stringify(body)
    });
    const result: {
      code: number;
      data: any;
      message: string;
      error: string;
    } = await response.json();
    if (result.message) {
      return jsonRes(res, { data: result.data });
    } else {
      // error
      return jsonRes(res, { code: 500, message: result.error });
    }
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}