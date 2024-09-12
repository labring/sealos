import { filterAuthenticationToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { checkCurrentResourceSvc } from '@/services/backend/svc/checkResource';
import { NextApiRequest, NextApiResponse } from 'next';
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await filterAuthenticationToken(req, res, async ({ userId, userUid }) => {
    await checkCurrentResourceSvc(userId, userUid)(res);
  });
});
