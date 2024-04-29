import { NextApiRequest, NextApiResponse } from 'next';
import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { accountBalanceGuard } from '@/services/backend/middleware/amount';
import { filterMergeUser, mergeUserGuard } from '@/services/backend/middleware/mergeUser';
import { mergeUserSvc } from '@/services/backend/svc/mergeUser';

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await filterAccessToken(req, res, async ({ userUid, userId, userCrName }) => {
    await filterMergeUser(req, res, async ({ providerId, providerType }) => {
      await mergeUserGuard(
        userUid,
        providerType,
        providerId
      )(res, async ({ mergeUserUid }) => {
        await accountBalanceGuard(mergeUserUid)(res, async () => {
          await mergeUserSvc(userUid, mergeUserUid)(res);
        });
      });
    });
  });
});
