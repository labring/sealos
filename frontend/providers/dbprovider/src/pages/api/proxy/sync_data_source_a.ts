import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import useEnvStore from '@/store/env';
const { SystemEnv } = useEnvStore.getState();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const apiUrl = `${process.env.GATEWAY_DOMAIN_NAME}/api/open/enterprise/sync_data_source_a`;

  const apiKey = SystemEnv.CHAT2DB_API_KEY;

  const { userKey, ...requestBody } = req.body as any;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...(userKey ? { sync_user: userKey } : {}),
      ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
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

  jsonRes(res, await response.json());
}
