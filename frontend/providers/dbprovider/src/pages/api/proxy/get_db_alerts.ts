import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  const { namespace } = req.query;
  const apiUrl = `${
    process.env.DATABASE_ALERT_URL || 'http://database-alert.sealos.svc:8000'
  }/v1/databases?namespace=${namespace}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
        ...(req.headers['auth_user']
          ? {
              auth_user: Array.isArray(req.headers['auth_user'])
                ? req.headers['auth_user'][0]
                : req.headers['auth_user']
            }
          : {}),
        'Time-Zone': Array.isArray(req.headers['time-zone'])
          ? req.headers['time-zone'][0]
          : req.headers['time-zone'] || 'Asia/Shanghai'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    jsonRes(res, data);
  } catch (error) {
    console.error('Database alerts proxy error:', error);
    jsonRes(res, {
      code: 500,
      error: 'Failed to fetch database alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
