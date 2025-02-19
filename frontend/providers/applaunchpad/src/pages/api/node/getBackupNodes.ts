import { authSession } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    if (process.env.GUIDE_ENABLED !== 'true') return jsonRes(res, { data: null });
    const kubeconfig = await authSession(req.headers);
    const domain = process.env.SERVER_BASE_URL;

    const response = await fetch(`${domain}/backup-nodes`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: encodeURIComponent(kubeconfig)
      },
    });
    const result: {
      backup_nodes: any;
    } = await response.json();
    console.log('resultresult>>>', result)
    if (result.backup_nodes) {
      return jsonRes(res, { data: result.backup_nodes.map((item: any) =>({internalIP: item})) });
    } else {
      // error
      return jsonRes(res, { code: 500, message: 'result.error' });
    }
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}