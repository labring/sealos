import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { allRegionResourceSvc } from '@/services/backend/svc/checkResource';
import { NextApiRequest, NextApiResponse } from 'next';
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await filterAccessToken(req, res, async ({ userId, userUid, userCrName }) => {
    await allRegionResourceSvc(userUid, userId, userCrName)(res);
  });
});
