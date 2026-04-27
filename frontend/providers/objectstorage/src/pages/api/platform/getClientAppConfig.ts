import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { getClientAppConfigServer } from '@/server/getClientAppConfig';
import { isServerMisconfiguredError } from '@sealos/shared/server/config';

export { getClientAppConfigServer };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    return jsonRes(res, {
      data: getClientAppConfigServer()
    });
  } catch (error) {
    if (isServerMisconfiguredError(error)) {
      return jsonRes(res, { code: 500, message: 'Server misconfigured' });
    }
    console.error('[Client App Config] Unexpected server error:', error);
    return jsonRes(res, { code: 500, message: 'Internal Server Error' });
  }
}
