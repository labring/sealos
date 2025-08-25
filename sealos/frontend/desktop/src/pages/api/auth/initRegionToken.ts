import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { getRegionToken, initRegionToken } from '@/services/backend/regionAuth';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { filterAuthenticationToken } from '@/services/backend/middleware/access';
import { initRegionTokenParamsSchema } from '@/schema/auth';
import { HttpStatusCode } from 'axios';
import { getRegionUid } from '@/services/enable';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await filterAuthenticationToken(req, res, async ({ userId, userUid }) => {
    const parseResult = initRegionTokenParamsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return jsonRes(res, {
        code: HttpStatusCode.BadRequest,
        message: parseResult.error.message
      });
    }
    const { workspaceName } = parseResult.data;
    const regionData = await initRegionToken({
      userId,
      workspaceName,
      regionUid: getRegionUid(),
      userUid
    });
    return jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: regionData
    });
  });
}, 'Failed to authenticate with globalToken');
