import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(request: NextApiRequest, res: NextApiResponse) {
  try {
    const { url } = request.query as { url: string };
    if (!url) {
      return jsonRes(res, {
        code: 400,
        error: '缺少 URL 参数'
      });
    }

    const response = await fetch(url);

    if (response.status === 503) {
      return jsonRes(res, {
        code: 503,
        message: 'Service Unavailable (503)'
      });
    }

    const text = await response.text();
    if (text.includes('upstream not health')) {
      return jsonRes(res, {
        code: 503,
        message: 'Upstream not healthy'
      });
    }

    return jsonRes(res, {
      code: 200,
      data: {
        ready: true
      }
    });
  } catch (error: any) {
    console.error(error);
    return jsonRes(res, {
      code: 500,
      error: error?.message
    });
  }
}
