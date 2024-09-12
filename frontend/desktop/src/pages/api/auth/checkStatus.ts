import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { checkUserStatusSvc } from '@/services/backend/svc/access';
import { NextApiRequest, NextApiResponse } from 'next';
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await filterAccessToken(req, res, async ({ userUid }) => checkUserStatusSvc(userUid)(res));
});
