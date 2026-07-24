import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { getRegionToken } from '@/services/backend/regionAuth';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { filterAuthenticationToken } from '@/services/backend/middleware/access';
import { HttpStatusCode } from 'axios';
import { getRequestDefaultPrivateWorkspaceName } from '@/services/backend/svc/workspaceDefaults';
import { canUseGlobalAuthToken } from '@/services/backend/authGuard';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await filterAuthenticationToken(req, res, async ({ userId, userUid }) => {
    if (!(await canUseGlobalAuthToken({ userUid }))) {
      return jsonRes(res, {
        code: HttpStatusCode.Unauthorized,
        message: 'Unauthorized'
      });
    }
    const regionData = await getRegionToken({
      userId,
      userUid,
      defaultWorkspaceName: getRequestDefaultPrivateWorkspaceName(req)
    });
    if (!regionData) {
      return jsonRes(res, {
        code: HttpStatusCode.Conflict,
        message: 'workspace is not inited'
      });
    }
    return jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: regionData
    });
  });
}, 'Failed to authenticate with globalToken');
