import { NextApiRequest, NextApiResponse } from 'next';
import { filterAccessToken, filterAuthenticationToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { resourceGuard } from '@/services/backend/middleware/checkResource';
import { jsonRes } from '@/services/backend/response';
import { RESOURCE_STATUS } from '@/types/response/checkResource';
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await filterAuthenticationToken(req, res, async ({ userUid }) => {
    await resourceGuard(userUid)(res, () => {
      jsonRes(res, {
        code: 200,
        message: RESOURCE_STATUS.RESULT_SUCCESS
      });
    });
  });
});
