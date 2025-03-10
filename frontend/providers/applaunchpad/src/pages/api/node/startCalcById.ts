import { authSession } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const kubeconfig = await authSession(req.headers);
    const domain = process.env.SERVER_BASE_URL;
    console.log(`${JSON.stringify(req.query)}`);
    const sId = req.query.stress_id
    const response = await fetch(`${domain}/api/mockRunTest?stress_id=${sId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: encodeURIComponent(kubeconfig)
      }
    });
    const result: {
      message: string;
    } = await response.json();

    if (result.message) {
      return jsonRes(res, { code: 200, message:result.message });
    } else {
      return jsonRes(res, { data: 'result.data' });
    }
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}