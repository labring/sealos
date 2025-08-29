import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';
import { ResponseCode, ResponseMessages } from '@/types/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  try {
    const kubeconfig = await authSession(req);
    if (!kubeconfig) {
      return jsonRes(res, {
        code: ResponseCode.UNAUTHORIZED,
        message: ResponseMessages[ResponseCode.UNAUTHORIZED]
      });
    }
  } catch (error) {
    return jsonRes(res, {
      code: ResponseCode.UNAUTHORIZED,
      message: ResponseMessages[ResponseCode.UNAUTHORIZED]
    });
  }

  const apiUrl = `${process.env.GATEWAY_DOMAIN_NAME}/api/open/enterprise/sync_data_source_a`;

  const apiKey = process.env.CHAT2DB_API_KEY;

  const { userKey, ...requestBody } = req.body as any;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...(userKey ? { sync_user: userKey } : {}),
        ...(req.headers['auth_user']
          ? {
              auth_user: Array.isArray(req.headers['auth_user'])
                ? req.headers['auth_user'][0]
                : req.headers['auth_user']
            }
          : {}),
        ...(req.headers['sync_user']
          ? {
              sync_user: Array.isArray(req.headers['sync_user'])
                ? req.headers['sync_user'][0]
                : req.headers['sync_user']
            }
          : {}),
        'Time-Zone': Array.isArray(req.headers['time-zone'])
          ? req.headers['time-zone'][0]
          : req.headers['time-zone'] || 'Asia/Shanghai'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    jsonRes(res, { data: responseData });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
