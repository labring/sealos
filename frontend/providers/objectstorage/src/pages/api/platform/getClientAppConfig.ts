import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { getClientAppConfigServer } from '@/server/getClientAppConfig';

export { getClientAppConfigServer };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return jsonRes(res, {
    data: getClientAppConfigServer()
  });
}
