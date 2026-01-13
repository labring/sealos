import { handleK8sError, jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchAllDatabaseVersions } from '@/services/backend/db-version';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const DBVersion = await fetchAllDatabaseVersions();
      return res.json(DBVersion);
    } catch (err) {
      console.log('error get db by name', err);
      jsonRes(res, handleK8sError(err));
    }
  } else {
    return jsonRes(res, {
      code: 405,
      message: 'Method not allowed'
    });
  }
}
