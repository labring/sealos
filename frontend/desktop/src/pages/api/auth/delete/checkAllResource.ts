import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { jsonRes } from '@/services/backend/response';
import { allRegionResourceSvc } from '@/services/backend/svc/checkResource';
import { isProtectedAdminUser, PROTECTED_ADMIN_USER_MESSAGE } from '@/utils/protectedUser';
import { NextApiRequest, NextApiResponse } from 'next';
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await filterAccessToken(req, res, async ({ userId, userUid, userCrName }) => {
    if (isProtectedAdminUser({ userId, userCrName })) {
      return jsonRes(res, { code: 403, message: PROTECTED_ADMIN_USER_MESSAGE });
    }

    await allRegionResourceSvc(userUid, userId, userCrName)(res);
  });
});
