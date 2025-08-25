import { filterAccessToken } from '@/services/backend/middleware/access';
import { filterForceDelete } from '@/services/backend/middleware/checkResource';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { forceDeleteUserSvc } from '@/services/backend/svc/deleteUser';
import { NextApiRequest, NextApiResponse } from 'next';
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await filterAccessToken(req, res, async ({ userUid, userId, userCrName }) => {
    await filterForceDelete(req, res, async ({ code }) => {
      await forceDeleteUserSvc(userUid, code)(res);
    });
  });
});
