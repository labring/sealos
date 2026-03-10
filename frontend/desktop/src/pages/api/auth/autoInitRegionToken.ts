import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { autoInitRegionToken, getRegionToken } from '@/services/backend/regionAuth';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { filterAuthenticationToken } from '@/services/backend/middleware/access';
import { HttpStatusCode } from 'axios';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await filterAuthenticationToken(req, res, async ({ userId, userUid }) => {
    const regionData = await autoInitRegionToken({
      userId,
      userUid
    });

    if (!regionData) {
      // user may already be initialized (isInited=true), fall back to getRegionToken
      const fallbackData = await getRegionToken({ userId, userUid });
      if (!fallbackData) {
        return jsonRes(res, {
          code: HttpStatusCode.InternalServerError,
          message: 'Failed to auto initialize workspace'
        });
      }
      return jsonRes(res, {
        code: 200,
        message: 'Successfully',
        data: fallbackData
      });
    }

    return jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: regionData
    });
  });
}, 'Failed to auto initialize with globalToken');
